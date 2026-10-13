import { ref } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { getErrorMessage } from "../services/errors";
async function runRefresh(refresh: () => void | Promise<void>) {
  try { await refresh(); }
  catch (reason: unknown) { uni.showToast({ title: getErrorMessage(reason, "刷新失败，请稍后再试"), icon: "none" }); }
}
export function usePullRefresh(refresh: () => void | Promise<void>) {
  onPullDownRefresh(async () => {
    try { await runRefresh(refresh); }
    finally { uni.stopPullDownRefresh(); }
  });
}
export function useScrollRefresh(refresh: () => void | Promise<void>) {
  const refreshing = ref(false);
  async function onRefresh() {
    if (refreshing.value) return;
    refreshing.value = true;
    try { await runRefresh(refresh); }
    finally { refreshing.value = false; }
  }
  return { refreshing, onRefresh };
}
