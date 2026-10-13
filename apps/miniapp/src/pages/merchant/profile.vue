<script setup lang="ts">
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
async function load() {
  if (!api.isRole("MERCHANT")) { error.value = "请先登录商户账号"; return; }
  loading.value = true;
  error.value = "";
  try { shop.value = await api.merchantShop(); }
  catch (reason: unknown) { error.value = getErrorMessage(reason, "店铺信息加载失败"); }
  finally { loading.value = false; }
}
function logout() {
  uni.showModal({ title: "退出登录", content: "确定退出当前商户账号吗？", confirmColor: "#ad477a", success: ({ confirm }) => { if (!confirm) return; api.logout(); uni.switchTab({ url: "/pages/profile/index" }); } });
}
onShow(load);
</script>

<template>
  <view class="app-page merchant-page">
    <PageHeading title="我的店铺" eyebrow="食巷 · 商户中心" />
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load" />
    <template v-if="shop && !loading && !error">
      <AccountIdentity :name="shop.name" :label="api.user?.nickname || '商户账号'" :image="shop.products.find((product) => product.image)?.image" merchant><BusinessStatus :open="shop.isOpen" /></AccountIdentity>
      <view class="group-label">店铺管理</view>
      <view class="surface motion-enter">
        <MenuRow title="店铺信息" icon="store" @click="openPage('settings')" />
        <MenuRow title="营业设置" icon="settings" color="danger" @click="openPage('settings')" />
        <MenuRow title="商品管理" icon="bag" color="success" @click="openPage('products')" />
        <MenuRow title="订单管理" icon="orders" :border="false" @click="openPage('orders')" />
      </view>
      <view class="logout-menu surface motion-enter"><MenuRow title="退出登录" icon="logout" danger :border="false" @click="logout" /></view>
    </template>
  </view>
  <MerchantNav active="profile" />
</template>

<style scoped>
.group-label { margin: 13px 0 12px 3px; color: var(--color-text-secondary); font-size: 11px; letter-spacing: 1px; }
.logout-menu { margin-top: 20px; }
</style>
