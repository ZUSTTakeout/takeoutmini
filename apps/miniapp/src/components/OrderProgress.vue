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
      <view class="status-icon"><ReIcon :name="order.status === 'CANCELLED' ? 'close' : order.status === 'COMPLETED' ? 'check' : 'bag'" color="white" :size="29" /></view>
      <view class="status-main"><text class="status-title">{{ STATUS_TEXT[order.status] }}</text><text class="status-note">{{ statusNote }}</text></view>
    </view>
    <view v-if="order.status !== 'CANCELLED'" class="progress-track">
      <view v-for="(step, index) in ORDER_STEPS" :key="step.status" :class="['progress-step', { done: index <= currentStep, current: index === currentStep }]">
        <view class="step-top"><view class="step-dot"><ReIcon v-if="index < currentStep || order.status === 'COMPLETED'" name="check" color="white" :size="12" /><text v-else>{{ index + 1 }}</text></view><view v-if="index < ORDER_STEPS.length - 1" class="step-line" /></view>
        <text class="step-label">{{ step.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.order-progress { margin-bottom: 20px; padding: 24px 21px; border-radius: 22px; background: var(--color-brand-strong); }
.order-progress.ready { background: #694975; }
.order-progress.cancelled { background: #66748e; }
.status-heading { display: flex; align-items: center; gap: 14px; }
.status-icon { display: flex; width: 52px; height: 52px; flex: none; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.28); border-radius: 17px; }
.status-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 6px; }
.status-title { color: var(--color-surface); font-size: 24px; font-weight: 750; line-height: 1.3; }
.status-note { color: #d4ddf5; font-size: 12px; line-height: 1.6; }
.progress-track { display: flex; margin-top: 25px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.15); }
.progress-step { min-width: 0; flex: 1; }
.step-top { display: flex; align-items: center; margin-bottom: 9px; }
.step-dot { display: flex; width: 20px; height: 20px; flex: none; align-items: center; justify-content: center; border: 1px solid #768ac4; border-radius: 50%; color: #a8b8df; font-size: 10px; }
.step-line { height: 1px; flex: 1; margin: 0 6px; background: #768ac4; }
.step-label { color: #a8b8df; font-size: 10px; }
.done .step-dot { border-color: #c3cff7; color: #ffffff; }
.done .step-label { color: #e8edff; }
.current .step-dot { background: rgba(255,255,255,0.16); }
.progress-step:last-child { max-width: 45px; }
</style>
