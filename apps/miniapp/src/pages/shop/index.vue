<script setup lang="ts">
import FoodImage from "../../components/FoodImage.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import CategoryRail from "../../components/CategoryRail.vue";
import ReIcon from "../../components/ReIcon.vue";
import CheckoutBar from "../../components/CheckoutBar.vue";
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import ProductRow from "../../components/ProductRow.vue";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import { loadCart, reconcileCart, saveCart } from "../../services/cart";
import type { CartItem, Product, Shop } from "../../types";

const shop = ref<Shop | null>(null);
const selectedCategory = ref("");
const cart = ref<CartItem[]>([]);
const shopId = ref("");
const loading = ref(true);
const error = ref("");

const cover = computed(() => shop.value?.products.find((product) => product.image)?.image);
const categoryName = computed(() => shop.value?.categories.find((category) => category.id === selectedCategory.value)?.name || "全部菜品");
const products = computed(() =>
  (shop.value?.products || []).filter(
    (product) =>
      product.isAvailable &&
      (!selectedCategory.value || product.categoryId === selectedCategory.value),
  ),
);
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

async function load() {
  if (!shopId.value) {
    loading.value = false;
    error.value = "店铺地址无效";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const result = await api.shop(shopId.value);
    if (!result) throw new Error("店铺不存在或已下线");
    shop.value = result;
    if (
      selectedCategory.value &&
      !result.categories.some((category) => category.id === selectedCategory.value)
    ) {
      selectedCategory.value = "";
    }
    syncCart();
  } catch (reason: unknown) {
    shop.value = null;
    error.value = getErrorMessage(reason, "店铺加载失败，请稍后重试");
  } finally {
    loading.value = false;
  }
}

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
  <view class="app-page with-dock shop-page">
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load" />
    <template v-if="shop && !loading && !error">
      <view class="shop-header motion-enter">
        <view class="shop-identity">
          <FoodImage :src="cover" :size="80" icon="store" />
          <view class="shop-main"><BusinessStatus :open="shop.isOpen" /><text class="shop-title">{{ shop.name }}</text><view class="shop-meta"><ReIcon name="bag" color="secondary" :size="13" /><text>到店自取</text><text>· {{ shop.products.filter((product) => product.isAvailable).length }} 道菜品</text></view></view>
        </view>
        <view v-if="shop.notice" class="shop-notice"><ReIcon name="chat" color="brand" :size="16" /><text>{{ shop.notice }}</text></view>
      </view>
      <view v-if="!shop.isOpen" class="closed-banner motion-enter"><ReIcon name="clock" color="secondary" :size="18" /><text>店铺休息中，暂时无法加购</text></view>
      <view class="menu-heading"><text class="menu-label">点餐</text><text class="menu-note">菜单</text></view>
      <view class="menu-layout">
        <CategoryRail v-model="selectedCategory" :categories="shop.categories" />
        <view :key="selectedCategory" class="menu-content">
          <view class="category-heading"><text>{{ categoryName }}</text><text class="category-count">{{ products.length }}</text></view>
          <StateView :empty="products.length === 0" empty-text="该分类暂无可售菜品" />
          <view v-for="(product, index) in products" :key="product.id" class="motion-item" :style="{ animationDelay: Math.min(index, 6) * 40 + 'ms' }"><ProductRow :product="product" :quantity="quantity(product.id)" :disabled="!shop.isOpen" @change="changeQuantity(product, $event)" /></view>
        </view>
      </view>
    </template>
    <CheckoutBar v-if="shop && !loading && !error && cart.length && shop.isOpen" :count="itemCount" :total="total" label="查看购物车" @action="goCart" />
  </view>
</template>

<style scoped>
.shop-page { padding: 10px 0 calc(var(--fixed-action-clearance) + env(safe-area-inset-bottom)); }
.shop-header { padding: 20px; background: var(--color-surface); }
.shop-identity { display: flex; align-items: center; gap: 16px; }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7px; }
.shop-title { color: var(--color-text); font-size: 22px; font-weight: 750; line-height: 1.35; overflow-wrap: anywhere; }
.shop-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; color: var(--color-text-secondary); font-size: 10px; }
.shop-notice { display: flex; align-items: flex-start; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.shop-notice text { min-width: 0; flex: 1; }
.closed-banner { display: flex; align-items: center; gap: 9px; margin: 14px 20px 0; padding: 13px; border-radius: 12px; background: var(--color-input); color: var(--color-text-secondary); font-size: 12px; }
.menu-heading { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.menu-label { padding-bottom: 8px; border-bottom: 3px solid var(--color-brand); color: var(--color-brand); font-size: 15px; font-weight: 750; }
.menu-note { color: var(--color-text-secondary); font-size: 10px; letter-spacing: 3px; }
.menu-layout { display: flex; align-items: stretch; }
.menu-content { min-width: 0; min-height: 400px; box-sizing: border-box; flex: 1; padding: 0 14px 18px; background: var(--color-surface); }
.category-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 19px 0 3px; color: var(--color-text); font-size: 13px; font-weight: 650; }
.category-count { color: var(--color-text-secondary); font-size: 10px; font-weight: 400; }
@media (max-width: 350px) { .menu-content { padding-right: 11px; padding-left: 11px; } }
</style>
