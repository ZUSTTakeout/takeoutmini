<script setup lang="ts">
import SearchField from "../../components/SearchField.vue";
import ShopRow from "../../components/ShopRow.vue";
import ReIcon from "../../components/ReIcon.vue";
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Shop } from "../../types";

const shops = ref<Shop[]>([]);
const loading = ref(true);
const error = ref("");
const search = ref("");

function visibleShops() {
  const query = search.value.trim().toLowerCase();
  if (!query) return shops.value;
  return shops.value.filter((shop) =>
    [shop.name, shop.notice, ...shop.categories.map((category) => category.name)]
      .join(" ").toLowerCase().includes(query),
  );
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    shops.value = await api.shops();
  } catch (reason: unknown) {
    shops.value = [];
    error.value = getErrorMessage(reason, "店铺加载失败，请稍后重试");
  } finally {
    loading.value = false;
  }
}

function openShop(id: string) {
  uni.navigateTo({ url: `/pages/shop/index?id=${encodeURIComponent(id)}` });
}

onShow(load);
</script>

<template>
  <view class="page">
    <view class="section-head">
      <view>
        <view class="title">营业店铺</view>
        <view class="subtitle">到店自取</view>
      </view>
      <view v-if="!loading && !error" class="count">
        <ReIcon name="store" color="brand" :size="14" class="count-icon" />
        <text>{{ shops.length }} 家营业中</text>
      </view>
    </view>

    <SearchField v-model="search" placeholder="搜索店铺或菜品" />

    <StateView
      :loading="loading"
      :error="error"
      :empty="!loading && !error && visibleShops().length === 0"
      :empty-text="search ? '没有匹配的店铺' : '暂时没有营业店铺'"
      action-text="重新加载"
      @action="load"
    />

    <ShopRow
      v-for="shop in visibleShops()"
      v-show="!loading && !error"
      :key="shop.id"
      :shop="shop"
      @open="openShop(shop.id)"
    />
  </view>
</template>

<style scoped>
.page {
  padding: 38rpx 32rpx 48rpx;
}

.page :deep(.search-field) { margin: 0 0 12px; }

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 12rpx 4rpx 24rpx;
}

.title {
  font-size: 21px;
  font-weight: 800;
}

.subtitle,
.count {
  color: #81766e;
  font-size: 11.5px;
}

.subtitle {
  margin-top: 8rpx;
}

.count {
  display: flex;
  align-items: center;
  padding-bottom: 4rpx;
}

.count-icon { margin-right: 6rpx; color: var(--color-brand); }

.shop-row {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 28rpx;
  border: 1rpx solid #eee3da;
  border-radius: 24rpx;
  background: #fff;
}

.logo {
  display: flex;
  width: 96rpx;
  height: 96rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
  background: #ffe0c9;
  color: #ad431f;
  font-size: 22px;
  font-weight: 800;
}

.shop-main {
  min-width: 0;
  flex: 1;
  margin-left: 24rpx;
}

.shop-name {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 15px;
  font-weight: 700;
}

.open {
  flex: none;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #e4f3e8;
  color: #3f6f78;
  font-size: 9.5px;
  font-weight: 500;
}

.shop-title {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}

.notice {
  overflow: hidden;
  margin-top: 11rpx;
  color: #665d57;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 9rpx;
  color: #8d837c;
  font-size: 10.5px;
}

.arrow {
  margin-left: 12rpx;
  color: #8e837b;
  font-size: 17px;
}
</style>
