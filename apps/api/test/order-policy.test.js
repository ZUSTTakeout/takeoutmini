const { OrderStatus } = require("@prisma/client");
const {
  canTransitionOrder,
  createOrderNumber,
  isSameIdempotentOrder,
  normalizeOrderItems,
  normalizeRemark,
} = require("../dist/order-policy");

describe("order policy", () => {
  test("enforces the student and merchant state machines", () => {
    expect(
      canTransitionOrder("STUDENT", OrderStatus.CREATED, OrderStatus.CANCELLED),
    ).toBe(true);
    expect(
      canTransitionOrder("STUDENT", OrderStatus.CREATED, OrderStatus.ACCEPTED),
    ).toBe(false);
    expect(
      canTransitionOrder("MERCHANT", OrderStatus.CREATED, OrderStatus.ACCEPTED),
    ).toBe(true);
    expect(
      canTransitionOrder("MERCHANT", OrderStatus.ACCEPTED, OrderStatus.READY),
    ).toBe(true);
    expect(
      canTransitionOrder("MERCHANT", OrderStatus.READY, OrderStatus.COMPLETED),
    ).toBe(true);
    expect(
      canTransitionOrder("MERCHANT", OrderStatus.READY, OrderStatus.CANCELLED),
    ).toBe(false);
  });

  test("aggregates duplicate products in a stable order", () => {
    expect(
      normalizeOrderItems([
        { productId: "product-b", quantity: 2 },
        { productId: "product-a", quantity: 1 },
        { productId: "product-b", quantity: 3 },
      ]),
    ).toEqual([
      { productId: "product-a", quantity: 1 },
      { productId: "product-b", quantity: 5 },
    ]);
  });

  test("rejects a duplicate-product aggregate above the order limit", () => {
    expect(() =>
      normalizeOrderItems([
        { productId: "product-a", quantity: 60 },
        { productId: "product-a", quantity: 40 },
      ]),
    ).toThrow("同一商品数量不能超过 99");

    expect(() =>
      normalizeOrderItems([
        { productId: "product-a", quantity: 1, expectedPrice: 1200 },
        { productId: "product-a", quantity: 1, expectedPrice: 1300 },
      ]),
    ).toThrow("同一商品的确认价格不一致");
  });

  test("matches an idempotent replay by owner-scoped request content", () => {
    const existing = {
      shopId: "shop-a",
      remark: " 少放辣 ",
      items: [
        { productId: "product-a", quantity: 1, price: 1200 },
        { productId: "product-b", quantity: 2, price: 800 },
      ],
    };
    expect(
      isSameIdempotentOrder(existing, {
        shopId: "shop-a",
        remark: "少放辣",
        items: [
          { productId: "product-b", quantity: 1, expectedPrice: 800 },
          { productId: "product-a", quantity: 1, expectedPrice: 1200 },
          { productId: "product-b", quantity: 1, expectedPrice: 800 },
        ],
      }),
    ).toBe(true);
    expect(
      isSameIdempotentOrder(existing, {
        shopId: "shop-b",
        remark: "少放辣",
        items: existing.items,
      }),
    ).toBe(false);
    expect(
      isSameIdempotentOrder(existing, {
        shopId: "shop-a",
        remark: "少放辣",
        items: [
          { productId: "product-a", quantity: 1, expectedPrice: 1300 },
          { productId: "product-b", quantity: 2, expectedPrice: 800 },
        ],
      }),
    ).toBe(false);
    expect(normalizeRemark("   ")).toBeNull();
  });

  test("creates collision-resistant fixed-format order numbers", () => {
    const numbers = new Set(Array.from({ length: 100 }, createOrderNumber));
    expect(numbers.size).toBe(100);
    for (const number of numbers) expect(number).toMatch(/^CF[A-F0-9]{32}$/);
  });
});
