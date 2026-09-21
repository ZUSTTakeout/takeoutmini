import {
  Module,
  Global,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import * as jwt from "jsonwebtoken";
import { Request } from "express";
@Injectable()
class Db extends PrismaClient {}
type AuthReq = Request & {
  user: { id: string; role: Role; shopId?: string | null };
};
@Injectable()
class Auth implements CanActivate {
  canActivate(c: ExecutionContext) {
    const req = c.switchToHttp().getRequest<AuthReq>();
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) throw new UnauthorizedException();
    try {
      req.user = jwt.verify(
        h.slice(7),
        process.env.JWT_SECRET || "dev-secret",
      ) as AuthReq["user"];
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
const sign = (u: any) =>
  jwt.sign(
    { id: u.id, role: u.role, shopId: u.shopId || null },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" },
  );
const publicShop = {
  categories: true,
  products: { where: { isAvailable: true } },
};
@Controller("api/auth")
class AuthC {
  constructor(private db: Db) {}
  @Post("dev") async dev(@Body() b: any) {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.DEV_AUTH_ENABLED === "false"
    )
      throw new ForbiddenException("开发登录已关闭");
    const role = b.role === "MERCHANT" ? Role.MERCHANT : Role.STUDENT;
    let u = await this.db.user.findFirst({ where: { role } });
    if (!u) {
      const s =
        role === Role.MERCHANT
          ? await this.db.shop.create({
              data: {
                name: "校园美食街示范店",
                categories: {
                  create: [{ name: "热销主食" }, { name: "饮品小吃" }],
                },
              },
            })
          : null;
      u = await this.db.user.create({
        data: {
          nickname: role === "MERCHANT" ? "示范商户" : "同学",
          role,
          shopId: s?.id,
        },
      });
      if (s)
        await this.db.shop.update({
          where: { id: s.id },
          data: { ownerId: u.id },
        });
    }
    return { token: sign(u), user: u };
  }
  @Post("wechat") async wechat(@Body("code") code: string) {
    if (!code) throw new BadRequestException("缺少微信 code");
    if (!process.env.WECHAT_APP_ID || process.env.DEV_AUTH_ENABLED === "true")
      return this.dev({ role: "STUDENT" });
    throw new BadRequestException("微信登录配置未完成");
  }
}
@Controller("api/shops")
class ShopsC {
  constructor(private db: Db) {}
  @Get() list() {
    return this.db.shop.findMany({
      where: { isOpen: true },
      include: publicShop,
    });
  }
  @Get(":id") one(@Param("id") id: string) {
    return this.db.shop.findUnique({ where: { id }, include: publicShop });
  }
}
@UseGuards(Auth)
@Controller("api/orders")
class OrdersC {
  constructor(private db: Db) {}
  @Get() list(@Req() r: AuthReq) {
    return this.db.order.findMany({
      where: { studentId: r.user.id },
      include: { shop: { select: { id: true, name: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
  }
  @Get(":id") async one(@Param("id") id: string, @Req() r: AuthReq) {
    const o = await this.db.order.findUnique({
      where: { id },
      include: { shop: { select: { id: true, name: true } }, items: true },
    });
    if (!o || o.studentId !== r.user.id) throw new NotFoundException();
    return o;
  }
  @Post() async create(@Req() r: AuthReq, @Body() b: any) {
    if (r.user.role !== Role.STUDENT) throw new ForbiddenException();
    if (!b.shopId || !Array.isArray(b.items) || !b.items.length)
      throw new BadRequestException("订单不能为空");
    if (!b.idempotencyKey) throw new BadRequestException("缺少幂等键");
    const old = await this.db.order.findUnique({
      where: { idempotencyKey: b.idempotencyKey },
      include: { items: true, shop: true },
    });
    if (old) return old;
    return this.db.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({ where: { id: b.shopId } });
      if (!shop?.isOpen) throw new BadRequestException("店铺未营业");
      let total = 0;
      const data: any[] = [];
      for (const x of b.items) {
        if (!Number.isInteger(x.quantity) || x.quantity < 1 || x.quantity > 99)
          throw new BadRequestException("数量不合法");
        const p = await tx.product.findUnique({ where: { id: x.productId } });
        if (
          !p ||
          p.shopId !== b.shopId ||
          !p.isAvailable ||
          p.stock < x.quantity
        )
          throw new BadRequestException("商品库存不足或已下架");
        total += p.price * x.quantity;
        data.push({
          productId: p.id,
          name: p.name,
          price: p.price,
          quantity: x.quantity,
        });
        await tx.product.update({
          where: { id: p.id },
          data: { stock: { decrement: x.quantity } },
        });
      }
      return tx.order.create({
        data: {
          number: `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`,
          studentId: r.user.id,
          shopId: b.shopId,
          total,
          remark: String(b.remark || "").slice(0, 200) || null,
          idempotencyKey: b.idempotencyKey,
          items: { create: data },
        },
        include: { items: true, shop: { select: { id: true, name: true } } },
      });
    });
  }
  @Patch(":id/status") async status(
    @Param("id") id: string,
    @Body("status") status: OrderStatus,
    @Req() r: AuthReq,
  ) {
    const o = await this.db.order.findUnique({
      where: { id },
      include: { items: true, shop: true },
    });
    if (!o) throw new NotFoundException();
    const merchant =
      r.user.role === Role.MERCHANT && o.shop.ownerId === r.user.id;
    if (r.user.id !== o.studentId && !merchant) throw new ForbiddenException();
    const allowed = merchant
      ? ({
          CREATED: ["ACCEPTED", "CANCELLED"],
          ACCEPTED: ["READY", "CANCELLED"],
          READY: ["COMPLETED"],
        } as any)
      : ({ CREATED: ["CANCELLED"] } as any);
    if (!allowed[o.status]?.includes(status))
      throw new BadRequestException("非法状态转换");
    return this.db.$transaction(async (tx) => {
      if (status === "CANCELLED")
        for (const i of o.items)
          await tx.product.update({
            where: { id: i.productId },
            data: { stock: { increment: i.quantity } },
          });
      return tx.order.update({
        where: { id },
        data: { status },
        include: { items: true, shop: { select: { id: true, name: true } } },
      });
    });
  }
}
@UseGuards(Auth)
@Controller("api/merchant")
class MerchantC {
  constructor(private db: Db) {}
  private async shop(r: AuthReq) {
    if (r.user.role !== Role.MERCHANT || !r.user.shopId)
      throw new ForbiddenException();
    const s = await this.db.shop.findUnique({
      where: { id: r.user.shopId },
      include: {
        categories: true,
        products: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!s) throw new NotFoundException();
    return s;
  }
  @Get("shop") shopGet(@Req() r: AuthReq) {
    return this.shop(r);
  }
  @Patch("shop") async shopPatch(@Req() r: AuthReq, @Body() b: any) {
    await this.shop(r);
    return this.db.shop.update({
      where: { id: r.user.shopId! },
      data: { name: b.name, notice: b.notice, isOpen: b.isOpen },
    });
  }
  @Get("orders") async orders(@Req() r: AuthReq) {
    const s = await this.shop(r);
    return this.db.order.findMany({
      where: { shopId: s.id },
      include: { items: true, shop: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  @Get("stats") async stats(@Req() r: AuthReq) {
    const s = await this.shop(r);
    const [count, sum] = await Promise.all([
      this.db.order.count({ where: { shopId: s.id, status: "COMPLETED" } }),
      this.db.order.aggregate({
        where: { shopId: s.id, status: "COMPLETED" },
        _sum: { total: true },
      }),
    ]);
    return {
      completedOrders: count,
      revenue: sum._sum.total || 0,
      productCount: s.products.length,
    };
  }
  @Get("categories") async cats(@Req() r: AuthReq) {
    const s = await this.shop(r);
    return this.db.category.findMany({ where: { shopId: s.id } });
  }
  @Post("categories") async cat(@Req() r: AuthReq, @Body("name") name: string) {
    const s = await this.shop(r);
    if (!name?.trim()) throw new BadRequestException();
    return this.db.category.create({
      data: { name: name.trim().slice(0, 30), shopId: s.id },
    });
  }
  @Post("products") async product(@Req() r: AuthReq, @Body() b: any) {
    const s = await this.shop(r);
    if (
      !b.name ||
      !Number.isInteger(b.price) ||
      b.price < 0 ||
      !Number.isInteger(b.stock) ||
      b.stock < 0
    )
      throw new BadRequestException("商品数据不合法");
    return this.db.product.create({
      data: {
        name: b.name.trim().slice(0, 60),
        price: b.price,
        stock: b.stock,
        categoryId: b.categoryId,
        shopId: s.id,
        description: b.description,
        isAvailable: b.isAvailable !== false,
        image: b.image,
      },
    });
  }
  @Patch("products/:id") async productPatch(
    @Req() r: AuthReq,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    const s = await this.shop(r);
    const p = await this.db.product.findUnique({ where: { id } });
    if (!p || p.shopId !== s.id) throw new NotFoundException();
    return this.db.product.update({
      where: { id },
      data: {
        name: b.name,
        price: b.price,
        stock: b.stock,
        categoryId: b.categoryId,
        isAvailable: b.isAvailable,
        description: b.description,
        image: b.image,
      },
    });
  }
}
@Module({
  controllers: [AuthC, ShopsC, OrdersC, MerchantC],
  providers: [Db, Auth],
})
export class AppModule {}
