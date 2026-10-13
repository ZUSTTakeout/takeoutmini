<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import FoodImage from "./FoodImage.vue";
import ReIcon from "./ReIcon.vue";
withDefaults(defineProps<{ name: string; label: string; image?: string | null; merchant?: boolean; clickable?: boolean }>(), { image: "", merchant: false, clickable: false });
defineEmits<{ open: [] }>();
</script>

<template>
  <view :class="['account-identity', { clickable }]" :role="clickable ? 'button' : undefined" :aria-label="clickable ? '查看账号信息或登录' : undefined" hover-class="identity-pressed" @click="clickable && $emit('open')">
    <FoodImage v-if="merchant" :src="image" :size="76" icon="store" />
    <view v-else class="avatar"><ReIcon name="user" color="secondary" :size="32" /></view>
    <view class="identity-main"><text class="identity-name">{{ name }}</text><text class="identity-label">{{ label }}</text></view>
    <slot />
    <ReIcon v-if="clickable" name="chevron-right" color="secondary" :size="18" />
  </view>
</template>

<style scoped>
.account-identity { display: flex; align-items: center; gap: 34rpx; padding: 48rpx 0 56rpx; }
.avatar { display: flex; width: 152rpx; height: 152rpx; flex: none; align-items: center; justify-content: center; border: 8rpx solid var(--color-surface); border-radius: 50%; background: var(--color-input); color: var(--color-brand); font-size: var(--font-title); font-weight: 750;  }
.identity-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 18rpx; }
.identity-name { color: var(--color-text); font-size: var(--font-title); font-weight: 750; line-height: 1.4; overflow-wrap: anywhere; }
.identity-label { color: var(--color-text-secondary); font-size: var(--font-caption); line-height: 1.5; }
.clickable { min-height: 160rpx; }
.clickable.identity-pressed { opacity: .75; }
</style>
