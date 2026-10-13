<script setup lang="ts">
import { ref } from "vue";
import AccountIdentity from "../../components/AccountIdentity.vue";
import PrimaryAction from "../../components/PrimaryAction.vue";
import MenuRow from "../../components/MenuRow.vue";
import ReIcon from "../../components/ReIcon.vue";
import { api, getErrorMessage } from "../../services/api";
import type { LoginRole } from "../../types";
const busy = ref("");
const moreLogin = ref(false);
const showDevLogin = api.devAuthEnabled;
async function login(role?: LoginRole) {
  if (busy.value) return;
  busy.value = role || "wechat";
  try {
    if (role) await api.login(role);
    else await api.loginWithWechat();
    uni.showToast({ title: "登录成功" });
    uni.navigateBack({ fail: () => uni.switchTab({ url: "/pages/profile/index" }) });
  } catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "登录失败，请稍后重试"), icon: "none" }); }
  finally { busy.value = ""; }
}
</script>
<template>
  <view class="app-page login-page">
    <AccountIdentity name="登录 / 注册" label="微信账号" />
    <PrimaryAction label="微信登录" icon="chat" :loading="busy === 'wechat'" :disabled="Boolean(busy)" @click="login()" />
    <view v-if="showDevLogin" class="more-entry">
      <view class="more-login" role="button" :aria-expanded="moreLogin" @click="moreLogin = !moreLogin"><text>更多登录方式</text><ReIcon name="chevron-right" :class="{ expanded: moreLogin }" :size="16" /></view>
      <view v-if="moreLogin" class="login-methods">
        <MenuRow title="学生登录" icon="graduation" :loading="busy === 'STUDENT'" @click="login('STUDENT')" />
        <MenuRow title="商户登录" icon="store" :loading="busy === 'MERCHANT'" :border="false" @click="login('MERCHANT')" />
      </view>
    </view>
  </view>
</template>
<style scoped>
.login-page { min-height: 100vh; background: var(--color-surface); }
.more-entry { margin-top: var(--space-4); }
.more-login { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-height: 96rpx; padding: var(--space-2) 0; color: var(--color-text-secondary); font-size: var(--font-body); }
.expanded { transform: rotate(90deg); }
.login-methods { margin-top: var(--space-2); }
</style>
