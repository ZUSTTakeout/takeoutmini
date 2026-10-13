<script setup lang="ts">
import { nativeNumber } from "../utils/events";
import ReIcon from "./ReIcon.vue";

const props = withDefaults(defineProps<{
  value: number;
  max: number;
  disabled?: boolean;
}>(), { disabled: false });

const emit = defineEmits<{ change: [value: number] }>();

function change(event: unknown) {
  const quantity = nativeNumber(event);
  if (!props.disabled && Number.isFinite(quantity)) {
    emit("change", Math.min(props.max, Math.max(0, quantity)));
  }
}
</script>

<template>
  <view class="quantity-stepper" @click.stop>
    <van-stepper
      :value="value"
      :min="0"
      :max="max"
      :disabled="disabled"
      :integer="true"
      :disable-input="true"
      :async-change="true"
      theme="round"
      plus-class="quantity-plus"
      minus-class="quantity-minus"
      button-size="28px"
      input-width="26px"
      aria-label="商品数量"
      @change="change"
    >
      <view slot="minus" class="quantity-symbol"><ReIcon name="minus" color="brand" :size="17" /></view>
      <view slot="plus" class="quantity-symbol"><ReIcon name="add" color="white" :size="17" /></view>
    </van-stepper>
  </view>
</template>

<style scoped>
.quantity-stepper {
  display: flex;
  flex: none;
  align-items: center;
  --stepper-input-font-size: 13px;
  --stepper-input-text-color: var(--color-text);
}
.quantity-symbol { display: flex; height: 100%; align-items: center; justify-content: center; }
</style>

