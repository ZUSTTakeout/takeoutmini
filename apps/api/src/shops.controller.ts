import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { IdParamDto } from "./dto";
import { PrismaService } from "./prisma.service";
import { publicShopSelect } from "./selects";

@Controller("api/shops")
export class ShopsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.shop.findMany({
      where: { isOpen: true },
      select: publicShopSelect,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Get(":id")
  async getOne(@Param() params: IdParamDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: params.id, isOpen: true },
      select: publicShopSelect,
    });
    if (!shop) throw new NotFoundException("店铺不存在或未营业");
    return shop;
  }
}
