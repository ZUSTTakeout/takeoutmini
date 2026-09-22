<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { ApiError, api, getErrorMessage } from "../../services/api";
import type { MerchantStats, Order, OrderStatus, Shop } from "../../types";

const ACTIVE_STATUSES: OrderStatus[] = ["CREATED", "ACCEPTED", "READY"];
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CREATED: "ACCEPTED",
  ACCEPTED: "READY",
  READY: "COMPLETED",
};
const ACTION_TEXT: Partial<Record<OrderStatus, string>> = {
  CREATED: "接单并开始制作",
  ACCEPTED: "出餐并通知取餐",
  READY: "确认已取餐",
};

const shop = ref<Shop | null>(null);
const orders = ref<Order[]>([]);
const stats = ref<MerchantStats>({
  completedOrders: 0,
  revenue: 0,
  productCount: 0,
});
const loading = ref(false);
const error = ref("");
const needsMerchantLogin = ref(false);
const toggling = ref(false);
const updatingOrderId = ref("");

const pendingOrders = computed(() =>
  orders.value.filter((order) => ACTIVE_STATUSES.includes(order.status)),
);

function goLogin() {
  uni.switchTab({ url: "/pages/profile/index" });
}

async function load() {
  error.value = "";
  needsMerchantLogin.value = false;
  if (!api.isRole("MERCHANT")) {
    loading.value = false;
    shop.value = null;
    orders.value = [];
    needsMerchantLogin.value = true;
    error.value = api.token
      ? "当前账号不是商户身份，请切换账号后进入"
      : "请先登录商户账号";
    return;
  }

  loading.value = true;
  try {
    const [shopResult, orderResult, statsResult] = await Promise.all([
      api.merchantShop(),
      api.merchantOrders(),
      api.merchantStats(),
    ]);
    shop.value = shopResult;
    orders.value = orderResult;
    stats.value = statsResult;
  } catch (reason: unknown) {
    shop.value = null;
    orders.value = [];
    if (
      reason instanceof ApiError &&
      (reason.statusCode === 401 || reason.statusCode === 403)
    ) {
      needsMerchantLogin.value = true;
      error.value = "商户身份无效，请重新登录";
    } else {
      error.value = getErrorMessage(reason, "工作台加载失败，请稍后重试");
    }
  } finally {
    loading.value = false;
  }
}

async function toggle(event: Event) {
  if (!shop.value || toggling.value) return;
  const isOpen = Boolean(
    (event as unknown as { detail?: { value?: boolean } }).detail?.value,
  );
  toggling.value = true;
  try {
    shop.value = await api.updateShop({ isOpen });
    uni.showToast({ title: isOpen ? "店铺已营业" : "店铺已休息" });
  } catch (reason: unknown) {
    uni.showToast({
      title: getErrorMessage(reason, "营业状态更新失败"),
      icon: "none",
    });
  } finally {
    toggling.value = false;
  }
}

async function advance(order: Order) {
  const nextStatus = NEXT_STATUS[order.status];
  if (!nextStatus || updatingOrderId.value) return;
  updatingOrderId.value = order.id;
  try {
    await api.merchantStatus(order.id, nextStatus);
    await load();
  } catch (reason: unknown) {
    uni.showToast({
      title: getErrorMessage(reason, "订单状态更新失败"),
      icon: "none",
    });
  } finally {
    updatingOrderId.value = "";
  }
}

onShow(load);
</script>

<template>
  <view class="page">
    <StateView :loading="loading" />
    <StateView
      v-if="!loading && error"
      :error="error"
      :action-text="needsMerchantLogin ? '去登录' : '重新加载'"
      @action="needsMerchantLogin ? goLogin() : load()"
    />

    <template v-if="shop && !loading && !error">
      <view class="head">
        <view class="head-main">
          <view class="title">商户工作台</view>
          <view class="shop-name">{{ shop.name }}</view>
        </view>
        <view class="open-control">
          <text>{{ shop.isOpen ? "营业中" : "休息中" }}</text>
          <switch
            :checked="shop.isOpen"
            :disabled="toggling"
            color="#c4532b"
            @change="toggle"
          />
        </view>
      </view>

      <view class="stats">
        <view class="stat">
          <text class="stat-value">{{ stats.completedOrders }}</text>
          <text class="stat-label">已完成订单</text>
        </view>
        <view class="stat">
          <text class="stat-value">{{ api.money(stats.revenue) }}</text>
          <text class="stat-label">累计营业额</text>
        </view>
        <view class="stat">
          <text class="stat-value">{{ stats.productCount }}</text>
          <text class="stat-label">在售商品</text>
        </view>
      </view>

      <view class="section-title">待处理订单</view>
      <StateView
        :empty="pendingOrders.length === 0"
        empty-text="暂无待处理订单"
      />

      <view v-for="order in pendingOrders" :key="order.id" class="order">
        <view class="order-top">
          <text class="order-number">#{{ order.number.slice(-6) }}</text>
          <text class="total">{{ api.money(order.total) }}</text>
        </view>
        <view class="items">
          {{ order.items.map((item) => `${item.name} × ${item.quantity}`).join("、") }}
        </view>
        <button
          class="order-action"
          :disabled="Boolean(updatingOrderId)"
          @click="advance(order)"
        >
          {{ updatingOrderId === order.id ? "更新中…" : ACTION_TEXT[order.status] }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 38rpx 32rpx 50rpx;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 4rpx 26rpx;
}

.head-main {
  min-width: 0;
  flex: 1;
}

.title {
  font-size: 42rpx;
  font-weight: 800;
}

.shop-name {
  overflow: hidden;
  margin-top: 8rpx;
  color: #81766e;
  font-size: 23rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-control {
  display: flex;
  margin-left: 20rpx;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  color: #655b54;
  font-size: 21rpx;
}

.stats {
  display: flex;
  margin: 10rpx 0 32rpx;
  padding: 28rpx 10rpx;
  border-radius: 22rpx;
  background: #2d2824;
  color: #fff;
}

.stat {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat + .stat {
  border-left: 1rpx solid #554a44;
}

.stat-value {
  color: #ffb08d;
  font-size: 30rpx;
  font-weight: 700;
}

.stat-label {
  margin-top: 9rpx;
  color: #d0c6bf;
  font-size: 20rpx;
}

.section-title {
  margin: 8rpx 0 18rpx;
  font-size: 31rpx;
  font-weight: 700;
}

.order {
  margin-bottom: 18rpx;
  padding: 25rpx;
  border: 1rpx solid #eee3da;
  border-radius: 22rpx;
  background: #fff;
}

.order-top {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
}

.order-number {
  color: #4b433e;
}

.total {
  color: #b84320;
}

.items {
  margin: 18rpx 0;
  color: #655c56;
  font-size: 24rpx;
  line-height: 1.6;
}

.order-action {
  height: 72rpx;
  background: #c4532b;
  color: #fff;
  font-size: 25rpx;
  line-height: 72rpx;
}

.order-action[disabled] {
  background: #8c8179;
  color: #eee7e2;
  opacity: 1;
}
</style>
