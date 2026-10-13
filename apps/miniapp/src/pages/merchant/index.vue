<script setup lang="ts">
import { computed, ref } from "vue";
import PageHeading from "../../components/PageHeading.vue";
import StatsStrip from "../../components/StatsStrip.vue";
import ShortcutGrid from "../../components/ShortcutGrid.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import FoodImage from "../../components/FoodImage.vue";
import { type ReIconName } from "../../icons";
import IconButton from "../../components/IconButton.vue";
import ReIcon from "../../components/ReIcon.vue";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import MerchantOrderCard from "../../components/MerchantOrderCard.vue";
import { usePullRefresh } from "../../composables/useRefresh";
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
const orderGroups = computed(() => [
  { status: "CREATED", title: "待接单" }, { status: "ACCEPTED", title: "制作中" }, { status: "READY", title: "待取餐" },
].map((group) => ({ ...group, orders: orders.value.filter((order) => order.status === group.status) })));
const now = ref(Date.now());
let fetching = false;
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

function goLogin() { uni.navigateTo({ url: "/pages/profile/login" }); }
function openPage(page: string) { uni.navigateTo({ url: `/pages/merchant/${page}` }); }
function openOrder(order: Order) { uni.navigateTo({ url: `/pages/orders/detail?id=${encodeURIComponent(order.id)}&merchant=1` }); }

async function load(silent = false) {
  if (fetching) return;
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
  fetching = true;
  if (!silent) loading.value = true;
  try {
    const [shopResult, orderResult, statsResult] = await Promise.all([api.merchantShop(), api.merchantOrders(), api.merchantStats()]);
    shop.value = shopResult;
    orders.value = orderResult;
    stats.value = statsResult;
    now.value = Date.now();
    knownOrderIds = new Set(orderResult.map((order) => order.id));
  } catch (reason: unknown) {
    if (reason instanceof ApiError && (reason.statusCode === 401 || reason.statusCode === 403)) {
      needsMerchantLogin.value = true;
      error.value = "商户身份无效，请重新登录";
    } else if (silent) uni.showToast({ title: getErrorMessage(reason, "刷新失败，请稍后再试"), icon: "none" });
    else error.value = getErrorMessage(reason, "工作台加载失败，请稍后重试");
  } finally { loading.value = false; fetching = false; }
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
  try {
    const updated = await api.merchantStatus(order.id, status);
    orders.value = orders.value.map((item) => item.id === updated.id ? updated : item);
    await load(true);
  }
  catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "订单状态更新失败"), icon: "none" }); }
  finally { updatingOrderId.value = ""; }
}

function requestCancel(order: Order) {
  if (updatingOrderId.value) return;
  uni.showModal({ title: "拒绝订单", content: "确定取消这笔订单吗？", success: ({ confirm }) => { if (confirm) void transition(order, true); } });
}

async function pollOrders() {
  if (fetching || loading.value || updatingOrderId.value || !api.isRole("MERCHANT")) return;
  fetching = true;
  try {
    const latest = await api.merchantOrders();
    if (updatingOrderId.value) return;
    now.value = Date.now();
    const knownIds = knownOrderIds;
    const hasNewOrder = Boolean(knownIds && latest.some((order) => order.status === "CREATED" && !knownIds.has(order.id)));
    orders.value = latest;
    knownOrderIds = new Set(latest.map((order) => order.id));
    if (hasNewOrder) { uni.vibrateShort({ type: "medium" }); uni.showToast({ title: "收到新订单", icon: "none" }); }
  } catch { /* 保留最近一次成功加载的订单。 */ }
  finally { fetching = false; }
}
usePagePolling(pollOrders, { interval: 15_000, onPageShow: () => load() });
usePullRefresh(() => load(Boolean(shop.value)));
</script>

<template>
  <view class="app-page merchant-page">
    <PageHeading title="经营工作台" ></PageHeading>
    <StateView :loading="loading" skeleton="card" />
    <StateView v-if="!loading && error" :error="error" :action-text="needsMerchantLogin ? '去登录' : '重新加载'" @action="needsMerchantLogin ? goLogin() : load()" />
    <template v-if="shop && !loading && !error">
      <view class="shop-strip surface motion-enter">
        <FoodImage :src="shop.products.find((product) => product.image)?.image" :size="56" icon="store" />
        <view class="shop-main"><text class="shop-name">{{ shop.name }}</text><BusinessStatus :open="shop.isOpen" /></view>
        <van-switch :checked="shop.isOpen" :loading="toggling" active-color="var(--color-brand)" inactive-color="var(--color-border)" size="50rpx" @change="toggle" />
      </view>
      <view class="metrics-wrap motion-enter"><StatsStrip :metrics="metrics" /></view>
      <ShortcutGrid :items="shortcuts" @select="openPage" />
      <view class="announcement surface" role="button" aria-label="编辑店铺公告" hover-class="tap-pressed" @click="openPage('settings')">
        <ReIcon name="chat" color="success" :size="24" /><view class="announcement-main"><text class="announcement-title">店铺公告</text><text class="announcement-text">{{ shop.notice || '暂无公告' }}</text></view><ReIcon name="chevron-right" color="secondary" :size="18" />
      </view>
      <view class="section-row"><text class="section-label">当前订单</text><IconButton name="arrow-right" label="查看全部订单" compact @click="openPage('orders')" /></view>
      <StateView :empty="pendingOrders.length === 0" empty-text="当前订单都已处理完了" />
      <view v-if="pendingOrders.length" class="order-groups">
        <view v-for="group in orderGroups" :key="group.status" class="order-group">
          <view class="group-heading"><text>{{ group.title }}</text><text class="section-meta">{{ group.orders.length }} 单</text></view>
          <text v-if="!group.orders.length" class="group-empty">暂无{{ group.title }}订单</text>
          <MerchantOrderCard v-for="order in group.orders" :key="order.id" :order="order" :now="now" :image="shop.products.find((product) => product.id === order.items[0]?.productId)?.image" :busy="updatingOrderId === order.id" :disabled="Boolean(updatingOrderId)" @open="openOrder(order)" @advance="transition(order)" @cancel="requestCancel(order)" />
        </view>
      </view>
      <view class="product-count"><ReIcon name="store" color="secondary" :size="13" /><text>{{ stats.productCount }} 件商品</text></view>
    </template>
  </view>
  <MerchantNav active="home" />
</template>

<style scoped>
.shop-strip { display: flex; align-items: center; gap: 26rpx; padding: 36rpx; }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 16rpx; }
.shop-name { color: var(--color-text); font-size: var(--font-body); font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.metrics-wrap { margin-top: 32rpx; }
.announcement { display: flex; align-items: center; gap: 28rpx; padding: 36rpx; }
.announcement-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }
.announcement-title { color: var(--color-text); font-size: var(--font-body); font-weight: 650; }
.announcement-text { overflow: hidden; color: var(--color-text-secondary); font-size: var(--font-caption); text-overflow: ellipsis; white-space: nowrap; }
.pending-count { margin-left: 14rpx; color: var(--color-accent); font-size: var(--font-body); }
.product-count { display: flex; align-items: center; justify-content: center; gap: 14rpx; margin-top: 46rpx; color: var(--color-text-secondary); font-size: var(--font-caption); }
.group-heading { display: flex; align-items: center; justify-content: space-between; margin: var(--space-3) 0; color: var(--color-text); font-size: var(--font-body); font-weight: 600; }
.group-empty { display: block; margin-bottom: var(--space-4); color: var(--color-text-tertiary); font-size: var(--font-caption); }
</style>
