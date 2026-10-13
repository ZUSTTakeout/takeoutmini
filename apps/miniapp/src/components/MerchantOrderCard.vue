<script setup lang="ts">
import { computed } from "vue";
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import { formatMoney } from "../utils/format";
import { ACTION_TEXT, NEXT_STATUS, STATUS_TEXT } from "../utils/order";
import type { Order } from "../types";

const props = withDefaults(defineProps<{ order: Order; busy?: boolean; disabled?: boolean }>(), { busy: false, disabled: false });
defineEmits<{ open: []; advance: []; cancel: [] }>();
const itemCount = computed(() => props.order.items.reduce((count, item) => count + item.quantity, 0));
const time = computed(() => {
  const date = new Date(props.order.createdAt);
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
});
const tagColors = computed(() => ({
  CREATED: { background: "#fff0e5", text: "#a43e1d" },
  ACCEPTED: { background: "#edf3f8", text: "#426b87" },
  READY: { background: "#fff0e5", text: "#a43e1d" },
  COMPLETED: { background: "#f0ede7", text: "#5c5b55" },
  CANCELLED: { background: "#f9e7e3", text: "#b23b34" },
})[props.order.status]);
</script>

<template>
  <view class="order-row">
    <view class="order-heading" role="button" @click="$emit('open')">
      <text class="number">#{{ order.number }}</text>
      <van-tag :color="tagColors.background" :text-color="tagColors.text">{{ STATUS_TEXT[order.status] }}</van-tag>
    </view>
    <view class="order-body" role="button" @click="$emit('open')">
      <view class="food-mark"><ReIcon name="restaurant" color="brand" :size="24" /></view>
      <view class="order-main">
        <text class="items">{{ order.items.map((item) => item.name).join('、') }}</text>
        <text class="meta">{{ itemCount }} 件 · {{ time }}</text>
      </view>
      <text class="total">{{ formatMoney(order.total) }}</text>
    </view>
    <view v-if="order.remark" class="remark">{{ order.remark }}</view>
    <view class="order-bottom">
      <IconButton name="chevron-right" label="查看订单详情" @click="$emit('open')" />
      <view class="order-actions">
        <IconButton v-if="order.status === 'CREATED' || order.status === 'ACCEPTED'" name="close" label="拒绝订单" variant="danger" :disabled="disabled" :loading="busy" @click="$emit('cancel')" />
        <IconButton v-if="NEXT_STATUS[order.status]" :name="order.status === 'ACCEPTED' ? 'bag' : 'check'" :label="ACTION_TEXT[order.status] || '更新订单状态'" variant="primary" :disabled="disabled" :loading="busy" @click="$emit('advance')" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.order-row { margin-bottom: 14rpx; padding: 25rpx; border: 1rpx solid #eee3da; border-radius: 22rpx; background: #fff; }
.order-heading, .order-body, .order-bottom, .order-actions { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.number { min-width: 0; flex: 1; overflow-wrap: anywhere; color: #4d4640; font-size: 12px; font-weight: 750; }
.order-body { margin-top: 20rpx; align-items: flex-start; }
.food-mark { display: flex; width: 45px; height: 45px; flex: none; align-items: center; justify-content: center; border-radius: 14rpx; background: #fff2e8; }
.order-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }
.items { overflow-wrap: anywhere; font-size: 13px; font-weight: 600; line-height: 1.5; }
.meta { color: #81766e; font-size: 10px; line-height: 1.5; }
.total { max-width: 110px; overflow-wrap: anywhere; color: #a43e1d; font-size: 13px; font-weight: 750; line-height: 1.5; }
.remark { margin-top: 18rpx; padding-left: 12rpx; border-left: 3rpx solid #d7e1e9; color: #657080; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.order-bottom { margin-top: 18rpx; padding-top: 14rpx; border-top: 1rpx solid #f2ece6; }
.order-actions { justify-content: flex-end; gap: 14rpx; }
</style>
