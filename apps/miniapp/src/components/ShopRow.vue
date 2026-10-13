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
const categories = computed(() => props.shop.categories.slice(0, 3));
const menuCount = computed(() => props.shop.products.filter((product) => product.isAvailable).length);
</script>

<template>
  <view class="shop-row tap-feedback" role="button" :aria-label="`进入${shop.name}`" hover-class="tap-pressed" :hover-stay-time="100" @click="$emit('open')">
    <FoodImage :src="cover" :size="84" icon="store" />
    <view class="shop-info">
      <view class="name-row"><text class="shop-name">{{ shop.name }}</text><BusinessStatus :open="shop.isOpen" /></view>
      <text class="notice">{{ shop.notice || '欢迎光临' }}</text>
      <view class="pickup-row"><ReIcon name="bag" color="secondary" :size="13" /><text>到店自取</text><text class="meta-divider">/</text><text>{{ menuCount }} 道菜品</text></view>
      <view class="category-row"><text v-for="category in categories" :key="category.id" class="category">{{ category.name }}</text></view>
    </view>
    <ReIcon name="chevron-right" color="secondary" :size="16" />
  </view>
</template>

<style scoped>
.shop-row { display: flex; align-items: center; gap: 12px; padding: 19px 0; border-bottom: 1px solid var(--color-border); }
.shop-info { min-width: 0; flex: 1; }
.name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 8px; }
.shop-name { min-width: 0; flex: 1; color: var(--color-text); font-size: 16px; font-weight: 750; line-height: 1.5; overflow-wrap: anywhere; }
.notice { display: block; overflow: hidden; margin-top: 5px; color: var(--color-text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.pickup-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 8px; color: var(--color-text-secondary); font-size: 10px; }
.meta-divider { color: #c2cadb; margin: 0 2px; }
.category-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.category { padding: 2px 6px; border-radius: 5px; background: var(--color-brand-soft); color: var(--color-brand); font-size: 10px; }
.category:nth-child(2) { background: var(--color-accent-soft); color: var(--color-accent); }
.category:nth-child(3) { background: var(--color-success-soft); color: var(--color-success); }
</style>
