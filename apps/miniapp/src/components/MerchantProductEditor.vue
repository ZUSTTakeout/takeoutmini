<script setup lang="ts">
import { computed, reactive, watch } from "vue";
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
  <van-popup :show="show" position="bottom" round :close-on-click-overlay="!saving" :safe-area-inset-bottom="false" custom-style="height:88vh;background:#fffaf4;" @close="!saving && $emit('close')">
    <view class="editor">
      <view class="editor-heading"><IconButton name="close" label="关闭商品编辑" :disabled="saving" @click="$emit('close')" /><text class="editor-title">{{ product ? '编辑商品' : '新增商品' }}</text><IconButton name="save" label="保存商品" variant="primary" :loading="saving" @click="emit('save', { ...draft })" /></view>
      <scroll-view scroll-y class="editor-scroll">
        <view class="image-preview"><image v-if="draft.image" :src="draft.image" class="product-image" mode="aspectFill" /><view v-else class="empty-image"><ReIcon name="restaurant" color="brand" :size="36" /></view><view class="image-title"><text>{{ draft.name || '商品图片' }}</text><text class="image-caption">{{ product ? '商品信息' : '新商品' }}</text></view></view>
        <van-cell-group :border="false"><van-field :value="draft.name" label="商品名称" placeholder="填写商品名称" :maxlength="60" :disabled="saving" custom-style="padding:16px;" @change="draft.name = nativeValue($event)" /><van-field :value="draft.priceYuan" label="价格（元）" type="digit" placeholder="0.00" :maxlength="10" :disabled="saving" custom-style="padding:16px;" @change="draft.priceYuan = nativeValue($event)" /><van-field :value="draft.stock" label="库存数量" type="number" placeholder="0" :maxlength="7" :disabled="saving" custom-style="padding:16px;" @change="draft.stock = nativeValue($event)" /></van-cell-group>
        <view class="category-heading"><text class="section-title">商品分类</text><IconButton name="add" label="新增商品分类" :disabled="saving" @click="$emit('addCategory')" /></view>
        <picker mode="selector" :range="categories" range-key="name" :value="categoryIndex" :disabled="saving || !categories.length" @change="chooseCategory"><van-cell :title="categoryName" clickable :border="false" custom-style="padding:16px;"><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell></picker>
        <view class="section-title description-title">商品详情</view>
        <van-cell-group :border="false"><van-field :value="draft.description" type="textarea" placeholder="填写商品描述" :maxlength="500" :autosize="{ minHeight: 80 }" show-word-limit :disabled="saving" custom-style="padding:16px;" @change="draft.description = nativeValue($event)" /><van-field :value="draft.image" label="图片地址" placeholder="选填" :maxlength="2048" :disabled="saving" custom-style="padding:16px;" @change="draft.image = nativeValue($event)" /><van-cell title="上架状态" center :border="false" custom-style="padding:16px;"><template #right-icon><van-switch :checked="draft.isAvailable" :disabled="saving" size="24px" active-color="#c4532b" inactive-color="#dfd9d2" @change="draft.isAvailable = Boolean(nativeDetail($event))" /></template></van-cell></van-cell-group>
      </scroll-view>
    </view>
  </van-popup>
</template>

<style scoped>
.editor { display: flex; height: 100%; box-sizing: border-box; flex-direction: column; padding: 20rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); }.editor-heading { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 18rpx; padding-bottom: 22rpx; }.editor-title { font-size: 17px; font-weight: 750; }.editor-scroll { height: 0; min-height: 0; flex: 1; }
.image-preview { display: flex; align-items: center; gap: 24rpx; margin: 10rpx 0 24rpx; }.product-image, .empty-image { width: 84px; height: 84px; flex: none; border-radius: 16rpx; background: #ffe9d8; }.empty-image { display: flex; align-items: center; justify-content: center; }.image-title { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 14rpx; overflow-wrap: anywhere; font-size: 15px; font-weight: 650; }.image-caption { color: #81766e; font-size: 11px; font-weight: 400; }
.category-heading { display: flex; align-items: center; justify-content: space-between; margin: 24rpx 0 12rpx; }.section-title { color: #51463e; font-size: 13px; font-weight: 700; }.description-title { margin: 30rpx 0 18rpx; }
</style>
