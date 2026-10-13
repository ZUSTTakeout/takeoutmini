declare const wx: {
  getRandomValues(options: {
    length: number;
    success: (result: { randomValues: ArrayBuffer }) => void;
    fail: () => void;
  }): void;
};

// 微信端没有 Web Crypto 时，用平台安全随机数生成同样的 UUID v4。
export const crypto = {
  async randomUUID(): Promise<string> {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return new Promise((resolve, reject) => {
      if (typeof wx === "undefined" || typeof wx.getRandomValues !== "function") {
        reject(new Error("当前版本无法生成订单编号，请升级微信后重试"));
        return;
      }
      wx.getRandomValues({
        length: 16,
        success: ({ randomValues }) => {
          const bytes = new Uint8Array(randomValues);
          bytes[6] = (bytes[6] & 15) | 64;
          bytes[8] = (bytes[8] & 63) | 128;
          const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
          resolve(`${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`);
        },
        fail: () => reject(new Error("订单准备失败，请稍后重试")),
      });
    });
  },
};
