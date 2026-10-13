<script setup lang="ts">
import ReIcon from "./ReIcon.vue";
import type { ReIconName } from "../icons";

withDefaults(defineProps<{
  name: ReIconName;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: "plain" | "primary" | "secondary" | "danger";
}>(), {
  disabled: false,
  loading: false,
  variant: "plain",
});

defineEmits<{ click: [] }>();
</script>

<template>
  <view :class="['icon-button', variant]" @click.stop>
    <van-button
      :disabled="disabled || loading"
      :loading="loading"
      :aria-label="label"
      :color="variant === 'primary' ? '#c4532b' : variant === 'secondary' ? '#fff0e5' : variant === 'danger' ? '#f9e7e3' : 'transparent'"
      :round="true"
      size="small"
      loading-size="20px"
      custom-style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: 0;"
      @click="$emit('click')"
    >
      <ReIcon
        :name="name"
        :color="variant === 'primary' ? 'white' : variant === 'danger' ? 'danger' : 'brand'"
        :size="21"
      />
    </van-button>
  </view>
</template>

<style scoped>
.icon-button {
  display: flex;
  width: 40px;
  height: 40px;
  flex: none;
  align-items: center;
  justify-content: center;
}
</style>
