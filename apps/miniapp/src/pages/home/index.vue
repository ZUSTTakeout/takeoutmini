<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Shop } from "../../types";

const shops = ref<Shop[]>([]);
const loading = ref(true);
const error = ref("");

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
        <view class="title">附近店铺</view>
        <view class="subtitle">到店自取</view>
      </view>
      <text v-if="!loading && !error" class="count">{{ shops.length }} 家营业中</text>
    </view>

    <StateView
      :loading="loading"
      :error="error"
      :empty="!loading && !error && shops.length === 0"
      empty-text="附近暂时没有营业店铺"
      action-text="重新加载"
      @action="load"
    />

    <view
      v-for="shop in shops"
      v-show="!loading && !error"
      :key="shop.id"
      class="shop-row"
      role="button"
      @click="openShop(shop.id)"
    >
      <view class="logo">{{ shop.name.slice(0, 1) }}</view>
      <view class="shop-main">
        <view class="shop-name">
          <text>{{ shop.name }}</text>
          <text class="open">营业中</text>
        </view>
        <view class="notice">{{ shop.notice || "欢迎光临" }}</view>
        <view class="meta">校园自取 · 约 15 分钟</view>
      </view>
      <text class="arrow">›</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 38rpx 32rpx 48rpx;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 12rpx 4rpx 24rpx;
}

.title {
  font-size: 42rpx;
  font-weight: 800;
}

.subtitle,
.count {
  color: #81766e;
  font-size: 23rpx;
}

.subtitle {
  margin-top: 8rpx;
}

.count {
  padding-bottom: 4rpx;
}

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
  font-size: 44rpx;
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
  font-size: 30rpx;
  font-weight: 700;
}

.open {
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #e4f3e8;
  color: #28794a;
  font-size: 19rpx;
  font-weight: 500;
}

.notice {
  overflow: hidden;
  margin-top: 11rpx;
  color: #665d57;
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 9rpx;
  color: #8d837c;
  font-size: 21rpx;
}

.arrow {
  margin-left: 12rpx;
  color: #8e837b;
  font-size: 44rpx;
}
</style>
