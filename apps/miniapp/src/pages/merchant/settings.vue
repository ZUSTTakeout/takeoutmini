<script setup lang="ts">
import { reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import IconButton from "../../components/IconButton.vue";
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
  <view class="page">
    <view class="heading"><view><text class="eyebrow">店铺管理</text><view class="title">营业设置</view></view><IconButton name="save" label="保存营业设置" variant="primary" :loading="saving" :disabled="loading || Boolean(error) || original === JSON.stringify(draft)" @click="save" /></view>
    <StateView :loading="loading" :error="error" action-text="重新加载" @action="load" />
    <template v-if="!loading && !error">
      <van-cell-group :border="false"><van-cell title="营业状态" :value="draft.isOpen ? '营业中' : '休息中'" center custom-style="padding:20px 16px;"><template #right-icon><view class="status-switch"><van-switch :checked="draft.isOpen" active-color="#c4532b" inactive-color="#dfd9d2" size="24px" :disabled="saving" @change="draft.isOpen = Boolean(nativeDetail($event))" /></view></template></van-cell></van-cell-group>
      <view class="section-title">店铺信息</view>
      <van-cell-group :border="false"><van-field :value="draft.name" label="店铺名称" placeholder="填写店铺名称" :maxlength="60" :disabled="saving" custom-style="padding:18px 16px;" @change="draft.name = nativeValue($event)" /></van-cell-group>
      <view class="section-heading"><text class="section-title">店铺公告</text><ReIcon name="chat" color="secondary" :size="18" /></view>
      <van-cell-group :border="false"><van-field :value="draft.notice" type="textarea" placeholder="填写店铺公告" :maxlength="200" show-word-limit :autosize="{ minHeight: 120 }" :disabled="saving" :border="false" custom-style="padding:20px 16px;" @change="draft.notice = nativeValue($event)" /></van-cell-group>
    </template>
  </view>
</template>

<style scoped>
.page { padding: 28rpx 30rpx calc(40rpx + env(safe-area-inset-bottom)); }.heading, .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.heading { margin-bottom: 30rpx; }.eyebrow { color: #a43e1d; font-size: 10px; font-weight: 650; letter-spacing: 1px; }.title { margin-top: 8rpx; font-size: 22px; font-weight: 800; }
.section-title { margin: 34rpx 0 18rpx; font-size: 14px; font-weight: 750; }.status-switch { display: flex; align-items: center; padding-left: 18rpx; }.section-heading { margin-top: 30rpx; }.section-heading .section-title { margin: 0 0 18rpx; }
</style>
