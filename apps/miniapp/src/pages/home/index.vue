<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import SearchField from "../../components/SearchField.vue";
import ShopRow from "../../components/ShopRow.vue";
import ShopGalleryCard from "../../components/ShopGalleryCard.vue";
import ViewModeSwitch from "../../components/ViewModeSwitch.vue";
import { STORAGE_PREFIX } from "../../config/runtime";
import ReIcon from "../../components/ReIcon.vue";
import { usePullRefresh } from "../../composables/useRefresh";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Shop } from "../../types";
const shops = ref<Shop[]>([]);
const loading = ref(true);
const error = ref("");
const search = ref("");
const viewKey = `${STORAGE_PREFIX}shop-view`;
const viewMode = ref<"list" | "gallery">(uni.getStorageSync(viewKey) === "gallery" ? "gallery" : "list");
function changeView(value: "list" | "gallery") {
  viewMode.value = value;
  uni.setStorageSync(viewKey, value);
}
let fetching = false;
const visibleShops = computed(() => shops.value.filter((shop) => shop.name.toLowerCase().includes(search.value.trim().toLowerCase())));
async function load(silent = false) {
  if (fetching) return;
  fetching = true;
  if (!silent) { loading.value = true; error.value = ""; }
  try { shops.value = await api.shops(); }
  catch (reason: unknown) {
    const message = getErrorMessage(reason, "店铺没能加载出来，点击重试");
    if (silent) uni.showToast({ title: message, icon: "none" });
    else error.value = message;
  }
  finally { fetching = false; if (!silent) loading.value = false; }
}
function openShop(id: string) { uni.navigateTo({ url: `/pages/shop/index?id=${encodeURIComponent(id)}` }); }
onShow(() => void load(shops.value.length > 0));
usePullRefresh(() => load(shops.value.length > 0));
</script>
<template>
  <view class="app-page home-page">
    <view class="pickup-line"><ReIcon name="location" color="brand" :size="15" /><text>校园店铺 · 到店自取</text></view>
    <SearchField v-model="search" placeholder="搜索店铺名称" />
    <view class="section-row"><view class="shop-count"><text class="section-label">店铺</text><text v-if="!loading && !error" class="section-meta">{{ visibleShops.length }} 家</text></view><ViewModeSwitch :model-value="viewMode" @update:model-value="changeView" /></view>
    <StateView :skeleton="viewMode === 'gallery' ? 'card' : 'list'" :loading="loading" :error="error" :empty="!loading && !error && visibleShops.length === 0" :empty-text="search ? '没找到这家店，换个名称试试' : '校园店铺还没有上线'" :action-text="error ? '重试' : ''" @action="load()" />
    <view v-if="!loading && !error && viewMode === 'list'" class="shop-list"><ShopRow v-for="shop in visibleShops" :key="shop.id" :shop="shop" @open="openShop(shop.id)" /></view>
    <view v-else-if="!loading && !error" class="shop-gallery"><ShopGalleryCard v-for="shop in visibleShops" :key="shop.id" :shop="shop" @open="openShop(shop.id)" /></view>
  </view>
</template>
<style scoped>
.home-page { background: var(--color-surface); }
.pickup-line { display: flex; align-items: center; gap: var(--space-1); margin-bottom: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-caption); }
.section-row { margin: var(--space-4) 0 var(--space-1); }
.shop-count { display: flex; align-items: center; gap: var(--space-2); }
.shop-gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); padding-top: var(--space-2); }
</style>
