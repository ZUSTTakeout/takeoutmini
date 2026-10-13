<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AccountIdentity from "../../components/AccountIdentity.vue";
import MenuRow from "../../components/MenuRow.vue";
import { api } from "../../services/api";
import type { User } from "../../types";
const user = ref<User | null>(api.user);
const labels = { STUDENT: "学生账号", MERCHANT: "商户账号", ADMIN: "运营账号" };
function openAccount() { uni.navigateTo({ url: user.value ? "/pages/profile/account" : "/pages/profile/login" }); }
function openOrders() { uni.switchTab({ url: "/pages/orders/index" }); }
function openMerchant() { uni.navigateTo({ url: "/pages/merchant/index" }); }
function openProducts() { uni.navigateTo({ url: "/pages/merchant/products" }); }
onShow(() => { user.value = api.user; });
</script>
<template>
  <view class="app-page profile-page">
    <AccountIdentity :name="user?.nickname || '登录 / 注册'" :label="user ? labels[user.role] : '未登录'" clickable @open="openAccount" />
    <view v-if="user?.role !== 'ADMIN'" class="profile-menu surface">
      <template v-if="user?.role === 'MERCHANT'"><MenuRow title="商户工作台" icon="dashboard" @click="openMerchant" /><MenuRow title="商品管理" icon="bag" :border="false" @click="openProducts" /></template>
      <MenuRow v-else title="我的订单" icon="orders" :border="false" @click="openOrders" />
    </view>
  </view>
</template>
<style scoped>
.profile-page { padding-top: var(--space-3); }
.profile-menu { margin-top: var(--space-4); }
</style>
