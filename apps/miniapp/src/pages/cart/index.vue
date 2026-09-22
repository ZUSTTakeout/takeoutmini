<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import QuantityStepper from "../../components/QuantityStepper.vue";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import {
  clearCheckoutAttempt,
  findCheckoutAttempt,
  getCheckoutAttempt,
  loadCart,
  reconcileCart,
  saveCart,
} from "../../services/cart";
import type { CartItem, Shop } from "../../types";

const items = ref<CartItem[]>([]);
const shop = ref<Shop | null>(null);
const shopId = ref("");
const remark = ref("");
const loading = ref(true);
const submitting = ref(false);
const error = ref("");

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
    await api.createOrder({
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
    items.value = [];
    uni.showToast({ title: "下单成功" });
    setTimeout(() => uni.switchTab({ url: "/pages/orders/index" }), 500);
  } catch (reason: unknown) {
    uni.showToast({
      title: getErrorMessage(reason, "下单失败，请稍后重试"),
      icon: "none",
    });
  } finally {
    submitting.value = false;
  }
}

onLoad((query) => {
  shopId.value = typeof query?.shopId === "string" ? query.shopId : "";
  items.value = loadCart(shopId.value);
  void load();
});
</script>

<template>
  <view class="page">
    <StateView
      :loading="loading"
      :error="error"
      action-text="重新加载"
      @action="load"
    />

    <template v-if="!loading && !error">
      <view v-if="shop" class="pickup">
        <view>
          <view class="pickup-title">到店自取</view>
          <view class="shop-name">{{ shop.name }}</view>
        </view>
        <text :class="['status', { closed: !shop.isOpen }]">
          {{ shop.isOpen ? "营业中" : "休息中" }}
        </text>
      </view>

      <StateView
        :empty="items.length === 0"
        empty-text="购物车还是空的"
        action-text="返回点餐"
        @action="goMenu"
      />

      <view v-if="items.length" class="order-list">
        <view v-for="item in items" :key="item.productId" class="item-row">
          <view class="item-main">
            <view class="item-name">{{ item.name }}</view>
            <view class="item-price">{{ api.money(item.price * item.quantity) }}</view>
          </view>
          <QuantityStepper
            :value="item.quantity"
            :max="Math.min(item.stock, 99)"
            :disabled="submitting || !shop?.isOpen"
            @change="changeQuantity(item, $event)"
          />
        </view>

        <textarea
          v-model="remark"
          class="remark"
          :disabled="submitting"
          :maxlength="200"
          placeholder="备注口味或取餐要求（选填）"
        />
      </view>

      <view v-if="items.length" class="bottom-bar">
        <view>
          <text class="total-label">合计</text>
          <text class="total">{{ api.money(total) }}</text>
        </view>
        <button
          class="submit-button"
          :disabled="submitting || !shop?.isOpen"
          @click="submit"
        >
          {{ submitting ? "提交中…" : shop?.isOpen ? "确认下单" : "店铺休息中" }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 30rpx 32rpx 190rpx;
}

.pickup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-left: 7rpx solid #c4532b;
  background: #fff0e5;
}

.pickup-title {
  color: #a43e1d;
  font-size: 28rpx;
  font-weight: 700;
}

.shop-name {
  margin-top: 7rpx;
  color: #655a53;
  font-size: 22rpx;
}

.status {
  color: #28794a;
  font-size: 22rpx;
  font-weight: 700;
}

.status.closed {
  color: #746a63;
}

.order-list {
  margin-top: 22rpx;
  padding: 4rpx 26rpx 26rpx;
  border: 1rpx solid #eee3da;
  border-radius: 22rpx;
  background: #fff;
}

.item-row {
  display: flex;
  align-items: center;
  padding: 25rpx 0;
  border-bottom: 1rpx solid #eee5de;
}

.item-main {
  min-width: 0;
  flex: 1;
  margin-right: 18rpx;
}

.item-name {
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-price {
  margin-top: 8rpx;
  color: #b84320;
  font-size: 24rpx;
}

.remark {
  box-sizing: border-box;
  width: 100%;
  height: 150rpx;
  margin-top: 24rpx;
  padding: 20rpx;
  border: 1rpx solid #e5d8ce;
  border-radius: 12rpx;
  background: #fffaf6;
  font-size: 25rpx;
}

.bottom-bar {
  position: fixed;
  right: 28rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 28rpx;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13rpx 14rpx 13rpx 28rpx;
  border-radius: 22rpx;
  background: #2d2824;
  color: #fff;
}

.total-label {
  margin-right: 10rpx;
  color: #d7cdc6;
  font-size: 22rpx;
}

.total {
  color: #ffb08d;
  font-size: 32rpx;
  font-weight: 700;
}

.submit-button {
  height: 72rpx;
  margin: 0;
  padding: 0 30rpx;
  background: #d65d30;
  color: #fff;
  font-size: 25rpx;
  line-height: 72rpx;
}

.submit-button[disabled] {
  background: #716760;
  color: #d8cec8;
  opacity: 1;
}
</style>
