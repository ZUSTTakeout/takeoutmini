<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
withDefaults(defineProps<{ label: string; value: string; selectable?: boolean }>(), { selectable: false });
</script>
<template><view class="info-row"><text class="label">{{ label }}</text><text class="value" :user-select="selectable">{{ value }}</text></view></template>
<style scoped>
.info-row { display: flex; align-items: baseline; gap: var(--space-4); padding: var(--space-4) 0; border-bottom: 2rpx solid var(--color-border); font-size: var(--font-body); line-height: 1.6; }
.label { flex: none; color: var(--color-text-secondary); }
.value { flex: 1; min-width: 0; color: var(--color-text); text-align: right; overflow-wrap: anywhere; }
</style>
