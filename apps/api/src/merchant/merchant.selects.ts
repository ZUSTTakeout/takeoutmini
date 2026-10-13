import { publicProductSelect } from "../shops/shop.selects";

export const merchantShopSelect = {
  id: true,
  name: true,
  notice: true,
  description: true,
  isOpen: true,
  categories: {
    select: { id: true, name: true },
    orderBy: { name: "asc" as const },
  },
  products: {
    select: publicProductSelect,
    orderBy: { createdAt: "desc" as const },
  },
} as const;
