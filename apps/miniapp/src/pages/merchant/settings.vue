<script setup lang="ts">
import { reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import PageHeading from "../../components/PageHeading.vue";
import ActionDock from "../../components/ActionDock.vue";
import { iconColors } from "../../icons";
import ReIcon from "../../components/ReIcon.vue";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import { nativeDetail, nativeValue } from "../../utils/events";

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const draft = reactive({ name: "", notice: "", isOpen: false });
const original = ref("");

async function load() {
  if (!api.isRole("MERCHANT")) { error.value = "请先登录商户账号"; return; }
  loading.value = true;
  error.value = "";
  try { const shop = await api.merchantShop(); Object.assign(draft, { name: shop.name, notice: shop.notice, isOpen: shop.isOpen }); original.value = JSON.stringify(draft); }
  catch (reason: unknown) { error.value = getErrorMessage(reason, "营业设置加载失败"); }
  finally { loading.value = false; }
}

async function save() {
  if (saving.value) return;
  const name = draft.name.trim();
  const notice = draft.notice.trim();
  if (!name || name.length > 60) { uni.showToast({ title: "请填写店铺名称", icon: "none" }); return; }
  saving.value = true;
  try {
    const shop = await api.updateShop({ name, notice, isOpen: draft.isOpen });
    Object.assign(draft, { name: shop.name, notice: shop.notice, isOpen: shop.isOpen });
    original.value = JSON.stringify(draft);
    uni.showToast({ title: "设置已保存" });
  } catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "保存设置失败"), icon: "none" }); }
  finally { saving.value = false; }
}

onShow(load);
</script>

<template>
  <view class="app-page with-dock">
    <PageHeading title="营业设置" eyebrow="店铺管理" />
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load" />
    <template v-if="!loading && !error">
      <view class="surface setting-state motion-enter">
        <view class="setting-icon"><ReIcon name="store" color="brand" :size="24" /></view>
        <view class="setting-main"><text class="setting-label">营业状态</text><text class="setting-value">{{ draft.isOpen ? '营业中' : '休息中' }}</text></view>
        <van-switch :checked="draft.isOpen" :active-color="iconColors.brand" inactive-color="#dbe1ee" size="26px" :disabled="saving" @change="draft.isOpen = Boolean(nativeDetail($event))" />
      </view>
      <view class="form-section motion-enter"><text class="form-label">店铺名称</text><input class="form-input name-input" :value="draft.name" placeholder="填写店铺名称" aria-label="店铺名称" :maxlength="60" :disabled="saving" @input="draft.name = nativeValue($event)" /></view>
      <view class="pickup-method motion-enter"><ReIcon name="bag" color="success" :size="23" /><text>到店自取</text><ReIcon name="check" color="success" :size="18" /></view>
      <view class="form-section motion-enter"><view class="notice-heading"><text class="form-label">店铺公告</text><ReIcon name="chat" color="secondary" :size="19" /></view><textarea class="form-input notice-input" :value="draft.notice" placeholder="填写店铺公告" aria-label="店铺公告" :maxlength="200" :disabled="saving" @input="draft.notice = nativeValue($event)" /><view class="character-count">{{ draft.notice.length }}/200</view></view>
    </template>
    <ActionDock v-if="!loading && !error" name="save" label="保存设置" :note="original === JSON.stringify(draft) ? '已保存' : '有待保存的修改'" :loading="saving" :disabled="original === JSON.stringify(draft)" @action="save" />
  </view>
</template>

<style scoped>
.setting-state { display: flex; align-items: center; gap: 13px; padding: 20px; }
.setting-icon { display: flex; width: 43px; height: 43px; flex: none; align-items: center; justify-content: center; border-radius: 13px; background: var(--color-brand-soft); }
.setting-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 6px; }
.setting-label { color: var(--color-text); font-size: 14px; font-weight: 650; }
.setting-value { color: var(--color-text-secondary); font-size: 11px; }
.name-input { height: 50px; }
.pickup-method { display: flex; align-items: center; gap: 10px; margin-top: 20px; padding: 20px; border-radius: var(--radius-card); background: var(--color-surface); color: var(--color-text); font-size: 14px; font-weight: 600; }
.pickup-method text { min-width: 0; flex: 1; }
.notice-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.notice-input { height: 150px; }
</style>
