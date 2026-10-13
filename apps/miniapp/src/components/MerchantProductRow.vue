<script setup lang="ts">
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import { nativeDetail } from "../utils/events";
import { formatMoney } from "../utils/format";
import type { Product } from "../types";
withDefaults(defineProps<{ product: Product; category?: string; busy?: boolean }>(), { category: "未分类", busy: false });
defineEmits<{ edit: []; stock: [delta: number]; available: [value: boolean] }>();
</script>

<template>
  <view class="product-row">
    <view class="product-content"><image v-if="product.image" :src="product.image" class="product-image" mode="aspectFill" /><view v-else class="product-placeholder"><ReIcon name="restaurant" color="brand" :size="28" /></view><view class="product-main"><text class="product-name">{{ product.name }}</text><text class="category">{{ category }}</text><text class="price">{{ formatMoney(product.price) }}</text></view><view class="product-state"><van-switch :checked="product.isAvailable" :loading="busy" size="22px" active-color="#c4532b" inactive-color="#dfd9d2" @change="$emit('available', Boolean(nativeDetail($event)))" /><text>{{ product.isAvailable ? '在售' : '下架' }}</text></view></view>
    <view class="product-controls"><view class="stock"><text class="stock-label">库存</text><IconButton name="minus" label="减少库存" variant="secondary" :disabled="busy || product.stock <= 0" @click="$emit('stock', -1)" /><text class="stock-value">{{ product.stock }}</text><IconButton name="add" label="增加库存" variant="secondary" :disabled="busy || product.stock >= 1000000" @click="$emit('stock', 1)" /></view><IconButton name="edit" label="编辑商品" :disabled="busy" @click="$emit('edit')" /></view>
  </view>
</template>

<style scoped>
.product-row { padding: 26rpx 0; border-bottom: 1rpx solid #e8dfd6; }.product-content, .product-controls, .stock { display: flex; align-items: center; gap: 18rpx; }.product-image, .product-placeholder { width: 68px; height: 68px; flex: none; border-radius: 16rpx; background: #ffe9d8; }.product-placeholder { display: flex; align-items: center; justify-content: center; }
.product-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8rpx; }.product-name { overflow-wrap: anywhere; font-size: 14px; font-weight: 750; line-height: 1.5; }.category { color: #81766e; font-size: 10px; overflow-wrap: anywhere; }.price { color: #a43e1d; font-size: 14px; font-weight: 750; overflow-wrap: anywhere; }.product-state { display: flex; flex: none; flex-direction: column; align-items: center; gap: 10rpx; color: #81766e; font-size: 10px; }
.product-controls { justify-content: space-between; margin-top: 16rpx; }.stock { min-width: 0; gap: 12rpx; }.stock-label { color: #81766e; font-size: 10px; }.stock-value { min-width: 25px; color: #51463e; font-size: 11px; text-align: center; }
</style>
