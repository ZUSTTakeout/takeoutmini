<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import FoodImage from "./FoodImage.vue";
import BusinessStatus from "./BusinessStatus.vue";
import ReIcon from "./ReIcon.vue";
import type { Shop } from "../types";
const props = defineProps<{ shop: Shop }>();
defineEmits<{ open: [] }>();
const cover = computed(() => props.shop.products.find((product) => product.image)?.image);
const hours = computed(() => /\d{1,2}[:：]\d{2}/.test(props.shop.notice || "") ? props.shop.notice : "");
</script>

<template>
  <view class="gallery-shop tap-feedback" role="button" :aria-label="`进入${shop.name}`" hover-class="tap-pressed" @click="$emit('open')">
    <view class="gallery-cover"><FoodImage :src="cover" fill /></view>
    <text class="shop-name">{{ shop.name }}</text>
    <BusinessStatus :open="shop.isOpen" />
    <text v-if="shop.description" class="description">{{ shop.description }}</text>
    <view v-if="hours" class="hours"><ReIcon name="clock" :size="12" /><text>{{ hours }}</text></view>
  </view>
</template>

<style scoped>
.gallery-shop { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: var(--space-1); padding-bottom: var(--space-3); }
.gallery-cover { width: 100%; height: 224rpx; overflow: hidden; margin-bottom: var(--space-1); border-radius: var(--radius-card); }
.shop-name { color: var(--color-text); font-size: var(--font-body); font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.description { width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: var(--font-caption); text-overflow: ellipsis; white-space: nowrap; }
.hours { display: flex; width: 100%; min-width: 0; align-items: center; gap: var(--space-1); color: var(--color-text-secondary); font-size: var(--font-caption); }
.hours text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
