<script setup lang="ts">
import { computed, ref } from "vue";
import PageHeading from "../../components/PageHeading.vue";
import FilterTabs from "../../components/FilterTabs.vue";
import { usePullRefresh } from "../../composables/useRefresh";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import MerchantOrderCard from "../../components/MerchantOrderCard.vue";
import { usePagePolling } from "../../composables/usePagePolling";
import { ApiError, api, getErrorMessage } from "../../services/api";
import { NEXT_STATUS } from "../../utils/order";
import type { Order } from "../../types";

const orders = ref<Order[]>([]);
const now = ref(Date.now());
let fetching = false;
const loading = ref(false);
const error = ref("");
const needsLogin = ref(false);
const updatingId = ref("");
const active = ref("ALL");
const tabs = [
  { name: "ALL", title: "全部" }, { name: "CREATED", title: "待接单" },
  { name: "ACCEPTED", title: "制作中" }, { name: "READY", title: "待取餐" },
  { name: "COMPLETED", title: "已完成" }, { name: "CANCELLED", title: "已取消" },
];
const filteredOrders = computed(() => active.value === "ALL" ? orders.value : orders.value.filter((order) => order.status === active.value));

function goLogin() { uni.navigateTo({ url: "/pages/profile/login" }); }
function openOrder(order: Order) { uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}&merchant=1` }); }

async function load(silent = false, interactive = false) {
  if (fetching) return;
  if (!api.isRole("MERCHANT")) {
    needsLogin.value = true;
    orders.value = [];
    error.value = "请先登录商户账号";
    return;
  }
  fetching = true;
  if (!silent) loading.value = true;
  try {
    orders.value = await api.merchantOrders();
    now.value = Date.now();
    error.value = "";
    needsLogin.value = false;
  } catch (reason: unknown) {
    if (reason instanceof ApiError && (reason.statusCode === 401 || reason.statusCode === 403)) {
      needsLogin.value = true;
      error.value = "商户身份无效，请重新登录";
    } else if (silent && interactive) uni.showToast({ title: getErrorMessage(reason, "刷新失败，请稍后再试"), icon: "none" });
    else if (!silent) error.value = getErrorMessage(reason, "订单加载失败");
  } finally { loading.value = false; fetching = false; }
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
  uni.showModal({ title: "拒绝订单", content: "确定取消这笔订单吗？", success: ({ confirm }) => { if (confirm) void transition(order, true); } });
}

usePagePolling(() => { if (!loading.value && !updatingId.value && api.isRole("MERCHANT")) void load(true); }, { interval: 15_000, onPageShow: () => load() });
usePullRefresh(() => load(orders.value.length > 0, true));
</script>

<template>
  <view class="app-page merchant-page">
    <PageHeading title="订单管理" eyebrow="商户中心" :meta="!loading && !error ? `共 ${orders.length} 笔订单` : ''"></PageHeading>
    <FilterTabs v-model="active" :items="tabs" label="商户订单状态" />
    <view class="content">
      <StateView :loading="loading" skeleton="card" />
      <StateView v-if="!loading && error" :error="error" :action-text="needsLogin ? '去登录' : '重新加载'" @action="needsLogin ? goLogin() : load()" />
      <template v-if="!loading && !error">
        <view class="list-caption">{{ tabs.find((tab) => tab.name === active)?.title }} · {{ filteredOrders.length }} 笔</view>
        <StateView :empty="filteredOrders.length === 0" empty-text="暂无订单" />
        <view :key="active"><view v-for="(order, index) in filteredOrders" :key="order.id" class="motion-item" :style="{ animationDelay: Math.min(index, 6) * 40 + 'ms' }"><MerchantOrderCard :order="order" :now="now" :busy="updatingId === order.id" :disabled="Boolean(updatingId)" @open="openOrder(order)" @advance="transition(order)" @cancel="requestCancel(order)" /></view></view>
      </template>
    </view>
  </view>
  <MerchantNav active="orders" />
</template>

<style scoped>
.content { padding-top: 6rpx; }
</style>
