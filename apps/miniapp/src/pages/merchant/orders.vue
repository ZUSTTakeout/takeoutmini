<script setup lang="ts">
import { computed, ref } from "vue";
import IconButton from "../../components/IconButton.vue";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import MerchantOrderCard from "../../components/MerchantOrderCard.vue";
import { usePagePolling } from "../../composables/usePagePolling";
import { ApiError, api, getErrorMessage } from "../../services/api";
import { nativeDetail } from "../../utils/events";
import { NEXT_STATUS } from "../../utils/order";
import type { Order, OrderStatus } from "../../types";

const orders = ref<Order[]>([]);
const loading = ref(false);
const error = ref("");
const needsLogin = ref(false);
const updatingId = ref("");
const active = ref<OrderStatus | "ALL">("ALL");
const tabs = [
  { name: "ALL", label: "全部" }, { name: "CREATED", label: "待接单" },
  { name: "ACCEPTED", label: "制作中" }, { name: "READY", label: "待取餐" },
  { name: "COMPLETED", label: "已完成" }, { name: "CANCELLED", label: "已取消" },
];
const filteredOrders = computed(() => active.value === "ALL" ? orders.value : orders.value.filter((order) => order.status === active.value));

function changeTab(event: unknown) { active.value = nativeDetail<{ name: OrderStatus | "ALL" }>(event).name; }
function goLogin() { uni.switchTab({ url: "/pages/profile/index" }); }
function openOrder(order: Order) { uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}&merchant=1` }); }

async function load(silent = false) {
  if (!api.isRole("MERCHANT")) {
    needsLogin.value = true;
    orders.value = [];
    error.value = "请先登录商户账号";
    return;
  }
  if (!silent) loading.value = true;
  try {
    orders.value = await api.merchantOrders();
    error.value = "";
    needsLogin.value = false;
  } catch (reason: unknown) {
    if (reason instanceof ApiError && (reason.statusCode === 401 || reason.statusCode === 403)) {
      needsLogin.value = true;
      error.value = "商户身份无效，请重新登录";
    } else if (!silent) error.value = getErrorMessage(reason, "订单加载失败");
  } finally { loading.value = false; }
}

async function transition(order: Order, cancel = false) {
  const status = cancel ? "CANCELLED" : NEXT_STATUS[order.status];
  if (!status || updatingId.value) return;
  updatingId.value = order.id;
  try {
    const updated = await api.merchantStatus(order.id, status);
    const index = orders.value.findIndex((item) => item.id === updated.id);
    if (index >= 0) orders.value.splice(index, 1, updated);
    uni.showToast({ title: cancel ? "订单已取消" : "订单状态已更新" });
  } catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "订单状态更新失败"), icon: "none" }); }
  finally { updatingId.value = ""; }
}

function requestCancel(order: Order) {
  if (updatingId.value) return;
  uni.showModal({ title: "拒绝订单", content: "确定取消这笔订单吗？", confirmColor: "#b23b34", success: ({ confirm }) => { if (confirm) void transition(order, true); } });
}

usePagePolling(() => { if (!loading.value && !updatingId.value && api.isRole("MERCHANT")) void load(true); }, { onPageShow: () => load() });
</script>

<template>
  <view class="page">
    <view class="heading"><view class="title-main"><text class="eyebrow">商户中心</text><text class="title">订单管理</text></view><IconButton name="refresh" label="刷新订单" :loading="loading" @click="load()" /></view>
    <van-tabs :active="active" color="#c4532b" title-active-color="#2d2824" title-inactive-color="#81766e" :swipe-threshold="4" :border="false" @change="changeTab"><van-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :title="tab.label" /></van-tabs>
    <view class="content">
      <StateView :loading="loading" />
      <StateView v-if="!loading && error" :error="error" :action-text="needsLogin ? '去登录' : '重新加载'" @action="needsLogin ? goLogin() : load()" />
      <template v-if="!loading && !error"><view class="list-count">{{ tabs.find((tab) => tab.name === active)?.label }} · {{ filteredOrders.length }} 笔</view><StateView :empty="filteredOrders.length === 0" empty-text="暂无订单" /><MerchantOrderCard v-for="order in filteredOrders" :key="order.id" :order="order" :busy="updatingId === order.id" :disabled="Boolean(updatingId)" @open="openOrder(order)" @advance="transition(order)" @cancel="requestCancel(order)" /></template>
    </view>
  </view>
  <MerchantNav active="orders" />
</template>

<style scoped>
.page { padding: 28rpx 0 24rpx; }.heading { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 0 30rpx 26rpx; }
.title-main { display: flex; flex-direction: column; gap: 8rpx; }.eyebrow { color: #a43e1d; font-size: 10px; font-weight: 650; letter-spacing: 1px; }.title { font-size: 22px; font-weight: 800; }
.content { padding: 20rpx 30rpx; }.list-count { margin: 6rpx 4rpx 20rpx; color: #81766e; font-size: 10px; }
</style>
