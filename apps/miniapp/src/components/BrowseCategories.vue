<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
import type { ReIconName } from "../icons";
defineProps<{ modelValue: string; categories: Array<{ id: string; name: string }> }>();
defineEmits<{ "update:modelValue": [value: string] }>();
function categoryIcon(name: string): ReIconName {
  if (/茶|饮|咖啡|奶/.test(name)) return "cup";
  if (/饭|餐/.test(name)) return "restaurant";
  if (/小吃|炸|甜/.test(name)) return "bag";
  return "empty";
}
</script>

<template>
  <scroll-view class="category-scroll" scroll-x :show-scrollbar="false">
    <view class="browse-categories" role="tablist" aria-label="店铺分类">
      <view :class="['browse-category', { selected: !modelValue }]" role="tab" :aria-selected="!modelValue" hover-class="category-pressed" @click="$emit('update:modelValue', '')">
        <view class="category-icon"><ReIcon name="dashboard" :color="modelValue ? 'brand' : 'white'" :size="24" /></view><text class="category-name">全部</text>
      </view>
      <view v-for="(category, index) in categories" :key="category.id" :class="['browse-category', 'tone-' + index % 3, { selected: modelValue === category.id }]" role="tab" :aria-selected="modelValue === category.id" hover-class="category-pressed" @click="$emit('update:modelValue', category.id)">
        <view class="category-icon"><ReIcon :name="categoryIcon(category.name)" :color="modelValue === category.id ? 'white' : index % 3 === 1 ? 'danger' : index % 3 === 2 ? 'success' : 'brand'" :size="24" /></view><text class="category-name">{{ category.name }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
.category-scroll { width: 100%; margin-top: 22px; white-space: nowrap; }
.browse-categories { display: inline-flex; min-width: 100%; justify-content: space-between; gap: 13px; padding: 2px 0 5px; }
.browse-category { display: flex; width: 64px; flex: none; flex-direction: column; align-items: center; gap: 9px; }
.category-icon { display: flex; width: 50px; height: 50px; align-items: center; justify-content: center; border-radius: 16px; background: var(--color-brand-soft); transition: background var(--motion-normal), transform var(--motion-fast); }
.category-name { display: -webkit-box; width: 64px; min-height: 32px; overflow: hidden; color: var(--color-text-secondary); font-size: 11px; line-height: 16px; text-align: center; white-space: normal; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tone-1 .category-icon { background: var(--color-accent-soft); }
.tone-2 .category-icon { background: var(--color-success-soft); }
.selected .category-icon { background: var(--color-brand); }
.selected .category-name { color: var(--color-brand); font-weight: 700; }
.category-pressed .category-icon { transform: scale(0.94); }
@media (prefers-reduced-motion: reduce) { .category-icon { transition: none; } .category-pressed .category-icon { transform: none; } }
</style>
