export type Role = "STUDENT" | "MERCHANT" | "ADMIN";
export type LoginRole = Exclude<Role, "ADMIN">;
export type OrderStatus =
  | "CREATED"
  | "ACCEPTED"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export interface User {
  id: string;
  role: Role;
  nickname: string;
  shopId?: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryId: string;
  isAvailable: boolean;
  description?: string | null;
  image?: string | null;
}

export interface Shop {
  id: string;
  name: string;
  notice: string;
  isOpen: boolean;
  description?: string | null;
  products: Product[];
  categories: Category[];
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  remark?: string | null;
  shop: { id: string; name: string };
  items: OrderItem[];
}

export interface MerchantStats {
  completedOrders: number;
  revenue: number;
  productCount: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface CreateOrderInput {
  shopId: string;
  items: Array<{
    productId: string;
    quantity: number;
    expectedPrice: number;
  }>;
  remark: string;
  idempotencyKey: string;
}
