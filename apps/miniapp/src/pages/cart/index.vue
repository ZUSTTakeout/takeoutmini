<script setup lang="ts">
import PageHeading from "../../components/PageHeading.vue";
import CartItemRow from "../../components/CartItemRow.vue";
import ProductSuggestion from "../../components/ProductSuggestion.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import FoodImage from "../../components/FoodImage.vue";
import ReIcon from "../../components/ReIcon.vue";
import IconButton from "../../components/IconButton.vue";
import CheckoutBar from "../../components/CheckoutBar.vue";
import { formatMoney } from "../../utils/format";
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { ApiError, api, getErrorMessage } from "../../services/api";
import {
  clearCheckoutAttempt,
  clearCheckoutRemark,
  findCheckoutAttempt,
  getCheckoutAttempt,
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
const confirming = ref(false);
const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
const productImages = computed(() => new Map(shop.value?.products.map((product) => [product.id, product.image]) || []));
const suggestions = computed(() => shop.value?.products.filter((product) =>
  product.isAvailable && product.stock > 0 && !items.value.some((item) => item.productId === product.id),
).slice(0, 2) || []);

function setStage(checkout: boolean) {
  confirming.value = checkout;
  uni.setNavigationBarTitle({ title: checkout ? "确认订单" : "购物车" });
  uni.pageScrollTo({ scrollTop: 0, duration: 0 });
}
function addSuggestion(product: Product) {
  if (!shop.value?.isOpen || submitting.value) return;
  items.value.push({ productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock });
  saveCart(shopId.value, items.value);
}
function clearCart() {
  if (submitting.value) return;
  uni.showModal({
    title: "清空购物车", content: "确定移除全部商品吗？", confirmColor: "#ad477a",
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

function orderSignature(cartItems: CartItem[]) {
  return JSON.stringify(
    cartItems.map((item) => [item.productId, item.quantity, item.price]),
  );
}

function goMenu() {
  uni.navigateBack({
    delta: 1,
    fail: () => uni.switchTab({ url: "/pages/home/index" }),
  });
}

async function load() {
  if (!shopId.value) {
    loading.value = false;
    error.value = "购物车地址无效";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const result = await api.shop(shopId.value);
    if (!result) throw new Error("店铺不存在或已下线");
    shop.value = result;
    items.value = reconcileCart(loadCart(shopId.value), result.products);
    saveCart(shopId.value, items.value);
  } catch (reason: unknown) {
    error.value = getErrorMessage(reason, "购物车加载失败，请稍后重试");
  } finally {
    loading.value = false;
  }
}

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
      if (confirm) uni.switchTab({ url: "/pages/profile/index" });
    },
  });
}

async function submit() {
  if (submitting.value) return;
  if (!items.value.length) {
    uni.showToast({ title: "购物车是空的", icon: "none" });
    return;
  }
  if (!api.isRole("STUDENT")) {
    requestStudentLogin();
    return;
  }

  submitting.value = true;
  try {
    let idempotencyKey = findCheckoutAttempt(
      shopId.value,
      items.value,
      remark.value,
    );
    if (!idempotencyKey) {
      const latestShop = await api.shop(shopId.value);
      if (!latestShop?.isOpen) throw new Error("店铺当前未营业");

      const previousSignature = orderSignature(items.value);
      const latestItems = reconcileCart(items.value, latestShop.products);
      items.value = latestItems;
      shop.value = latestShop;
      saveCart(shopId.value, latestItems);
      if (!latestItems.length) throw new Error("所选菜品已售罄或下架");
      if (previousSignature !== orderSignature(latestItems)) {
        uni.showToast({ title: "菜品信息已更新，请确认后重试", icon: "none" });
        return;
      }
      idempotencyKey = getCheckoutAttempt(
        shopId.value,
        items.value,
        remark.value,
      );
    }
    const order = await api.createOrder({
      shopId: shopId.value,
      items: items.value.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        expectedPrice: item.price,
      })),
      remark: remark.value,
      idempotencyKey,
    });
    saveCart(shopId.value, []);
    clearCheckoutAttempt(shopId.value);
    clearCheckoutRemark(shopId.value);
    items.value = [];
    remark.value = "";
    setStage(false);
    uni.showModal({
      title: "下单成功",
      content: `订单 ${order.number} 已提交，可在订单页查看进度。`,
      confirmText: "查看订单",
      cancelText: "留在当前页",
      success: ({ confirm }) => {
        if (confirm) uni.switchTab({ url: "/pages/orders/index" });
      },
    });
  } catch (reason: unknown) {
    if (!(reason instanceof ApiError && reason.statusCode === 401)) {
      uni.showToast({
        title: getErrorMessage(reason, "下单失败，请稍后重试"),
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
  <view class="app-page with-dock">
    <PageHeading :title="confirming ? '确认订单' : '购物车'" :eyebrow="shop?.name || '食巷'" :meta="items.length ? `共 ${itemCount} 份商品` : ''">
      <IconButton v-if="confirming" name="edit" label="修改购物车" variant="secondary" :disabled="submitting" @click="setStage(false)" />
      <IconButton v-else-if="items.length" name="close" label="清空购物车" variant="danger" :disabled="submitting" @click="clearCart" />
    </PageHeading>
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load" />
    <template v-if="!loading && !error">
      <StateView :empty="items.length === 0" empty-text="购物车还是空的" action-text="返回点餐" @action="goMenu" />
      <template v-if="items.length">
        <view class="checkout-stages">
          <view :class="['stage', { current: !confirming }]"><text class="stage-number">01</text><text>购物车</text></view>
          <view class="stage-divider" />
          <view :class="['stage', { current: confirming }]"><text class="stage-number">02</text><text>确认订单</text></view>
        </view>
        <view v-if="!confirming" class="cart-content motion-enter">
          <view class="surface items-surface">
            <CartItemRow v-for="item in items" :key="item.productId" :item="item" :image="productImages.get(item.productId)" :disabled="submitting || !shop?.isOpen" @change="changeQuantity(item, $event)" />
          </view>
          <template v-if="suggestions.length && shop?.isOpen">
            <view class="section-row"><text class="section-label">再加一道</text><ReIcon name="restaurant" color="danger" :size="19" /></view>
            <view class="suggestion-list"><view v-for="product in suggestions" :key="product.id" class="suggestion-column motion-item"><ProductSuggestion :product="product" @add="addSuggestion(product)" /></view></view>
          </template>
        </view>
        <view v-else class="confirmation-content motion-enter">
          <view v-if="shop" class="surface pickup-section">
            <view class="pickup-method"><ReIcon name="bag" color="brand" :size="21" /><text>到店自取</text><ReIcon name="check" color="brand" :size="18" /></view>
            <view class="pickup-shop"><FoodImage :src="shop.products.find((product) => product.image)?.image" :size="54" icon="store" /><view class="pickup-shop-main"><text class="shop-name">{{ shop.name }}</text><BusinessStatus :open="shop.isOpen" /></view></view>
          </view>
          <view class="section-row"><text class="section-label">商品明细</text><text class="section-meta">{{ itemCount }} 份</text></view>
          <view class="surface items-surface">
            <CartItemRow v-for="item in items" :key="item.productId" :item="item" :image="productImages.get(item.productId)" readonly />
            <view class="order-total"><text>合计</text><text>{{ formatMoney(total) }}</text></view>
          </view>
          <view class="form-section">
            <text class="form-label">订单备注</text>
            <textarea :value="remark" class="form-input remark" :disabled="submitting" :maxlength="200" placeholder="口味偏好、取餐要求（选填）" aria-label="订单备注" @input="updateRemark" />
            <view class="character-count">{{ remark.length }}/200</view>
          </view>
        </view>
      </template>
    </template>
    <CheckoutBar v-if="!loading && !error && items.length" :count="itemCount" :total="total" :name="confirming ? 'check' : 'arrow-right'" :label="confirming ? '提交订单' : '确认商品'" :loading="submitting" :disabled="submitting || !shop?.isOpen" @action="confirming ? submit() : setStage(true)" />
  </view>
</template>

<style scoped>
.checkout-stages { display: flex; align-items: center; gap: 14px; margin: 2px 0 22px; }
.stage { display: flex; flex: none; align-items: center; gap: 7px; color: var(--color-text-secondary); font-size: 11px; transition: color var(--motion-normal); }
.stage-number { display: flex; width: 25px; height: 25px; align-items: center; justify-content: center; border: 1px solid var(--color-border); border-radius: 50%; color: var(--color-text-secondary); font-size: 10px; }
.stage.current { color: var(--color-brand); font-weight: 700; }
.current .stage-number { border-color: var(--color-brand); background: var(--color-brand); color: var(--color-surface); }
.stage-divider { height: 1px; min-width: 10px; flex: 1; background: var(--color-border); }
.items-surface { padding: 0 18px; }
.suggestion-list { display: flex; align-items: stretch; gap: 12px; }
.suggestion-column { min-width: 0; flex: 1; }
.pickup-section { padding: 18px; }
.pickup-method { display: flex; align-items: center; gap: 9px; color: var(--color-brand); font-size: 14px; font-weight: 700; }
.pickup-method text { min-width: 0; flex: 1; }
.pickup-shop { display: flex; align-items: center; gap: 13px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.pickup-shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7px; }
.shop-name { color: var(--color-text); font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
.order-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 0; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 12px; }
.order-total text:last-child { color: var(--color-accent); font-size: 20px; font-weight: 750; }
.remark { height: 112px; }
@media (prefers-reduced-motion: reduce) { .stage { transition: none; } }
</style>
