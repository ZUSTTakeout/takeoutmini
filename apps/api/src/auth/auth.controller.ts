import {
  ConflictException,
  Controller,
  ForbiddenException,
  Post,
  Body,
  Get,
  UseGuards,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { AuthGuard, AuthService, AuthenticatedUser, CurrentUser } from "./auth";
import { DevLoginDto, WechatLoginDto } from "./auth.dto";
import { PrismaService } from "../database/prisma.service";

const publicUserSelect = {
  id: true,
  nickname: true,
  role: true,
  shopId: true,
} as const;

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Post("dev")
  async devLogin(@Body() body: DevLoginDto) {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.DEV_AUTH_ENABLED !== "true"
    ) {
      throw new ForbiddenException("开发登录已关闭");
    }

    const user =
      body.role === Role.MERCHANT
        ? await this.getOrCreateDevMerchant()
        : await this.getOrCreateDevStudent();
    if (body.role === Role.MERCHANT && user.shopId) {
      await this.ensureDemoCatalog(user.id, user.shopId);
    }
    return this.authResponse(user);
  }

  private async ensureDemoCatalog(userId: string, shopId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const shop = await transaction.shop.findFirst({
        where: { id: shopId, ownerId: userId },
        select: { id: true },
      });
      if (!shop) return;

      const categories = await Promise.all(
        ["热销主食", "校园小吃", "清爽饮品"].map((name) =>
          transaction.category.upsert({
            where: { shopId_name: { shopId, name } },
            create: { shopId, name },
            update: {},
            select: { id: true, name: true },
          }),
        ),
      );
      const productCount = await transaction.product.count({
        where: { shopId },
      });
      if (productCount > 0) return;

      const categoryId = new Map(
        categories.map((category) => [category.name, category.id]),
      );
      await transaction.product.createMany({
        data: [
          {
            shopId,
            categoryId: categoryId.get("热销主食")!,
            name: "香煎鸡排饭",
            price: 1800,
            stock: 30,
            description: "现煎鸡排搭配时蔬与米饭 · 演示商品",
          },
          {
            shopId,
            categoryId: categoryId.get("热销主食")!,
            name: "番茄牛腩饭",
            price: 2200,
            stock: 20,
            description: "番茄慢炖牛腩，酸甜开胃 · 演示商品",
          },
          {
            shopId,
            categoryId: categoryId.get("校园小吃")!,
            name: "脆皮炸鸡块",
            price: 1200,
            stock: 25,
            description: "外酥里嫩，适合分享 · 演示商品",
          },
          {
            shopId,
            categoryId: categoryId.get("校园小吃")!,
            name: "手作饭团",
            price: 800,
            stock: 18,
            description: "紫菜包裹米饭与精选馅料 · 演示商品",
          },
          {
            shopId,
            categoryId: categoryId.get("清爽饮品")!,
            name: "柠檬气泡水",
            price: 600,
            stock: 40,
            description: "清爽柠檬风味 · 演示商品",
          },
          {
            shopId,
            categoryId: categoryId.get("清爽饮品")!,
            name: "桂花酸梅汤",
            price: 700,
            stock: 30,
            description: "酸甜解腻，冰镇更佳 · 演示商品",
          },
        ],
      });
    });
  }

  @Post("wechat")
  async wechatLogin(@Body() body: WechatLoginDto) {
    const user = await this.auth.loginWechat(body.code);
    return this.authResponse(user);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id, nickname: user.nickname, role: user.role, shopId: user.shopId,
    };
  }

  private async getOrCreateDevStudent(): Promise<AuthenticatedUser> {
    return this.prisma.user.upsert({
      where: { devLoginKey: "dev:student" },
      create: {
        devLoginKey: "dev:student",
        nickname: "同学",
        role: Role.STUDENT,
      },
      update: {},
      select: publicUserSelect,
    });
  }

  private async getOrCreateDevMerchant(): Promise<AuthenticatedUser> {
    const existing = await this.prisma.user.findUnique({
      where: { devLoginKey: "dev:merchant" },
      include: { ownedShop: { select: { id: true } } },
    });
    if (existing) {
      if (existing.role !== Role.MERCHANT) {
        throw new ConflictException("开发商户账号配置异常");
      }
      if (existing.ownedShop && existing.shopId !== existing.ownedShop.id) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { shopId: existing.ownedShop.id },
          select: publicUserSelect,
        });
      }
      if (existing.ownedShop) return existing;
      return this.attachDemoShop(existing.id);
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            devLoginKey: "dev:merchant",
            nickname: "示范商户",
            role: Role.MERCHANT,
          },
        });
        const shop = await transaction.shop.create({
          data: {
            name: "校园美食街示范店",
            ownerId: user.id,
            categories: {
              create: [{ name: "热销主食" }, { name: "饮品小吃" }],
            },
          },
        });
        return transaction.user.update({
          where: { id: user.id },
          data: { shopId: shop.id },
          select: publicUserSelect,
        });
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const raced = await this.prisma.user.findUnique({
        where: { devLoginKey: "dev:merchant" },
        select: publicUserSelect,
      });
      if (!raced) throw new ConflictException("开发商户账号创建冲突，请重试");
      return raced;
    }
  }

  private async attachDemoShop(userId: string): Promise<AuthenticatedUser> {
    return this.prisma.$transaction(async (transaction) => {
      const shop = await transaction.shop.create({
        data: {
          name: "校园美食街示范店",
          ownerId: userId,
          categories: {
            create: [{ name: "热销主食" }, { name: "饮品小吃" }],
          },
        },
      });
      return transaction.user.update({
        where: { id: userId },
        data: { shopId: shop.id },
        select: publicUserSelect,
      });
    });
  }

  private authResponse(user: AuthenticatedUser) {
    const publicUser: AuthenticatedUser = {
      id: user.id,
      nickname: user.nickname,
      role: user.role,
      shopId: user.shopId,
    };
    return {
      token: this.auth.signAccessToken(publicUser),
      user: publicUser,
    };
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
