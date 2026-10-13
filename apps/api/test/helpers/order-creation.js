const { OrderStatus, Prisma, Role } = require("@prisma/client");
const { OrdersService } = require("../../dist/orders/orders.service");

function createOrderFixture({ beforeCreate } = {}) {
  const shop = { id: "a3f9-campus", name: "Campus shop" };
  const student = { id: "student-a", role: Role.STUDENT };
  const product = {
    id: "product-a", shopId: shop.id, name: "Lunch",
    price: 1200, stock: 100, isAvailable: true,
  };
  const orders = [];
  let shopLock = Promise.resolve();
  const matches = (order, where) =>
    (!where.shopId || order.shopId === where.shopId) &&
    (!where.number || order.number.startsWith(where.number.startsWith));
  const findUnique = jest.fn(async ({ where }) => {
    if (where.number) return orders.find((order) => order.number === where.number) || null;
    const key = where.studentId_idempotencyKey;
    return orders.find((order) => order.studentId === key.studentId &&
      order.idempotencyKey === key.idempotencyKey) || null;
  });
  const count = jest.fn(async ({ where }) => orders.filter((order) => matches(order, where)).length);
  const findFirst = jest.fn(async ({ where }) => {
    const matching = orders.filter((order) => matches(order, where))
      .sort((a, b) => b.number.localeCompare(a.number));
    return matching[0] ? { number: matching[0].number } : null;
  });
  const prisma = {
    order: { findUnique },
    $transaction: jest.fn(async (callback) => {
      let release;
      let stagedStock;
      let stagedOrder;
      const transaction = {
        $queryRaw: jest.fn(async () => {
          const previous = shopLock;
          shopLock = new Promise((resolve) => { release = resolve; });
          await previous;
          stagedStock = product.stock;
          return [{ id: shop.id }];
        }),
        shop: { findFirst: jest.fn(async () => ({ id: shop.id })) },
        product: {
          findMany: jest.fn(async () => [{ ...product }]),
          updateMany: jest.fn(async ({ where, data }) => {
            if (where.id !== product.id || stagedStock < where.stock.gte) {
              return { count: 0 };
            }
            stagedStock -= data.stock.decrement;
            return { count: 1 };
          }),
        },
        order: {
          count, findFirst,
          create: jest.fn(async ({ data }) => {
            if (beforeCreate) await beforeCreate(data, orders);
            const duplicate = orders.some((order) => order.number === data.number ||
              (order.studentId === data.studentId && order.idempotencyKey === data.idempotencyKey));
            if (duplicate) {
              throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
                code: "P2002", clientVersion: Prisma.prismaVersion.client,
                meta: { target: ["number"] },
              });
            }
            stagedOrder = {
              ...data, id: `order-${orders.length + 1}`, status: OrderStatus.CREATED,
              shop, createdAt: new Date(), updatedAt: new Date(),
              items: data.items.create.map((item, index) => ({ ...item, id: `item-${index}` })),
            };
            return stagedOrder;
          }),
        },
      };
      try {
        const result = await callback(transaction);
        orders.push(stagedOrder);
        product.stock = stagedStock;
        return result;
      } finally {
        if (release) release();
      }
    }),
  };
  const service = new OrdersService(prisma);
  const create = (idempotencyKey) => service.create(student, {
    shopId: shop.id, idempotencyKey,
    items: [{ productId: product.id, quantity: 1, expectedPrice: product.price }],
  });
  return { prisma, service, shop, student, product, orders, create, count };
}

module.exports = { createOrderFixture };
