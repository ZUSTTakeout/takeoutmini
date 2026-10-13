<script setup lang="ts">
import PageHeading from "../../components/PageHeading.vue";
import FilterTabs from "../../components/FilterTabs.vue";
import IconButton from "../../components/IconButton.vue";
import { computed, ref } from "vue";
import OrderSummary from "../../components/OrderSummary.vue";
import StateView from "../../components/StateView.vue";
import { usePagePolling } from "../../composables/usePagePolling";
import { ApiError, api, getErrorMessage } from "../../services/api";
import { ACTIVE_STATUSES } from "../../utils/order";
import type { Order } from "../../types";

const orders = ref<Order[]>([]);
const loading = ref(false);
const error = ref("");
const needsStudentLogin = ref(false);
const cancellingId = ref("");
const activeTab = ref("all");
let fetchingOrders = false;
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

function openDetail(order: Order) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}` });
}

function goLogin() {
  uni.switchTab({ url: "/pages/profile/index" });
}

function goBrowse() {
  uni.switchTab({ url: "/pages/home/index" });
}

async function load(silent = false) {
  if (fetchingOrders) return;
  if (!silent) {
    error.value = "";
    needsStudentLogin.value = false;
  }
  if (!api.isRole("STUDENT")) {
    loading.value = false;
    orders.value = [];
    needsStudentLogin.value = true;
    error.value = api.token
      ? "当前账号不是学生身份，请切换账号后查看"
      : "登录学生账号后即可查看订单";
    return;
  }

  fetchingOrders = true;
  if (!silent) loading.value = true;
  try {
    orders.value = await api.orders();
    error.value = "";
  } catch (reason: unknown) {
    if (reason instanceof ApiError && reason.statusCode === 401) {
      orders.value = [];
      needsStudentLogin.value = true;
      error.value = "登录已过期，请重新登录";
    } else if (!silent) {
      orders.value = [];
      error.value = getErrorMessage(reason, "订单加载失败，请稍后重试");
    }
  } finally {
    fetchingOrders = false;
    if (!silent) loading.value = false;
  }
}

function requestCancel(order: Order) {
  uni.showModal({
    title: "取消订单",
    content: "确定取消这笔订单吗？",
    confirmText: "确认取消",
    confirmColor: "#ad477a",
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
    !loading.value && !cancellingId.value &&
    orders.value.some((order) => ACTIVE_STATUSES.includes(order.status))
  ) void load(true);
}, { onPageShow: () => load() });
</script>

<template>
  <view class="app-page">
    <PageHeading title="我的订单" eyebrow="食巷" :meta="!loading && !error ? `到店自取 · ${orders.length} 笔订单` : '到店自取'"><IconButton name="refresh" label="刷新订单状态" :loading="loading" variant="secondary" @click="load()" /></PageHeading>
    <FilterTabs v-model="activeTab" :items="orderTabs" label="订单状态" />
    <view class="order-content">
      <StateView :loading="loading" />
      <StateView v-if="!loading && error" :error="error" :action-text="needsStudentLogin ? '去登录' : '重新加载'" @action="needsStudentLogin ? goLogin() : load()" />
      <template v-if="!loading && !error">
        <StateView :empty="visibleOrders.length === 0" :empty-text="orders.length ? '这个分类还没有订单' : '还没有订单'" action-text="去点餐" @action="goBrowse" />
        <view :key="activeTab">
          <view v-for="(order, index) in visibleOrders" :key="order.id" class="motion-item" :style="{ animationDelay: Math.min(index, 6) * 40 + 'ms' }"><OrderSummary :order="order" show-shop show-cancel clickable :cancelling="cancellingId === order.id" @open="openDetail(order)" @cancel="requestCancel(order)" /></view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
.order-content { padding-top: 20px; }
</style>
