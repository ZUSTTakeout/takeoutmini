<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AccountIdentity from "../../components/AccountIdentity.vue";
import InfoRow from "../../components/InfoRow.vue";
import MenuRow from "../../components/MenuRow.vue";
import { api } from "../../services/api";
import type { User } from "../../types";
const user = ref<User | null>(api.user);
const roles = { STUDENT: "学生", MERCHANT: "商户", ADMIN: "运营" };
const showMoreLogin = import.meta.env.DEV || import.meta.env.VITE_MOCK_ENABLED === "true";
function openLogin() { uni.navigateTo({ url: "/pages/profile/login" }); }
function logout() {
  uni.showModal({
    title: "退出登录", content: "确定退出当前账号吗？",
    success: ({ confirm }) => {
      if (!confirm) return;
      api.logout();
      uni.navigateBack({ fail: () => uni.switchTab({ url: "/pages/profile/index" }) });
    },
  });
}
onShow(() => {
  user.value = api.user;
  if (!user.value) uni.redirectTo({ url: "/pages/profile/login" });
});
</script>
<template>
  <view v-if="user" class="app-page account-page">
    <AccountIdentity :name="user.nickname" :label="roles[user.role] + '账号'" />
    <view class="account-fields"><InfoRow label="昵称" :value="user.nickname" /><InfoRow label="身份" :value="roles[user.role]" /><InfoRow label="账号编号" :value="user.id" selectable /></view>
    <view class="account-actions">
      <MenuRow v-if="showMoreLogin" title="切换账号" icon="user" @click="openLogin" />
      <MenuRow title="退出登录" icon="logout" color="danger" danger :border="false" @click="logout" />
    </view>
  </view>
</template>
<style scoped>
.account-page { min-height: 100vh; background: var(--color-surface); }
.account-actions { margin-top: var(--space-5); }
</style>
