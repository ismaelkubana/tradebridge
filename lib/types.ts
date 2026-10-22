export type Role = "buyer" | "seller" | "admin";
export type ShopType = "shop" | "restaurant" | "salon";
export type ShopStatus = "pending" | "approved" | "suspended";
export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready"
  | "completed"
  | "cancelled";
export type Fulfillment = "delivery" | "pickup" | "booking";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  type: ShopType;
  description: string;
  district: string;
  address: string;
  phone: string;
  status: ShopStatus;
  created_at: string;
}

export interface Listing {
  id: string;
  shop_id: string;
  title: string;
  description: string;
  price_rwf: number;
  stock: number | null;
  duration_min: number | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  shop_id: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  address: string;
  scheduled_at: string | null;
  note: string;
  contact_phone: string;
  total_rwf: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  listing_id: string | null;
  title: string;
  price_rwf: number;
  qty: number;
}

export const SHOP_TYPE_LABEL: Record<ShopType, string> = {
  shop: "Shop",
  restaurant: "Restaurant",
  salon: "Salon",
};

export const SHOP_TYPE_PLURAL: Record<ShopType, string> = {
  shop: "Shops",
  restaurant: "Restaurants",
  salon: "Salons",
};

export const KIGALI_DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge"];
