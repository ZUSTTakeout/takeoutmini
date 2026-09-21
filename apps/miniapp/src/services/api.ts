import type { User, Shop, Order, Product, Category } from "../types";
const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
let token = uni.getStorageSync("token") || "";
async function request<T>(path: string, options: UniApp.RequestOptions = {}) {
  try {
    const res = await uni.request({
      url: base + path,
      header: {
        ...(options.header || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    if (res.statusCode >= 200 && res.statusCode < 300) return res.data as T;
    throw new Error((res.data as any)?.message || `请求失败 ${res.statusCode}`);
  } catch (e) {
    throw e;
  }
}
export const api = {
  restore() {
    token = uni.getStorageSync("token") || "";
  },
  async devLogin(role: "STUDENT" | "MERCHANT") {
    const d = await request<{ token: string; user: User }>("/auth/dev", {
      method: "POST",
      data: { role },
    });
    token = d.token;
    uni.setStorageSync("token", token);
    uni.setStorageSync("user", d.user);
    return d.user;
  },
  shops: () => request<Shop[]>("/shops"),
  shop: (id: string) => request<Shop>(`/shops/${id}`),
  orders: () => request<Order[]>("/orders"),
  order: (id: string) => request<Order>(`/orders/${id}`),
  createOrder: (data: any) =>
    request<Order>("/orders", { method: "POST", data }),
  cancelOrder: (id: string) =>
    request<Order>(`/orders/${id}/status`, {
      method: "PATCH",
      data: { status: "CANCELLED" },
    }),
  merchantShop: () => request<Shop>("/merchant/shop"),
  merchantOrders: () => request<Order[]>("/merchant/orders"),
  merchantStats: () => request<any>("/merchant/stats"),
  merchantStatus: (id: string, status: string) =>
    request<Order>(`/orders/${id}/status`, {
      method: "PATCH",
      data: { status },
    }),
  updateShop: (data: any) =>
    request<Shop>("/merchant/shop", { method: "PATCH", data }),
  product: (data: any, id?: string) =>
    request<Product>(id ? `/merchant/products/${id}` : "/merchant/products", {
      method: id ? "PATCH" : "POST",
      data,
    }),
  categories: () => request<Category[]>("/merchant/categories"),
  addCategory: (name: string) =>
    request<Category>("/merchant/categories", {
      method: "POST",
      data: { name },
    }),
};
