<script setup lang="ts">
defineOptions({ options: { virtualHost: true } });
import { computed } from "vue";
import { getIconColor, type IconName } from "../icons";

const props = withDefaults(defineProps<{
  name: IconName;
  size?: number | string;
  color?: string;
}>(), {
  size: 24,
  color: "text",
});

const source = computed(() => `/static/icons/${props.name}-${getIconColor(props.color)}.png`);
const dimension = computed(() => typeof props.size === "number" ? `${props.size}px` : props.size);
</script>

<template>
  <image
    class="re-icon"
    :src="source"
    :style="{ width: dimension, height: dimension }"
    mode="aspectFit"
    aria-hidden="true"
  />
</template>

<style scoped>
.re-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
