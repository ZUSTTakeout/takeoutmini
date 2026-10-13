<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed, reactive, watch } from "vue";
import FoodImage from "./FoodImage.vue";
import IconButton from "./IconButton.vue";
import ReIcon from "./ReIcon.vue";
import { nativeDetail, nativeValue } from "../utils/events";
import type { Category, Product } from "../types";

interface Draft { name: string; priceYuan: string; stock: string; categoryId: string; description: string; image: string; isAvailable: boolean }
const props = defineProps<{ show: boolean; product: Product | null; categories: Category[]; saving: boolean }>();
const emit = defineEmits<{ close: []; save: [draft: Draft]; addCategory: [] }>();
const draft = reactive<Draft>({ name: "", priceYuan: "", stock: "0", categoryId: "", description: "", image: "", isAvailable: true });
const categoryIndex = computed(() => Math.max(0, props.categories.findIndex((category) => category.id === draft.categoryId)));
const categoryName = computed(() => props.categories.find((category) => category.id === draft.categoryId)?.name || "选择分类");
watch(() => props.show, (show) => {
  if (!show) return;
  const product = props.product;
  Object.assign(draft, product ? { name: product.name, priceYuan: (product.price / 100).toFixed(2), stock: String(product.stock), categoryId: product.categoryId, description: product.description ?? "", image: product.image ?? "", isAvailable: product.isAvailable } : { name: "", priceYuan: "", stock: "0", categoryId: props.categories[0]?.id ?? "", description: "", image: "", isAvailable: true });
});
watch(() => props.categories, (categories) => { if (!draft.categoryId) draft.categoryId = categories[0]?.id ?? ""; });
function chooseCategory(event: unknown) {
  const index = Number(nativeDetail<{ value: string }>(event).value);
  const category = props.categories[index];
  if (category) draft.categoryId = category.id;
}
</script>

<template>
  <van-popup :show="show" position="bottom" round :duration="160" :close-on-click-overlay="!saving" :safe-area-inset-bottom="false" custom-style="height:88vh;" @close="!saving && $emit('close')">
    <view class="editor">
      <view class="sheet-handle" />
      <view class="editor-heading"><IconButton name="close" label="关闭商品编辑" :disabled="saving" @click="$emit('close')" /><text class="editor-title">{{ product ? '编辑商品' : '新增商品' }}</text><IconButton name="save" label="保存商品" variant="primary" :loading="saving" @click="emit('save', { ...draft })" /></view>
      <scroll-view scroll-y class="editor-scroll" :show-scrollbar="false">
        <view class="editor-body">
          <view class="image-preview"><FoodImage :src="draft.image" :size="96" /><view class="image-heading"><text class="image-name">{{ draft.name || '商品图片' }}</text><text class="image-caption">{{ product ? '商品信息' : '新商品' }}</text></view></view>
          <view class="editor-field"><text class="form-label">商品名称</text><input class="form-input" :value="draft.name" placeholder-class="form-placeholder" placeholder="填写商品名称" aria-label="商品名称" :maxlength="60" :disabled="saving" @input="draft.name = nativeValue($event)" /></view>
          <view class="field-columns">
            <view class="editor-field"><text class="form-label">价格（元）</text><input class="form-input" :value="draft.priceYuan" type="digit" placeholder-class="form-placeholder" placeholder="0.00" aria-label="商品价格" :maxlength="10" :disabled="saving" @input="draft.priceYuan = nativeValue($event)" /></view>
            <view class="editor-field"><text class="form-label">库存数量</text><input class="form-input" :value="draft.stock" type="number" placeholder-class="form-placeholder" placeholder="0" aria-label="库存数量" :maxlength="7" :disabled="saving" @input="draft.stock = nativeValue($event)" /></view>
          </view>
          <view class="editor-field">
            <view class="category-heading"><text class="form-label">商品分类</text><IconButton name="add" label="新增商品分类" compact :disabled="saving" @click="$emit('addCategory')" /></view>
            <picker mode="selector" :range="categories" range-key="name" :value="categoryIndex" :disabled="saving || !categories.length" @change="chooseCategory"><view class="category-picker"><text>{{ categoryName }}</text><ReIcon name="chevron-right" color="secondary" :size="17" /></view></picker>
          </view>
          <view class="editor-field"><text class="form-label">商品描述</text><textarea class="form-input form-textarea description-input" :value="draft.description" placeholder-class="form-placeholder" placeholder="填写商品描述" aria-label="商品描述" :maxlength="500" :disabled="saving" @input="draft.description = nativeValue($event)" /><view class="character-count">{{ draft.description.length }}/500</view></view>
          <view class="editor-field"><text class="form-label">图片地址</text><input class="form-input" :value="draft.image" placeholder-class="form-placeholder" placeholder="选填" aria-label="商品图片地址" :maxlength="2048" :disabled="saving" @input="draft.image = nativeValue($event)" /></view>
          <view class="availability"><view><text class="availability-title">上架状态</text><text class="availability-value">{{ draft.isAvailable ? '在售' : '下架' }}</text></view><van-switch :checked="draft.isAvailable" :disabled="saving" size="52rpx" active-color="var(--color-brand)" inactive-color="var(--color-border)" @change="draft.isAvailable = Boolean(nativeDetail($event))" /></view>
        </view>
      </scroll-view>
    </view>
  </van-popup>
</template>

<style scoped>
.editor { display: flex; height: 100%; box-sizing: border-box; flex-direction: column; padding: 22rpx 40rpx calc(36rpx + env(safe-area-inset-bottom)); }
.sheet-handle { width: 64rpx; height: 8rpx; flex: none; align-self: center; margin-bottom: 18rpx; border-radius: var(--radius-control); background: var(--color-border); }
.editor-heading { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 28rpx; padding-bottom: 30rpx; border-bottom: 2rpx solid var(--color-border); }
.editor-title { color: var(--color-text); font-size: var(--font-title); font-weight: 750; }
.editor-scroll { height: 0; min-height: 0; flex: 1; }
.editor-body { padding: 44rpx 0 24rpx; }
.image-preview { display: flex; align-items: center; gap: 40rpx; margin-bottom: 50rpx; }
.image-heading { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 16rpx; }
.image-name { color: var(--color-text); font-size: var(--font-title); font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
.image-caption { color: var(--color-text-secondary); font-size: var(--font-caption); }
.editor-field { min-width: 0; margin-bottom: 44rpx; }
.editor-field .form-label { margin-bottom: 20rpx; font-size: var(--font-body); }
.editor-field input { height: 98rpx; }
.field-columns { display: flex; gap: 28rpx; }
.field-columns .editor-field { flex: 1; }
.category-heading { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 14rpx; }
.category-heading .form-label { margin-bottom: 0; }
.category-picker { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; padding: 28rpx; border-radius: var(--radius-control); background: var(--color-input); color: var(--color-text); font-size: var(--font-body); }
.description-input { height: 160rpx; }
.availability { display: flex; align-items: center; justify-content: space-between; gap: 28rpx; padding: 20rpx 0 28rpx; }
.availability-title { display: block; color: var(--color-text); font-size: var(--font-body); font-weight: 600; }
.availability-value { display: block; margin-top: 10rpx; color: var(--color-text-secondary); font-size: var(--font-caption); }
</style>
