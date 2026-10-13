<script setup lang="ts">
import PageHeading from "../../components/PageHeading.vue";
import AccountIdentity from "../../components/AccountIdentity.vue";
import MenuRow from "../../components/MenuRow.vue";
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api, getErrorMessage } from "../../services/api";
import type { LoginRole, User } from "../../types";

const user = ref<User | null>(api.user);
const busyAction = ref("");
const roleLabel = computed(() => {
  if (user.value?.role === "MERCHANT") return "商户账号";
  if (user.value?.role === "STUDENT") return "学生账号";
  if (user.value?.role === "ADMIN") return "运营账号";
  return "未登录";
});

function syncUser() {
  user.value = api.user;
}

function showLoginResult() {
  syncUser();
  uni.showToast({ title: "登录成功" });
}

async function wechatLogin() {
  if (busyAction.value) return;
  busyAction.value = "wechat";
  try {
    await api.loginWithWechat();
    showLoginResult();
  } catch (reason: unknown) {
    uni.showToast({
      title: getErrorMessage(reason, "登录失败，请稍后重试"),
      icon: "none",
    });
  } finally {
    busyAction.value = "";
  }
}

async function roleLogin(role: LoginRole) {
  if (busyAction.value) return;
  busyAction.value = role;
  try {
    await api.login(role);
    showLoginResult();
  } catch (reason: unknown) {
    uni.showToast({
      title: getErrorMessage(reason, "登录失败，请稍后重试"),
      icon: "none",
    });
  } finally {
    busyAction.value = "";
  }
}

function openMerchant() {
  if (!api.isRole("MERCHANT")) {
    uni.showToast({ title: "请先登录商户账号", icon: "none" });
    return;
  }
  uni.navigateTo({ url: "/pages/merchant/index" });
}

function openOrders() {
  uni.switchTab({ url: "/pages/orders/index" });
}

function openProducts() {
  uni.navigateTo({ url: "/pages/merchant/products" });
}

function requestLogout() {
  uni.showModal({
    title: "退出登录",
    content: "确定退出当前账号吗？",
    confirmColor: "#ad477a",
    success: ({ confirm }) => {
      if (!confirm) return;
      api.logout();
      syncUser();
      uni.showToast({ title: "已退出登录" });
    },
  });
}

onShow(syncUser);
</script>

<template>
  <view class="app-page profile-page">
    <PageHeading title="我的" eyebrow="食巷" />
    <AccountIdentity :name="user?.nickname || '未登录'" :label="roleLabel" />
    <view v-if="user?.role !== 'ADMIN'" class="profile-group motion-enter">
      <view class="group-label">{{ user?.role === 'MERCHANT' ? '店铺' : '订单' }}</view>
      <view class="surface">
        <template v-if="user?.role === 'MERCHANT'"><MenuRow title="商户工作台" icon="dashboard" @click="openMerchant" /><MenuRow title="商品管理" icon="bag" color="success" :border="false" @click="openProducts" /></template>
        <MenuRow v-else title="我的订单" icon="orders" :border="false" @click="openOrders" />
      </view>
    </view>
    <view class="profile-group motion-enter">
      <view class="group-label">账号</view>
      <view class="surface">
        <MenuRow :title="busyAction === 'wechat' ? '登录中…' : '微信登录'" icon="chat" color="success" :loading="busyAction === 'wechat'" :border="api.devAuthEnabled || Boolean(user)" @click="wechatLogin" />
        <template v-if="api.devAuthEnabled">
          <MenuRow :title="busyAction === 'STUDENT' ? '登录中…' : '学生登录'" icon="graduation" :loading="busyAction === 'STUDENT'" @click="roleLogin('STUDENT')" />
          <MenuRow :title="busyAction === 'MERCHANT' ? '登录中…' : '商户登录'" icon="store" color="danger" :loading="busyAction === 'MERCHANT'" :border="Boolean(user)" @click="roleLogin('MERCHANT')" />
        </template>
        <MenuRow v-if="user" title="退出登录" icon="logout" color="danger" danger :border="false" @click="requestLogout" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.profile-page { padding-top: 18px; }
.profile-group { margin-top: 22px; }
.group-label { margin: 0 0 11px 3px; color: var(--color-text-secondary); font-size: 11px; letter-spacing: 1px; }
</style>
