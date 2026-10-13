<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
withDefaults(defineProps<{
  loading?: boolean; error?: string; empty?: boolean; emptyText?: string; actionText?: string;
}>(), { loading: false, error: "", empty: false, emptyText: "暂无内容", actionText: "" });
defineEmits<{ action: [] }>();
</script>

<template>
  <view v-if="loading" class="state loading-state" role="status" aria-label="正在加载">
    <view v-for="index in 3" :key="index" class="skeleton-row">
      <view class="skeleton-image skeleton" /><view class="skeleton-lines"><view class="skeleton line-long" /><view class="skeleton line-short" /><view class="skeleton line-medium" /></view>
    </view>
  </view>
  <view v-else-if="error || empty" class="state empty-state motion-enter" :role="error ? 'alert' : 'status'">
    <view class="state-image"><ReIcon :name="error ? 'alert' : 'empty'" :color="error ? 'danger' : 'secondary'" :size="36" /></view>
    <text class="state-message">{{ error || emptyText }}</text>
    <view v-if="actionText" class="state-action"><text>{{ actionText }}</text><IconButton :name="error ? 'refresh' : 'arrow-right'" :label="actionText" variant="secondary" compact @click="$emit('action')" /></view>
  </view>
</template>

<style scoped>
.state { min-height: 200px; box-sizing: border-box; }
.loading-state { padding: 16px 0; }
.skeleton-row { display: flex; align-items: center; gap: 14px; padding: 20px 0; border-bottom: 1px solid var(--color-border); }
.skeleton-image { width: 70px; height: 70px; flex: none; border-radius: 14px; }
.skeleton-lines { min-width: 0; flex: 1; }
.skeleton { background: linear-gradient(100deg, #e9edf6 20%, #f5f7fb 45%, #e9edf6 70%); background-size: 220% 100%; animation: loading-shimmer 1500ms ease-in-out infinite; }
.skeleton-lines .skeleton { height: 10px; margin-bottom: 12px; border-radius: 3px; }
.line-long { width: 85%; }.line-short { width: 50%; }.line-medium { width: 65%; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 35px 8px; text-align: center; }
.state-image { display: flex; width: 72px; height: 72px; align-items: center; justify-content: center; border-radius: 24px; background: var(--color-input); }
.state-message { max-width: 280px; color: var(--color-text-secondary); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.state-action { display: flex; align-items: center; gap: 10px; color: var(--color-brand); font-size: 12px; }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
</style>

