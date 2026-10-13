<script setup lang="ts">
import ReIcon from "./ReIcon.vue";
import { nativeValue } from "../utils/events";

withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
}>(), {
  placeholder: "搜索店铺或美食",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  search: [value: string];
}>();
</script>

<template>
  <view class="search-field">
    <van-search
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :use-left-icon-slot="true"
      :use-right-icon-slot="true"
      :clearable="false"
      background="transparent"
      shape="round"
      @change="emit('update:modelValue', nativeValue($event))"
      @search="emit('search', nativeValue($event))"
    >
      <view slot="left-icon" class="search-icon"><ReIcon name="search" color="secondary" :size="18" /></view>
      <view v-if="modelValue" slot="right-icon" class="search-clear" @click="emit('update:modelValue', '')">
        <ReIcon name="close" color="secondary" :size="17" />
      </view>
    </van-search>
  </view>
</template>

<style scoped>
.search-field {
  --search-padding: 0;
  --search-background-color: #f3f1ee;
  --search-input-height: 38px;
  --field-input-text-color: var(--color-text);
  --field-placeholder-text-color: #a19a94;
}
.search-icon, .search-clear { display: flex; height: 24px; align-items: center; justify-content: center; }
.search-clear { width: 24px; }
</style>
