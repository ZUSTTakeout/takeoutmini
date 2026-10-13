import type { CreateOrderInput, LoginRole, OrderStatus, Product, Shop, User } from "../types";
import { ApiError } from "../services/errors";
import { MOCK_MERCHANT, MOCK_STUDENT } from "./fixtures";
import { createOrder, transitionOrder } from "./orders";
import { clone, getState, publicOrder, saveState, type MockState } from "./store";

export interface MockRequestConfig { method?: "GET" | "POST" | "PATCH"; data?: unknown }
function merchantShop(state: MockState, user: User) {
  if (user.role !== "MERCHANT") throw new ApiError("请使用商户账号登录", 403);
  const shop = state.shops.find((item) => item.id === user.shopId);
  if (!shop) throw new ApiError("店铺不存在", 404);
  return shop;
}
function saveProduct(state: MockState, shop: Shop, patch: Partial<Product>, id?: string) {
  const existing = id ? shop.products.find((item) => item.id === id) : undefined;
  if (id && !existing) throw new ApiError("商品不存在", 404);
  const product: Product = {
    id: existing?.id ?? `mock-product-${++state.sequence}`, name: "", price: 0, stock: 0,
    categoryId: "", isAvailable: true, description: "", image: null, ...existing, ...patch,
  };
  product.id = existing?.id ?? product.id;
  product.name = product.name.trim();
  if (!product.name || !Number.isInteger(product.price) || product.price < 0 || product.price > 100_000_000 ||
      !Number.isInteger(product.stock) || product.stock < 0 || product.stock > 1_000_000 ||
      !shop.categories.some((category) => category.id === product.categoryId)) {
    throw new ApiError("请检查商品名称、价格、库存和分类", 400);
  }
  if (existing) shop.products.splice(shop.products.indexOf(existing), 1, product);
  else shop.products.unshift(product);
  return product;
}

export function dispatchMockRequest(path: string, config: MockRequestConfig, user: User | null) {
  const method = config.method || "GET";
  const state = getState();
  let result: unknown;
  let changed = method !== "GET";
  if (path === "/auth/dev" || path === "/auth/wechat") {
    const role = (config.data as { role?: LoginRole } | undefined)?.role || "STUDENT";
    if (!["STUDENT", "MERCHANT"].includes(role)) throw new ApiError("登录身份无效", 400);
    changed = false;
    result = { token: role === "MERCHANT" ? "mock-merchant" : "mock-student", user: role === "MERCHANT" ? MOCK_MERCHANT : MOCK_STUDENT };
  } else if (path === "/shops" && method === "GET") {
    result = state.shops.map((shop) => ({ ...shop, products: shop.products.filter((product) => product.isAvailable) }));
  } else if (path.startsWith("/shops/") && method === "GET") {
    const shop = state.shops.find((item) => item.id === decodeURIComponent(path.slice(7)));
    result = shop ? { ...shop, products: shop.products.filter((product) => product.isAvailable) } : null;
  } else {
    if (!user) throw new ApiError("请先登录", 401);
    const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
    if (segments[0] === "merchant") {
      const shop = merchantShop(state, user);
      if (path === "/merchant/shop" && method === "GET") result = shop;
      else if (path === "/merchant/shop" && method === "PATCH") {
        const patch = config.data as Partial<Pick<Shop, "name" | "notice" | "isOpen">>;
        if (typeof patch.name === "string") {
          if (!patch.name.trim()) throw new ApiError("店铺名称不能为空", 400);
          shop.name = patch.name.trim();
          state.orders.filter((order) => order.shop.id === shop.id).forEach((order) => { order.shop.name = shop.name; });
        }
        if (typeof patch.notice === "string") shop.notice = patch.notice.trim();
        if (typeof patch.isOpen === "boolean") shop.isOpen = patch.isOpen;
        result = shop;
      } else if (segments[1] === "orders" && method === "GET") {
        const orders = state.orders.filter((order) => order.shop.id === shop.id);
        result = segments[2] ? publicOrder(orders.find((order) => order.id === segments[2]) ?? missingOrder()) : orders.map(publicOrder);
      } else if (path === "/merchant/stats" && method === "GET") {
        const completed = state.orders.filter((order) => order.shop.id === shop.id && order.status === "COMPLETED");
        result = { completedOrders: completed.length, revenue: completed.reduce((sum, order) => sum + order.total, 0), productCount: shop.products.length };
      } else if (path === "/merchant/categories" && method === "GET") result = shop.categories;
      else if (path === "/merchant/categories" && method === "POST") {
        const name = (config.data as { name: string }).name.trim();
        if (!name) throw new ApiError("分类名称不能为空", 400);
        if (shop.categories.some((category) => category.name === name)) throw new ApiError("该分类已存在", 409);
        const category = { id: `mock-category-${++state.sequence}`, name };
        shop.categories.push(category);
        result = category;
      } else if (segments[1] === "products" && (method === "POST" || method === "PATCH")) {
        result = saveProduct(state, shop, config.data as Partial<Product>, segments[2]);
      } else throw new ApiError("请求不存在", 404);
    } else if (path === "/orders" && method === "GET") {
      if (user.role !== "STUDENT") throw new ApiError("请使用学生账号查看订单", 403);
      result = state.orders.filter((order) => order.studentId === user.id).map(publicOrder);
    } else if (path === "/orders" && method === "POST") {
      result = createOrder(state, user, config.data as CreateOrderInput);
    } else if (segments[0] === "orders" && segments[2] === "status" && method === "PATCH") {
      result = transitionOrder(state, user, segments[1], (config.data as { status: OrderStatus }).status);
    } else if (segments[0] === "orders" && segments.length === 2 && method === "GET") {
      const order = state.orders.find((item) => item.id === segments[1] && item.studentId === user.id);
      if (user.role !== "STUDENT" || !order) throw new ApiError("订单不存在", 404);
      result = publicOrder(order);
    } else throw new ApiError("请求不存在", 404);
  }
  if (changed) saveState(state);
  return clone(result);
}

function missingOrder(): never { throw new ApiError("订单不存在", 404); }
export async function mockRequest<T>(path: string, config: MockRequestConfig, user: User | null): Promise<T> {
  const state = uni.getStorageSync("mock:v1:ui-state") as string | undefined;
  await new Promise<void>((resolve) => setTimeout(resolve, state === "loading" ? 8_000 : 160));
  if (state === "error") throw new ApiError("暂时连接不上，稍后再试", 503);
  if (state === "empty" && ["/shops", "/orders", "/merchant/orders"].includes(path) && (!config.method || config.method === "GET")) return [] as T;
  return dispatchMockRequest(path, config, user) as T;
}
