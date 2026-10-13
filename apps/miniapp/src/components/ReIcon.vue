<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import SvgIcon from "./icons/SvgIcon.vue";
import type { IconName } from "../icons";
withDefaults(defineProps<{ name: IconName; size?: number | string; color?: string }>(), { size: 24, color: "inherit" });
</script>
<template><SvgIcon :name="name" :size="size" :color="color" /></template>
