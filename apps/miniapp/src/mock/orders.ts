import type { CreateOrderInput, OrderStatus, User } from "../types";
import { ApiError } from "../services/errors";
import type { MockOrder } from "./fixtures";
import { publicOrder, type MockState } from "./store";

function normalizedRequest(input: CreateOrderInput) {
  if (!input.shopId || !input.idempotencyKey || !Array.isArray(input.items) || !input.items.length) {
    throw new ApiError("请检查订单信息", 400);
  }
  const merged = new Map<string, { productId: string; quantity: number; expectedPrice: number }>();
  for (const item of input.items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
        !Number.isInteger(item.expectedPrice) || item.expectedPrice < 0) {
      throw new ApiError("订单商品数据不合法", 400);
    }
    const previous = merged.get(item.productId);
    if (previous && previous.expectedPrice !== item.expectedPrice) throw new ApiError("同一商品的确认价格不一致", 400);
    const quantity = (previous?.quantity ?? 0) + item.quantity;
    if (quantity > 99) throw new ApiError("同一商品数量不能超过 99", 400);
    merged.set(item.productId, { ...item, quantity });
  }
  const items = [...merged.values()].sort((a, b) => a.productId.localeCompare(b.productId));
  const remark = (input.remark || "").trim().slice(0, 200);
  return { items, remark, fingerprint: JSON.stringify([input.shopId, items, remark]) };
}

export function createOrder(state: MockState, user: User, input: CreateOrderInput) {
  if (user.role !== "STUDENT") throw new ApiError("请使用学生账号下单", 403);
  const request = normalizedRequest(input);
  const existing = state.orders.find((order) => order.studentId === user.id && order.idempotencyKey === input.idempotencyKey);
  if (existing) {
    if (existing.fingerprint !== request.fingerprint) throw new ApiError("幂等键已用于其他订单请求", 409);
    return publicOrder(existing);
  }
  const shop = state.shops.find((item) => item.id === input.shopId);
  if (!shop?.isOpen) throw new ApiError("店铺不存在或未营业", 409);
  const items = request.items.map((item, index) => {
    const product = shop.products.find((entry) => entry.id === item.productId);
    if (!product) throw new ApiError("商品不存在或不属于该店铺", 400);
    if (!product.isAvailable) throw new ApiError("商品已下架", 409);
    if (product.price !== item.expectedPrice) throw new ApiError("商品价格已变化，请确认后重新下单", 409);
    if (product.stock < item.quantity) throw new ApiError("商品库存不足，请调整数量", 409);
    return { id: `mock-item-${state.sequence}-${index}`, productId: product.id, name: product.name, price: product.price, quantity: item.quantity };
  });
  // 全部校验通过后再扣库存，失败请求不会产生部分更新。
  for (const item of items) shop.products.find((product) => product.id === item.productId)!.stock -= item.quantity;
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const order: MockOrder = {
    id: `mock-order-${++state.sequence}`, number: `${date}${String(state.sequence).padStart(4, "0")}`,
    status: "CREATED", total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    createdAt: now.toISOString(), updatedAt: now.toISOString(), remark: request.remark,
    shop: { id: shop.id, name: shop.name }, items, studentId: user.id,
    idempotencyKey: input.idempotencyKey, fingerprint: request.fingerprint,
  };
  state.orders.unshift(order);
  return publicOrder(order);
}

export function transitionOrder(state: MockState, user: User, id: string, status: OrderStatus) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) throw new ApiError("订单不存在", 404);
  const student = user.role === "STUDENT" && order.studentId === user.id;
  const merchant = user.role === "MERCHANT" && order.shop.id === user.shopId;
  if (!student && !merchant) throw new ApiError("无权操作此订单", 403);
  const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = merchant
    ? { CREATED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["READY", "CANCELLED"], READY: ["COMPLETED"] }
    : { CREATED: ["CANCELLED"] };
  if (!allowed[order.status]?.includes(status)) throw new ApiError("当前订单状态不允许此操作", 409);
  if (status === "CANCELLED") {
    const shop = state.shops.find((item) => item.id === order.shop.id);
    for (const item of order.items) {
      const product = shop?.products.find((entry) => entry.id === item.productId);
      if (product) product.stock += item.quantity;
    }
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return publicOrder(order);
}
