// A simple browser-side cart (kept in localStorage). One shop per cart.
export interface CartItem {
  listingId: string;
  title: string;
  price: number;
  qty: number;
}

export interface Cart {
  shopId: string;
  shopName: string;
  shopType: "shop" | "restaurant" | "salon";
  items: CartItem[];
}

const KEY = "tradebridge_cart";

export function readCart(): Cart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cart) : null;
  } catch {
    return null;
  }
}

export function writeCart(cart: Cart | null) {
  try {
    if (!cart || cart.items.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable (private mode): the cart just will not persist.
  }
  window.dispatchEvent(new Event("cart-changed"));
}

export function cartCount(cart: Cart | null): number {
  return cart ? cart.items.reduce((n, i) => n + i.qty, 0) : 0;
}

export function cartTotal(cart: Cart | null): number {
  return cart ? cart.items.reduce((n, i) => n + i.qty * i.price, 0) : 0;
}
