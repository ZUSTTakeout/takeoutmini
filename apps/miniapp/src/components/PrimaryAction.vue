<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
import type { IconName } from "../icons";
withDefaults(defineProps<{ label: string; icon?: IconName; loading?: boolean; disabled?: boolean }>(), { icon: "arrow-right", loading: false, disabled: false });
defineEmits<{ click: [] }>();
</script>
<template><button class="primary-action" :disabled="disabled || loading" :aria-busy="loading" hover-class="action-pressed" @click.stop="!disabled && !loading && $emit('click')"><ReIcon :name="loading ? 'refresh' : icon" :class="{ spinning: loading }" :size="18" /><text>{{ loading ? '请稍候' : label }}</text></button></template>
<style scoped>
.primary-action { display: flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 96rpx; margin: 0; padding: var(--space-2) var(--space-4); border: 0; border-radius: var(--radius-control); background: var(--color-brand); color: var(--color-surface); font-size: var(--font-body); font-weight: 600; line-height: 1.4; }
.primary-action[disabled] { background: var(--color-brand); color: var(--color-surface); opacity: .5; }
.action-pressed { opacity: .8; }
.spinning { animation: action-spin 800ms linear infinite; } @keyframes action-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinning { animation: none; } }
</style>
