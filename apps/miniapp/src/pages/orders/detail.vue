<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
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
  <view class="page">
    <view class="page-head">
      <text class="page-title">订单详情</text>
      <IconButton name="refresh" label="刷新订单详情" :loading="loading" @click="load" />
    </view>
    <StateView :loading="loading" />
    <StateView
      v-if="!loading && error"
      :error="error"
      action-text="重新加载"
      @action="load"
    />
    <template v-if="order && !loading && !error">
      <OrderProgress :order="order" />
      <view class="receipt">
        <van-cell
          :title="order.shop.name"
          label="到店自取"
          :border="false"
          :clickable="!merchantView"
          center
          title-style="font-size: 17px; font-weight: 700;"
          custom-style="padding: 0; background: transparent;"
          @click="openShop"
        >
          <view slot="icon" class="shop-symbol"><ReIcon name="store" color="brand" :size="25" /></view>
          <view v-if="!merchantView" slot="right-icon" class="shop-arrow"><ReIcon name="chevron-right" color="secondary" :size="19" /></view>
        </van-cell>
        <van-divider custom-style="margin: 22px 0 15px; border-color: #eee7df;" />
        <view class="receipt-section">
          <view class="section-title">商品明细</view>
          <view v-for="item in order.items" :key="item.id" class="item-row">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-quantity">×{{ item.quantity }}</text>
            <text class="item-price">{{ formatMoney(item.price * item.quantity) }}</text>
          </view>
          <van-divider custom-style="margin: 16px 0; border-color: #eee7df;" />
          <view class="total-row"><text>订单合计</text><text class="total">{{ formatMoney(order.total) }}</text></view>
        </view>
        <van-divider custom-style="margin: 23px 0; border-color: #eee7df;" />
        <view class="receipt-section">
          <view class="section-title">订单信息</view>
          <view class="info-row"><text class="info-label">订单编号</text><text class="info-value number">{{ order.number }}</text></view>
          <view class="info-row"><text class="info-label">下单时间</text><text class="info-value">{{ formatDate(order.createdAt) }}</text></view>
          <view class="info-row"><text class="info-label">取餐方式</text><text class="info-value">到店自取</text></view>
          <view class="info-row"><text class="info-label">备注</text><text class="info-value">{{ order.remark || '无' }}</text></view>
        </view>
        <view v-if="order.status === 'READY'" class="pickup-note">
          <ReIcon name="bag" color="brand" :size="17" />
          <text>请向商户出示本页取餐</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page { padding: 22px 20px calc(30px + env(safe-area-inset-bottom)); }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 24px; }
.page-title { font-size: 23px; font-weight: 800; }
.receipt { padding: 21px; border: 1px solid var(--color-border); border-radius: 18px; background: #fffdfa; }
.shop-symbol { display: flex; width: 47px; height: 47px; flex: none; align-items: center; justify-content: center; margin-right: 13px; border-radius: 12px; background: #f9eadb; }
.shop-arrow { display: flex; align-items: center; margin-left: 8px; }
.section-title { margin-bottom: 15px; color: #9c8b7d; font-size: 12px; font-weight: 500; }
.item-row { display: flex; align-items: baseline; gap: 12px; padding: 9px 0; color: #493c32; font-size: 14px; line-height: 1.6; }
.item-name { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.item-quantity { flex: none; color: #9b8b7d; font-size: 12px; }
.item-price { flex: none; min-width: 61px; text-align: right; font-weight: 500; }
.total-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; color: #58483b; font-size: 14px; }
.total { flex: none; color: var(--color-brand-strong); font-size: 24px; font-weight: 750; }
.info-row { display: flex; align-items: baseline; gap: 16px; margin-top: 14px; font-size: 12px; line-height: 1.65; }
.info-label { width: 61px; flex: none; color: #a08f81; }
.info-value { min-width: 0; flex: 1; color: #726153; overflow-wrap: anywhere; }
.number { font-size: 11px; }
.pickup-note { display: flex; align-items: center; gap: 7px; margin-top: 24px; color: #b15a31; font-size: 12px; line-height: 1.5; }
</style>
