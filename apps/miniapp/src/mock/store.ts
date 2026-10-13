import type { CartItem, Shop } from "../types";
import { createOrders, createShops, type MockOrder } from "./fixtures";

const STATE_KEY = "mock:v1:data";
export interface MockState {
  version: 1;
  shops: Shop[];
  orders: MockOrder[];
  sequence: number;
}
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function saveState(state: MockState) {
  uni.setStorageSync(STATE_KEY, state);
}
export function getState(): MockState {
  const saved = uni.getStorageSync(STATE_KEY) as MockState | undefined;
  if (saved?.version === 1 && Array.isArray(saved.shops) && Array.isArray(saved.orders)) {
    return clone(saved);
  }
  const shops = createShops();
  const state: MockState = { version: 1, shops, orders: createOrders(shops), sequence: 100 };
  const cart: CartItem[] = shops[0].products
    .filter((product) => ["mock-rice-2", "mock-noodle-1", "mock-drink-1"].includes(product.id))
    .map((product) => ({
      productId: product.id, name: product.name, price: product.price,
      stock: product.stock, quantity: product.id === "mock-noodle-1" ? 1 : 2,
    }));
  uni.setStorageSync("mock:v1:cart:mock-hejian", cart);
  uni.setStorageSync("mock:v1:checkout-remark:mock-hejian", "鸡腿饭少盐，柠檬茶少冰。");
  saveState(state);
  return state;
}
export function publicOrder(order: MockOrder) {
  const { id, number, status, total, createdAt, updatedAt, remark, shop, items } = order;
  return clone({
    id, number, status, total, createdAt, updatedAt, remark, shop, items,
    paymentStatus: order.paymentStatus ?? "NOT_REQUIRED",
    paymentMethod: order.paymentMethod ?? null,
    paymentReference: order.paymentReference ?? null,
    paidAt: order.paidAt ?? null, refundedAt: order.refundedAt ?? null,
  });
}
