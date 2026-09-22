import { randomUUID } from "node:crypto";
import { OrderStatus } from "@prisma/client";

export type OrderActor = "STUDENT" | "MERCHANT";

export type OrderItemQuantity = {
  productId: string;
  quantity: number;
  expectedPrice?: number;
  price?: number;
};

export type ComparableOrder = {
  shopId: string;
  remark: string | null;
  items: OrderItemQuantity[];
};

const transitions: Record<
  OrderActor,
  Partial<Record<OrderStatus, readonly OrderStatus[]>>
> = {
  STUDENT: {
    CREATED: [OrderStatus.CANCELLED],
  },
  MERCHANT: {
    CREATED: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
    ACCEPTED: [OrderStatus.READY, OrderStatus.CANCELLED],
    READY: [OrderStatus.COMPLETED],
  },
};

export function canTransitionOrder(
  actor: OrderActor,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return transitions[actor][from]?.includes(to) ?? false;
}

export function normalizeOrderItems(
  items: readonly OrderItemQuantity[],
): OrderItemQuantity[] {
  const normalized = new Map<
    string,
    { quantity: number; expectedPrice: number | undefined }
  >();
  for (const item of items) {
    if (
      typeof item.productId !== "string" ||
      !item.productId ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      throw new RangeError("订单商品数据不合法");
    }

    const expectedPrice = item.expectedPrice ?? item.price;
    if (
      expectedPrice !== undefined &&
      (!Number.isInteger(expectedPrice) ||
        expectedPrice < 0 ||
        expectedPrice > 100_000_000)
    ) {
      throw new RangeError("商品价格数据不合法");
    }

    const previous = normalized.get(item.productId);
    if (
      previous &&
      previous.expectedPrice !== undefined &&
      expectedPrice !== undefined &&
      previous.expectedPrice !== expectedPrice
    ) {
      throw new RangeError("同一商品的确认价格不一致");
    }
    const quantity = (previous?.quantity ?? 0) + item.quantity;
    if (quantity > 99) {
      throw new RangeError("同一商品数量不能超过 99");
    }
    normalized.set(item.productId, {
      quantity,
      expectedPrice: previous?.expectedPrice ?? expectedPrice,
    });
  }

  return [...normalized.entries()]
    .map(([productId, item]) => ({
      productId,
      quantity: item.quantity,
      ...(item.expectedPrice === undefined
        ? {}
        : { expectedPrice: item.expectedPrice }),
    }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}

export function normalizeRemark(remark: string | null | undefined): string | null {
  if (typeof remark !== "string") return null;
  const normalized = remark.trim();
  return normalized || null;
}

export function isSameIdempotentOrder(
  existing: ComparableOrder,
  requested: ComparableOrder,
): boolean {
  if (
    existing.shopId !== requested.shopId ||
    normalizeRemark(existing.remark) !== normalizeRemark(requested.remark)
  ) {
    return false;
  }

  let existingItems: OrderItemQuantity[];
  let requestedItems: OrderItemQuantity[];
  try {
    existingItems = normalizeOrderItems(existing.items);
    requestedItems = normalizeOrderItems(requested.items);
  } catch {
    return false;
  }

  return (
    existingItems.length === requestedItems.length &&
    existingItems.every(
      (item, index) =>
        item.productId === requestedItems[index].productId &&
        item.quantity === requestedItems[index].quantity &&
        item.expectedPrice === requestedItems[index].expectedPrice,
    )
  );
}

export function createOrderNumber(): string {
  return `CF${randomUUID().replaceAll("-", "").toUpperCase()}`;
}
