<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: number;
    max: number;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{ change: [value: number] }>();

function decrease() {
  if (!props.disabled) emit("change", Math.max(0, props.value - 1));
}

function increase() {
  if (!props.disabled && props.value < props.max) emit("change", props.value + 1);
}
</script>

<template>
  <view class="stepper" @click.stop>
    <button
      class="icon-button secondary"
      :disabled="disabled"
      aria-label="减少一份"
      @click.stop="decrease"
    >
      −
    </button>
    <text class="quantity">{{ value }}</text>
    <button
      class="icon-button"
      :disabled="disabled || value >= max"
      aria-label="增加一份"
      @click.stop="increase"
    >
      ＋
    </button>
  </view>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.icon-button {
  width: 58rpx;
  height: 58rpx;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: #c4532b;
  color: #fff;
  font-size: 34rpx;
  line-height: 54rpx;
}

.icon-button.secondary {
  border: 2rpx solid #d7c9bd;
  background: #fff;
  color: #5f554e;
}

.icon-button[disabled] {
  background: #e8dfd7;
  color: #a79d96;
  opacity: 1;
}

.quantity {
  min-width: 34rpx;
  color: #2d2824;
  font-size: 27rpx;
  font-weight: 700;
  text-align: center;
}
</style>
