import {
  ConflictException,
  Controller,
  ForbiddenException,
  Post,
  Body,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { AuthService, AuthenticatedUser } from "./auth";
import { DevLoginDto, WechatLoginDto } from "./dto";
import { PrismaService } from "./prisma.service";

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
    return this.authResponse(user);
  }

  @Post("wechat")
  async wechatLogin(@Body() body: WechatLoginDto) {
    const session = await this.auth.exchangeWechatCode(body.code);
    let [byOpenId, byUnionId] = await Promise.all([
      this.prisma.user.findUnique({
        where: { wechatOpenId: session.openId },
        select: publicUserSelect,
      }),
      session.unionId
        ? this.prisma.user.findUnique({
            where: { wechatUnionId: session.unionId },
            select: publicUserSelect,
          })
        : null,
    ]);

    if (byOpenId && byUnionId && byOpenId.id !== byUnionId.id) {
      throw new UnauthorizedException("微信身份信息冲突");
    }

    let user = byOpenId ?? byUnionId;
    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            nickname: "微信用户",
            role: Role.STUDENT,
            wechatOpenId: session.openId,
            wechatUnionId: session.unionId,
          },
          select: publicUserSelect,
        });
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        [byOpenId, byUnionId] = await Promise.all([
          this.prisma.user.findUnique({
            where: { wechatOpenId: session.openId },
            select: publicUserSelect,
          }),
          session.unionId
            ? this.prisma.user.findUnique({
                where: { wechatUnionId: session.unionId },
                select: publicUserSelect,
              })
            : null,
        ]);
        user = byOpenId ?? byUnionId;
        if (!user) throw new ConflictException("微信账号创建冲突，请重试");
      }
    }

    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException("该微信账号不能用于学生登录");
    }
    return this.authResponse(user);
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
