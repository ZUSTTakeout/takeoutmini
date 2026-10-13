<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import FoodImage from "./FoodImage.vue";
import ReIcon from "./ReIcon.vue";
import BusinessStatus from "./BusinessStatus.vue";
import type { Shop } from "../types";
const props = defineProps<{ shop: Shop }>();
defineEmits<{ open: [] }>();
const cover = computed(() => props.shop.products.find((product) => product.image)?.image);
const hours = computed(() => /\d{1,2}[:：]\d{2}/.test(props.shop.notice || "") ? props.shop.notice : "");
</script>
<template>
  <view class="shop-row tap-feedback" role="button" :aria-label="`进入${shop.name}`" hover-class="tap-pressed" @click="$emit('open')">
    <FoodImage :src="cover" :size="80" />
    <view class="shop-info">
      <view class="name-row"><text class="shop-name">{{ shop.name }}</text><BusinessStatus :open="shop.isOpen" /></view>
      <text v-if="shop.description" class="description">{{ shop.description }}</text>
      <view v-if="hours" class="hours"><ReIcon name="clock" :size="12" /><text>{{ hours }}</text></view>
    </view>
    <ReIcon name="chevron-right" color="secondary" :size="14" />
  </view>
</template>
<style scoped>
.shop-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) 0; border-bottom: 2rpx solid var(--color-border); }
.shop-info { min-width: 0; flex: 1; }
.name-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); }
.shop-name { min-width: 0; color: var(--color-text); font-size: var(--font-body); font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.description { display: block; overflow: hidden; margin-top: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); text-overflow: ellipsis; white-space: nowrap; }
.hours { display: flex; align-items: flex-start; gap: var(--space-1); margin-top: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); }
.hours text { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
