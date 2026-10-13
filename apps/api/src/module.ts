import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { AuthGuard, AuthService, RolesGuard } from "./auth/auth";
import { HealthController } from "./health/health.controller";
import { MerchantController } from "./merchant/merchant.controller";
import { MerchantService } from "./merchant/merchant.service";
import { OrdersController } from "./orders/orders.controller";
import { OrdersService } from "./orders/orders.service";
import { PrismaService } from "./database/prisma.service";
import { ShopsController } from "./shops/shops.controller";
import { PaymentsController } from "./payments/payments.controller";
import { PaymentsService } from "./payments/payments.service";

@Module({
  controllers: [
    AuthController,
    HealthController,
    MerchantController,
    OrdersController,
    PaymentsController,
    ShopsController,
  ],
  providers: [
    AuthGuard,
    AuthService,
    MerchantService,
    OrdersService,
    PaymentsService,
    PrismaService,
    RolesGuard,
  ],
})
export class AppModule {}
