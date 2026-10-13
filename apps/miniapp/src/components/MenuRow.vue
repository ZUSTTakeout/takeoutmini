<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
import { iconColors, type ReIconName } from "../icons";
withDefaults(defineProps<{
  title: string; icon: ReIconName; color?: string; loading?: boolean; border?: boolean; danger?: boolean; value?: string;
}>(), { color: "brand", loading: false, border: true, danger: false, value: "" });
defineEmits<{ click: [] }>();
</script>

<template>
  <view :class="['menu-row', { border, danger }]" role="button" :aria-label="title" hover-class="menu-pressed" :hover-stay-time="100" @click="$emit('click')">
    <view :class="['menu-icon', { berry: danger || color === 'danger', sky: color === 'success' }]"><ReIcon :name="icon" :color="danger ? 'danger' : color" :size="22" /></view>
    <text class="menu-title">{{ title }}</text>
    <text v-if="value" class="menu-value">{{ value }}</text>
    <van-loading v-if="loading" size="18px" :color="iconColors.brand" />
    <ReIcon v-else name="chevron-right" color="secondary" :size="17" />
  </view>
</template>

<style scoped>
.menu-row { display: flex; min-height: 74px; box-sizing: border-box; align-items: center; gap: 13px; padding: 14px 18px; background: var(--color-surface); transition: background var(--motion-fast); }
.menu-row.border { border-bottom: 1px solid var(--color-border); }
.menu-pressed { background: var(--color-brand-soft); }
.menu-icon { display: flex; width: 37px; height: 37px; flex: none; align-items: center; justify-content: center; border-radius: 12px; background: var(--color-brand-soft); }
.berry { background: var(--color-accent-soft); }
.sky { background: var(--color-success-soft); }
.menu-title { min-width: 0; flex: 1; color: var(--color-text); font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.danger .menu-title { color: var(--color-accent); }
.menu-value { color: var(--color-text-secondary); font-size: 11px; }
@media (prefers-reduced-motion: reduce) { .menu-row { transition: none; } }
</style>
