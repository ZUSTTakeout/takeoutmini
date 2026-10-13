<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
</script>
<template>
  <view class="page-frame">
    <view v-if="$slots.header" class="frame-header"><slot name="header" /></view>
    <view class="frame-body"><slot /></view>
    <view v-if="$slots.footer" class="frame-footer"><slot name="footer" /></view>
  </view>
</template>
<style scoped>
.page-frame { display: flex; height: 100vh; min-height: 0; box-sizing: border-box; flex-direction: column; background: var(--color-background); }
.frame-header { flex: none; background: var(--color-surface); }
.frame-body { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.frame-footer { position: sticky; bottom: 0; z-index: 5; flex: none; }
</style>
