<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import QuantityStepper from "../../components/QuantityStepper.vue";
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

      <view v-for="product in products" :key="product.id" class="product">
        <image
          v-if="product.image"
          class="picture"
          :src="product.image"
          mode="aspectFill"
        />
        <view v-else class="picture placeholder">餐</view>
        <view class="info">
          <view class="product-name">{{ product.name }}</view>
          <view class="description">{{ product.description || "新鲜现做" }}</view>
          <view class="price-row">
            <text class="price">{{ api.money(product.price) }}</text>
            <text class="stock">剩余 {{ product.stock }}</text>
          </view>
        </view>
        <QuantityStepper
          v-if="quantity(product.id) > 0"
          :value="quantity(product.id)"
          :max="Math.min(product.stock, 99)"
          :disabled="!shop.isOpen"
          @change="changeQuantity(product, $event)"
        />
        <button
          v-else
          class="add-button"
          :disabled="!shop.isOpen || product.stock < 1"
          aria-label="加入购物车"
          @click="changeQuantity(product, 1)"
        >
          ＋
        </button>
      </view>

      <view v-if="cart.length && shop.isOpen" class="cart-bar">
        <view>
          <text class="cart-count">{{ itemCount }} 份</text>
          <text class="separator">·</text>
          <text>{{ api.money(total) }}</text>
        </view>
        <button class="checkout" @click="goCart">去结算</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 30rpx 32rpx 180rpx;
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
  font-size: 44rpx;
}

.head-main {
  min-width: 0;
  flex: 1;
  margin-left: 22rpx;
}

.name {
  font-size: 38rpx;
  font-weight: 800;
}

.notice {
  overflow: hidden;
  margin-top: 9rpx;
  color: #776c64;
  font-size: 23rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shop-status {
  margin-left: 18rpx;
  padding: 6rpx 10rpx;
  border-radius: 8rpx;
  background: #e4f3e8;
  color: #28794a;
  font-size: 20rpx;
}

.shop-status.closed {
  background: #eee8e3;
  color: #746a63;
}

.tabs {
  box-sizing: border-box;
  width: 100%;
  margin: 6rpx 0 20rpx;
  white-space: nowrap;
}

.tab {
  display: inline-block;
  margin-right: 34rpx;
  padding: 12rpx 0;
  border-bottom: 5rpx solid transparent;
  color: #756b64;
  font-size: 27rpx;
}

.tab.active {
  border-bottom-color: #c4532b;
  color: #a43e1d;
  font-weight: 700;
}

.product {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #eadfd6;
}

.picture {
  width: 132rpx;
  height: 132rpx;
  border-radius: 20rpx;
}

.placeholder {
  background: #fff0e5;
  color: #bd6845;
  font-size: 36rpx;
}

.info {
  min-width: 0;
  flex: 1;
  margin: 0 20rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: 700;
}

.description {
  overflow: hidden;
  margin: 10rpx 0;
  color: #7f756e;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.price {
  color: #b84320;
  font-size: 29rpx;
  font-weight: 700;
}

.stock {
  color: #887e77;
  font-size: 20rpx;
}

.add-button {
  width: 58rpx;
  height: 58rpx;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: #c4532b;
  color: #fff;
  font-size: 34rpx;
  line-height: 54rpx;
}

.add-button[disabled] {
  background: #e8dfd7;
  color: #a79d96;
  opacity: 1;
}

.cart-bar {
  position: fixed;
  right: 28rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 28rpx;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 14rpx 12rpx 30rpx;
  border-radius: 22rpx;
  background: #2d2824;
  color: #fff;
}

.cart-count {
  color: #ffb08d;
  font-weight: 700;
}

.separator {
  margin: 0 10rpx;
  color: #bfb4ad;
}

.checkout {
  height: 70rpx;
  margin: 0;
  padding: 0 32rpx;
  background: #d65d30;
  color: #fff;
  font-size: 26rpx;
  line-height: 70rpx;
}
</style>
