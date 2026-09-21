<script setup
    lang="ts">    import { onLaunch } from '@dcloudio/uni-app'; import { api } from './lib/api'; onLaunch(() => api.restore());</script>
<style>
page {
    background: #fffaf4;
    color: #2d2824;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif
}

button {
    border-radius: 999px
}
</style>
