<script setup lang="ts">
import CheckoutBar from "../../components/CheckoutBar.vue";
import { formatMoney } from "../../utils/format";
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import QuantityStepper from "../../components/QuantityStepper.vue";
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
import type { CartItem, Shop } from "../../types";

type MiniappTextareaEvent = Event & { detail?: { value?: unknown } };

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
            <view class="item-price">{{ formatMoney(item.price * item.quantity) }}</view>
          </view>
          <QuantityStepper
            :value="item.quantity"
            :max="Math.min(item.stock, 99)"
            :disabled="submitting || !shop?.isOpen"
            @change="changeQuantity(item, $event)"
          />
        </view>

        <textarea
          :value="remark"
          class="remark"
          :disabled="submitting"
          :maxlength="200"
          placeholder="备注口味或取餐要求（选填）"
          @input="updateRemark"
        />
        <view class="remark-count">{{ remark.length }}/200</view>
      </view>

      <CheckoutBar
        v-if="items.length"
        :count="items.reduce((sum, item) => sum + item.quantity, 0)"
        :total="total"
        name="check"
        label="确认下单"
        :loading="submitting"
        :disabled="submitting || !shop?.isOpen"
        @action="submit"
      />
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 30rpx 32rpx calc(var(--fixed-action-clearance) + env(safe-area-inset-bottom));
}

.pickup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-left: 7rpx solid var(--color-brand);
  background: #fff0e5;
}

.pickup > view {
  min-width: 0;
  flex: 1;
  margin-right: 16rpx;
}

.pickup-title {
  color: var(--color-brand-strong);
  font-size: 14px;
  font-weight: 700;
}

.shop-name {
  overflow-wrap: anywhere;
  margin-top: 7rpx;
  color: #655a53;
  font-size: 11px;
}

.status {
  flex: none;
  color: #3f6f78;
  font-size: 11px;
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
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-price {
  margin-top: 8rpx;
  color: var(--color-brand-strong);
  font-size: 12px;
}

.remark {
  box-sizing: border-box;
  width: 100%;
  height: 150rpx;
  margin-top: 24rpx;
  padding: 20rpx;
  border: 1rpx solid #e5d8ce;
  border-radius: var(--radius-control);
  background: #fffaf6;
  font-size: 12.5px;
}

.remark-count {
  margin-top: 8rpx;
  color: #8d837c;
  font-size: 10px;
  text-align: right;
}

</style>
