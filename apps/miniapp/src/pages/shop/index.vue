<script setup lang="ts">
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
  <view class="page">
    <StateView
      :loading="loading"
      :error="error"
      action-text="重新加载"
      @action="load"
    />

    <template v-if="shop && !loading && !error">
      <view class="head">
        <view class="logo">{{ shop.name.slice(0, 1) }}</view>
        <view class="head-main">
          <view class="name">{{ shop.name }}</view>
          <view class="notice">{{ shop.notice || "欢迎光临" }}</view>
        </view>
        <text :class="['shop-status', { closed: !shop.isOpen }]">
          {{ shop.isOpen ? "营业中" : "休息中" }}
        </text>
      </view>

      <view v-if="!shop.isOpen" class="closed-banner">
        <text class="closed-title">店铺休息中，暂时无法加购</text>
        <text class="closed-note">可以先浏览菜单，营业后再下单</text>
      </view>

      <scroll-view v-if="shop.categories.length" scroll-x class="tabs">
        <text
          :class="['tab', { active: selectedCategory === '' }]"
          @click="selectedCategory = ''"
        >
          全部
        </text>
        <text
          v-for="category in shop.categories"
          :key="category.id"
          :class="['tab', { active: selectedCategory === category.id }]"
          @click="selectedCategory = category.id"
        >
          {{ category.name }}
        </text>
      </scroll-view>

      <StateView
        :empty="products.length === 0"
        empty-text="该分类暂无可售菜品"
      />

      <ProductRow
        v-for="product in products"
        :key="product.id"
        :product="product"
        :quantity="quantity(product.id)"
        :disabled="!shop.isOpen"
        @change="changeQuantity(product, $event)"
      />

      <CheckoutBar v-if="cart.length && shop.isOpen" :count="itemCount" :total="total" label="去结算" @action="goCart" />
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 30rpx 32rpx calc(var(--fixed-action-clearance) + env(safe-area-inset-bottom));
}

.head {
  display: flex;
  align-items: center;
  padding: 18rpx 0 34rpx;
}

.logo,
.picture {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  background: #ffe0c9;
  color: #ad431f;
  font-weight: 800;
}

.logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 22rpx;
  font-size: 22px;
}

.head-main {
  min-width: 0;
  flex: 1;
  margin-left: 22rpx;
}

.name {
  overflow-wrap: anywhere;
  font-size: 19px;
  font-weight: 800;
}

.notice {
  overflow: hidden;
  margin-top: 9rpx;
  color: #776c64;
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shop-status {
  flex: none;
  margin-left: 18rpx;
  padding: 6rpx 10rpx;
  border-radius: 8rpx;
  background: #e4f3e8;
  color: #3f6f78;
  font-size: 10px;
}

.shop-status.closed {
  background: #eee8e3;
  color: #746a63;
}

.tabs {
  box-sizing: border-box;
  position: sticky;
  top: 0;
  z-index: 5;
  width: 100%;
  margin: 6rpx -32rpx 20rpx;
  padding: 0 32rpx;
  background: #fffaf4;
  white-space: nowrap;
}

.closed-banner {
  display: flex;
  margin: -14rpx 0 22rpx;
  padding: 18rpx 20rpx;
  flex-direction: column;
  border-left: 6rpx solid #8e837b;
  border-radius: 10rpx;
  background: #f0ece8;
}

.closed-title { color: #554c46; font-size: 11.5px; font-weight: 700; }
.closed-note { margin-top: 5rpx; color: #81766e; font-size: 10px; }

.tab {
  display: inline-block;
  margin-right: 34rpx;
  padding: 12rpx 0;
  border-bottom: 5rpx solid transparent;
  color: #756b64;
  font-size: 13.5px;
}

.tab.active {
  border-bottom-color: var(--color-brand);
  color: var(--color-brand-strong);
  font-weight: 700;
}

</style>
