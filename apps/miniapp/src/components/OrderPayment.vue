<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import { isPendingPayment } from "../utils/order";
import { formatMoney } from "../utils/format";
import { formatOrderTime } from "../utils/time";
import type { Order } from "../types";
const props = withDefaults(defineProps<{
  order: Order; merchant?: boolean; busy?: boolean;
}>(), { merchant: false, busy: false });
defineEmits<{ pay: [] }>();
const pending = computed(() => isPendingPayment(props.order));
const title = computed(() => ({
  NOT_REQUIRED: "", PENDING: "测试支付", PAID: "支付成功",
  CLOSED: "支付已关闭", REFUNDED: "测试支付已退回",
}[props.order.paymentStatus]));
const note = computed(() => {
  if (props.order.paymentStatus === "PAID" && props.order.paidAt) return formatOrderTime(props.order.paidAt);
  if (props.order.paymentStatus === "REFUNDED" && props.order.refundedAt) return formatOrderTime(props.order.refundedAt);
  return pending.value ? "本次不会实际扣款" : "测试支付 · 未实际扣款";
});
</script>
<template>
  <view v-if="order.paymentStatus !== 'NOT_REQUIRED'" class="payment-row">
    <ReIcon :name="pending ? 'orders' : order.paymentStatus === 'CLOSED' ? 'close' : 'check'" :color="pending ? 'brand' : 'secondary'" :size="22" />
    <view class="payment-copy"><text class="payment-title">{{ title }}</text><text class="payment-note">{{ note }}</text></view>
    <text class="payment-amount">{{ formatMoney(order.total) }}</text>
    <IconButton v-if="pending && !merchant" name="check" label="确认测试支付" variant="primary" :loading="busy" @click="$emit('pay')" />
  </view>
</template>
<style scoped>
.payment-row { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 2rpx solid var(--color-border); background: var(--color-surface); }
.payment-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-1); }
.payment-title { color: var(--color-text); font-size: var(--font-body); font-weight: 600; overflow-wrap: anywhere; }
.payment-note { color: var(--color-text-secondary); font-size: var(--font-caption); }
.payment-amount { flex: none; color: var(--color-text); font-size: var(--font-body); font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
