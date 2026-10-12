<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    error?: string;
    empty?: boolean;
    emptyText?: string;
    actionText?: string;
  }>(),
  {
    loading: false,
    error: "",
    empty: false,
    emptyText: "暂无内容",
    actionText: "",
  },
);

defineEmits<{ action: [] }>();
</script>

<template>
  <view v-if="loading" class="state" role="status">
    <view class="skeleton" aria-hidden="true">
      <view class="skeleton-mark" />
      <view class="skeleton-line wide" />
      <view class="skeleton-line" />
    </view>
    <text class="message">正在加载</text>
  </view>
  <view v-else-if="error" class="state" role="alert">
    <view class="state-icon error-icon" aria-hidden="true"><view class="error-mark" /></view>
    <text class="message">{{ error }}</text>
    <text v-if="actionText" class="action" role="button" @click="$emit('action')">
      {{ actionText }} →
    </text>
  </view>
  <view v-else-if="empty" class="state">
    <view class="state-icon empty-icon" aria-hidden="true"><view class="plate" /></view>
    <text class="message">{{ emptyText }}</text>
    <text v-if="actionText" class="action" role="button" @click="$emit('action')">
      {{ actionText }} →
    </text>
  </view>
</template>

<style scoped>
.state {
  display: flex;
  min-height: 260rpx;
  padding: 54rpx 24rpx;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #746a63;
  text-align: center;
}

.skeleton {
  display: flex;
  width: 250rpx;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.skeleton-mark,
.skeleton-line {
  height: 18rpx;
  border-radius: 999rpx;
  background: #f0e8e1;
}

.skeleton-mark {
  width: 78rpx;
  height: 78rpx;
  margin-bottom: 8rpx;
  border-radius: 22rpx;
  background: #f6e4d8;
}

.skeleton-line { width: 62%; }
.skeleton-line.wide { width: 100%; }

.state-icon {
  position: relative;
  display: flex;
  width: 76rpx;
  height: 76rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.error-icon { background: #f9e7e3; }
.error-mark { position: relative; width: 7rpx; height: 34rpx; border-radius: 8rpx; background: #b23b34; }
.error-mark::after { position: absolute; bottom: -12rpx; left: 0; width: 7rpx; height: 7rpx; border-radius: 50%; background: #b23b34; content: ""; }
.empty-icon { background: #fff0e5; }
.plate { width: 42rpx; height: 42rpx; border: 5rpx solid #c2673f; border-radius: 50%; }
.plate::after { display: block; width: 20rpx; height: 20rpx; margin: 6rpx; border: 3rpx solid #dda081; border-radius: 50%; content: ""; }

@media (prefers-reduced-motion: reduce) {
  .skeleton, .skeleton-mark, .skeleton-line { animation: none !important; }
}

.message {
  margin-top: 18rpx;
  font-size: 27rpx;
  line-height: 1.6;
}

.action {
  margin-top: 24rpx;
  color: #b34b26;
  font-size: 26rpx;
  font-weight: 700;
}
</style>
