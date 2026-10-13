<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import PageHeading from "../../components/PageHeading.vue";
import OrderProgress from "../../components/OrderProgress.vue";
import StateView from "../../components/StateView.vue";
import IconButton from "../../components/IconButton.vue";
import ReIcon from "../../components/ReIcon.vue";
import { api, getErrorMessage } from "../../services/api";
import { formatMoney } from "../../utils/format";
import type { Order } from "../../types";

const orderId = ref("");
const merchantView = ref(false);
const order = ref<Order | null>(null);
const loading = ref(false);
const error = ref("");

function openShop() {
  if (!order.value || merchantView.value) return;
  uni.navigateTo({ url: `/pages/shop/index?id=${encodeURIComponent(order.value.shop.id)}` });
}

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

onLoad((query) => {
  orderId.value = typeof query?.id === "string" ? query.id : "";
  merchantView.value = query?.merchant === "1";
});
onShow(() => {
  if (orderId.value) void load();
});
</script>

<template>
  <view class="app-page">
    <PageHeading title="订单详情" :eyebrow="merchantView ? '商户中心' : '食巷'"><IconButton name="refresh" label="刷新订单详情" :loading="loading" variant="secondary" @click="load" /></PageHeading>
    <StateView :loading="loading" />
    <StateView v-if="!loading && error" :error="error" action-text="重新加载" @action="load" />
    <template v-if="order && !loading && !error">
      <OrderProgress :order="order" />
      <view class="receipt motion-enter">
        <view class="receipt-shop" :role="!merchantView ? 'button' : undefined" @click="openShop">
          <view class="shop-symbol"><ReIcon name="store" color="brand" :size="24" /></view>
          <view class="shop-main"><text class="shop-name">{{ order.shop.name }}</text><text class="shop-caption">到店自取</text></view>
          <IconButton v-if="!merchantView" name="chevron-right" label="进入店铺" compact @click="openShop" />
        </view>
        <view class="hairline" />
        <view class="receipt-label">商品明细</view>
        <view v-for="item in order.items" :key="item.id" class="item-row"><text class="item-name">{{ item.name }}</text><text class="item-quantity">×{{ item.quantity }}</text><text class="item-price">{{ formatMoney(item.price * item.quantity) }}</text></view>
        <view class="total-row"><text>订单合计</text><text class="total">{{ formatMoney(order.total) }}</text></view>
        <view class="receipt-cut"><view class="cut-line" /></view>
        <view class="receipt-label">订单信息</view>
        <view class="info-row"><text class="info-label">订单编号</text><text class="info-value number" user-select>{{ order.number }}</text></view>
        <view class="info-row"><text class="info-label">下单时间</text><text class="info-value">{{ formatDate(order.createdAt) }}</text></view>
        <view class="info-row"><text class="info-label">取餐方式</text><text class="info-value">到店自取</text></view>
        <view class="info-row"><text class="info-label">备注</text><text class="info-value">{{ order.remark || '无' }}</text></view>
        <view v-if="order.status === 'READY'" class="pickup-note"><ReIcon name="bag" color="danger" :size="18" /><text>请向商户出示本页取餐</text></view>
      </view>
      <view v-if="!merchantView" class="reorder-row"><text>再逛逛这家店</text><IconButton name="arrow-right" label="返回店铺点餐" variant="primary" @click="openShop" /></view>
    </template>
  </view>
</template>

<style scoped>
.receipt { padding: 22px 20px; border-radius: var(--radius-card); background: var(--color-surface); }
.receipt-shop { display: flex; align-items: center; gap: 12px; }
.shop-symbol { display: flex; width: 46px; height: 46px; flex: none; align-items: center; justify-content: center; border-radius: 14px; background: var(--color-brand-soft); }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.shop-name { color: var(--color-text); font-size: 16px; font-weight: 750; overflow-wrap: anywhere; }
.shop-caption, .receipt-label { color: var(--color-text-secondary); font-size: 11px; }
.receipt-label { margin-bottom: 11px; }
.item-row { display: flex; align-items: baseline; gap: 12px; padding: 9px 0; color: var(--color-text); font-size: 13px; line-height: 1.6; }
.item-name { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.item-quantity { flex: none; color: var(--color-text-secondary); font-size: 11px; }
.item-price { flex: none; min-width: 62px; text-align: right; font-weight: 600; }
.total-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 14px; padding-top: 17px; border-top: 1px solid var(--color-border); font-size: 12px; }
.total { color: var(--color-accent); font-size: 24px; font-weight: 750; }
.receipt-cut { padding: 24px 0; }
.cut-line { border-top: 1px dashed #ced6e7; }
.info-row { display: flex; align-items: baseline; gap: 15px; margin-top: 13px; font-size: 12px; line-height: 1.6; }
.info-label { width: 58px; flex: none; color: var(--color-text-secondary); }
.info-value { min-width: 0; flex: 1; color: #536079; overflow-wrap: anywhere; }
.number { font-size: 11px; font-variant-numeric: tabular-nums; }
.pickup-note { display: flex; align-items: center; gap: 8px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--color-border); color: var(--color-accent); font-size: 12px; }
.reorder-row { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 20px; color: var(--color-brand); font-size: 12px; }
</style>
