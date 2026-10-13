<script setup lang="ts">
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
    confirmColor: "#c4532b",
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
  <view class="page">
    <view class="page-title">我的</view>
    <view class="profile">
      <view class="avatar">{{ user?.nickname?.slice(0, 1) || "食" }}</view>
      <view class="profile-main">
        <view class="nickname">{{ user?.nickname || "未登录" }}</view>
        <view class="account-state">
          <van-tag
            :color="user?.role === 'MERCHANT' ? '#e9eff7' : '#f9e9d9'"
            :text-color="user?.role === 'MERCHANT' ? '#466a95' : '#a35d33'"
            size="medium"
            round
          >{{ roleLabel }}</van-tag>
        </view>
      </view>
    </view>

    <view v-if="user?.role !== 'ADMIN'" class="menu-group">
      <view class="group-title">{{ user?.role === 'MERCHANT' ? '店铺' : '订单' }}</view>
      <view class="menu">
        <template v-if="user?.role === 'MERCHANT'">
          <MenuRow title="商户工作台" icon="dashboard" @click="openMerchant" />
          <MenuRow title="商品管理" icon="bag" color="text" :border="false" @click="openProducts" />
        </template>
        <MenuRow v-else title="我的订单" icon="orders" :border="false" @click="openOrders" />
      </view>
    </view>

    <view class="menu-group">
      <view class="group-title">账号</view>
      <view class="menu">
      <MenuRow
        :title="busyAction === 'wechat' ? '登录中…' : '微信登录'"
        icon="chat"
        color="text"
        :loading="busyAction === 'wechat'"
        :border="api.devAuthEnabled || Boolean(user)"
        @click="wechatLogin"
      />
      <template v-if="api.devAuthEnabled">
        <MenuRow
          :title="busyAction === 'STUDENT' ? '登录中…' : '学生登录'"
          icon="graduation"
          :loading="busyAction === 'STUDENT'"
          @click="roleLogin('STUDENT')"
        />
        <MenuRow
          :title="busyAction === 'MERCHANT' ? '登录中…' : '商户登录'"
          icon="store"
          color="text"
          :loading="busyAction === 'MERCHANT'"
          :border="Boolean(user)"
          @click="roleLogin('MERCHANT')"
        />
      </template>
      <MenuRow v-if="user" title="退出登录" icon="logout" color="danger" danger :border="false" @click="requestLogout" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 26px 20px calc(35px + env(safe-area-inset-bottom));
}
.page-title { margin-bottom: 25px; font-size: 26px; font-weight: 800; }
.profile {
  display: flex;
  align-items: center;
  padding: 14px 2px 31px;
  border-bottom: 1px solid var(--color-border);
}

.avatar {
  display: flex;
  width: 70px;
  height: 70px;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 4px solid #fffdfa;
  border-radius: 50%;
  background: #e8c9ab;
  color: #7b482a;
  font-size: 29px;
  font-weight: 800;
}

.profile-main {
  min-width: 0;
  flex: 1;
  margin-left: 17px;
}

.nickname {
  overflow: hidden;
  font-size: 22px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-state {
  margin-top: 9px;
}
.menu-group { margin-top: 25px; }
.group-title { margin: 0 0 10px 3px; color: #a08e7e; font-size: 12px; }
.menu {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: #fffdfa;
}
</style>
