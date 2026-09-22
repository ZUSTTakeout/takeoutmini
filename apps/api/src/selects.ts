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

export const orderResponseSelect = {
  id: true,
  number: true,
  status: true,
  total: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  shop: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      productId: true,
      name: true,
      price: true,
      quantity: true,
    },
  },
} as const;
