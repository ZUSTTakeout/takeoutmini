<script setup lang="ts">
import { usePullRefresh } from "../../composables/useRefresh";
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import PageHeading from "../../components/PageHeading.vue";
import OrderProgress from "../../components/OrderProgress.vue";
import StateView from "../../components/StateView.vue";
import IconButton from "../../components/IconButton.vue";
import ReIcon from "../../components/ReIcon.vue";
import FoodImage from "../../components/FoodImage.vue";
import { formatOrderTime } from "../../utils/time";
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

async function load(silent = false) {
  if (!orderId.value) {
    error.value = "订单地址无效";
    return;
  }
  if (!silent) { loading.value = true; error.value = ""; }
  try {
    order.value = merchantView.value
      ? await api.merchantOrder(orderId.value)
      : await api.order(orderId.value);
  } catch (reason: unknown) {
    const message = getErrorMessage(reason, "订单详情加载失败");
    if (silent) uni.showToast({ title: message, icon: "none" });
    else { order.value = null; error.value = message; }
  } finally {
    if (!silent) loading.value = false;
  }
}

onLoad((query) => {
  orderId.value = typeof query?.id === "string" ? query.id : "";
  merchantView.value = query?.merchant === "1";
});
onShow(() => {
  if (orderId.value) void load(Boolean(order.value));
});
usePullRefresh(() => load(Boolean(order.value)));
</script>

<template>
  <view class="app-page">
    <PageHeading title="订单详情" :eyebrow="merchantView ? '商户中心' : '食巷'"></PageHeading>
    <StateView :loading="loading" skeleton="card" />
    <StateView v-if="!loading && error" :error="error" action-text="重新加载" @action="load()" />
    <template v-if="order && !loading && !error">
      <OrderProgress :order="order" />
      <view v-if="order.status === 'READY'" class="pickup-reference"><text class="pickup-label">取餐订单号</text><text class="pickup-number" user-select>{{ order.number }}</text><text class="pickup-caption">到店向商户出示此订单</text></view>
      <view class="receipt motion-enter">
        <view class="receipt-shop" :role="!merchantView ? 'button' : undefined" @click="openShop">
          <FoodImage :size="40" />
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
        <view class="info-row"><text class="info-label">下单时间</text><text class="info-value">{{ formatOrderTime(order.createdAt) }}</text></view>
        <view class="info-row"><text class="info-label">取餐方式</text><text class="info-value">到店自取</text></view>
        <view class="info-row"><text class="info-label">备注</text><text class="info-value">{{ order.remark || '无' }}</text></view>
        <view v-if="order.status === 'READY'" class="pickup-note"><ReIcon name="bag" color="danger" :size="18" /><text>请向商户出示本页取餐</text></view>
      </view>
      <view v-if="!merchantView" class="reorder-row"><text>再逛逛这家店</text><IconButton name="arrow-right" label="返回店铺点餐" variant="primary" @click="openShop" /></view>
    </template>
  </view>
</template>

<style scoped>
.receipt { padding: var(--space-4); border-radius: var(--radius-card); background: var(--color-surface); }
.receipt-shop { display: flex; align-items: center; gap: 24rpx; }
.shop-symbol { display: flex; width: 92rpx; height: 92rpx; flex: none; align-items: center; justify-content: center; border-radius: var(--radius-card); background: var(--color-brand-soft); }
.shop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }
.shop-name { color: var(--color-text); font-size: var(--font-body); font-weight: 750; overflow-wrap: anywhere; }
.shop-caption, .receipt-label { color: var(--color-text-secondary); font-size: var(--font-caption); }
.receipt-label { margin-bottom: 22rpx; }
.item-row { display: flex; align-items: baseline; gap: 24rpx; padding: 18rpx 0; color: var(--color-text); font-size: var(--font-body); line-height: 1.6; }
.item-name { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.item-quantity { flex: none; color: var(--color-text-secondary); font-size: var(--font-caption); }
.item-price { flex: none; min-width: 124rpx; text-align: right; font-weight: 600; }
.total-row { display: flex; align-items: center; justify-content: space-between; gap: 28rpx; margin-top: 28rpx; padding-top: 34rpx; border-top: 2rpx solid var(--color-border); font-size: var(--font-caption); }
.total { color: var(--color-brand); font-size: var(--font-title); font-weight: 750; }
.receipt-cut { padding: 48rpx 0; }
.cut-line { border-top: 2rpx dashed var(--color-text-tertiary); }
.info-row { display: flex; align-items: baseline; gap: 30rpx; margin-top: 26rpx; font-size: var(--font-caption); line-height: 1.6; }
.info-label { width: 116rpx; flex: none; color: var(--color-text-secondary); }
.info-value { min-width: 0; flex: 1; color: var(--color-text-secondary); overflow-wrap: anywhere; }
.number { font-size: var(--font-caption); font-variant-numeric: tabular-nums; }
.pickup-note { display: flex; align-items: center; gap: 16rpx; margin-top: 44rpx; padding-top: 36rpx; border-top: 2rpx solid var(--color-border); color: var(--color-accent); font-size: var(--font-caption); }
.reorder-row { display: flex; align-items: center; justify-content: flex-end; gap: 24rpx; margin-top: 40rpx; color: var(--color-brand); font-size: var(--font-caption); }
.pickup-reference { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); padding: var(--space-4); border: 2rpx solid var(--color-brand); border-radius: var(--radius-card); background: var(--color-surface); }
.pickup-label, .pickup-caption { color: var(--color-text-secondary); font-size: var(--font-caption); }
.pickup-number { max-width: 100%; color: var(--color-brand); font-size: var(--font-title); font-weight: 700; letter-spacing: 2rpx; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; text-align: center; }
</style>
