import { onHide, onShow, onUnload } from "@dcloudio/uni-app";

interface PagePollingOptions {
  interval?: number;
  onPageShow?: () => void | Promise<void>;
}

export function usePagePolling(
  poll: () => void | Promise<void>,
  { interval = 10_000, onPageShow }: PagePollingOptions = {},
) {
  let timer: ReturnType<typeof setInterval> | undefined;

  function stopPolling() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }

  function startPolling() {
    stopPolling();
    timer = setInterval(() => void poll(), interval);
  }

  onShow(() => {
    void onPageShow?.();
    startPolling();
  });
  onHide(stopPolling);
  onUnload(stopPolling);
}
