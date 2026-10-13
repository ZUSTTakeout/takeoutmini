<script setup lang="ts">
import IconButton from "../../components/IconButton.vue";
import { computed, ref } from "vue";
import OrderSummary from "../../components/OrderSummary.vue";
import StateView from "../../components/StateView.vue";
import { usePagePolling } from "../../composables/usePagePolling";
import { ApiError, api, getErrorMessage } from "../../services/api";
import { ACTIVE_STATUSES } from "../../utils/order";
import { nativeDetail } from "../../utils/events";
import type { Order } from "../../types";

const orders = ref<Order[]>([]);
const loading = ref(false);
const error = ref("");
const needsStudentLogin = ref(false);
const cancellingId = ref("");
const activeTab = ref("all");
const orderTabs = [
  { name: "all", title: "全部" },
  { name: "active", title: "进行中" },
  { name: "completed", title: "已完成" },
  { name: "cancelled", title: "已取消" },
];
const visibleOrders = computed(() => orders.value.filter((order) => {
  if (activeTab.value === "active") return ACTIVE_STATUSES.includes(order.status);
  if (activeTab.value === "completed") return order.status === "COMPLETED";
  if (activeTab.value === "cancelled") return order.status === "CANCELLED";
  return true;
}));

function changeTab(event: unknown) {
  const { name } = nativeDetail<{ name: string }>(event);
  if (orderTabs.some((tab) => tab.name === name)) activeTab.value = name;
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

usePagePolling(() => {
  if (
    !loading.value &&
    orders.value.some((order) => ACTIVE_STATUSES.includes(order.status))
  ) void load();
}, { onPageShow: load });
</script>

<template>
  <view class="page">
    <view class="page-head">
      <view class="head-row">
        <view>
          <view class="title">我的订单</view>
          <view class="order-count">到店自取<text v-if="!loading && !error"> · {{ orders.length }} 笔订单</text></view>
        </view>
        <IconButton
          name="refresh"
          label="刷新订单状态"
          :loading="loading"
          @click="load"
        />
      </view>
    </view>
    <van-tabs
      :active="activeTab"
      color="#c4532b"
      title-active-color="#342b25"
      title-inactive-color="#9b8c80"
      :line-width="24"
      :line-height="3"
      @change="changeTab"
    >
      <van-tab v-for="tab in orderTabs" :key="tab.name" :name="tab.name" :title="tab.title" />
    </van-tabs>
    <view class="order-content">
    <StateView :loading="loading" />
    <StateView
      v-if="!loading && error"
      :error="error"
      :action-text="needsStudentLogin ? '去登录' : '重新加载'"
      @action="needsStudentLogin ? goLogin() : load()"
    />
    <StateView
      v-else-if="!loading && !error"
      :empty="visibleOrders.length === 0"
      :empty-text="orders.length ? '这个分类还没有订单' : '还没有订单'"
      action-text="去点餐"
      @action="goBrowse"
    />

    <OrderSummary
      v-for="order in visibleOrders"
      v-show="!loading && !error"
      :key="order.id"
      :order="order"
      show-shop
      show-cancel
      clickable
      :cancelling="cancellingId === order.id"
      @open="openDetail(order)"
      @cancel="requestCancel(order)"
    />
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 23px 20px calc(25px + env(safe-area-inset-bottom));
}

.page-head {
  padding: 5px 0 22px;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title {
  font-size: 26px;
  font-weight: 800;
}
.order-count { margin-top: 7px; color: #9b8c80; font-size: 12px; }
.order-content { padding-top: 20px; }
</style>
