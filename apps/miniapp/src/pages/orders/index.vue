<script setup lang="ts">
import { ref } from "vue";
import { onHide, onShow, onUnload } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { ApiError, api, getErrorMessage } from "../../services/api";
import type { Order, OrderStatus } from "../../types";

const STATUS_TEXT: Record<OrderStatus, string> = {
  CREATED: "待接单",
  ACCEPTED: "制作中",
  READY: "待取餐",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

const orders = ref<Order[]>([]);
const loading = ref(false);
const error = ref("");
const needsStudentLogin = ref(false);
const cancellingId = ref("");
let pollTimer: ReturnType<typeof setInterval> | undefined;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = undefined;
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    if (!loading.value && orders.value.some((order) =>
      ["CREATED", "ACCEPTED", "READY"].includes(order.status),
    )) void load();
  }, 10_000);
}

function openDetail(order: Order) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}` });
}

function goLogin() {
  uni.switchTab({ url: "/pages/profile/index" });
}

function goBrowse() {
  uni.switchTab({ url: "/pages/home/index" });
}

async function load() {
  error.value = "";
  needsStudentLogin.value = false;
  if (!api.isRole("STUDENT")) {
    loading.value = false;
    orders.value = [];
    needsStudentLogin.value = true;
    error.value = api.token
      ? "当前账号不是学生身份，请切换账号后查看"
      : "登录学生账号后即可查看订单";
    return;
  }

  loading.value = true;
  try {
    orders.value = await api.orders();
  } catch (reason: unknown) {
    orders.value = [];
    if (reason instanceof ApiError && reason.statusCode === 401) {
      needsStudentLogin.value = true;
      error.value = "登录已过期，请重新登录";
    } else {
      error.value = getErrorMessage(reason, "订单加载失败，请稍后重试");
    }
  } finally {
    loading.value = false;
  }
}

function requestCancel(order: Order) {
  uni.showModal({
    title: "取消订单",
    content: "确定取消这笔订单吗？",
    confirmText: "确认取消",
    confirmColor: "#b23b34",
    success: ({ confirm }) => {
      if (confirm) void cancel(order);
    },
  });
}

async function cancel(order: Order) {
  if (cancellingId.value) return;
  cancellingId.value = order.id;
  try {
    const updated = await api.cancelOrder(order.id);
    const index = orders.value.findIndex((item) => item.id === order.id);
    if (index >= 0) orders.value.splice(index, 1, updated);
    uni.showToast({ title: "订单已取消" });
  } catch (reason: unknown) {
    uni.showToast({
      title: getErrorMessage(reason, "取消失败，请稍后重试"),
      icon: "none",
    });
  } finally {
    cancellingId.value = "";
  }
}

onShow(() => {
  void load();
  startPolling();
});
onHide(stopPolling);
onUnload(stopPolling);
</script>

<template>
  <view class="page">
    <view class="page-head">
      <view class="head-row">
        <view class="title">我的订单</view>
        <button
          class="refresh"
          :disabled="loading"
          @click="load"
        >
          刷新状态
        </button>
      </view>
      <view class="subtitle">打开订单页时刷新状态</view>
    </view>

    <StateView :loading="loading" />
    <StateView
      v-if="!loading && error"
      :error="error"
      :action-text="needsStudentLogin ? '去登录' : '重新加载'"
      @action="needsStudentLogin ? goLogin() : load()"
    />
    <StateView
      v-else-if="!loading && !error"
      :empty="orders.length === 0"
      empty-text="还没有订单"
      action-text="去点餐"
      @action="goBrowse"
    />

    <view
      v-for="order in orders"
      v-show="!loading && !error"
      :key="order.id"
      class="order"
      @click="openDetail(order)"
    >
      <view class="order-top">
        <view>
          <view class="shop-name">{{ order.shop.name }}</view>
          <view class="order-number">#{{ order.number.slice(-6) }}</view>
        </view>
        <text class="status">{{ STATUS_TEXT[order.status] || order.status }}</text>
      </view>
      <view class="items">
        {{ order.items.map((item) => `${item.name} × ${item.quantity}`).join("、") }}
      </view>
      <view class="order-foot">
        <text class="total">{{ api.money(order.total) }}</text>
        <text
          v-if="order.status === 'CREATED'"
          class="cancel-action"
          role="button"
          @click.stop="requestCancel(order)"
        >
          {{ cancellingId === order.id ? "取消中…" : "取消订单" }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 38rpx 32rpx 48rpx;
}

.page-head {
  padding: 12rpx 4rpx 24rpx;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.refresh {
  flex: none;
  margin: 0;
  padding: 0 14rpx;
  background: transparent;
  color: var(--color-brand-strong);
  font-size: 23rpx;
}

.title {
  font-size: 42rpx;
  font-weight: 800;
}

.subtitle {
  margin-top: 8rpx;
  color: #81766e;
  font-size: 23rpx;
}

.order {
  margin-top: 20rpx;
  padding: 26rpx;
  border: 1rpx solid #eee3da;
  border-radius: 22rpx;
  background: #fff;
}

.order-top,
.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shop-name {
  font-size: 29rpx;
  font-weight: 700;
}

.order-number {
  margin-top: 6rpx;
  color: #887e77;
  font-size: 20rpx;
}

.status {
  color: var(--color-brand-strong);
  font-size: 24rpx;
  font-weight: 700;
}

.items {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eee5de;
  color: #655c56;
  font-size: 24rpx;
  line-height: 1.6;
}

.order-foot {
  padding-top: 20rpx;
}

.total {
  color: var(--color-brand-strong);
  font-size: 29rpx;
  font-weight: 700;
}

.cancel-action {
  color: #8e342f;
  font-size: 23rpx;
  font-weight: 700;
}
</style>
