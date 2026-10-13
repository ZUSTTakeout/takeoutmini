<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
defineProps<{ metrics: Array<{ label: string; value: string | number; accent?: boolean; wide?: boolean }> }>();
</script>

<template>
  <view class="stats-strip">
    <view v-for="metric in metrics" :key="metric.label" :class="['metric', { wide: metric.wide }]">
      <text class="metric-label">{{ metric.label }}</text><text :key="metric.value" :class="['metric-value', 'motion-count', { accent: metric.accent }]">{{ metric.value }}</text>
    </view>
  </view>
</template>

<style scoped>
.stats-strip { display: flex; padding: 46rpx 16rpx; border-radius: var(--radius-card); background: var(--color-surface); }
.metric { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; gap: var(--space-2); padding: 0 12rpx; text-align: center; }
.metric.wide { flex: 1.8; }
.metric + .metric { border-left: 2rpx solid var(--color-border); }
.metric-label { color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.5; }
.metric-value { max-width: 100%; color: var(--color-text); font-size: var(--font-title); font-weight: 750; line-height: 1.25; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.wide .metric-value { font-size: var(--font-title); }
.accent { color: var(--color-text-tertiary); }
</style>
