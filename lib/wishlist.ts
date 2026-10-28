export type WishlistItem = {
  listingId: string;
  shopId: string;
  shopName: string;
  title: string;
  price: number;
  imageUrl: string | null;
};

const KEY = "tradebridge:wishlist:v1";

export function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is WishlistItem =>
      !!item &&
      typeof item.listingId === "string" &&
      typeof item.shopId === "string" &&
      typeof item.shopName === "string" &&
      typeof item.title === "string" &&
      typeof item.price === "number" &&
      (typeof item.imageUrl === "string" || item.imageUrl === null)
    );
  } catch {
    return [];
  }
}

export function writeWishlist(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("tradebridge:wishlist-change"));
  } catch {
    // Storage may be unavailable or full; keep the page usable.
  }
}
