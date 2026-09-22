import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  AuthGuard,
  AuthenticatedUser,
  CurrentUser,
  Roles,
  RolesGuard,
} from "./auth";
import { CreateOrderDto, IdParamDto, UpdateOrderStatusDto } from "./dto";
import { OrdersService } from "./orders.service";

@Controller("api/orders")
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Roles(Role.STUDENT)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.listForStudent(user.id);
  }

  @Get(":id")
  @Roles(Role.STUDENT)
  getOne(
    @Param() params: IdParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.getForStudent(params.id, user.id);
  }

  @Post()
  @Roles(Role.STUDENT)
  create(
    @Body() body: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.create(user, body);
  }

  @Patch(":id/status")
  @Roles(Role.STUDENT, Role.MERCHANT)
  transition(
    @Param() params: IdParamDto,
    @Body() body: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.transition(params.id, body.status, user);
  }
}
