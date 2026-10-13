<script setup lang="ts">
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";

withDefaults(defineProps<{
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyText?: string;
  actionText?: string;
}>(), {
  loading: false,
  error: "",
  empty: false,
  emptyText: "暂无内容",
  actionText: "",
});

defineEmits<{ action: [] }>();
</script>

<template>
  <view v-if="loading" class="state loading-state" role="status">
    <van-loading color="#c4532b" size="24px">正在加载</van-loading>
    <view class="skeleton-placeholder">
      <van-skeleton :row="3" :loading="true" row-width="100%" />
    </view>
  </view>
  <view v-else-if="error || empty" class="state" :role="error ? 'alert' : 'status'">
    <van-empty :description="error || emptyText" custom-class="compact-empty">
      <view slot="image" class="state-image">
        <ReIcon :name="error ? 'alert' : 'empty'" :color="error ? 'danger' : 'secondary'" :size="44" />
      </view>
      <view v-if="actionText" class="state-action">
        <text>{{ actionText }}</text>
        <IconButton name="arrow-right" :label="actionText" variant="secondary" @click="$emit('action')" />
      </view>
    </van-empty>
  </view>
</template>

<style scoped>
.state {
  display: flex;
  min-height: 220px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  text-align: center;
  --loading-text-font-size: 13px;
}
.loading-state { flex-direction: column; gap: 28px; padding: 30px 16px; }
.skeleton-placeholder { width: 100%; }
.state-image { display: flex; height: 60px; align-items: center; justify-content: center; }
.state-action { display: flex; align-items: center; gap: 12px; color: var(--color-brand); font-size: 13px; }
</style>

