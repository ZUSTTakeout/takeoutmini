<script setup lang="ts">
import { computed } from "vue";
import type { OrderStatus } from "../types";
import { STATUS_TEXT } from "../utils/order";

const props = defineProps<{ status: OrderStatus }>();

const tone = computed(() => {
  if (props.status === "READY") return { background: "#fff0e5", text: "#b6532c" };
  if (props.status === "COMPLETED") return { background: "#eaf0f8", text: "#466a95" };
  if (props.status === "CANCELLED") return { background: "#f1eeeb", text: "#82766f" };
  return { background: "#fff3dd", text: "#9d691c" };
});
</script>

<template>
  <van-tag :color="tone.background" :text-color="tone.text" size="medium" round>
    {{ STATUS_TEXT[status] }}
  </van-tag>
</template>
