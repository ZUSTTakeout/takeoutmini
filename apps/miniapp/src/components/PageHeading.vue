<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
withDefaults(defineProps<{ title: string; eyebrow?: string; meta?: string }>(), { eyebrow: "", meta: "" });
</script>

<template>
  <view class="page-heading motion-enter">
    <view class="heading-main">
      <text v-if="eyebrow" class="heading-eyebrow">{{ eyebrow }}</text>
      <text class="heading-title">{{ title }}</text>
      <text v-if="meta" class="heading-meta">{{ meta }}</text>
    </view>
    <view class="heading-actions"><slot /></view>
  </view>
</template>

<style scoped>
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 5px 0 22px; }
.heading-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.heading-eyebrow { margin-bottom: 7px; color: var(--color-brand); font-size: 10px; font-weight: 700; letter-spacing: 2px; line-height: 1.5; }
.heading-title { color: var(--color-text); font-size: var(--font-title); font-weight: 800; letter-spacing: -0.5px; line-height: 1.35; overflow-wrap: anywhere; }
.heading-meta { margin-top: 8px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; }
.heading-actions { display: flex; flex: none; align-items: center; gap: 8px; }
</style>
