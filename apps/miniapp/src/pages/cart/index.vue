<script setup lang="ts">
import PageFrame from "../../components/PageFrame.vue";
import CartItemRow from "../../components/CartItemRow.vue";
import ProductSuggestion from "../../components/ProductSuggestion.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import ReIcon from "../../components/ReIcon.vue";
import IconButton from "../../components/IconButton.vue";
import CheckoutBar from "../../components/CheckoutBar.vue";
import { useScrollRefresh } from "../../composables/useRefresh";
import { formatMoney } from "../../utils/format";
import { crypto } from "../../utils/crypto";
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { ApiError, NetworkError, api, getErrorMessage } from "../../services/api";
import {
  clearCheckoutRemark,
  loadCheckoutRemark,
  loadCart,
  reconcileCart,
  saveCart,
  saveCheckoutRemark,
} from "../../services/cart";
import type { CartItem, Product, Shop } from "../../types";

type MiniappTextareaEvent = Event & { detail?: { value?: unknown } };

const items = ref<CartItem[]>([]);
const shop = ref<Shop | null>(null);
const shopId = ref("");
const remark = ref("");
const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const cartChanges = ref<string[]>([]);
const confirming = ref(false);
const contentTop = ref(0);
const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
const productImages = computed(() => new Map(shop.value?.products.map((product) => [product.id, product.image]) || []));
const suggestions = computed(() => shop.value?.products.filter((product) =>
  product.isAvailable && product.stock > 0 && !items.value.some((item) => item.productId === product.id),
).slice(0, 2) || []);

function setStage(checkout: boolean) {
  confirming.value = checkout;
  uni.setNavigationBarTitle({ title: checkout ? "确认订单" : "购物车" });
  contentTop.value = contentTop.value === 0 ? 1 : 0;
}
function addSuggestion(product: Product) {
  if (!shop.value?.isOpen || submitting.value) return;
  items.value.push({ productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock });
  saveCart(shopId.value, items.value);
}
function clearCart() {
  if (submitting.value) return;
  uni.showModal({
    title: "清空购物车", content: "确定移除全部商品吗？",
    success: ({ confirm }) => {
      if (!confirm) return;
      items.value = [];
      saveCart(shopId.value, []);
      setStage(false);
    },
  });
}

const total = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
);

function updateCart(latestShop: Shop, previousItems: CartItem[] = items.value) {
  const latestItems = reconcileCart(previousItems, latestShop.products);
  const itemsById = new Map(latestItems.map((item) => [item.productId, item]));
  const changes = previousItems.flatMap((item) => {
    const latest = itemsById.get(item.productId);
    if (!latest) return [`已移除「${item.name}」（已售罄或下架）`];
    const messages: string[] = [];
    if (latest.quantity !== item.quantity) {
      messages.push(`「${item.name}」数量从 ${item.quantity} 份调整为 ${latest.quantity} 份`);
    }
    if (latest.price !== item.price) {
      messages.push(`「${item.name}」价格从 ${formatMoney(item.price)} 调整为 ${formatMoney(latest.price)}`);
    }
    return messages;
  });
  shop.value = latestShop;
  items.value = latestItems;
  saveCart(shopId.value, latestItems);
  cartChanges.value = changes;
  if (changes.length) {
    contentTop.value = contentTop.value === 0 ? 1 : 0;
    uni.showToast({ title: changes[0], icon: "none", duration: 4000 });
  }
  return changes.length > 0;
}

function goMenu() {
  uni.navigateBack({
    delta: 1,
    fail: () => uni.switchTab({ url: "/pages/home/index" }),
  });
}

async function load(silent = false) {
  if (!shopId.value) {
    loading.value = false;
    error.value = "购物车地址无效";
    return;
  }
  if (!silent) { loading.value = true; error.value = ""; }
  try {
    const result = await api.shop(shopId.value);
    if (!result) throw new Error("店铺不存在或已下线");
    updateCart(result, loadCart(shopId.value));
  } catch (reason: unknown) {
    const message = getErrorMessage(reason, "购物车加载失败，请稍后重试");
    if (silent) uni.showToast({ title: message, icon: "none" });
    else error.value = message;
  } finally {
    if (!silent) loading.value = false;
  }
}
const { refreshing, onRefresh } = useScrollRefresh(async () => {
  if (!submitting.value) await load(Boolean(shop.value));
});

function changeQuantity(item: CartItem, nextQuantity: number) {
  const index = items.value.findIndex(
    (candidate) => candidate.productId === item.productId,
  );
  if (index < 0) return;
  if (nextQuantity < 1) items.value.splice(index, 1);
  else items.value[index] = { ...item, quantity: nextQuantity };
  saveCart(shopId.value, items.value);
}

function updateRemark(event: MiniappTextareaEvent) {
  const value = event.detail?.value;
  if (typeof value !== "string") return;
  remark.value = value.slice(0, 200);
  saveCheckoutRemark(shopId.value, remark.value);
}

function requestStudentLogin() {
  uni.showModal({
    title: "需要学生身份",
    content: "请先登录学生账号后再提交订单。",
    confirmText: "去登录",
    success: ({ confirm }) => {
      if (confirm) uni.navigateTo({ url: "/pages/profile/login" });
    },
  });
}

async function submit() {
  if (submitting.value) return;
  if (!api.isRole("STUDENT")) {
    requestStudentLogin();
    return;
  }
  if (!items.value.length) {
    uni.showToast({ title: "购物车是空的", icon: "none" });
    return;
  }

  submitting.value = true;
  let orderRequested = false;
  try {
    const latestShop = await api.shop(shopId.value);
    if (!latestShop) throw new Error("店铺不存在或已下线");
    if (updateCart(latestShop)) return;
    if (!latestShop.isOpen) throw new Error("店铺当前未营业");

    const idempotencyKey = await crypto.randomUUID();
    const input = {
      shopId: shopId.value,
      items: items.value.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        expectedPrice: item.price,
      })),
      remark: remark.value,
      idempotencyKey,
    };
    orderRequested = true;
    const order = await api.createOrder(input).catch((reason: unknown) => {
      if (!(reason instanceof NetworkError)) throw reason;
      return api.createOrder(input);
    });

    saveCart(shopId.value, []);
    clearCheckoutRemark(shopId.value);
    items.value = [];
    remark.value = "";
    cartChanges.value = [];
    setStage(false);
    uni.navigateTo({
      url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}${order.paymentStatus === 'PENDING' ? '&pay=1' : ''}`,
      fail: () => uni.switchTab({ url: "/pages/orders/index" }),
    });
  } catch (reason: unknown) {
    if (!(reason instanceof ApiError && reason.statusCode === 401)) {
      uni.showToast({
        title: orderRequested && reason instanceof NetworkError
          ? "未收到下单结果，请先查看订单"
          : getErrorMessage(reason, "下单失败，请稍后重试"),
        icon: "none",
      });
    }
  } finally {
    submitting.value = false;
  }
}

onLoad((query) => {
  shopId.value = typeof query?.shopId === "string" ? query.shopId : "";
  items.value = loadCart(shopId.value);
  remark.value = loadCheckoutRemark(shopId.value);
  void load();
});
</script>

<template>
  <PageFrame>
    <template #header>
      <view v-if="shop && !loading && !error" class="shop-strip">
        <view class="shop-heading"><text class="shop-name">{{ shop.name }}</text><IconButton v-if="items.length" :name="confirming ? 'edit' : 'close'" :label="confirming ? '修改商品' : '清空购物车'" :disabled="submitting" compact @click="confirming ? setStage(false) : clearCart()" /></view>
        <BusinessStatus :open="shop.isOpen" />
        <view class="pickup-line"><ReIcon name="bag" :size="14" /><text>到店自取，请等餐点备好后到店取餐</text></view>
      </view>
    </template>
    <scroll-view class="cart-scroll" scroll-y :scroll-top="contentTop" :refresher-enabled="!submitting" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view class="cart-body">
        <view v-if="cartChanges.length" class="cart-updates">
          <ReIcon name="alert" :size="16" />
          <view class="update-messages"><text v-for="message in cartChanges" :key="message">{{ message }}</text><text>请确认商品后重新提交</text></view>
        </view>
        <StateView :loading="loading" :error="error" skeleton="card" action-text="重试" @action="load()" />
        <template v-if="!loading && !error">
          <StateView :empty="items.length === 0" empty-text="购物车还是空的，先选点想吃的吧" action-text="去点餐" @action="goMenu" />
          <template v-if="items.length">
            <view class="content-heading"><text class="section-label">{{ confirming ? '确认商品' : '已选商品' }}</text><text class="section-meta">{{ itemCount }} 份</text></view>
            <view class="item-list">
              <CartItemRow v-for="item in items" :key="item.productId" :item="item" :image="productImages.get(item.productId)" :readonly="confirming" :disabled="submitting || !shop?.isOpen" @change="changeQuantity(item, $event)" />
              <view v-if="confirming" class="order-total"><text>合计</text><text>{{ formatMoney(total) }}</text></view>
            </view>
            <view class="remark-section">
              <view class="remark-heading"><text class="section-label">备注</text><text class="character-count">{{ remark.length }}/200</text></view>
              <textarea :value="remark" class="form-input form-textarea remark" :disabled="submitting" :maxlength="200" placeholder="口味偏好、取餐要求（选填）" aria-label="订单备注" @input="updateRemark" />
            </view>
            <template v-if="!confirming && suggestions.length && shop?.isOpen">
              <view class="section-row"><text class="section-label">再加一道</text></view>
              <view class="suggestion-list"><view v-for="product in suggestions" :key="product.id" class="suggestion-column"><ProductSuggestion :product="product" @add="addSuggestion(product)" /></view></view>
            </template>
          </template>
        </template>
      </view>
    </scroll-view>
    <template v-if="!loading && !error && items.length" #footer>
      <CheckoutBar :count="itemCount" :total="total" :name="confirming ? 'check' : 'arrow-right'" :label="confirming ? '提交订单' : '确认商品'" :loading="submitting" :disabled="submitting || !shop?.isOpen" @action="confirming ? submit() : setStage(true)" />
    </template>
  </PageFrame>
</template>
<style scoped>
.shop-strip { padding: var(--space-3) var(--space-4); border-bottom: 2rpx solid var(--color-border); }
.shop-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-1); }
.shop-name { min-width: 0; flex: 1; font-size: var(--font-title); font-weight: 700; overflow-wrap: anywhere; }
.pickup-line { display: flex; align-items: flex-start; gap: var(--space-1); margin-top: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); }
.pickup-line text { min-width: 0; flex: 1; }
.cart-scroll { height: 0; flex: 1; min-height: 0; }
.cart-body { --content-clearance: var(--space-3); padding: var(--space-3) var(--space-4) calc(var(--content-clearance) + env(safe-area-inset-bottom)); }
.cart-updates { display: flex; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-3); padding: var(--space-3) 0; border-bottom: 2rpx solid var(--color-border); color: var(--color-warning); font-size: var(--font-caption); line-height: 1.6; }
.update-messages { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-1); overflow-wrap: anywhere; }
.content-heading, .remark-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-3); }
.item-list { padding: 0 var(--space-3); border-radius: var(--radius-card); background: var(--color-surface); }
.order-total { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0; font-size: var(--font-body); }
.order-total text:last-child { color: var(--color-brand); font-size: var(--font-title); font-weight: 700; }
.remark-section { margin-top: var(--space-4); }
.character-count { margin: 0; }
.remark { height: 160rpx; padding: var(--space-3); background: var(--color-surface); }
.suggestion-list { display: flex; align-items: stretch; gap: var(--space-3); }
.suggestion-column { min-width: 0; flex: 1; }
</style>
