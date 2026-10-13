<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
withDefaults(defineProps<{
  modelValue: string;
  items: Array<{ name: string; title: string; count?: number }>;
  label?: string;
}>(), { label: "筛选" });
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <scroll-view scroll-x :show-scrollbar="false" class="filter-scroll">
    <view class="filter-tabs" role="tablist" :aria-label="label">
      <view v-for="item in items" :key="item.name" :class="['filter-tab', { selected: item.name === modelValue }]" role="tab" :aria-selected="item.name === modelValue" hover-class="filter-pressed" :hover-stay-time="100" @click="$emit('update:modelValue', item.name)">
        <view class="tab-label"><text>{{ item.title }}</text><text v-if="item.count !== undefined" class="tab-count">{{ item.count }}</text></view>
        <view class="tab-line" />
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
.filter-scroll { width: 100%; border-bottom: 2rpx solid var(--color-border); white-space: nowrap; }
.filter-tabs { display: inline-flex; min-width: 100%; }
.filter-tab { display: flex; min-width: 152rpx; min-height: 96rpx; box-sizing: border-box; flex: 1; flex-direction: column; align-items: center; justify-content: flex-end; gap: 24rpx; padding: 16rpx 20rpx 0; color: var(--color-text-secondary); font-size: var(--font-body); transition: color var(--motion-fast), background var(--motion-fast); }
.tab-label { display: flex; align-items: center; justify-content: center; gap: 10rpx; }
.tab-count { font-size: var(--font-caption); opacity: 0.8; }
.tab-line { width: 36rpx; height: 6rpx; border-radius: var(--radius-control); background: var(--color-brand); opacity: 0; transform: scaleX(0.35); transition: opacity var(--motion-normal), transform var(--motion-normal); }
.selected { color: var(--color-brand); font-weight: 700; }
.selected .tab-line { opacity: 1; transform: scaleX(1); }
.filter-pressed { background: var(--color-brand-soft); }
@media (prefers-reduced-motion: reduce) { .filter-tab, .tab-line { transition: none; } }
</style>
