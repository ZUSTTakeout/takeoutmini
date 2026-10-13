import type { Shop } from "../types";
import { request } from "./http";

export const shopsApi = {
  shops: () => request<Shop[]>("/shops", { authenticated: false }),
  shop: (id: string) =>
    request<Shop | null>(`/shops/${encodeURIComponent(id)}`, {
      authenticated: false,
    }),
};
