import type { User } from "../types";
import { ApiError } from "./errors";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface AuthResponse {
  token: string;
  user: User;
}

let token = "";
let currentUser: User | null = null;
let sessionExpiryModalVisible = false;

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<User>;
  return (
    typeof user.id === "string" &&
    typeof user.nickname === "string" &&
    ["STUDENT", "MERCHANT", "ADMIN"].includes(String(user.role))
  );
}

export const session = {
  get token() {
    return token;
  },
  get user() {
    return currentUser;
  },
  restore() {
    const savedToken = uni.getStorageSync(TOKEN_KEY);
    const savedUser = uni.getStorageSync(USER_KEY);
    if (typeof savedToken === "string" && savedToken && isUser(savedUser)) {
      token = savedToken;
      currentUser = savedUser;
      return currentUser;
    }
    session.clear();
    return null;
  },
  save(auth: AuthResponse) {
    if (!auth.token || !isUser(auth.user)) {
      throw new ApiError("登录响应无效，请稍后重试");
    }
    token = auth.token;
    currentUser = auth.user;
    uni.setStorageSync(TOKEN_KEY, token);
    uni.setStorageSync(USER_KEY, currentUser);
    return currentUser;
  },
  clear() {
    token = "";
    currentUser = null;
    uni.removeStorageSync(TOKEN_KEY);
    uni.removeStorageSync(USER_KEY);
  },
  expire(requestToken: string) {
    if (token !== requestToken) return;
    session.clear();
    if (sessionExpiryModalVisible) return;
    sessionExpiryModalVisible = true;
    uni.showModal({
      title: "登录状态已失效",
      content: "请重新登录后继续。购物车和已填写的订单备注会保留。",
      confirmText: "去登录",
      cancelText: "稍后再说",
      success: ({ confirm }) => {
        if (confirm) uni.switchTab({ url: "/pages/profile/index" });
      },
      complete: () => {
        sessionExpiryModalVisible = false;
      },
    });
  },
};
