<script setup lang="ts">
import { computed } from "vue";
import ReIcon from "./ReIcon.vue";
import OrderStatus from "./OrderStatus.vue";
import { ORDER_STEPS, STATUS_TEXT } from "../utils/order";
import type { Order } from "../types";

const props = defineProps<{ order: Order }>();
const currentStep = computed(() => ORDER_STEPS.findIndex((step) => step.status === props.order.status));
const steps = ORDER_STEPS.map((step) => ({ text: step.label }));
const statusNote = computed(() => ({
  CREATED: "等待商户确认餐点",
  ACCEPTED: "餐点正在制作中",
  READY: "餐点已备好，请到店取餐",
  COMPLETED: "本次取餐已完成",
  CANCELLED: "本次订单已取消",
}[props.order.status]));
</script>

<template>
  <view class="order-progress">
    <view class="status-heading">
      <view :class="['status-icon', { cancelled: order.status === 'CANCELLED' }]">
        <ReIcon :name="order.status === 'CANCELLED' ? 'close' : order.status === 'COMPLETED' ? 'check' : 'bag'" :color="order.status === 'CANCELLED' ? 'secondary' : 'brand'" :size="30" />
      </view>
      <view class="status-main">
        <view class="status-title">{{ STATUS_TEXT[order.status] }}</view>
        <view class="status-note">{{ statusNote }}</view>
      </view>
      <OrderStatus :status="order.status" />
    </view>
    <van-steps
      v-if="order.status !== 'CANCELLED'"
      :steps="steps"
      :active="currentStep"
      active-color="#c4532b"
      inactive-color="#b8aaa0"
      active-icon="/static/icons/check-brand.png"
      custom-class="order-steps"
    />
  </view>
</template>

<style scoped>
.order-progress { margin-bottom: 25px; }
.status-heading { display: flex; align-items: center; gap: 13px; padding: 5px 0 22px; }
.status-icon { display: flex; width: 54px; height: 54px; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: var(--color-brand-soft); }
.status-icon.cancelled { background: #ece7e1; }
.status-main { min-width: 0; flex: 1; }
.status-title { color: #342b25; font-size: 23px; font-weight: 800; line-height: 1.3; }
.status-note { margin-top: 5px; color: #89786b; font-size: 12px; line-height: 1.5; }
</style>
