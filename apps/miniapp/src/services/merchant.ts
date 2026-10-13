import type { Category, MerchantStats, Order, OrderStatus, Product, Shop } from "../types";
import { request } from "./http";

export const merchantApi = {
  merchantShop: () => request<Shop>("/merchant/shop"),
  merchantOrders: () => request<Order[]>("/merchant/orders"),
  merchantOrder: (id: string) =>
    request<Order>(`/merchant/orders/${encodeURIComponent(id)}`),
  merchantStats: () => request<MerchantStats>("/merchant/stats"),
  merchantStatus: (id: string, status: OrderStatus) =>
    request<Order>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      data: { status },
    }),
  updateShop: (data: Partial<Pick<Shop, "name" | "notice" | "isOpen">>) =>
    request<Shop>("/merchant/shop", { method: "PATCH", data }),
  product: (data: Partial<Product>, id?: string) =>
    request<Product>(
      id ? `/merchant/products/${encodeURIComponent(id)}` : "/merchant/products",
      { method: id ? "PATCH" : "POST", data },
    ),
  categories: () => request<Category[]>("/merchant/categories"),
  addCategory: (name: string) =>
    request<Category>("/merchant/categories", {
      method: "POST",
      data: { name },
    }),
};
