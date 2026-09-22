<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api, getErrorMessage } from "../../services/api";
import type { LoginRole, User } from "../../types";

const user = ref<User | null>(api.user);
const busyAction = ref("");

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

function requestLogout() {
  uni.showModal({
    title: "退出登录",
    content: "确定退出当前账号吗？",
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
    <view class="profile">
      <view class="avatar">{{ user?.nickname?.slice(0, 1) || "食" }}</view>
      <view class="profile-main">
        <view class="nickname">{{ user?.nickname || "欢迎使用校园美食街" }}</view>
        <view class="account-state">
          {{
            user
              ? user.role === "MERCHANT"
                ? "商户账号"
                : "学生账号"
              : "尚未登录"
          }}
        </view>
      </view>
    </view>

    <view class="menu">
      <view class="line" role="button" @click="wechatLogin">
        <text class="line-icon">微</text>
        <text class="line-label">{{ busyAction === "wechat" ? "登录中…" : "微信登录" }}</text>
        <text class="arrow">›</text>
      </view>
      <template v-if="api.devAuthEnabled">
        <view class="line" role="button" @click="roleLogin('STUDENT')">
          <text class="line-icon student">学</text>
          <text class="line-label">{{ busyAction === "STUDENT" ? "登录中…" : "学生登录" }}</text>
          <text class="arrow">›</text>
        </view>
        <view class="line" role="button" @click="roleLogin('MERCHANT')">
          <text class="line-icon merchant">店</text>
          <text class="line-label">{{ busyAction === "MERCHANT" ? "登录中…" : "商户登录" }}</text>
          <text class="arrow">›</text>
        </view>
      </template>
      <view v-if="user?.role === 'MERCHANT'" class="line" role="button" @click="openMerchant">
        <text class="line-icon workspace">台</text>
        <text class="line-label">商户工作台</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="user" class="line last-line" role="button" @click="requestLogout">
        <text class="line-icon logout">退</text>
        <text class="line-label logout-label">退出登录</text>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 48rpx 32rpx;
}

.profile {
  display: flex;
  align-items: center;
  padding: 22rpx 12rpx 50rpx;
}

.avatar {
  display: flex;
  width: 112rpx;
  height: 112rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: #ffe0c9;
  color: #ad431f;
  font-size: 50rpx;
  font-weight: 800;
}

.profile-main {
  min-width: 0;
  margin-left: 25rpx;
}

.nickname {
  overflow: hidden;
  font-size: 37rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-state {
  margin-top: 10rpx;
  color: #81766e;
  font-size: 23rpx;
}

.menu {
  padding: 0 27rpx;
  border: 1rpx solid #eee3da;
  border-radius: 22rpx;
  background: #fff;
}

.line {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #eee5de;
}

.line:last-child,
.last-line {
  border-bottom: 0;
}

.line-icon {
  display: flex;
  width: 48rpx;
  height: 48rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #3e8a58;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}

.line-icon.student {
  background: #3f6f9e;
}

.line-icon.merchant,
.line-icon.workspace {
  background: #c4532b;
}

.line-icon.logout {
  background: #7a6f67;
}

.line-label {
  flex: 1;
  margin-left: 20rpx;
  color: #332d29;
  font-size: 28rpx;
}

.logout-label {
  color: #6d312e;
}

.arrow {
  color: #8e837b;
  font-size: 40rpx;
}
</style>
