const { OrderStatus, PaymentMethod, PaymentStatus, Role } = require("@prisma/client");
const { PaymentsService } = require("../../dist/payments/payments.service");
const { OrdersService } = require("../../dist/orders/orders.service");

function selectRow(row, select) {
  return Object.fromEntries(Object.entries(select).map(([key, value]) => [
    key, value === true ? row[key] : Array.isArray(row[key])
      ? row[key].map((item) => selectRow(item, value.select))
      : selectRow(row[key], value.select),
  ]));
}

function paymentFixture(patch = {}) {
  const student = { id: "student-a", role: Role.STUDENT, shopId: null };
  const merchant = { id: "merchant-a", role: Role.MERCHANT, shopId: "shop-a" };
  const order = {
    id: "order-a", number: "261013-A3F9-0001", studentId: student.id,
    shopId: merchant.shopId, status: OrderStatus.CREATED, total: 2400,
    paymentStatus: PaymentStatus.PENDING, paymentMethod: PaymentMethod.TEST,
    paymentReference: null, paidAt: null, refundedAt: null, remark: null,
    createdAt: new Date(), updatedAt: new Date(),
    shop: { id: merchant.shopId, name: "Campus shop", ownerId: merchant.id },
    items: [{ id: "item-a", productId: "product-a", name: "Lunch", price: 1200, quantity: 2 }],
    ...patch,
  };
  const stock = new Map([["product-a", 3]]);
  const writes = [];
  let queue = Promise.resolve();
  const prisma = {
    $transaction: jest.fn(async (callback) => {
      let release;
      let staged;
      let stagedStock;
      const matches = (where) => Object.entries(where).every(([key, value]) => staged[key] === value);
      const find = jest.fn(async ({ where, select }) => matches(where) ? selectRow(staged, select) : null);
      const transaction = {
        $queryRaw: jest.fn(async () => {
          const previous = queue;
          queue = new Promise((resolve) => { release = resolve; });
          await previous;
          staged = structuredClone(order);
          stagedStock = new Map(stock);
          return [{ id: order.id }];
        }),
        order: {
          findFirst: find, findUnique: find,
          updateMany: jest.fn(async ({ where, data }) => {
            if (!matches(where)) return { count: 0 };
            Object.assign(staged, data);
            writes.push(data);
            return { count: 1 };
          }),
        },
        product: {
          updateMany: jest.fn(async ({ where, data }) => {
            if (!stagedStock.has(where.id)) return { count: 0 };
            stagedStock.set(where.id, stagedStock.get(where.id) + data.stock.increment);
            return { count: 1 };
          }),
        },
      };
      try {
        const result = await callback(transaction);
        Object.assign(order, staged);
        for (const [id, value] of stagedStock) stock.set(id, value);
        return result;
      } finally { if (release) release(); }
    }),
  };
  return {
    order, stock, writes, student, merchant, prisma,
    payments: new PaymentsService(prisma), orders: new OrdersService(prisma),
  };
}

module.exports = { paymentFixture };
