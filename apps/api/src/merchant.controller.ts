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
import {
  CreateCategoryDto,
  CreateProductDto,
  IdParamDto,
  UpdateProductDto,
  UpdateShopDto,
} from "./dto";
import { MerchantService } from "./merchant.service";

@Controller("api/merchant")
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.MERCHANT)
export class MerchantController {
  constructor(private readonly merchant: MerchantService) {}

  @Get("shop")
  getShop(@CurrentUser() user: AuthenticatedUser) {
    return this.merchant.getShop(user);
  }

  @Patch("shop")
  updateShop(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateShopDto,
  ) {
    return this.merchant.updateShop(user, body);
  }

  @Get("orders")
  listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.merchant.listOrders(user);
  }

  @Get("stats")
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.merchant.stats(user);
  }

  @Get("categories")
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.merchant.listCategories(user);
  }

  @Post("categories")
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCategoryDto,
  ) {
    return this.merchant.createCategory(user, body);
  }

  @Post("products")
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateProductDto,
  ) {
    return this.merchant.createProduct(user, body);
  }

  @Patch("products/:id")
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() body: UpdateProductDto,
  ) {
    return this.merchant.updateProduct(user, params.id, body);
  }
}
