import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard, AuthService, RolesGuard } from "./auth";
import { HealthController } from "./health.controller";
import { MerchantController } from "./merchant.controller";
import { MerchantService } from "./merchant.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaService } from "./prisma.service";
import { ShopsController } from "./shops.controller";

@Module({
  controllers: [
    AuthController,
    HealthController,
    MerchantController,
    OrdersController,
    ShopsController,
  ],
  providers: [
    AuthGuard,
    AuthService,
    MerchantService,
    OrdersService,
    PrismaService,
    RolesGuard,
  ],
})
export class AppModule {}
