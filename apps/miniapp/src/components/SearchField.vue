<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { ref } from "vue";
import ReIcon from "./ReIcon.vue";
import { nativeValue } from "../utils/events";
withDefaults(defineProps<{ modelValue: string; placeholder?: string; disabled?: boolean }>(), { placeholder: "搜索店铺或美食", disabled: false });
defineEmits<{ "update:modelValue": [value: string]; search: [value: string] }>();
const focused = ref(false);
</script>

<template>
  <view :class="['search-field', { focused }]">
    <ReIcon name="search" :color="focused ? 'brand' : 'secondary'" :size="20" />
    <input class="search-input" :value="modelValue" :placeholder="placeholder" :disabled="disabled" :aria-label="placeholder" confirm-type="search" :maxlength="100" placeholder-class="search-placeholder" @input="$emit('update:modelValue', nativeValue($event))" @confirm="$emit('search', nativeValue($event))" @focus="focused = true" @blur="focused = false" />
    <button v-if="modelValue" class="search-clear" aria-label="清空搜索" :disabled="disabled" @click="$emit('update:modelValue', '')"><ReIcon name="close" color="secondary" :size="17" /></button>
  </view>
</template>

<style scoped>
.search-field { display: flex; min-height: 96rpx; box-sizing: border-box; align-items: center; gap: 20rpx; padding: 0 30rpx; border: 2rpx solid var(--color-border); border-radius: var(--radius-card); background: var(--color-input); transition: border-color var(--motion-fast), box-shadow var(--motion-fast); }
.search-field.focused { border-color: var(--color-brand);  }
.search-input { min-width: 0; height: 92rpx; flex: 1; color: var(--color-text); font-size: var(--font-body); }
.search-placeholder { color: var(--color-text-secondary); }
.search-clear { display: flex; width: 88rpx; height: 88rpx; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; background: transparent; line-height: 1; }
@media (prefers-reduced-motion: reduce) { .search-field { transition: none; } }
</style>
