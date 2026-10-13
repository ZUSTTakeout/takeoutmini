import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { orderResponseSelect } from "../orders/order.selects";
import { assertTestPaymentsEnabled } from "./payment-policy";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async payTest(orderId: string, studentId: string) {
    assertTestPaymentsEnabled();
    return this.prisma.$transaction(async (transaction) => {
      // 支付和取消共用订单行锁，避免取消后付款或错过退款。
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM \`Order\` WHERE id = ${orderId} FOR UPDATE`,
      );
      const order = await transaction.order.findFirst({
        where: { id: orderId, studentId },
        select: orderResponseSelect,
      });
      if (!order) throw new NotFoundException("订单不存在");
      if (order.paymentMethod !== PaymentMethod.TEST) {
        throw new ConflictException("此订单不支持测试支付");
      }
      if (order.paymentStatus === PaymentStatus.PAID) return order;
      if (
        order.status !== OrderStatus.CREATED ||
        order.paymentStatus !== PaymentStatus.PENDING
      ) {
        throw new ConflictException("订单已关闭，无法继续付款");
      }

      // 金额来自不可变的订单快照，不接收客户端金额或支付成功标记。
      const result = await transaction.order.updateMany({
        where: {
          id: orderId,
          studentId,
          status: OrderStatus.CREATED,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.TEST,
        },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentReference: `TEST-${randomUUID()}`,
          paidAt: new Date(),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException("订单状态已变化，请重新查看订单");
      }
      const paid = await transaction.order.findFirst({
        where: { id: orderId, studentId },
        select: orderResponseSelect,
      });
      if (!paid) throw new NotFoundException("订单不存在");
      return paid;
    }, { maxWait: 5_000, timeout: 10_000 });
  }
}
