<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import IconButton from "./IconButton.vue";
import EmptyIllustration from "./icons/EmptyIllustration.vue";
withDefaults(defineProps<{
  loading?: boolean; error?: string; empty?: boolean; emptyText?: string; actionText?: string;
  skeleton?: "list" | "card";
}>(), { loading: false, error: "", empty: false, emptyText: "这里还没有内容", actionText: "", skeleton: "list" });
defineEmits<{ action: [] }>();
</script>
<template>
  <view v-if="loading" :class="['loading-state', skeleton]" role="status" aria-label="正在加载">
    <view v-for="index in 3" :key="index" class="skeleton-row">
      <view v-if="skeleton === 'list'" class="skeleton-image skeleton-block" />
      <view class="skeleton-lines"><view class="skeleton-block line-long" /><view class="skeleton-block line-short" /><view class="skeleton-block line-medium" /></view>
      <view v-if="skeleton === 'card'" class="skeleton-footer"><view class="skeleton-block" /></view>
    </view>
  </view>
  <view v-else-if="error || empty" class="empty-state motion-enter" :role="error ? 'alert' : 'status'">
    <EmptyIllustration :error="Boolean(error)" />
    <text class="state-message">{{ error || emptyText }}</text>
    <view v-if="actionText" class="state-action" role="button" @click="$emit('action')"><text>{{ actionText }}</text><IconButton :name="error ? 'refresh' : 'arrow-right'" :label="actionText" compact @click="$emit('action')" /></view>
  </view>
</template>
<style scoped>
.loading-state { padding: var(--space-2) 0; }
.skeleton-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) 0; border-bottom: 2rpx solid var(--color-border); }
.skeleton-image { width: 144rpx; height: 144rpx; flex: none; border-radius: var(--radius-card); }
.skeleton-lines { min-width: 0; flex: 1; }
.skeleton-block { background: linear-gradient(100deg, var(--color-input) 20%, var(--color-background) 45%, var(--color-input) 70%); background-size: 220% 100%; animation: loading-shimmer 1400ms ease-in-out infinite; }
.skeleton-lines .skeleton-block { height: 20rpx; margin-bottom: var(--space-3); border-radius: var(--radius-control); }
.line-long { width: 82%; }.line-short { width: 48%; }.line-medium { width: 64%; }
.card .skeleton-row { display: block; margin-bottom: var(--space-3); padding: var(--space-4); border: 2rpx solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); }
.skeleton-footer { margin-top: var(--space-4); border-top: 2rpx solid var(--color-border); padding-top: var(--space-3); }
.skeleton-footer .skeleton-block { width: 30%; height: 24rpx; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); min-height: 400rpx; padding: var(--space-5) var(--space-2); box-sizing: border-box; text-align: center; }
.state-message { max-width: 560rpx; color: var(--color-text-secondary); font-size: var(--font-body); line-height: 1.6; overflow-wrap: anywhere; }
.state-action { display: flex; align-items: center; gap: var(--space-1); color: var(--color-brand); font-size: var(--font-body); }
@media (prefers-reduced-motion: reduce) { .skeleton-block { animation: none; } }
</style>

