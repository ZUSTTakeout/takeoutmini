<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
withDefaults(defineProps<{ value: number; max: number; disabled?: boolean }>(), { disabled: false });
defineEmits<{ change: [value: number] }>();
</script>

<template>
  <view class="quantity-stepper" @click.stop>
    <IconButton name="minus" label="减少数量" variant="secondary" compact :disabled="disabled || value <= 0" @click="$emit('change', Math.max(0, value - 1))" />
    <text :key="value" class="quantity-value motion-count" role="status" aria-label="商品数量">{{ value }}</text>
    <IconButton name="add" label="增加数量" variant="primary" compact :disabled="disabled || value >= max" @click="$emit('change', Math.min(max, value + 1))" />
  </view>
</template>

<style scoped>
.quantity-stepper { display: flex; flex: none; align-items: center; gap: 2px; }
.quantity-value { min-width: 24px; color: var(--color-text); font-size: 13px; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
</style>

