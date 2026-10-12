<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { api } from "./services/api";

onLaunch(() => api.restore());
</script>

<style>
@import "./styles/theme.css";

page {
  min-height: 100%;
  background: #fffaf4;
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
}

button {
  border-radius: var(--radius-control);
}

button::after {
  border: 0;
}
</style>
