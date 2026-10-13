<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
withDefaults(defineProps<{ title: string; eyebrow?: string; meta?: string }>(), { eyebrow: "", meta: "" });
</script>

<template>
  <view class="page-heading motion-enter">
    <view class="heading-main">
            <text class="heading-title">{{ title }}</text>
      <text v-if="meta" class="heading-meta">{{ meta }}</text>
    </view>
    <view class="heading-actions"><slot /></view>
  </view>
</template>

<style scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 32rpx; padding: var(--space-1) 0 var(--space-3); }
.heading-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.heading-eyebrow { margin-bottom: 14rpx; color: var(--color-brand); font-size: var(--font-caption); font-weight: 700; letter-spacing: 4rpx; line-height: 1.5; }
.heading-title { color: var(--color-text); font-size: var(--font-title); font-weight: 800; letter-spacing: -1rpx; line-height: 1.35; overflow-wrap: anywhere; }
.heading-meta { margin-top: var(--space-1); color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.5; }
.heading-actions { display: flex; flex: none; align-items: center; gap: 16rpx; }
</style>
