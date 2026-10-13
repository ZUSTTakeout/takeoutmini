const { OrderStatus, Prisma } = require("@prisma/client");
const { ConflictException } = require("@nestjs/common");
const { createOrderFixture } = require("./helpers/order-creation");
const {
  canTransitionOrder,
  createOrderNumber,
  isSameIdempotentOrder,
  normalizeOrderItems,
  normalizeRemark,
  orderNumberPrefix,
} = require("../dist/orders/order-policy");

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

  test("formats readable shop order numbers with a four-digit sequence", () => {
    const date = new Date("2026-10-13T04:00:00Z");
    const number = createOrderNumber("a3f9-campus", 38, date);
    expect(number).toBe("261013-A3F9-0038");
    expect(number).toMatch(/^\d{6}-[A-Z0-9]{4}-\d{4}$/);
    expect(createOrderNumber("a3f9-campus", 1, date)).toBe("261013-A3F9-0001");
    expect(createOrderNumber("a3f9-campus", 9999, date)).toBe("261013-A3F9-9999");
  });

  test("uses the campus calendar date across midnight in China", () => {
    expect(orderNumberPrefix("a3f9-campus", new Date("2026-10-13T15:59:59Z")))
      .toBe("261013-A3F9-");
    expect(orderNumberPrefix("a3f9-campus", new Date("2026-10-13T16:00:00Z")))
      .toBe("261014-A3F9-");
  });

  test.each([0, -1, 1.5, 10000])("rejects an invalid daily sequence: %s", (sequence) => {
    expect(() => createOrderNumber("a3f9-campus", sequence)).toThrow(RangeError);
  });
});

describe("daily shop order allocation", () => {
  const originalTestPayment = process.env.TEST_PAYMENT_ENABLED;
  beforeEach(() => {
    process.env.TEST_PAYMENT_ENABLED = "true";
    jest.useFakeTimers({ now: new Date("2026-10-13T04:00:00Z") });
  });
  afterEach(() => {
    if (originalTestPayment === undefined) delete process.env.TEST_PAYMENT_ENABLED;
    else process.env.TEST_PAYMENT_ENABLED = originalTestPayment;
    jest.useRealTimers();
  });

  test("increments the same shop's sequence without counting legacy orders or replays", async () => {
    const fixture = createOrderFixture();
    fixture.orders.push({ number: "CF" + "A".repeat(32), shopId: fixture.shop.id });
    const first = await fixture.create("first");
    const second = await fixture.create("second");
    expect(first.number).toBe("261013-A3F9-0001");
    expect(second.number).toBe("261013-A3F9-0002");
    const replay = await fixture.create("first");
    expect(replay.id).toBe(first.id);
    expect(fixture.orders).toHaveLength(3);
    expect(fixture.product.stock).toBe(98);
  });

  test("resets the daily sequence when the campus date changes", async () => {
    const fixture = createOrderFixture();
    const today = await fixture.create("today");
    jest.setSystemTime(new Date("2026-10-13T16:00:00Z"));
    const tomorrow = await fixture.create("tomorrow");
    expect(today.number).toBe("261013-A3F9-0001");
    expect(tomorrow.number).toBe("261014-A3F9-0001");
  });

  test("creates ten concurrent orders with unique increasing numbers", async () => {
    const fixture = createOrderFixture();
    const orders = await Promise.all(Array.from({ length: 10 }, (_, index) =>
      fixture.create("parallel-" + index),
    ));
    const numbers = orders.map((order) => order.number).sort();
    expect(new Set(numbers).size).toBe(10);
    expect(numbers).toEqual(Array.from({ length: 10 }, (_, index) =>
      "261013-A3F9-" + String(index + 1).padStart(4, "0"),
    ));
    expect(fixture.product.stock).toBe(90);
    expect(fixture.orders).toHaveLength(10);
  });

  test("recounts after P2002 without deducting stock twice", async () => {
    const fixture = createOrderFixture({
      beforeCreate: (data, orders) => {
        if (!orders.length) orders.push({ ...data, idempotencyKey: "other-request" });
      },
    });
    const order = await fixture.create("retry");
    expect(order.number).toBe("261013-A3F9-0002");
    expect(fixture.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(fixture.product.stock).toBe(99);
    expect(fixture.orders).toHaveLength(2);
  });

  test("skips numbers occupied by another shop with the same short code", async () => {
    const fixture = createOrderFixture();
    fixture.orders.push({ number: "261013-A3F9-0038", shopId: "a3f9-other" });
    expect((await fixture.create("same-code")).number).toBe("261013-A3F9-0039");
    expect(fixture.product.stock).toBe(99);
  });

  test("does not reuse a number when previous rows leave sequence gaps", async () => {
    const fixture = createOrderFixture();
    fixture.orders.push(
      { number: "261013-A3F9-0001", shopId: fixture.shop.id },
      { number: "261013-A3F9-0003", shopId: fixture.shop.id },
    );
    expect((await fixture.create("gap")).number).toBe("261013-A3F9-0004");
  });

  test("stops after three unique conflicts and rolls back stock", async () => {
    const fixture = createOrderFixture({
      beforeCreate: () => {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002", clientVersion: Prisma.prismaVersion.client,
          meta: { target: ["number"] },
        });
      },
    });
    await expect(fixture.create("conflict")).rejects.toBeInstanceOf(ConflictException);
    expect(fixture.prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(fixture.orders).toHaveLength(0);
    expect(fixture.product.stock).toBe(100);
  });

  test("rejects sequence overflow without creating an order or reducing stock", async () => {
    const fixture = createOrderFixture();
    fixture.orders.push({ number: "261013-A3F9-9999", shopId: fixture.shop.id });
    await expect(fixture.create("overflow")).rejects.toThrow("当日取餐号已用完");
    expect(fixture.orders).toHaveLength(1);
    expect(fixture.product.stock).toBe(100);
  });
});
