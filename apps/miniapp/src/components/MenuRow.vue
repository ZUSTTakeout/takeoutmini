<script setup lang="ts">
import ReIcon from "./ReIcon.vue";
import type { ReIconName } from "../icons";

withDefaults(defineProps<{
  title: string;
  icon: ReIconName;
  color?: string;
  loading?: boolean;
  border?: boolean;
  danger?: boolean;
}>(), {
  color: "brand",
  loading: false,
  border: true,
  danger: false,
});

defineEmits<{ click: [] }>();
</script>

<template>
  <van-cell
    :title="title"
    :border="border"
    center
    clickable
    :title-style="`font-size: 15px; font-weight: 500; color: ${danger ? '#a0493c' : '#322d29'};`"
    custom-style="padding: 19px 20px; background: transparent;"
    @click="$emit('click')"
  >
    <view slot="icon" class="menu-icon">
      <ReIcon :name="icon" :color="color" :size="23" />
    </view>
    <view slot="right-icon" class="menu-arrow">
      <van-loading v-if="loading" size="18px" color="#c4532b" />
      <ReIcon v-else name="chevron-right" color="secondary" :size="18" />
    </view>
  </van-cell>
</template>

<style scoped>
.menu-icon { display: flex; align-items: center; margin-right: 14px; }
.menu-arrow { display: flex; align-items: center; margin-left: 12px; }
</style>
