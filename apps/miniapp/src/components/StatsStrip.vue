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
.stats-strip { display: flex; padding: 23px 8px; border-radius: var(--radius-card); background: var(--color-text); }
.metric { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; gap: 12px; padding: 0 6px; text-align: center; }
.metric.wide { flex: 1.8; }
.metric + .metric { border-left: 1px solid #3f4d6c; }
.metric-label { color: #b6c2da; font-size: 10px; line-height: 1.5; }
.metric-value { max-width: 100%; color: var(--color-surface); font-size: 24px; font-weight: 750; line-height: 1.25; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.wide .metric-value { font-size: 20px; }
.accent { color: #e6b9d0; }
</style>
