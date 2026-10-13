export function formatOrderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间暂不可用";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function elapsedTime(value: string, now = Date.now()) {
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return "";
  const minutes = Math.max(0, Math.floor((now - created) / 60_000));
  return minutes === 0 ? "刚刚下单" : `${minutes} 分钟前`;
}
