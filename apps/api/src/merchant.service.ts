import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "./auth";
import {
  CreateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateShopDto,
} from "./dto";
import { PrismaService } from "./prisma.service";
import {
  merchantShopSelect,
  orderResponseSelect,
  publicProductSelect,
} from "./selects";

@Injectable()
export class MerchantService {
  constructor(private readonly prisma: PrismaService) {}

  async getShop(user: AuthenticatedUser) {
    const shopId = await this.ownedShopId(user);
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: merchantShopSelect,
    });
    if (!shop) throw new NotFoundException("店铺不存在");
    return shop;
  }

  async updateShop(user: AuthenticatedUser, body: UpdateShopDto) {
    const shopId = await this.ownedShopId(user);
    const data: Prisma.ShopUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.notice !== undefined) data.notice = body.notice;
    if (body.isOpen !== undefined) data.isOpen = body.isOpen;
    if (!Object.keys(data).length) {
      throw new BadRequestException("没有可更新的店铺字段");
    }
    return this.prisma.shop.update({
      where: { id: shopId },
      data,
      select: merchantShopSelect,
    });
  }

  async listOrders(user: AuthenticatedUser) {
    const shopId = await this.ownedShopId(user);
    return this.prisma.order.findMany({
      where: { shopId },
      select: orderResponseSelect,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  async stats(user: AuthenticatedUser) {
    const shopId = await this.ownedShopId(user);
    const [completedOrders, revenue, productCount] = await Promise.all([
      this.prisma.order.count({
        where: { shopId, status: OrderStatus.COMPLETED },
      }),
      this.prisma.order.aggregate({
        where: { shopId, status: OrderStatus.COMPLETED },
        _sum: { total: true },
      }),
      this.prisma.product.count({ where: { shopId, isAvailable: true } }),
    ]);
    return {
      completedOrders,
      revenue: revenue._sum.total ?? 0,
      productCount,
    };
  }

  async listCategories(user: AuthenticatedUser) {
    const shopId = await this.ownedShopId(user);
    return this.prisma.category.findMany({
      where: { shopId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async createCategory(user: AuthenticatedUser, body: CreateCategoryDto) {
    const shopId = await this.ownedShopId(user);
    try {
      return await this.prisma.category.create({
        data: { name: body.name, shopId },
        select: { id: true, name: true },
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException("同名分类已存在");
      }
      throw error;
    }
  }

  async createProduct(user: AuthenticatedUser, body: CreateProductDto) {
    const shopId = await this.ownedShopId(user);
    await this.assertCategoryInShop(body.categoryId, shopId);
    return this.prisma.product.create({
      data: {
        name: body.name,
        price: body.price,
        stock: body.stock,
        categoryId: body.categoryId,
        shopId,
        description: normalizeOptionalText(body.description),
        image: normalizeOptionalText(body.image),
        isAvailable: body.isAvailable ?? true,
      },
      select: publicProductSelect,
    });
  }

  async updateProduct(
    user: AuthenticatedUser,
    productId: string,
    body: UpdateProductDto,
  ) {
    const shopId = await this.ownedShopId(user);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("商品不存在");
    if (body.categoryId !== undefined) {
      await this.assertCategoryInShop(body.categoryId, shopId);
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.price !== undefined) data.price = body.price;
    if (body.stock !== undefined) data.stock = body.stock;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.description !== undefined) {
      data.description = normalizeOptionalText(body.description);
    }
    if (body.image !== undefined) data.image = normalizeOptionalText(body.image);
    if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable;
    if (!Object.keys(data).length) {
      throw new BadRequestException("没有可更新的商品字段");
    }

    return this.prisma.product.update({
      where: { id: product.id },
      data,
      select: publicProductSelect,
    });
  }

  private async ownedShopId(user: AuthenticatedUser): Promise<string> {
    if (!user.shopId) throw new ForbiddenException("商户未绑定店铺");
    const shop = await this.prisma.shop.findFirst({
      where: { id: user.shopId, ownerId: user.id },
      select: { id: true },
    });
    if (!shop) throw new ForbiddenException("无权管理该店铺");
    return shop.id;
  }

  private async assertCategoryInShop(
    categoryId: string,
    shopId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, shopId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException("分类不存在或不属于该店铺");
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
