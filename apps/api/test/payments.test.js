const { OrderStatus, PaymentStatus } = require("@prisma/client");
const { paymentFixture } = require("./helpers/payment");
const { createOrderFixture } = require("./helpers/order-creation");

describe("test payments", () => {
  const originalFlag = process.env.TEST_PAYMENT_ENABLED;
  const originalEnvironment = process.env.NODE_ENV;
  beforeEach(() => {
    process.env.TEST_PAYMENT_ENABLED = "true";
    process.env.NODE_ENV = "test";
  });
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.TEST_PAYMENT_ENABLED;
    else process.env.TEST_PAYMENT_ENABLED = originalFlag;
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });

  test("new orders reserve stock and wait for payment", async () => {
    const fixture = createOrderFixture();
    const order = await fixture.create("pending-payment");
    expect(order).toMatchObject({ status: "CREATED", paymentStatus: "PENDING", paymentMethod: "TEST", total: 1200 });
    expect(fixture.product.stock).toBe(99);
  });

  test("pays the server amount once and returns the same result to ten concurrent retries", async () => {
    const fixture = paymentFixture();
    const results = await Promise.all(Array.from({ length: 10 }, () =>
      fixture.payments.payTest(fixture.order.id, fixture.student.id),
    ));
    expect(new Set(results.map((order) => order.paymentReference)).size).toBe(1);
    expect(results.every((order) => order.paymentStatus === PaymentStatus.PAID && order.total === 2400)).toBe(true);
    expect(results[0].paymentReference).toMatch(/^TEST-/);
    expect(results[0].paidAt).toBeInstanceOf(Date);
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.stock.get("product-a")).toBe(3);
    expect(results[0]).not.toHaveProperty("studentId");
  });

  test("another student's order cannot be paid", async () => {
    const fixture = paymentFixture();
    await expect(fixture.payments.payTest(fixture.order.id, "student-other")).rejects.toThrow("订单不存在");
    expect(fixture.order.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(fixture.writes).toHaveLength(0);
  });

  test("a merchant cannot accept an unpaid order", async () => {
    const fixture = paymentFixture();
    await expect(fixture.orders.transition(fixture.order.id, OrderStatus.ACCEPTED, fixture.merchant))
      .rejects.toThrow("尚未付款");
    expect(fixture.order.status).toBe(OrderStatus.CREATED);
    await fixture.payments.payTest(fixture.order.id, fixture.student.id);
    await expect(fixture.orders.transition(fixture.order.id, OrderStatus.ACCEPTED, fixture.merchant))
      .resolves.toMatchObject({ status: OrderStatus.ACCEPTED, paymentStatus: PaymentStatus.PAID });
  });

  test("cancelling an unpaid order closes payment and restores stock only once", async () => {
    const fixture = paymentFixture();
    await expect(fixture.orders.transition(fixture.order.id, OrderStatus.CANCELLED, fixture.student))
      .resolves.toMatchObject({ status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.CLOSED });
    await expect(fixture.payments.payTest(fixture.order.id, fixture.student.id)).rejects.toThrow("订单已关闭");
    await expect(fixture.orders.transition(fixture.order.id, OrderStatus.CANCELLED, fixture.student))
      .rejects.toThrow("不允许");
    expect(fixture.stock.get("product-a")).toBe(5);
  });

  test("cancelling a paid test order records the refund and restores stock atomically", async () => {
    const fixture = paymentFixture();
    const paid = await fixture.payments.payTest(fixture.order.id, fixture.student.id);
    const cancelled = await fixture.orders.transition(fixture.order.id, OrderStatus.CANCELLED, fixture.student);
    expect(cancelled).toMatchObject({ status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.REFUNDED, paymentReference: paid.paymentReference });
    expect(cancelled.refundedAt).toBeInstanceOf(Date);
    expect(cancelled.paidAt).toEqual(paid.paidAt);
    expect(fixture.stock.get("product-a")).toBe(5);
    await expect(fixture.payments.payTest(fixture.order.id, fixture.student.id)).rejects.toThrow("订单已关闭");
  });

  test.each([true, false])("payment and cancellation races cannot leave a cancelled order paid (pay first: %s)", async (payFirst) => {
    const fixture = paymentFixture();
    const pay = () => fixture.payments.payTest(fixture.order.id, fixture.student.id);
    const cancel = () => fixture.orders.transition(fixture.order.id, OrderStatus.CANCELLED, fixture.student);
    const results = await Promise.allSettled(payFirst ? [pay(), cancel()] : [cancel(), pay()]);
    expect(results[payFirst ? 1 : 0].status).toBe("fulfilled");
    expect(fixture.order.status).toBe(OrderStatus.CANCELLED);
    expect(fixture.order.paymentStatus).toBe(payFirst ? PaymentStatus.REFUNDED : PaymentStatus.CLOSED);
    expect(fixture.stock.get("product-a")).toBe(5);
  });

  test("legacy orders still use the existing order state machine", async () => {
    const fixture = paymentFixture({ paymentStatus: PaymentStatus.NOT_REQUIRED, paymentMethod: null });
    await expect(fixture.orders.transition(fixture.order.id, OrderStatus.ACCEPTED, fixture.merchant))
      .resolves.toMatchObject({ status: OrderStatus.ACCEPTED });
    await expect(fixture.payments.payTest(fixture.order.id, fixture.student.id)).rejects.toThrow("不支持测试支付");
  });

  test.each(["disabled", "production"])("test payment cannot run when %s", async (mode) => {
    if (mode === "disabled") process.env.TEST_PAYMENT_ENABLED = "false";
    else process.env.NODE_ENV = "production";
    const fixture = paymentFixture();
    await expect(fixture.payments.payTest(fixture.order.id, fixture.student.id)).rejects.toThrow("支付暂不可用");
    expect(fixture.prisma.$transaction).not.toHaveBeenCalled();
    const creation = createOrderFixture();
    await expect(creation.create("unavailable")).rejects.toThrow("支付暂不可用");
    expect(creation.product.stock).toBe(100);
  });
});
