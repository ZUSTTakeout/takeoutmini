<script setup lang="ts">
import { usePullRefresh } from "../../composables/useRefresh";
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import PageHeading from "../../components/PageHeading.vue";
import AccountIdentity from "../../components/AccountIdentity.vue";
import BusinessStatus from "../../components/BusinessStatus.vue";
import MenuRow from "../../components/MenuRow.vue";
import StateView from "../../components/StateView.vue";
import MerchantNav from "../../components/MerchantNav.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Shop } from "../../types";

const shop = ref<Shop | null>(null);
const loading = ref(false);
const error = ref("");
function openPage(page: string) { uni.navigateTo({ url: `/pages/merchant/${page}` }); }
async function load(silent = false) {
  if (!api.isRole("MERCHANT")) { error.value = "请先登录商户账号"; return; }
  if (!silent) { loading.value = true; error.value = ""; }
  try { shop.value = await api.merchantShop(); }
  catch (reason: unknown) {
    if (silent) uni.showToast({ title: getErrorMessage(reason, "刷新失败，请稍后再试"), icon: "none" });
    else error.value = getErrorMessage(reason, "店铺信息加载失败");
  }
  finally { if (!silent) loading.value = false; }
}
function openAccount() { uni.navigateTo({ url: "/pages/profile/account" }); }
onShow(() => void load(Boolean(shop.value)));
usePullRefresh(() => load(Boolean(shop.value)));
</script>

<template>
  <view class="app-page merchant-page">
    <PageHeading title="我的店铺" eyebrow="食巷 · 商户中心" />
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load()" />
    <template v-if="shop && !loading && !error">
      <AccountIdentity :name="api.user?.nickname || shop.name" :label="shop.name" :image="shop.products.find((product) => product.image)?.image" merchant clickable @open="openAccount"><BusinessStatus :open="shop.isOpen" /></AccountIdentity>
      <text v-if="shop.description" class="shop-description">{{ shop.description }}</text>
      <view class="group-label">店铺管理</view>
      <view class="surface motion-enter">
        <MenuRow title="营业设置" icon="settings" color="danger" @click="openPage('settings')" />
        <MenuRow title="商品管理" icon="bag" color="success" @click="openPage('products')" />
        <MenuRow title="订单管理" icon="orders" :border="false" @click="openPage('orders')" />
      </view>
    </template>
  </view>
  <MerchantNav active="profile" />
</template>

<style scoped>
.group-label { margin: 26rpx 0 24rpx 6rpx; color: var(--color-text-secondary); font-size: var(--font-caption); letter-spacing: 2rpx; }
.shop-description { display: block; margin-bottom: var(--space-4); color: var(--color-text-secondary); font-size: var(--font-body); line-height: 1.6; }
</style>
