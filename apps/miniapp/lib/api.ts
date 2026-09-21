const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
export const api = {
  token: "",
  user: null as any,
  restore() {
    this.token = uni.getStorageSync("token") || "";
    this.user = uni.getStorageSync("user") || null;
  },
  async request(path: string, method = "GET", data?: any) {
    const res = await new Promise<any>((resolve, reject) =>
      uni.request({
        url: base + path,
        method: method as any,
        data,
        header: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        success: resolve,
        fail: reject,
      }),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) return res.data;
    throw new Error(res.data?.message || "网络请求失败");
  },
  async login(role = "STUDENT") {
    const r = await this.request("/auth/dev", "POST", { role });
    this.token = r.token;
    this.user = r.user;
    uni.setStorageSync("token", r.token);
    uni.setStorageSync("user", r.user);
    return r;
  },
  money(v: number) {
    return `¥${(v / 100).toFixed(2)}`;
  },
};
