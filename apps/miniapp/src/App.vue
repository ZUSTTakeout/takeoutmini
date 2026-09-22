<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { api } from "./services/api";

onLaunch(() => api.restore());
</script>

<style>
page {
  min-height: 100%;
  background: #fffaf4;
  color: #2d2824;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
}

button {
  border-radius: 16rpx;
}

button::after {
  border: 0;
}
</style>
