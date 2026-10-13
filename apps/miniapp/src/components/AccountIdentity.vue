<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import FoodImage from "./FoodImage.vue";
withDefaults(defineProps<{ name: string; label: string; image?: string | null; merchant?: boolean }>(), { image: "", merchant: false });
</script>

<template>
  <view class="account-identity motion-enter">
    <FoodImage v-if="merchant" :src="image" :size="76" icon="store" />
    <view v-else class="avatar">{{ name.slice(0, 1) || '食' }}</view>
    <view class="identity-main"><text class="identity-name">{{ name }}</text><text class="identity-label">{{ label }}</text></view>
    <slot />
  </view>
</template>

<style scoped>
.account-identity { display: flex; align-items: center; gap: 17px; padding: 24px 0 28px; }
.avatar { display: flex; width: 76px; height: 76px; flex: none; align-items: center; justify-content: center; border: 4px solid var(--color-surface); border-radius: 50%; background: var(--color-brand-soft); color: var(--color-brand); font-size: 29px; font-weight: 750; box-shadow: 0 4px 16px rgba(65,99,207,0.06); }
.identity-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 9px; }
.identity-name { color: var(--color-text); font-size: 21px; font-weight: 750; line-height: 1.4; overflow-wrap: anywhere; }
.identity-label { color: var(--color-text-secondary); font-size: 11px; line-height: 1.5; }
</style>
