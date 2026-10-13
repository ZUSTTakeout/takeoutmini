<script setup lang="ts">
import { computed, ref } from "vue";
import PageHeading from "../../components/PageHeading.vue";
import StatsStrip from "../../components/StatsStrip.vue";
import ShortcutGrid from "../../components/ShortcutGrid.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import FoodImage from "../../components/FoodImage.vue";
import { iconColors, type ReIconName } from "../../icons";
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
const metrics = computed(() => [
  { label: "已完成订单", value: stats.value.completedOrders },
  { label: "累计营业额", value: formatMoney(stats.value.revenue), wide: true },
  { label: "待接单", value: createdCount.value, accent: true },
]);
const shortcuts: Array<{ key: string; title: string; icon: ReIconName; tone: "brand" | "success" | "danger" }> = [
  { key: "products", title: "商品管理", icon: "bag", tone: "brand" },
  { key: "orders", title: "订单管理", icon: "orders", tone: "success" },
  { key: "settings", title: "营业设置", icon: "settings", tone: "danger" },
  { key: "profile", title: "店铺信息", icon: "store", tone: "brand" },
];

function goLogin() { uni.switchTab({ url: "/pages/profile/index" }); }
function openPage(page: string) { uni.navigateTo({ url: `/pages/merchant/${page}` }); }
function openOrder(order: Order) { uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}&merchant=1` }); }

async function load(silent = false) {
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
  if (!silent) loading.value = true;
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
  try { await api.merchantStatus(order.id, status); await load(true); }
  catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "订单状态更新失败"), icon: "none" }); }
  finally { updatingOrderId.value = ""; }
}

function requestCancel(order: Order) {
  if (updatingOrderId.value) return;
  uni.showModal({ title: "拒绝订单", content: "确定取消这笔订单吗？", confirmColor: "#ad477a", success: ({ confirm }) => { if (confirm) void transition(order, true); } });
}

async function pollOrders() {
  if (loading.value || updatingOrderId.value || !api.isRole("MERCHANT")) return;
  try {
    const latest = await api.merchantOrders();
    const knownIds = knownOrderIds;
    const hasNewOrder = Boolean(knownIds && latest.some((order) => order.status === "CREATED" && !knownIds.has(order.id)));
    orders.value = latest;
    knownOrderIds = new Set(latest.map((order) => order.id));
    if (hasNewOrder) { uni.vibrateShort({ type: "medium" }); uni.showToast({ title: "收到新订单", icon: "none" }); }
  } catch { /* 保留最近一次成功加载的订单。 */ }
}
usePagePolling(pollOrders, { onPageShow: () => load() });
</script>

<template>
  <view class="app-page merchant-page">
    <PageHeading title="经营工作台" eyebrow="食巷 · 商户中心"><IconButton name="refresh" label="刷新工作台" variant="secondary" :loading="loading" @click="load()" /></PageHeading>
    <StateView :loading="loading" />
    <StateView v-if="!loading && error" :error="error" :action-text="needsMerchantLogin ? '去登录' : '重新加载'" @action="needsMerchantLogin ? goLogin() : load()" />
    <template v-if="shop && !loading && !error">
      <view class="shop-strip surface motion-enter">
        <FoodImage :src="shop.products.find((product) => product.image)?.image" :size="56" icon="store" />
        <view class="shop-main"><text class="shop-name">{{ shop.name }}</text><BusinessStatus :open="shop.isOpen" /></view>
        <van-switch :checked="shop.isOpen" :loading="toggling" :active-color="iconColors.brand" inactive-color="#dbe1ee" size="25px" @change="toggle" />
      </view>
      <view class="metrics-wrap motion-enter"><StatsStrip :metrics="metrics" /></view>
      <ShortcutGrid :items="shortcuts" @select="openPage" />
      <view class="announcement surface" role="button" aria-label="编辑店铺公告" hover-class="tap-pressed" @click="openPage('settings')">
        <ReIcon name="chat" color="success" :size="24" /><view class="announcement-main"><text class="announcement-title">店铺公告</text><text class="announcement-text">{{ shop.notice || '暂无公告' }}</text></view><ReIcon name="chevron-right" color="secondary" :size="18" />
      </view>
      <view class="section-row"><text class="section-label">待处理订单 <text class="pending-count">{{ pendingOrders.length }}</text></text><IconButton name="arrow-right" label="查看全部订单" compact @click="openPage('orders')" /></view>
      <StateView :empty="pendingOrders.length === 0" empty-text="暂无待处理订单" />
      <view v-for="(order, index) in previewOrders" :key="order.id" class="motion-item" :style="{ animationDelay: index * 40 + 'ms' }"><MerchantOrderCard :order="order" :busy="updatingOrderId === order.id" :disabled="Boolean(updatingOrderId)" @open="openOrder(order)" @advance="transition(order)" @cancel="requestCancel(order)" /></view>
      <view class="product-count"><ReIcon name="store" color="secondary" :size="13" /><text>{{ stats.productCount }} 件商品</text></view>
    </template>
  </view>
  <MerchantNav active="home" />
</template>

<style scoped>
.shop-strip { display: flex; align-items: center; gap: 13px; padding: 18px; }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8px; }
.shop-name { color: var(--color-text); font-size: 16px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.metrics-wrap { margin-top: 16px; }
.announcement { display: flex; align-items: center; gap: 14px; padding: 18px; }
.announcement-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.announcement-title { color: var(--color-text); font-size: 13px; font-weight: 650; }
.announcement-text { overflow: hidden; color: var(--color-text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.pending-count { margin-left: 7px; color: var(--color-accent); font-size: 13px; }
.product-count { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 23px; color: var(--color-text-secondary); font-size: 10px; }
</style>
