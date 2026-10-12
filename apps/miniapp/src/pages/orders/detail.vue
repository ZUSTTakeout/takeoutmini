<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Order, OrderStatus } from "../../types";

const STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: "CREATED", label: "待接单" },
  { status: "ACCEPTED", label: "制作中" },
  { status: "READY", label: "待取餐" },
  { status: "COMPLETED", label: "已完成" },
];

const orderId = ref("");
const merchantView = ref(false);
const order = ref<Order | null>(null);
const loading = ref(false);
const error = ref("");

async function load() {
  if (!orderId.value) {
    error.value = "订单地址无效";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    order.value = merchantView.value
      ? await api.merchantOrder(orderId.value)
      : await api.order(orderId.value);
  } catch (reason: unknown) {
    order.value = null;
    error.value = getErrorMessage(reason, "订单详情加载失败");
  } finally {
    loading.value = false;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间暂不可用";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function stepState(status: OrderStatus, index: number) {
  if (order.value?.status === "CANCELLED") return "inactive";
  const current = STEPS.findIndex((step) => step.status === order.value?.status);
  return index < current ? "done" : index === current ? "current" : "inactive";
}

onLoad((query) => {
  orderId.value = typeof query?.id === "string" ? query.id : "";
  merchantView.value = query?.merchant === "1";
});
onShow(() => {
  if (orderId.value) void load();
});
</script>

<template>
  <view class="page">
    <StateView :loading="loading" />
    <StateView
      v-if="!loading && error"
      :error="error"
      action-text="重新加载"
      @action="load"
    />
    <template v-if="order && !loading && !error">
      <view class="status-card">
        <view class="status-title">
          {{ order.status === "CANCELLED" ? "订单已取消" : STEPS.find((step) => step.status === order?.status)?.label }}
        </view>
        <view class="status-subtitle">到店自取 · {{ order.shop.name }}</view>
        <view v-if="order.status === 'CANCELLED'" class="cancel-note">如需用餐，可以返回店铺重新下单</view>
        <view v-else class="timeline">
          <view
            v-for="(step, index) in STEPS"
            :key="step.status"
            :class="['timeline-step', stepState(step.status, index)]"
          >
            <view class="dot" />
            <text>{{ step.label }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">取餐信息</view>
        <view class="info-row"><text>下单时间</text><text>{{ formatDate(order.createdAt) }}</text></view>
        <view class="order-number">
          <text class="muted">订单编号（不是取餐码）</text>
          <text class="number">{{ order.number }}</text>
        </view>
        <view class="pickup-hint">到店后请向商户出示订单页面。当前版本尚未生成独立短取餐码。</view>
      </view>

      <view class="card">
        <view class="card-title">商品明细</view>
        <view v-for="item in order.items" :key="item.id" class="item-row">
          <text class="item-name">{{ item.name }} × {{ item.quantity }}</text>
          <text>{{ api.money(item.price * item.quantity) }}</text>
        </view>
        <view class="total-row"><text>实付合计</text><text class="total">{{ api.money(order.total) }}</text></view>
      </view>

      <view v-if="order.remark" class="card">
        <view class="card-title">订单备注</view>
        <text class="remark">{{ order.remark }}</text>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page { padding: 28rpx 30rpx calc(40rpx + env(safe-area-inset-bottom)); }
.status-card, .card { margin-bottom: 20rpx; padding: 28rpx; border: 1rpx solid #eee3da; border-radius: 22rpx; background: #fff; }
.status-card { background: #fff3e9; }
.status-title { color: var(--color-brand-strong); font-size: 34rpx; font-weight: 800; }
.status-subtitle { margin-top: 8rpx; color: #746a63; font-size: 23rpx; }
.timeline { display: flex; justify-content: space-between; margin-top: 36rpx; }
.timeline-step { display: flex; flex: 1; flex-direction: column; align-items: center; gap: 10rpx; color: #aaa099; font-size: 20rpx; }
.dot { width: 20rpx; height: 20rpx; border-radius: 50%; background: #d7cdc6; }
.timeline-step.done .dot, .timeline-step.current .dot { background: var(--color-brand); }
.timeline-step.current { color: var(--color-brand-strong); font-weight: 700; }
.cancel-note { margin-top: 22rpx; color: #8d5147; font-size: 22rpx; }
.card-title { margin-bottom: 22rpx; font-size: 27rpx; font-weight: 700; }
.info-row, .item-row, .total-row { display: flex; justify-content: space-between; gap: 16rpx; color: #655c56; font-size: 23rpx; }
.info-row { margin-bottom: 18rpx; }
.order-number { display: flex; flex-direction: column; gap: 8rpx; padding-top: 18rpx; border-top: 1rpx solid #eee5de; }
.muted { color: #81766e; font-size: 21rpx; }
.number { overflow-wrap: anywhere; color: #4b433e; font-size: 22rpx; }
.pickup-hint { margin-top: 16rpx; color: #81766e; font-size: 20rpx; line-height: 1.5; }
.item-row { padding: 14rpx 0; }
.item-name { min-width: 0; flex: 1; }
.total-row { margin-top: 12rpx; padding-top: 18rpx; border-top: 1rpx solid #eee5de; align-items: center; }
.total { color: var(--color-brand-strong); font-size: 29rpx; font-weight: 700; }
.remark { color: #655c56; font-size: 23rpx; line-height: 1.6; }
</style>
