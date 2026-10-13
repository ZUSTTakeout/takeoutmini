export function formatMoney(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    console.error("[金额格式化] 预期收到以分为单位的非负安全整数，实际值：", value);
    return "金额暂不可用";
  }
  return `¥${(value / 100).toFixed(2)}`;
}
