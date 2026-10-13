import { STORAGE_PREFIX } from "../config/runtime";
import type { CartItem, Product } from "../types";

const CART_PREFIX = `${STORAGE_PREFIX}cart:`;
const CHECKOUT_PREFIX = `${STORAGE_PREFIX}checkout:`;
const REMARK_PREFIX = `${STORAGE_PREFIX}checkout-remark:`;
const MAX_QUANTITY = 99;

interface CheckoutAttempt {
  fingerprint: string;
  key: string;
}

function cartKey(shopId: string) {
  return `${CART_PREFIX}${shopId}`;
}

function checkoutKey(shopId: string) {
  return `${CHECKOUT_PREFIX}${shopId}`;
}

function remarkKey(shopId: string) {
  return `${REMARK_PREFIX}${shopId}`;
}

export function loadCheckoutRemark(shopId: string) {
  if (!shopId) return "";
  const saved = uni.getStorageSync(remarkKey(shopId));
  return typeof saved === "string" ? saved.slice(0, 200) : "";
}

export function saveCheckoutRemark(shopId: string, remark: string) {
  if (!shopId) return;
  if (!remark) {
    uni.removeStorageSync(remarkKey(shopId));
    return;
  }
  uni.setStorageSync(remarkKey(shopId), remark.slice(0, 200));
}

export function clearCheckoutRemark(shopId: string) {
  if (shopId) uni.removeStorageSync(remarkKey(shopId));
}

function validItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    Number.isInteger(item.price) &&
    Number(item.price) >= 0 &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) > 0
  );
}

export function loadCart(shopId: string) {
  if (!shopId) return [];
  const saved = uni.getStorageSync(cartKey(shopId));
  if (!Array.isArray(saved)) return [];
  return saved.filter(validItem).map((item) => ({
    ...item,
    stock: Number.isInteger(item.stock) ? Math.max(0, item.stock) : MAX_QUANTITY,
    quantity: Math.min(item.quantity, MAX_QUANTITY),
  }));
}

export function saveCart(shopId: string, items: CartItem[]) {
  if (!shopId) return;
  if (!items.length) {
    uni.removeStorageSync(cartKey(shopId));
    return;
  }
  uni.setStorageSync(cartKey(shopId), items);
}

export function reconcileCartWithRemoved(items: CartItem[], products: Product[]) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const removed: CartItem[] = [];
  const next = items.flatMap((item) => {
    const product = productsById.get(item.productId);
    if (!product?.isAvailable || product.stock < 1) {
      removed.push(item);
      return [];
    }
    return [
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        quantity: Math.min(item.quantity, product.stock, MAX_QUANTITY),
      },
    ];
  });
  return { items: next, removed };
}

export function reconcileCart(items: CartItem[], products: Product[]) {
  return reconcileCartWithRemoved(items, products).items;
}

function fingerprint(shopId: string, items: CartItem[], remark: string) {
  const itemFingerprint = [...items]
    .sort((left, right) => left.productId.localeCompare(right.productId))
    .map((item) => `${item.productId}:${item.quantity}:${item.price}`)
    .join("|");
  return JSON.stringify([shopId, itemFingerprint, remark]);
}

export function getCheckoutAttempt(
  shopId: string,
  items: CartItem[],
  remark: string,
) {
  const currentFingerprint = fingerprint(shopId, items, remark);
  const saved = uni.getStorageSync(checkoutKey(shopId)) as
    | Partial<CheckoutAttempt>
    | undefined;
  if (
    saved &&
    saved.fingerprint === currentFingerprint &&
    typeof saved.key === "string" &&
    saved.key
  ) {
    return saved.key;
  }
  const attempt: CheckoutAttempt = {
    fingerprint: currentFingerprint,
    key: `mini-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  };
  uni.setStorageSync(checkoutKey(shopId), attempt);
  return attempt.key;
}

export function findCheckoutAttempt(
  shopId: string,
  items: CartItem[],
  remark: string,
) {
  const saved = uni.getStorageSync(checkoutKey(shopId)) as
    | Partial<CheckoutAttempt>
    | undefined;
  return saved &&
    saved.fingerprint === fingerprint(shopId, items, remark) &&
    typeof saved.key === "string" &&
    saved.key
    ? saved.key
    : null;
}

export function clearCheckoutAttempt(shopId: string) {
  if (shopId) uni.removeStorageSync(checkoutKey(shopId));
}
