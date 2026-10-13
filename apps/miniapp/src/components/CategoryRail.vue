<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import type { Category } from "../types";
defineProps<{ modelValue: string; categories: Category[]; }>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <view class="category-rail" role="tablist" aria-label="菜品分类">

    <view v-for="category in categories" :key="category.id" :class="['rail-item', { selected: modelValue === category.id }]" role="tab" :aria-selected="modelValue === category.id" hover-class="rail-pressed" @click="$emit('update:modelValue', category.id)"><text>{{ category.name }}</text></view>
  </view>
</template>

<style scoped>
.category-rail { width: 144rpx; box-sizing: border-box; flex: none; padding: 16rpx 0; background: var(--color-input); }
.rail-item { display: flex; min-height: 108rpx; box-sizing: border-box; align-items: center; padding: 24rpx 18rpx; border-left: 4rpx solid transparent; color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.5; overflow-wrap: anywhere; transition: background var(--motion-fast), color var(--motion-fast), border-color var(--motion-fast); }
.rail-item.selected { border-left-color: var(--color-brand); background: var(--color-surface); color: var(--color-brand); font-weight: 700; }
.rail-pressed { background: var(--color-brand-soft); }
@media (prefers-reduced-motion: reduce) { .rail-item { transition: none; } }
</style>
