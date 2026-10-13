<script setup lang="ts">
import ReIcon from "./ReIcon.vue";

const props = withDefaults(defineProps<{ active?: "home" | "orders" | "products" | "profile" }>(), { active: "home" });
const emit = defineEmits<{ navigate: [key: "home" | "orders" | "products" | "profile"] }>();
const items = [
  { key: "home" as const, title: "工作台", icon: "dashboard" as const, path: "/pages/merchant/index" },
  { key: "orders" as const, title: "订单", icon: "orders" as const, path: "/pages/merchant/orders" },
  { key: "products" as const, title: "商品", icon: "store" as const, path: "/pages/merchant/products" },
  { key: "profile" as const, title: "我的", icon: "user" as const, path: "/pages/merchant/profile" },
];

function go(key: (typeof items)[number]["key"]) {
  emit("navigate", key);
  const target = items.find((item) => item.key === key);
  if (target && target.key !== props.active) uni.redirectTo({ url: target.path });
}
</script>

<template>
  <van-tabbar :active="items.findIndex((item) => item.key === active)" active-color="#c4532b" inactive-color="#81766e" placeholder>
    <van-tabbar-item v-for="item in items" :key="item.key" @click="go(item.key)">
      <template #icon-active><ReIcon :name="item.icon" color="brand" :size="22" /></template>
      <template #icon><ReIcon :name="item.icon" color="secondary" :size="22" /></template>
      {{ item.title }}
    </van-tabbar-item>
  </van-tabbar>
</template>

<style scoped>
:deep(.van-tabbar) { background: #fffaf4; border-top: 1rpx solid #eee3da; }
:deep(.van-tabbar-item) { font-size: 10px; }
</style>
