<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import ReIcon from "./ReIcon.vue";
import { ORDER_STEPS, STATUS_TEXT } from "../utils/order";
import type { Order } from "../types";
const props = defineProps<{ order: Order }>();
const currentStep = computed(() => ORDER_STEPS.findIndex((step) => step.status === props.order.status));
const statusNote = computed(() => ({
  CREATED: "等待商户确认餐点", ACCEPTED: "餐点正在制作中", READY: "餐点已备好，请到店取餐",
  COMPLETED: "本次取餐已完成", CANCELLED: "本次订单已取消",
}[props.order.status]));
</script>

<template>
  <view :class="['order-progress', { cancelled: order.status === 'CANCELLED', ready: order.status === 'READY' }]">
    <view class="status-heading">
      <view class="status-icon"><ReIcon :name="order.status === 'CANCELLED' ? 'close' : order.status === 'COMPLETED' ? 'check' : 'bag'" color="brand" :size="26" /></view>
      <view class="status-main"><text class="status-title">{{ STATUS_TEXT[order.status] }}</text><text class="status-note">{{ statusNote }}</text></view>
    </view>
    <view v-if="order.status !== 'CANCELLED'" class="progress-track">
      <view v-for="(step, index) in ORDER_STEPS" :key="step.status" :class="['progress-step', { done: index <= currentStep, current: index === currentStep }]">
        <view class="step-top"><view class="step-dot"><ReIcon v-if="index < currentStep || order.status === 'COMPLETED'" name="check" color="inherit" :size="12" /><text v-else>{{ index + 1 }}</text></view><view v-if="index < ORDER_STEPS.length - 1" class="step-line" /></view>
        <text class="step-label">{{ step.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.order-progress { margin-bottom: var(--space-3); padding: var(--space-4); border-radius: var(--radius-panel); background: var(--color-surface); }
.order-progress.ready { background: var(--color-brand-soft); }
.order-progress.cancelled { background: var(--color-input); }
.status-heading { display: flex; align-items: center; gap: 28rpx; }
.status-icon { display: flex; width: 104rpx; height: 104rpx; flex: none; align-items: center; justify-content: center; border: 2rpx solid var(--color-border); border-radius: var(--radius-card); }
.status-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 12rpx; }
.status-title { color: var(--color-text); font-size: var(--font-title); font-weight: 750; line-height: 1.3; }
.status-note { color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.6; }
.progress-track { display: flex; margin-top: var(--space-4); padding-top: var(--space-3); border-top: 2rpx solid var(--color-border); }
.progress-step { min-width: 0; flex: 1; }
.step-top { display: flex; align-items: center; margin-bottom: 18rpx; }
.step-dot { display: flex; width: 40rpx; height: 40rpx; flex: none; align-items: center; justify-content: center; border: 2rpx solid var(--color-border); border-radius: 50%; color: var(--color-text-tertiary); font-size: var(--font-caption); }
.step-line { height: 2rpx; flex: 1; margin: 0 var(--space-1); background: var(--color-border); }
.done .step-line { background: var(--color-brand); }
.step-label { color: var(--color-text-tertiary); font-size: var(--font-caption); }
.done .step-dot { border-color: var(--color-brand); background: var(--color-brand); color: var(--color-surface); }
.done .step-label { color: var(--color-text); }
.current .step-dot { border-color: var(--color-brand); background: var(--color-brand); color: var(--color-surface); }
.progress-step:last-child { max-width: 90rpx; }
</style>
