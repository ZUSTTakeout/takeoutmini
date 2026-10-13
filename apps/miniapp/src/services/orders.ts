import type { CreateOrderInput, Order } from "../types";
import { request } from "./http";

export const ordersApi = {
  orders: () => request<Order[]>("/orders"),
  order: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
  createOrder: (data: CreateOrderInput) =>
    request<Order>("/orders", { method: "POST", data }),
  cancelOrder: (id: string) =>
    request<Order>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      data: { status: "CANCELLED" },
    }),
};
