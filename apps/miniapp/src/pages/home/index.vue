<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import SearchField from "../../components/SearchField.vue";
import ShopRow from "../../components/ShopRow.vue";
import BrowseCategories from "../../components/BrowseCategories.vue";
import PageHeading from "../../components/PageHeading.vue";
import ReIcon from "../../components/ReIcon.vue";
import IconButton from "../../components/IconButton.vue";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Shop } from "../../types";

const shops = ref<Shop[]>([]);
const loading = ref(true);
const error = ref("");
const search = ref("");
const selectedCategory = ref("");
const categories = computed(() => Array.from(new Map(
  shops.value.flatMap((shop) => shop.categories).map((category) => [category.id, category]),
).values()));
const visibleShops = computed(() => {
  const query = search.value.trim().toLowerCase();
  return shops.value.filter((shop) => {
    const categoryMatch = !selectedCategory.value || shop.categories.some((category) => category.id === selectedCategory.value);
    const searchMatch = !query || [shop.name, shop.notice, ...shop.categories.map((category) => category.name), ...shop.products.map((product) => product.name)].join(" ").toLowerCase().includes(query);
    return categoryMatch && searchMatch;
  });
});
async function load() {
  loading.value = true;
  error.value = "";
  try {
    shops.value = await api.shops();
    if (selectedCategory.value && !categories.value.some((category) => category.id === selectedCategory.value)) selectedCategory.value = "";
  } catch (reason: unknown) {
    shops.value = [];
    error.value = getErrorMessage(reason, "店铺加载失败，请稍后重试");
  } finally { loading.value = false; }
}
function openShop(id: string) { uni.navigateTo({ url: `/pages/shop/index?id=${encodeURIComponent(id)}` }); }
onShow(load);
</script>

<template>
  <view class="app-page home-page">
    <PageHeading title="食巷" eyebrow="校园美食街">
      <view class="pickup-mark"><ReIcon name="location" color="brand" :size="16" /><text>到店自取</text></view>
    </PageHeading>
    <SearchField v-model="search" placeholder="搜索店铺、菜品" />
    <BrowseCategories v-if="!loading && !error && categories.length" v-model="selectedCategory" :categories="categories" />
    <view class="section-row">
      <view class="section-identity"><view class="section-rule" /><text class="section-label">{{ selectedCategory ? categories.find((category) => category.id === selectedCategory)?.name : '校园店铺' }}</text></view>
      <view class="shop-count"><text v-if="!loading && !error" class="section-meta">{{ visibleShops.length }} 家</text><IconButton name="refresh" label="刷新店铺" :loading="loading" compact @click="load" /></view>
    </view>
    <StateView :loading="loading" :error="error" :empty="!loading && !error && visibleShops.length === 0" :empty-text="search || selectedCategory ? '没有匹配的店铺' : '暂时没有营业店铺'" action-text="重新加载" @action="load" />
    <view v-if="!loading && !error" :key="selectedCategory + search" class="shop-list">
      <view v-for="(shop, index) in visibleShops" :key="shop.id" class="motion-item" :style="{ animationDelay: Math.min(index, 6) * 40 + 'ms' }"><ShopRow :shop="shop" @open="openShop(shop.id)" /></view>
    </view>
  </view>
</template>

<style scoped>
.home-page { padding-top: 15px; }
.pickup-mark { display: flex; align-items: center; gap: 5px; color: var(--color-brand); font-size: 11px; }
.section-row { margin-top: 24px; margin-bottom: 0; }
.section-identity { display: flex; min-width: 0; align-items: center; gap: 9px; }
.section-rule { width: 4px; height: 17px; flex: none; border-radius: 2px; background: var(--color-accent); }
.shop-count { display: flex; align-items: center; gap: 5px; }
.shop-list { border-top: 1px solid var(--color-border); }
</style>
