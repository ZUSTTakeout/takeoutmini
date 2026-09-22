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
    <text class="symbol">⋯</text>
    <text class="message">正在加载</text>
  </view>
  <view v-else-if="error" class="state" role="alert">
    <text class="symbol error-symbol">!</text>
    <text class="message">{{ error }}</text>
    <text v-if="actionText" class="action" role="button" @click="$emit('action')">
      {{ actionText }} →
    </text>
  </view>
  <view v-else-if="empty" class="state">
    <text class="symbol">—</text>
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

.symbol {
  color: #c2673f;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1;
}

.error-symbol {
  color: #b23b34;
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
