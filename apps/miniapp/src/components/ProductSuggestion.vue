<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import FoodImage from "./FoodImage.vue";
import IconButton from "./IconButton.vue";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";
withDefaults(defineProps<{ product: Product; disabled?: boolean }>(), { disabled: false });
defineEmits<{ add: [] }>();
</script>

<template>
  <view class="suggestion">
    <FoodImage :src="product.image" :size="86" />
    <text class="suggestion-name">{{ product.name }}</text>
    <view class="suggestion-bottom"><text class="suggestion-price">{{ formatMoney(product.price) }}</text><IconButton name="add" :label="`加购${product.name}`" variant="secondary" compact :disabled="disabled" @click="$emit('add')" /></view>
  </view>
</template>

<style scoped>
.suggestion { min-width: 0; box-sizing: border-box; padding: 17px 14px 12px; border-radius: var(--radius-card); background: var(--color-surface); }
.suggestion-name { display: block; margin-top: 12px; color: var(--color-text); font-size: 13px; font-weight: 650; line-height: 1.5; overflow-wrap: anywhere; }
.suggestion-bottom { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 8px; }
.suggestion-price { min-width: 0; color: var(--color-accent); font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
</style>
