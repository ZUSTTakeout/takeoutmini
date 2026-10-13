<script setup lang="ts">
import { computed, ref } from "vue";
import IconButton from "../../components/IconButton.vue";
import ReIcon from "../../components/ReIcon.vue";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import MerchantOrderCard from "../../components/MerchantOrderCard.vue";
import { usePagePolling } from "../../composables/usePagePolling";
import { ApiError, api, getErrorMessage } from "../../services/api";
import { nativeDetail } from "../../utils/events";
import { formatMoney } from "../../utils/format";
import { ACTIVE_STATUSES, NEXT_STATUS } from "../../utils/order";
import type { MerchantStats, Order, Shop } from "../../types";

const shop = ref<Shop | null>(null);
const orders = ref<Order[]>([]);
const stats = ref<MerchantStats>({ completedOrders: 0, revenue: 0, productCount: 0 });
const loading = ref(false);
const error = ref("");
const needsMerchantLogin = ref(false);
const toggling = ref(false);
const updatingOrderId = ref("");
let knownOrderIds: Set<string> | undefined;
const pendingOrders = computed(() => orders.value.filter((order) => ACTIVE_STATUSES.includes(order.status)));
const createdCount = computed(() => orders.value.filter((order) => order.status === "CREATED").length);
const previewOrders = computed(() => pendingOrders.value.slice(0, 3));

function goLogin() { uni.switchTab({ url: "/pages/profile/index" }); }
function openPage(page: string) { uni.navigateTo({ url: `/pages/merchant/${page}` }); }
function openOrder(order: Order) { uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}&merchant=1` }); }

async function load() {
  error.value = "";
  needsMerchantLogin.value = false;
  if (!api.isRole("MERCHANT")) {
    loading.value = false;
    shop.value = null;
    orders.value = [];
    needsMerchantLogin.value = true;
    error.value = api.token ? "当前账号不是商户身份，请切换账号后进入" : "请先登录商户账号";
    return;
  }
  loading.value = true;
  try {
    const [shopResult, orderResult, statsResult] = await Promise.all([api.merchantShop(), api.merchantOrders(), api.merchantStats()]);
    shop.value = shopResult;
    orders.value = orderResult;
    stats.value = statsResult;
    knownOrderIds = new Set(orderResult.map((order) => order.id));
  } catch (reason: unknown) {
    if (reason instanceof ApiError && (reason.statusCode === 401 || reason.statusCode === 403)) {
      needsMerchantLogin.value = true;
      error.value = "商户身份无效，请重新登录";
    } else error.value = getErrorMessage(reason, "工作台加载失败，请稍后重试");
  } finally { loading.value = false; }
}

async function toggle(event: unknown) {
  if (!shop.value || toggling.value) return;
  const isOpen = Boolean(nativeDetail<boolean>(event));
  toggling.value = true;
  try {
    shop.value = await api.updateShop({ isOpen });
    uni.showToast({ title: isOpen ? "店铺已营业" : "店铺已休息" });
  } catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "营业状态更新失败"), icon: "none" }); }
  finally { toggling.value = false; }
}

async function transition(order: Order, cancel = false) {
  const status = cancel ? "CANCELLED" : NEXT_STATUS[order.status];
  if (!status || updatingOrderId.value) return;
  updatingOrderId.value = order.id;
  try { await api.merchantStatus(order.id, status); await load(); }
  catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "订单状态更新失败"), icon: "none" }); }
  finally { updatingOrderId.value = ""; }
}

function requestCancel(order: Order) {
  if (updatingOrderId.value) return;
  uni.showModal({ title: "拒绝订单", content: "确定取消这笔订单吗？", confirmColor: "#b23b34", success: ({ confirm }) => { if (confirm) void transition(order, true); } });
}

async function pollOrders() {
  if (loading.value || !api.isRole("MERCHANT")) return;
  try {
    const latest = await api.merchantOrders();
    const knownIds = knownOrderIds;
    const hasNewOrder = Boolean(knownIds && latest.some((order) => order.status === "CREATED" && !knownIds.has(order.id)));
    orders.value = latest;
    knownOrderIds = new Set(latest.map((order) => order.id));
    if (hasNewOrder) { uni.vibrateShort({ type: "medium" }); uni.showToast({ title: "收到新订单", icon: "none" }); }
  } catch { /* 保留最近一次成功加载的订单。 */ }
}
usePagePolling(pollOrders, { onPageShow: load });
</script>

<template>
  <view class="page">
    <view class="page-heading"><view class="heading-main"><text class="eyebrow">食巷 · 商户中心</text><text class="heading">经营工作台</text></view><IconButton name="refresh" label="刷新工作台" :loading="loading" @click="load" /></view>
    <StateView :loading="loading" />
    <StateView v-if="!loading && error" :error="error" :action-text="needsMerchantLogin ? '去登录' : '重新加载'" @action="needsMerchantLogin ? goLogin() : load()" />
    <template v-if="shop && !loading && !error">
      <view class="shop-strip"><view class="shop-mark"><ReIcon name="store" color="brand" :size="30" /></view><view class="shop-main"><text class="shop-name">{{ shop.name }}</text><text class="shop-state">{{ shop.isOpen ? '营业中' : '休息中' }}</text></view><van-switch :checked="shop.isOpen" :loading="toggling" active-color="#c4532b" inactive-color="#dfd9d2" size="24px" @change="toggle" /></view>
      <view class="stats"><view class="stat"><text class="stat-label">已完成订单</text><text class="stat-number">{{ stats.completedOrders }}</text></view><view class="stat"><text class="stat-label">累计营业额</text><text class="stat-number revenue">{{ formatMoney(stats.revenue) }}</text></view><view class="stat"><text class="stat-label">待接单</text><text class="stat-number pending">{{ createdCount }}</text></view></view>
      <view class="quick-nav"><view class="quick-item" role="button" @click="openPage('products')"><view class="quick-icon orange"><ReIcon name="bag" color="brand" :size="26" /></view><text>商品管理</text></view><view class="quick-item" role="button" @click="openPage('orders')"><view class="quick-icon blue"><ReIcon name="orders" color="text" :size="26" /></view><text>订单管理</text></view><view class="quick-item" role="button" @click="openPage('settings')"><view class="quick-icon sand"><ReIcon name="edit" color="brand" :size="26" /></view><text>营业设置</text></view><view class="quick-item" role="button" @click="openPage('profile')"><view class="quick-icon graphite"><ReIcon name="user" color="text" :size="26" /></view><text>店铺信息</text></view></view>
      <van-cell title="店铺公告" :label="shop.notice || '暂无公告'" center clickable custom-style="margin:20rpx 0;border-radius:18rpx;background:#fff;" @click="openPage('settings')"><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell>
      <view class="section-heading"><text class="section-title">待处理订单 <text class="count">{{ pendingOrders.length }}</text></text><IconButton name="arrow-right" label="查看全部订单" @click="openPage('orders')" /></view>
      <StateView :empty="pendingOrders.length === 0" empty-text="暂无待处理订单" />
      <MerchantOrderCard v-for="order in previewOrders" :key="order.id" :order="order" :busy="updatingOrderId === order.id" :disabled="Boolean(updatingOrderId)" @open="openOrder(order)" @advance="transition(order)" @cancel="requestCancel(order)" />
      <view class="product-count"><text>{{ stats.productCount }} 件在售商品</text><ReIcon name="store" color="secondary" :size="14" /></view>
    </template>
  </view>
  <MerchantNav active="home" />
</template>

<style scoped>
.page { padding: 28rpx 30rpx 30rpx; }
.page-heading, .shop-strip, .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.page-heading { padding: 0 2rpx 25rpx; }
.heading-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8rpx; }
.eyebrow { color: #a43e1d; font-size: 10px; font-weight: 650; letter-spacing: 1px; }
.heading { color: #2d2824; font-size: 22px; font-weight: 800; }
.shop-strip { padding: 26rpx 0; border-top: 1rpx solid #e8dfd6; border-bottom: 1rpx solid #e8dfd6; }
.shop-mark { display: flex; width: 55px; height: 55px; flex: none; align-items: center; justify-content: center; border-radius: 18rpx; background: #ffe9d8; }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }
.shop-name { overflow-wrap: anywhere; font-size: 17px; font-weight: 750; line-height: 1.4; }
.shop-state { color: #81766e; font-size: 11px; }
.stats { display: grid; grid-template-columns: 1fr 1.3fr .8fr; margin: 24rpx 0; padding: 28rpx 20rpx; border-radius: 20rpx; background: #2d2824; }
.stat { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 16rpx; }
.stat + .stat { border-left: 1rpx solid #564d46; }
.stat-label { color: #d2c7bc; font-size: 10px; }
.stat-number { max-width: 100%; overflow-wrap: anywhere; color: #fffaf4; font-size: 23px; font-weight: 750; }
.stat-number.revenue { color: #ffbb91; font-size: 19px; }.stat-number.pending { color: #ffbb91; }
.quick-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; padding: 16rpx 0 18rpx; }
.quick-item { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 16rpx; color: #5b5049; font-size: 11px; }
.quick-icon { display: flex; width: 52px; height: 52px; align-items: center; justify-content: center; border-radius: 16rpx; }
.orange { background: #ffe9d8; }.blue { background: #e7eff5; }.sand { background: #f0e9df; }.graphite { background: #e9e5e0; }
.section-heading { margin: 28rpx 0 16rpx; }.section-title { font-size: 16px; font-weight: 750; }
.count { margin-left: 12rpx; color: #a43e1d; font-size: 13px; }
.product-count { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 20rpx; color: #81766e; font-size: 10px; }
</style>
