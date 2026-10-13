<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import ReIcon from "../../components/ReIcon.vue";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Shop } from "../../types";

const shop = ref<Shop | null>(null);
const loading = ref(false);
const error = ref("");
function openPage(page: string) { uni.navigateTo({ url: `/pages/merchant/${page}` }); }
async function load() {
  if (!api.isRole("MERCHANT")) { error.value = "请先登录商户账号"; return; }
  loading.value = true;
  error.value = "";
  try { shop.value = await api.merchantShop(); }
  catch (reason: unknown) { error.value = getErrorMessage(reason, "店铺信息加载失败"); }
  finally { loading.value = false; }
}
function logout() {
  uni.showModal({ title: "退出登录", content: "确定退出当前商户账号吗？", confirmColor: "#b23b34", success: ({ confirm }) => { if (!confirm) return; api.logout(); uni.switchTab({ url: "/pages/profile/index" }); } });
}
onShow(load);
</script>

<template>
  <view class="page">
    <view class="eyebrow">食巷 · 商户中心</view><view class="title">我的店铺</view>
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load" />
    <template v-if="shop && !loading && !error">
      <view class="shop-profile"><view class="mark"><ReIcon name="store" color="brand" :size="32" /></view><view class="profile-main"><text class="shop-name">{{ shop.name }}</text><text class="account">{{ api.user?.nickname || '商户账号' }}</text></view><van-tag :color="shop.isOpen ? '#fff0e5' : '#f0ede7'" :text-color="shop.isOpen ? '#a43e1d' : '#81766e'">{{ shop.isOpen ? '营业中' : '休息中' }}</van-tag></view>
      <van-cell-group :border="false"><van-cell title="店铺信息" clickable center custom-style="padding:18px 16px;" @click="openPage('settings')"><template #icon><view class="menu-icon"><ReIcon name="store" color="brand" :size="22" /></view></template><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell><van-cell title="营业设置" clickable center custom-style="padding:18px 16px;" @click="openPage('settings')"><template #icon><view class="menu-icon blue"><ReIcon name="edit" color="text" :size="22" /></view></template><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell><van-cell title="商品管理" clickable center custom-style="padding:18px 16px;" @click="openPage('products')"><template #icon><view class="menu-icon"><ReIcon name="bag" color="brand" :size="22" /></view></template><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell><van-cell title="订单管理" clickable center :border="false" custom-style="padding:18px 16px;" @click="openPage('orders')"><template #icon><view class="menu-icon blue"><ReIcon name="orders" color="text" :size="22" /></view></template><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell></van-cell-group>
      <view class="logout-menu"><van-cell title="退出登录" clickable center :border="false" title-style="color:#b23b34;" custom-style="padding:18px 16px;" @click="logout"><template #icon><view class="menu-icon"><ReIcon name="logout" color="danger" :size="22" /></view></template><template #right-icon><ReIcon name="chevron-right" color="secondary" :size="18" /></template></van-cell></view>
    </template>
  </view>
  <MerchantNav active="profile" />
</template>

<style scoped>
.page { padding: 28rpx 30rpx 40rpx; }.eyebrow { color: #a43e1d; font-size: 10px; font-weight: 650; letter-spacing: 1px; }.title { margin-top: 8rpx; font-size: 22px; font-weight: 800; }
.shop-profile { display: flex; align-items: center; gap: 22rpx; margin: 34rpx 0; padding: 25rpx 0; border-top: 1rpx solid #eee3da; border-bottom: 1rpx solid #eee3da; }.mark { display: flex; width: 58px; height: 58px; flex: none; align-items: center; justify-content: center; border-radius: 18rpx; background: #ffe9d8; }
.profile-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 10rpx; }.shop-name { overflow-wrap: anywhere; font-size: 17px; font-weight: 750; }.account { color: #81766e; font-size: 11px; overflow-wrap: anywhere; }
.menu-icon { display: flex; align-items: center; margin-right: 20rpx; }.logout-menu { margin-top: 24rpx; }
</style>
