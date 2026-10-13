import { ApiError } from "./errors";
import { session } from "./session";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const REQUEST_TIMEOUT = 10_000;

interface RequestConfig {
  method?: "GET" | "POST" | "PATCH";
  data?: unknown;
  authenticated?: boolean;
}

function responseMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter(Boolean).join("；") || fallback;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function request<T>(path: string, config: RequestConfig = {}) {
  const authenticated = config.authenticated !== false;
  if (authenticated && !session.token) {
    return Promise.reject(new ApiError("请先登录", 401));
  }
  const requestToken = session.token;
  // uni-app 的声明未包含 PATCH，实际请求接口支持该方法。
  const requestMethod = (config.method || "GET") as UniApp.RequestOptions["method"];

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: requestMethod,
      data: config.data as UniApp.RequestOptions["data"],
      header: authenticated && requestToken
        ? { Authorization: `Bearer ${requestToken}` }
        : {},
      timeout: REQUEST_TIMEOUT,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        if (response.statusCode === 401 && authenticated) session.expire(requestToken);
        reject(new ApiError(
          responseMessage(response.data, `请求失败（${response.statusCode}）`),
          response.statusCode,
        ));
      },
      fail: (failure) => {
        const detail = failure.errMsg?.replace(/^request:fail\s*/i, "").trim();
        reject(new ApiError(
          /timeout/i.test(detail || "")
            ? "请求超时，请检查网络后重试"
            : detail || "无法连接服务器，请检查网络后重试",
        ));
      },
    });
  });
}
