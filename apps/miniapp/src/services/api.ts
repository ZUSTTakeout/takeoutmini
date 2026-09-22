import type {
  Category,
  CreateOrderInput,
  LoginRole,
  MerchantStats,
  Order,
  OrderStatus,
  Product,
  Shop,
  User,
} from "../types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const TOKEN_KEY = "token";
const USER_KEY = "user";

type HttpMethod = "GET" | "POST" | "PATCH";

interface RequestConfig {
  method?: HttpMethod;
  data?: unknown;
  authenticated?: boolean;
}

interface AuthResponse {
  token: string;
  user: User;
}

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 0) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

let token = "";
let currentUser: User | null = null;

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<User>;
  return (
    typeof user.id === "string" &&
    typeof user.nickname === "string" &&
    ["STUDENT", "MERCHANT", "ADMIN"].includes(String(user.role))
  );
}

function responseMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter(Boolean).join("；") || fallback;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function clearSession() {
  token = "";
  currentUser = null;
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
}

function saveSession(auth: AuthResponse) {
  if (!auth.token || !isUser(auth.user)) {
    throw new ApiError("登录响应无效，请稍后重试");
  }
  token = auth.token;
  currentUser = auth.user;
  uni.setStorageSync(TOKEN_KEY, token);
  uni.setStorageSync(USER_KEY, currentUser);
  return currentUser;
}

function request<T>(path: string, config: RequestConfig = {}) {
  const authenticated = config.authenticated !== false;
  if (authenticated && !token) {
    return Promise.reject(new ApiError("请先登录", 401));
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: (config.method || "GET") as never,
      data: config.data as UniApp.RequestOptions["data"],
      header: authenticated && token ? { Authorization: `Bearer ${token}` } : {},
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        if (response.statusCode === 401) clearSession();
        reject(
          new ApiError(
            responseMessage(response.data, `请求失败（${response.statusCode}）`),
            response.statusCode,
          ),
        );
      },
      fail: (failure) => {
        const detail = failure.errMsg?.replace(/^request:fail\s*/i, "").trim();
        reject(new ApiError(detail || "无法连接服务器，请检查网络后重试"));
      },
    });
  });
}

function wechatCode() {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: "weixin",
      success: ({ code }) =>
        code ? resolve(code) : reject(new ApiError("微信登录未返回有效凭证")),
      fail: () => reject(new ApiError("微信登录失败，请稍后重试")),
    });
  });
}

export function getErrorMessage(error: unknown, fallback = "请求失败，请稍后重试") {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const api = {
  get token() {
    return token;
  },
  get user() {
    return currentUser;
  },
  get devAuthEnabled() {
    return import.meta.env.VITE_DEV_AUTH_ENABLED === "true" || import.meta.env.DEV;
  },
  restore() {
    const savedToken = uni.getStorageSync(TOKEN_KEY);
    const savedUser = uni.getStorageSync(USER_KEY);
    if (typeof savedToken === "string" && savedToken && isUser(savedUser)) {
      token = savedToken;
      currentUser = savedUser;
      return currentUser;
    }
    clearSession();
    return null;
  },
  logout() {
    clearSession();
  },
  isRole(role: LoginRole) {
    return Boolean(token && currentUser?.role === role);
  },
  async login(role: LoginRole) {
    const auth = await request<AuthResponse>("/auth/dev", {
      method: "POST",
      data: { role },
      authenticated: false,
    });
    return saveSession(auth);
  },
  async loginWithWechat() {
    const code = await wechatCode();
    const auth = await request<AuthResponse>("/auth/wechat", {
      method: "POST",
      data: { code },
      authenticated: false,
    });
    return saveSession(auth);
  },
  shops: () => request<Shop[]>("/shops", { authenticated: false }),
  shop: (id: string) =>
    request<Shop | null>(`/shops/${encodeURIComponent(id)}`, {
      authenticated: false,
    }),
  orders: () => request<Order[]>("/orders"),
  createOrder: (data: CreateOrderInput) =>
    request<Order>("/orders", { method: "POST", data }),
  cancelOrder: (id: string) =>
    request<Order>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      data: { status: "CANCELLED" },
    }),
  merchantShop: () => request<Shop>("/merchant/shop"),
  merchantOrders: () => request<Order[]>("/merchant/orders"),
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
  money(value: number) {
    const amount = Number.isFinite(value) ? value : 0;
    return `¥${(amount / 100).toFixed(2)}`;
  },
};
