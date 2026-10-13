import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth";
import { CreateOrderDto } from "./orders.dto";
import {
  canTransitionOrder,
  createOrderNumber,
  isSameIdempotentOrder,
  normalizeOrderItems,
  normalizeRemark,
  orderNumberPrefix,
  OrderActor,
  OrderItemQuantity,
} from "./order-policy";
import { PrismaService } from "../database/prisma.service";
import { orderResponseSelect } from "./order.selects";
import { assertTestPaymentsEnabled } from "../payments/payment-policy";

const existingOrderSelect = {
  ...orderResponseSelect,
  shopId: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  listForStudent(studentId: string) {
    return this.prisma.order.findMany({
      where: { studentId },
      select: orderResponseSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getForStudent(orderId: string, studentId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, studentId },
      select: orderResponseSelect,
    });
    if (!order) throw new NotFoundException("订单不存在");
    return order;
  }

  async create(student: AuthenticatedUser, body: CreateOrderDto) {
    const items = this.normalizedItems(body.items);
    const remark = normalizeRemark(body.remark);
    const requested = { shopId: body.shopId, remark, items };

    const existing = await this.findExisting(student.id, body.idempotencyKey);
    if (existing) return this.validateIdempotentReplay(existing, requested);
    assertTestPaymentsEnabled();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.createInTransaction(
          student.id,
          body.idempotencyKey,
          requested,
        );
      } catch (error) {
        if (isUniqueConflict(error)) {
          const raced = await this.findExisting(
            student.id,
            body.idempotencyKey,
          );
          if (raced) return this.validateIdempotentReplay(raced, requested);
          continue;
        }
        if (isTransactionConflict(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException("订单创建冲突，请重试");
  }

  async transition(
    orderId: string,
    status: OrderStatus,
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM \`Order\` WHERE id = ${orderId} FOR UPDATE`,
        );
        const order = await transaction.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            studentId: true,
            shopId: true,
            shop: { select: { ownerId: true } },
            items: { select: { productId: true, quantity: true } },
          },
        });
        if (!order) throw new NotFoundException("订单不存在");

        const actor = this.authorizedActor(order, user);
        if (!canTransitionOrder(actor, order.status, status)) {
          throw new ConflictException("当前订单状态不允许此操作");
        }

        if (
          status !== OrderStatus.CANCELLED &&
          order.paymentStatus !== PaymentStatus.PAID &&
          order.paymentStatus !== PaymentStatus.NOT_REQUIRED
        ) {
          throw new ConflictException("订单尚未付款，不能开始制作");
        }

        const data: Prisma.OrderUpdateManyMutationInput = { status };
        if (status === OrderStatus.CANCELLED) {
          if (order.paymentStatus === PaymentStatus.PENDING) {
            data.paymentStatus = PaymentStatus.CLOSED;
          } else if (order.paymentStatus === PaymentStatus.PAID) {
            if (order.paymentMethod !== PaymentMethod.TEST) {
              throw new ConflictException("该订单需要先完成退款");
            }
            data.paymentStatus = PaymentStatus.REFUNDED;
            data.refundedAt = new Date();
          }
        }

        const updated = await transaction.order.updateMany({
          where: { id: order.id, status: order.status },
          data,
        });
        if (updated.count !== 1) {
          throw new ConflictException("订单状态已变化，请刷新后重试");
        }

        if (status === OrderStatus.CANCELLED) {
          for (const item of order.items) {
            await transaction.product.updateMany({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        const result = await transaction.order.findUnique({
          where: { id: order.id },
          select: orderResponseSelect,
        });
        if (!result) throw new NotFoundException("订单不存在");
        return result;
      },
      {
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  }

  private normalizedItems(items: OrderItemQuantity[]): OrderItemQuantity[] {
    try {
      return normalizeOrderItems(items);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "订单商品数据不合法",
      );
    }
  }

  private findExisting(studentId: string, idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: { studentId_idempotencyKey: { studentId, idempotencyKey } },
      select: existingOrderSelect,
    });
  }

  private validateIdempotentReplay(
    existing: NonNullable<Awaited<ReturnType<OrdersService["findExisting"]>>>,
    requested: {
      shopId: string;
      remark: string | null;
      items: OrderItemQuantity[];
    },
  ) {
    if (!isSameIdempotentOrder(existing, requested)) {
      throw new ConflictException("幂等键已用于其他订单请求");
    }
    const { shopId: _shopId, ...response } = existing;
    return response;
  }

  private createInTransaction(
    studentId: string,
    idempotencyKey: string,
    request: {
      shopId: string;
      remark: string | null;
      items: OrderItemQuantity[];
    },
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        // 先锁店铺行，让同店并发订单依次分配流水，避免共享读锁升级导致死锁。
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM Shop WHERE id = ${request.shopId} FOR UPDATE`,
        );
        const shop = await transaction.shop.findFirst({
          where: { id: request.shopId, isOpen: true },
          select: { id: true },
        });
        if (!shop) throw new ConflictException("店铺不存在或未营业");

        const products = await transaction.product.findMany({
          where: {
            id: { in: request.items.map((item) => item.productId) },
            shopId: request.shopId,
          },
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
          },
        });
        if (products.length !== request.items.length) {
          throw new BadRequestException("商品不存在或不属于该店铺");
        }

        const productById = new Map(
          products.map((product) => [product.id, product]),
        );
        const orderItems: Array<{
          productId: string;
          name: string;
          price: number;
          quantity: number;
        }> = [];
        let total = 0;

        for (const item of request.items) {
          const product = productById.get(item.productId);
          if (!product || !product.isAvailable) {
            throw new ConflictException("商品已下架");
          }
          if (item.expectedPrice === undefined) {
            throw new BadRequestException("缺少商品确认价格");
          }
          if (product.price !== item.expectedPrice) {
            throw new ConflictException("商品价格已变化，请重新确认订单");
          }

          const decremented = await transaction.product.updateMany({
            where: {
              id: product.id,
              shopId: request.shopId,
              isAvailable: true,
              price: item.expectedPrice,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (decremented.count !== 1) {
            throw new ConflictException("商品库存、价格或上架状态已变化");
          }

          total += item.expectedPrice * item.quantity;
          if (!Number.isSafeInteger(total) || total > 2_000_000_000) {
            throw new BadRequestException("订单金额超出允许范围");
          }
          orderItems.push({
            productId: product.id,
            name: product.name,
            price: item.expectedPrice,
            quantity: item.quantity,
          });
        }

        const date = new Date();
        const prefix = orderNumberPrefix(shop.id, date);
        const count = await transaction.order.count({
          where: { shopId: shop.id, number: { startsWith: prefix } },
        });
        // 不同店铺可能有相同短码；已有流水也可能因历史删除留下空缺。
        const latest = await transaction.order.findFirst({
          where: { number: { startsWith: prefix } },
          select: { number: true },
          orderBy: { number: "desc" },
        });
        const sequence = Math.max(
          count + 1,
          latest ? Number(latest.number.slice(prefix.length)) + 1 : 1,
        );
        if (sequence > 9999) {
          throw new ConflictException("当日取餐号已用完，请联系商户");
        }

        return transaction.order.create({
          data: {
            number: createOrderNumber(shop.id, sequence, date),
            studentId,
            shopId: request.shopId,
            total,
            remark: request.remark,
            idempotencyKey,
            paymentStatus: PaymentStatus.PENDING,
            paymentMethod: PaymentMethod.TEST,
            items: { create: orderItems },
          },
          select: orderResponseSelect,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  }

  private authorizedActor(
    order: {
      studentId: string;
      shopId: string;
      shop: { ownerId: string | null };
    },
    user: AuthenticatedUser,
  ): OrderActor {
    if (user.role === Role.STUDENT) {
      if (order.studentId !== user.id) throw new NotFoundException("订单不存在");
      return "STUDENT";
    }
    if (
      user.role === Role.MERCHANT &&
      user.shopId === order.shopId &&
      order.shop.ownerId === user.id
    ) {
      return "MERCHANT";
    }
    throw new ForbiddenException("无权操作该订单");
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}
