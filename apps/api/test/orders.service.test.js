const { OrderStatus, Prisma, Role } = require("@prisma/client");
const { OrdersService } = require("../dist/orders/orders.service");

describe("order cancellation", () => {
  test("cancels an order with a deleted product and restores remaining stock", async () => {
    const order = {
      id: "order-a",
      status: OrderStatus.CREATED,
      studentId: "student-a",
      shopId: "shop-a",
      shop: { ownerId: "merchant-a" },
      items: [
        { productId: "product-a", quantity: 2 },
        { productId: "deleted-product", quantity: 1 },
        { productId: "product-b", quantity: 4 },
      ],
    };
    const stock = new Map([
      ["product-a", 3],
      ["deleted-product", 9],
      ["product-b", 7],
    ]);
    stock.delete("deleted-product");

    const incrementStock = ({ where, data }) => {
      const currentStock = stock.get(where.id);
      if (currentStock === undefined) return 0;
      stock.set(where.id, currentStock + data.stock.increment);
      return 1;
    };
    const transaction = {
      $queryRaw: jest.fn(async () => [{ id: order.id }]),
      order: {
        findUnique: jest.fn(async () => ({ ...order })),
        updateMany: jest.fn(async ({ where, data }) => {
          if (where.id !== order.id || where.status !== order.status) {
            return { count: 0 };
          }
          order.status = data.status;
          return { count: 1 };
        }),
      },
      product: {
        update: jest.fn(async (args) => {
          if (incrementStock(args) === 0) {
            throw new Prisma.PrismaClientKnownRequestError(
              "Record to update not found.",
              { code: "P2025", clientVersion: Prisma.prismaVersion.client },
            );
          }
          return { id: args.where.id, stock: stock.get(args.where.id) };
        }),
        updateMany: jest.fn(async (args) => ({ count: incrementStock(args) })),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const service = new OrdersService(prisma);

    await expect(
      service.transition(order.id, OrderStatus.CANCELLED, {
        id: order.studentId,
        role: Role.STUDENT,
      }),
    ).resolves.toMatchObject({ id: order.id, status: OrderStatus.CANCELLED });

    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(stock.has("deleted-product")).toBe(false);
    expect(stock.get("product-a")).toBe(5);
    expect(stock.get("product-b")).toBe(11);
  });
});
