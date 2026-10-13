<script setup lang="ts">
import PageFrame from "../../components/PageFrame.vue";
import FoodImage from "../../components/FoodImage.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import CategoryRail from "../../components/CategoryRail.vue";
import ReIcon from "../../components/ReIcon.vue";
import CheckoutBar from "../../components/CheckoutBar.vue";
import { computed, nextTick, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import ProductRow from "../../components/ProductRow.vue";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import { loadCart, reconcileCart, saveCart } from "../../services/cart";
import { useScrollRefresh } from "../../composables/useRefresh";
import { nativeDetail } from "../../utils/events";
import type { CartItem, Product, Shop } from "../../types";

const shop = ref<Shop | null>(null);
const selectedCategory = ref("");
const cart = ref<CartItem[]>([]);
const shopId = ref("");
const loading = ref(true);
const error = ref("");

const cover = computed(() => shop.value?.products.find((product) => product.image)?.image);
const scrollTarget = ref("");
const sections = computed(() => {
  if (!shop.value) return [];
  const available = shop.value.products.filter((product) => product.isAvailable);
  const groups = shop.value.categories.map((category) => ({ ...category, products: available.filter((product) => product.categoryId === category.id) }));
  const other = available.filter((product) => !shop.value?.categories.some((category) => category.id === product.categoryId));
  if (other.length) groups.push({ id: "uncategorized", name: "其他", products: other });
  return groups;
});
const signatureId = computed(() => {
  const available = shop.value?.products.filter((product) => product.isAvailable && product.stock > 0) || [];
  return available.reduce<Product | undefined>((chosen, product) => !chosen || product.stock < chosen.stock ? product : chosen, undefined)?.id;
});
let sectionTops: number[] = [];
let scrollPosition = 0;
let selecting = false;
async function selectCategory(id: string) {
  selectedCategory.value = id;
  selecting = true;
  scrollTarget.value = "";
  await nextTick();
  scrollTarget.value = "menu-section-" + sections.value.findIndex((section) => section.id === id);
  setTimeout(() => { selecting = false; }, 400);
}
function trackScroll(event: unknown) {
  scrollPosition = nativeDetail<{ scrollTop: number }>(event).scrollTop;
  if (selecting || !sectionTops.length) return;
  let index = 0;
  sectionTops.forEach((top, i) => { if (top <= scrollPosition + 1) index = i; });
  selectedCategory.value = sections.value[index]?.id || "";
}
async function measureSections() {
  await nextTick();
  const query = uni.createSelectorQuery();
  query.select("#product-scroll").boundingClientRect();
  query.selectAll(".category-section").boundingClientRect();
  query.exec((result) => {
    const container = result[0] as { top: number } | null;
    const rows = result[1] as Array<{ top: number }>;
    if (container && rows?.length) sectionTops = rows.map((row) => row.top - container.top + scrollPosition);
  });
}
const total = computed(() =>
  cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
);
const itemCount = computed(() =>
  cart.value.reduce((sum, item) => sum + item.quantity, 0),
);

function syncCart() {
  if (!shopId.value) return;
  const saved = loadCart(shopId.value);
  cart.value = shop.value ? reconcileCart(saved, shop.value.products) : saved;
  saveCart(shopId.value, cart.value);
}

async function load(silent = false) {
  if (!shopId.value) {
    loading.value = false;
    error.value = "店铺地址无效";
    return;
  }
  if (!silent) { loading.value = true; error.value = ""; }
  try {
    const result = await api.shop(shopId.value);
    if (!result) throw new Error("店铺不存在或已下线");
    shop.value = result;
    if (
      selectedCategory.value &&
      !sections.value.some((category) => category.id === selectedCategory.value)
    ) {
      selectedCategory.value = "";
    }
    if (!selectedCategory.value) selectedCategory.value = sections.value[0]?.id || "";
    if (!silent) scrollPosition = 0;
    syncCart();
    setTimeout(() => void measureSections(), 100);
  } catch (reason: unknown) {
    const message = getErrorMessage(reason, "店铺加载失败，请稍后重试");
    if (silent) uni.showToast({ title: message, icon: "none" });
    else { shop.value = null; error.value = message; }
  } finally {
    if (!silent) loading.value = false;
  }
}
const { refreshing, onRefresh } = useScrollRefresh(() => load(Boolean(shop.value)));

function quantity(productId: string) {
  return cart.value.find((item) => item.productId === productId)?.quantity || 0;
}

function changeQuantity(product: Product, nextQuantity: number) {
  if (!shop.value?.isOpen) {
    uni.showToast({ title: "店铺休息中", icon: "none" });
    return;
  }
  const maximum = Math.min(product.stock, 99);
  if (nextQuantity > maximum) {
    uni.showToast({ title: `最多可选 ${maximum} 份`, icon: "none" });
    return;
  }
  const index = cart.value.findIndex((item) => item.productId === product.id);
  if (nextQuantity < 1) {
    if (index >= 0) cart.value.splice(index, 1);
  } else if (index >= 0) {
    cart.value[index] = {
      ...cart.value[index],
      name: product.name,
      price: product.price,
      stock: product.stock,
      quantity: nextQuantity,
    };
  } else {
    cart.value.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      quantity: nextQuantity,
    });
  }
  saveCart(shopId.value, cart.value);
}

function goCart() {
  if (!cart.value.length) {
    uni.showToast({ title: "请先选择菜品", icon: "none" });
    return;
  }
  uni.navigateTo({
    url: `/pages/cart/index?shopId=${encodeURIComponent(shopId.value)}`,
  });
}

onLoad((query) => {
  shopId.value = typeof query?.id === "string" ? query.id : "";
  syncCart();
  void load();
});

onShow(syncCart);
</script>

<template>
  <PageFrame>
    <template v-if="shop && !loading && !error" #header>
      <view class="shop-header">
        <FoodImage :src="cover" :size="58" />
        <view class="shop-main"><view class="shop-title-row"><text class="shop-title">{{ shop.name }}</text><BusinessStatus :open="shop.isOpen" /></view><text v-if="shop.description" class="shop-description">{{ shop.description }}</text><text class="pickup-note">到店自取</text></view>
      </view>
      <view v-if="shop.notice" class="shop-notice"><ReIcon name="clock" :size="13" /><text>{{ shop.notice }}</text></view>
      <view v-if="!shop.isOpen" class="closed-banner">店铺休息中，暂时无法加购</view>
      <view class="menu-toolbar"><text>菜单</text><text class="section-meta">{{ shop.products.filter((product) => product.isAvailable).length }} 道菜品</text></view>
    </template>
    <scroll-view v-if="loading || error" scroll-y class="state-scroll" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh"><view class="state-wrap"><StateView :loading="loading" :error="error" action-text="重试" @action="load()" /></view></scroll-view>
    <view v-else-if="shop" class="menu-layout">
      <scroll-view scroll-y class="category-scroll"><CategoryRail :model-value="selectedCategory" :categories="sections" @update:model-value="selectCategory" /></scroll-view>
      <scroll-view id="product-scroll" class="menu-content" scroll-y :scroll-into-view="scrollTarget" scroll-with-animation refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scroll="trackScroll">
        <view v-for="(section, index) in sections" :id="'menu-section-' + index" :key="section.id" class="category-section">
          <view class="category-heading"><text>{{ section.name }}</text><text class="section-meta">{{ section.products.length }}</text></view>
          <StateView :empty="section.products.length === 0" empty-text="这个分类暂时没有菜品" />
          <ProductRow v-for="product in section.products" :key="product.id" :product="product" :signature="product.id === signatureId" :quantity="quantity(product.id)" :disabled="!shop.isOpen" @change="changeQuantity(product, $event)" />
        </view>
        <StateView :empty="sections.length === 0" empty-text="店铺还没有上架菜品" />
        <view class="menu-end">已经到底了</view>
      </scroll-view>
    </view>
    <template v-if="shop && !loading && !error && cart.length" #footer><CheckoutBar :count="itemCount" :total="total" label="查看购物车" :disabled="!shop.isOpen" @action="goCart" /></template>
  </PageFrame>
</template>
<style scoped>
.shop-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-1); }
.shop-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.shop-title { min-width: 0; color: var(--color-text); font-size: var(--font-title); font-weight: 700; overflow-wrap: anywhere; }
.shop-description { color: var(--color-text-secondary); font-size: var(--font-caption); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pickup-note { color: var(--color-text-secondary); font-size: var(--font-caption); }
.shop-notice { display: flex; align-items: flex-start; gap: var(--space-1); padding: 0 var(--space-4) var(--space-3); color: var(--color-text-secondary); font-size: var(--font-caption); }
.shop-notice text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.closed-banner { padding: var(--space-2) var(--space-4); background: var(--color-warning-soft); color: var(--color-warning); font-size: var(--font-caption); }
.menu-toolbar { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-4); border-top: 2rpx solid var(--color-border); border-bottom: 2rpx solid var(--color-border); color: var(--color-text); font-size: var(--font-body); font-weight: 600; }
.menu-layout { display: flex; height: 100%; min-height: 0; flex: 1; }
.category-scroll { width: 144rpx; height: 100%; flex: none; background: var(--color-input); }
.menu-content { width: 0; height: 100%; min-width: 0; flex: 1; background: var(--color-surface); }
.category-section { padding: 0 var(--space-3); }
.category-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-3) 0 0; color: var(--color-text); font-size: var(--font-body); font-weight: 600; }
.menu-end { padding: var(--space-4); text-align: center; color: var(--color-text-tertiary); font-size: var(--font-caption); }
.state-scroll { height: 0; flex: 1; }
.state-wrap { padding: 0 var(--space-4); }
</style>
