<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import ReIcon from "./ReIcon.vue";
const props = withDefaults(defineProps<{ active?: "home" | "orders" | "products" | "profile" }>(), { active: "home" });
const emit = defineEmits<{ navigate: [key: "home" | "orders" | "products" | "profile"] }>();
const items = [
  { key: "home" as const, title: "工作台", icon: "dashboard" as const, path: "/pages/merchant/index" },
  { key: "orders" as const, title: "订单", icon: "orders" as const, path: "/pages/merchant/orders" },
  { key: "products" as const, title: "商品", icon: "bag" as const, path: "/pages/merchant/products" },
  { key: "profile" as const, title: "我的", icon: "user" as const, path: "/pages/merchant/profile" },
];
function go(key: (typeof items)[number]["key"]) {
  emit("navigate", key);
  const target = items.find((item) => item.key === key);
  if (target && target.key !== props.active) uni.redirectTo({ url: target.path });
}
</script>

<template>
  <view class="merchant-nav" role="navigation" aria-label="商户导航">
    <view v-for="item in items" :key="item.key" :class="['nav-item', { active: item.key === active }]" role="button" :aria-label="item.title" :aria-current="item.key === active ? 'page' : undefined" hover-class="nav-pressed" :hover-stay-time="100" @click="go(item.key)">
      <view class="nav-icon"><ReIcon :name="item.icon" :color="item.key === active ? 'brand' : 'secondary'" :size="22" /></view><text>{{ item.title }}</text>
    </view>
  </view>
</template>

<style scoped>
.merchant-nav { position: fixed; right: 0; bottom: 0; left: 0; z-index: 20; display: flex; min-height: 68px; box-sizing: border-box; justify-content: space-around; padding: 8px 15px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: var(--color-surface); }
.nav-item { display: flex; min-width: 60px; flex: 1; flex-direction: column; align-items: center; gap: 3px; color: var(--color-text-secondary); font-size: 10px; }
.nav-icon { display: flex; width: 42px; height: 32px; align-items: center; justify-content: center; border-radius: 12px; transition: background var(--motion-normal); }
.active { color: var(--color-brand); font-weight: 650; }
.active .nav-icon { background: var(--color-brand-soft); }
.nav-pressed { opacity: 0.7; }
@media (prefers-reduced-motion: reduce) { .nav-icon { transition: none; } }
</style>
