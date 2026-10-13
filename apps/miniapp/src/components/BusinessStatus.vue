<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
defineProps<{ open: boolean }>();
</script>

<template>
  <view :class="['business-status', { closed: !open }]">
    <view class="status-dot" /><text>{{ open ? '营业中' : '休息中' }}</text>
  </view>
</template>

<style scoped>
.business-status { display: inline-flex; flex: none; align-items: center; gap: 5px; color: var(--color-success); font-size: 10px; font-weight: 650; white-space: nowrap; }
.status-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--color-success); }
.closed { color: var(--color-text-secondary); }
.closed .status-dot { background: var(--color-text-secondary); }
</style>
