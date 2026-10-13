import type { Order, OrderStatus } from "../types";

export const STATUS_TEXT: Record<OrderStatus, string> = {
  CREATED: "待接单",
  ACCEPTED: "制作中",
  READY: "待取餐",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export const ACTIVE_STATUSES: OrderStatus[] = ["CREATED", "ACCEPTED", "READY"];

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CREATED: "ACCEPTED",
  ACCEPTED: "READY",
  READY: "COMPLETED",
};

export const ACTION_TEXT: Partial<Record<OrderStatus, string>> = {
  CREATED: "接单并开始制作",
  ACCEPTED: "标记为待取餐",
  READY: "标记为已完成",
};

export const ORDER_STEPS = (
  ["CREATED", "ACCEPTED", "READY", "COMPLETED"] as const
).map((status) => ({ status, label: STATUS_TEXT[status] }));

export function orderItemsText(order: Order) {
  return order.items.map((item) => `${item.name} × ${item.quantity}`).join("、");
}

export function stepState(
  currentStatus: OrderStatus,
  index: number,
) {
  if (currentStatus === "CANCELLED") return "inactive";
  const currentIndex = ORDER_STEPS.findIndex((step) => step.status === currentStatus);
  return index < currentIndex ? "done" : index === currentIndex ? "current" : "inactive";
}
