import type { Order } from "../types";
import { NetworkError } from "./errors";
import { request } from "./http";

export const paymentsApi = {
  async payTestOrder(id: string): Promise<Order> {
    const path = `/orders/${encodeURIComponent(id)}`;
    const pay = () => request<Order>(`${path}/pay/test`, { method: "POST" });
    try {
      return await pay().catch((reason: unknown) => {
        if (!(reason instanceof NetworkError)) throw reason;
        // 按订单幂等，网络层失败只重试一次，HTTP 错误不重试。
        return pay();
      });
    } catch (reason: unknown) {
      if (!(reason instanceof NetworkError)) throw reason;
      // 请求可能已成功，先向服务端确认，不能凭弹窗或本地状态判定已付。
      const order = await request<Order>(path).catch(() => null);
      if (order?.paymentStatus === "PAID") return order;
      throw reason;
    }
  },
};
