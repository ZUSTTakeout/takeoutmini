export const publicProductSelect = {
  id: true,
  name: true,
  price: true,
  stock: true,
  description: true,
  image: true,
  isAvailable: true,
  categoryId: true,
} as const;

export const publicShopSelect = {
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
    where: { isAvailable: true },
    select: publicProductSelect,
    orderBy: { createdAt: "desc" as const },
  },
} as const;
