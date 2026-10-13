import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuthGuard, AuthenticatedUser, CurrentUser, Roles, RolesGuard } from "../auth/auth";
import { PaymentsService } from "./payments.service";

@Controller("api/orders")
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(":id/pay/test")
  @Roles(Role.STUDENT)
  payTest(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.payTest(id, user.id);
  }
}
