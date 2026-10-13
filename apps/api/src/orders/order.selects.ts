export const orderResponseSelect = {
  id: true,
  number: true,
  status: true,
  total: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  paymentStatus: true,
  paymentMethod: true,
  paymentReference: true,
  paidAt: true,
  refundedAt: true,
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
