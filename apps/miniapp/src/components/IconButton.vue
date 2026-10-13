<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
import { iconColors, type ReIconName } from "../icons";
withDefaults(defineProps<{
  name: ReIconName; label: string; disabled?: boolean; loading?: boolean;
  variant?: "plain" | "primary" | "secondary" | "danger"; compact?: boolean;
}>(), { disabled: false, loading: false, variant: "plain", compact: false });
defineEmits<{ click: [] }>();
</script>

<template>
  <button
    :class="['icon-button', variant, { compact, busy: loading, inactive: disabled || loading }]"
    :disabled="disabled || loading" :aria-label="label" :aria-busy="loading"
    hover-class="icon-pressed" :hover-start-time="0" :hover-stay-time="120"
    @click.stop="!disabled && !loading && $emit('click')"
  >
    <van-loading v-if="loading" :color="variant === 'primary' ? iconColors.white : iconColors.brand" :size="compact ? '16px' : '20px'" />
    <ReIcon v-else :name="name" :color="variant === 'primary' ? 'white' : variant === 'danger' ? 'danger' : 'brand'" :size="compact ? 18 : 22" />
  </button>
</template>

<style scoped>
.icon-button { display: flex; width: 44px; height: 44px; min-width: 44px; box-sizing: border-box; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 50%; background: transparent; line-height: 1; transition: transform var(--motion-fast), background var(--motion-fast), opacity var(--motion-fast); }
.primary { background: var(--color-brand); box-shadow: 0 4px 10px rgba(65, 99, 207, 0.16); }
.secondary { background: var(--color-brand-soft); }
.danger { background: var(--color-danger-soft); }
.compact { width: 38px; height: 38px; min-width: 38px; }
.icon-button.icon-pressed { opacity: 0.75; transform: scale(0.92); }
.icon-button.inactive { opacity: 0.5; box-shadow: none; }
button.icon-button.primary[disabled] { background: var(--color-brand); }
button.icon-button.secondary[disabled] { background: var(--color-brand-soft); }
button.icon-button.danger[disabled] { background: var(--color-danger-soft); }
button.icon-button.plain[disabled] { background: transparent; }
.icon-button.busy { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .icon-button { transition: none; } .icon-button.icon-pressed { transform: none; } }
</style>
