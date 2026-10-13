import type { LoginRole, User } from "../types";
import { ApiError } from "./errors";
import { request } from "./http";
import { session, type AuthResponse } from "./session";

function wechatCode() {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: "weixin",
      timeout: 10_000,
      success: ({ code }) =>
        code ? resolve(code) : reject(new ApiError("微信登录未返回有效凭证")),
      fail: () => reject(new ApiError("微信登录失败，请稍后重试")),
    });
  });
}

export const authApi = {
  get devAuthEnabled() {
    return import.meta.env.VITE_MOCK_ENABLED === "true" || import.meta.env.VITE_DEV_AUTH_ENABLED === "true" || import.meta.env.DEV;
  },
  isRole(role: LoginRole) {
    return Boolean(session.token && session.user?.role === role);
  },
  async login(role: LoginRole) {
    const auth = await request<AuthResponse>("/auth/dev", {
      method: "POST",
      data: { role },
      authenticated: false,
    });
    return session.save(auth);
  },
  async loginWithWechat() {
    const code = import.meta.env.VITE_MOCK_ENABLED === "true" ? "mock-wechat-code" : await wechatCode();
    const auth = await request<AuthResponse>("/auth/wechat", {
      method: "POST",
      data: { code },
      authenticated: false,
    });
    return session.save(auth);
  },
  async refreshUser() {
    const token = session.token;
    if (!token) return null;
    const user = await request<User>("/auth/me");
    // 后台校验期间用户可能已退出或切换账号。
    if (session.token !== token) return session.user;
    return session.save({ token, user });
  },
};
