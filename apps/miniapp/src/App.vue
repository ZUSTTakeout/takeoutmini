<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { api } from "./services/api";

onLaunch(() => {
  if (api.restore()) void api.refreshUser().catch(() => undefined);
});
</script>

<style>
@import "./styles/theme.css";
@import "./styles/layout.css";
@import "./styles/motion.css";
@import "./styles/vant.css";

page {
  min-height: 100%;
  background: var(--color-background);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: var(--font-body);
  line-height: 1.5;
}

button {
  border-radius: var(--radius-control);
}

button::after {
  border: 0;
}
</style>
