<script setup lang="ts">
import { computed } from "vue";
import FoodImage from "./FoodImage.vue";
import ReIcon from "./ReIcon.vue";
import type { Shop } from "../types";

const props = defineProps<{ shop: Shop }>();
defineEmits<{ open: [] }>();
const cover = computed(() => props.shop.products.find((product) => product.image)?.image);
const categories = computed(() => props.shop.categories.slice(0, 3));
</script>

<template>
  <view class="shop-row" role="button" :aria-label="`进入${shop.name}`" @click="$emit('open')">
    <FoodImage :src="cover" :size="78" icon="store" />
    <view class="shop-info">
      <view class="name-row">
        <text class="shop-name">{{ shop.name }}</text>
        <van-tag color="#fff0e5" text-color="#a43e1d">营业中</van-tag>
      </view>
      <text class="notice">{{ shop.notice || '欢迎光临' }}</text>
      <view class="category-row">
        <text v-for="category in categories" :key="category.id" class="category">{{ category.name }}</text>
      </view>
      <view class="pickup-row">
        <ReIcon name="bag" color="secondary" :size="13" />
        <text>到店自取</text>
        <text class="menu-count">{{ shop.products.filter((product) => product.isAvailable).length }} 道菜品</text>
      </view>
    </view>
    <ReIcon name="chevron-right" color="secondary" :size="18" />
  </view>
</template>

<style scoped>
.shop-row { display: flex; align-items: center; gap: 12px; padding: 20px 0; border-bottom: 1px solid var(--color-border); }
.shop-info { min-width: 0; flex: 1; }
.name-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.shop-name { min-width: 0; flex: 1; overflow-wrap: anywhere; font-size: 16px; font-weight: 700; }
.notice { display: block; overflow: hidden; margin-top: 6px; color: var(--color-text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.category-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.category { padding: 2px 6px; border-radius: 4px; background: #f5f3ef; color: #6f675f; font-size: 10px; }
.pickup-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 8px; color: var(--color-text-secondary); font-size: 11px; }
.menu-count { margin-left: 3px; }
</style>
