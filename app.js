const places = [
  { name: "Fresh bananas · 1 kg", type: "Shops", category: "Groceries", tag: "Kigali Fresh Market · Fruits & vegetables", rating: "Sample", distance: "Kigali", time: "Pickup", price: "RWF 2,000", priceValue: 2000, tone: "market", icon: "🍌", badge: "Sample listing", shopName: "Kigali Fresh Market", description: "Fresh, locally sourced bananas for your home.", details: "A sample product to show how Kigali businesses can list prices and product information." },
  { name: "Pilau plate", type: "Restaurants", category: "Food & drink", tag: "Umucyo Hotel · Rwandan kitchen", rating: "Sample", distance: "Kigali", time: "Pickup", price: "RWF 5,000", priceValue: 5000, tone: "kitchen", icon: "🍲", badge: "Sample listing", shopName: "Umucyo Hotel", description: "A generous plate of seasoned pilau, prepared fresh.", details: "Sample menu item. Sellers can add ingredients, portion sizes, and collection or delivery details." },
  { name: "Coffee beans · 250 g", type: "Shops", category: "Groceries", tag: "Inzora Coffee House · Fresh roast", rating: "Sample", distance: "Kigali", time: "Pickup", price: "RWF 7,500", priceValue: 7500, tone: "coffee", icon: "☕", badge: "Sample listing", shopName: "Inzora Coffee House", description: "Locally roasted coffee with a smooth, rich finish.", details: "Sample product. Add roast level, origin, weight, and preparation information in the full details." },
  { name: "Everyday tote bag", type: "Shops", category: "Clothing", tag: "Makuza Home & Living · Accessories", rating: "Sample", distance: "Kigali", time: "Pickup", price: "RWF 8,000", priceValue: 8000, tone: "home", icon: "👜", badge: "Sample listing", shopName: "Makuza Home & Living", description: "A practical reusable carry bag for everyday errands.", details: "Sample product. Sellers can include dimensions, materials, and care instructions." },
  { name: "Silk press appointment", type: "Salons", category: "Beauty", tag: "Atelier Hair Studio · Hair care", rating: "Sample", distance: "Kigali", time: "Book a time", price: "RWF 15,000", priceValue: 15000, tone: "salon", icon: "✂️", badge: "Sample listing", shopName: "Atelier Hair Studio", description: "A salon appointment tailored to your hair and preferred finish.", details: "Sample service. Sellers can explain what is included, how long it takes, and what customers should prepare." },
  { name: "Fresh juice · 500 ml", type: "Restaurants", category: "Food & drink", tag: "Umurava Kitchen · Made fresh", rating: "Sample", distance: "Kigali", time: "Pickup", price: "RWF 3,000", priceValue: 3000, tone: "market", icon: "🥭", badge: "Sample listing", shopName: "Umurava Kitchen", description: "Fresh seasonal fruit blended to order.", details: "Sample menu item. Add ingredients, size options, and allergy information to the product details." },
];

const state = { role: "buyer", category: "All", query: "", saved: new Set(), sellerTab: "Overview", adminTab: "Overview", session: null, profile: null, liveListings: null, banners: [], bannerIndex: 0, adminListings: [], adminBanners: [], businesses: [], selectedListing: null, selectedQuantity: 1, authMode: "signin" };
let editingListingId = null;
let listingGallery = [];
let listingOriginalUrls = [];
let editingBannerId = null;
let bannerObjectUrl = null;
let bannerImageUrl = null;
let heroTimer = null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let toastTimer;
let supabaseClient = null;
let supabaseLoad = null;
const SUPABASE_JS_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";

async function getSupabase() {
  const config = window.TRADEBRIDGE_SUPABASE;
  if (!config?.url || !config?.publishableKey) throw new Error("TradeBridge database settings are missing.");
  if (!supabaseLoad) supabaseLoad = import(SUPABASE_JS_URL).then(({ createClient }) => {
    supabaseClient = createClient(config.url, config.publishableKey);
    return supabaseClient;
  });
  return supabaseLoad;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function requireAccount() {
  if (state.session?.user) return true;
  openAuth();
  toast("Sign in to continue.");
  return false;
}

function openAuth(mode = "signin") {
  state.authMode = mode;
  $("#auth-title").textContent = mode === "signup" ? "Create your account" : "Welcome back";
  $("#auth-description").textContent = mode === "signup" ? "Join TradeBridge to save places and place orders." : "Sign in to save places and manage your orders.";
  $("#auth-name-wrap").hidden = mode !== "signup";
  $("#auth-form").elements.full_name.required = mode === "signup";
  $("#auth-role-wrap").hidden = mode !== "signup";
  $("#auth-phone-wrap").hidden = mode !== "signup";
  $("#auth-submit").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("#auth-switch-prompt").textContent = mode === "signup" ? "Already have an account?" : "New to TradeBridge?";
  $("#auth-switch").textContent = mode === "signup" ? "Sign in" : "Create an account";
  $("#auth-dialog").showModal();
}

function updateAccountLabel() {
  const user = state.session?.user;
  const name = user ? (state.profile?.full_name || user.email || "Account") : "Sign in";
  $("#account-label").textContent = name.length > 22 ? `${name.slice(0, 19)}…` : name;
  $("#sidebar-account-label").textContent = name;
  $("#sidebar-account-subtitle").textContent = user ? (state.profile?.role === "admin" ? "Administrator" : "TradeBridge member") : "Save your account";
  $("#login-action").hidden = Boolean(user);
  $("#logout-action").hidden = !user;
  $("#admin-nav-button").hidden = !user || state.profile?.role !== "admin";
}

async function loadProfile() {
  if (!state.session?.user) { state.profile = null; state.saved = new Set(); $("#saved-count").textContent = ""; updateAccountLabel(); return; }
  const client = await getSupabase();
  const { data, error } = await client.from("profiles").select("id, full_name, phone, role").eq("id", state.session.user.id).maybeSingle();
  if (error) throw error;
  state.profile = data;
  updateAccountLabel();
  const { data: saved, error: savedError } = await client.from("listing_feedback").select("listing_id").eq("buyer_id", state.session.user.id).eq("liked", true);
  if (savedError) throw savedError;
  state.saved = new Set(saved.map((row) => row.listing_id));
  $("#saved-count").textContent = state.saved.size || "";
}

async function refreshListings() {
  const client = await getSupabase();
  const { data, error } = await client.from("listings")
    .select("id,shop_id,title,description,details,category,image_url,image_urls,price_rwf,stock,duration_min,active,shops!inner(name,type,district,address,phone,status,payment_methods,payment_instructions)")
    .eq("active", true).eq("shops.status", "approved").order("created_at", { ascending: false });
  if (error) throw error;
  const categoryNames = { shop: "Shops", restaurant: "Restaurants", salon: "Salons" };
  const icons = { shop: "🛍️", restaurant: "🍲", salon: "✂️" };
  state.liveListings = data.map((listing, index) => ({
    id: listing.id, shopId: listing.shop_id, name: listing.title,
    type: categoryNames[listing.shops.type] || "Shops",
    category: listing.category || categoryNames[listing.shops.type] || "Shops",
    tag: `${listing.shops.name} · ${listing.category || "Local listing"}`,
    shopName: listing.shops.name, rating: "New", distance: listing.shops.district || "Kigali", time: listing.shops.type === "salon" ? "Book a time" : "Pickup",
    price: `RWF ${Number(listing.price_rwf).toLocaleString()}`,
    priceValue: Number(listing.price_rwf), tone: ["market", "kitchen", "salon", "home", "coffee", "curl"][index % 6], icon: icons[listing.shops.type] || "🛍️", badge: listing.stock === 0 ? "Out of stock" : "Local",
    description: listing.description, details: listing.details, imageUrl: listing.image_url, imageUrls: listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [], stock: listing.stock, shop: listing.shops, fulfillment: listing.shops.type === "salon" ? "booking" : "pickup"
  }));
  renderPlaces();
  const notice = $(".preview-notice", $("#buyer-view"));
  if (notice) notice.innerHTML = state.liveListings.length
    ? '<span>✳</span><span><strong>Live marketplace</strong> — These listings are published by TradeBridge businesses.</span>'
    : '<span>✳</span><span><strong>Getting started</strong> — Preview products show how local listings will look. Sample items can’t be ordered.</span>';
}

async function loadSiteBanners() {
  const client = await getSupabase();
  const { data, error } = await client.from("site_banners").select("id,slug,title,subtitle,cta_label,cta_category,image_url,theme,sort_order,active").eq("active", true).order("sort_order", { ascending: true });
  if (error) throw error;
  state.banners = data || [];
  state.bannerIndex = 0;
  renderHeroBanner();
}

function renderHeroBanner() {
  const host = $("#hero-banner-content");
  if (!host) return;
  const banners = state.banners || [];
  if (!banners.length) {
    host.innerHTML = '<div class="promo-slide theme-market"><div class="promo-slide-copy"><span class="promo-kicker">TRADEBRIDGE · KIGALI</span><h2>Good finds, close to home</h2><p>Discover shops, food, and services around your neighborhood.</p><button class="hero-button" data-category="All">Explore TradeBridge <span>→</span></button></div><div class="promo-slide-art" aria-hidden="true">🧺</div></div>';
    $("#hero-banner-dots").innerHTML = "";
    return;
  }
  state.bannerIndex = (state.bannerIndex + banners.length) % banners.length;
  const banner = banners[state.bannerIndex];
  host.innerHTML = `<div class="promo-slide theme-${escapeHtml(banner.theme || "market")}">${banner.image_url ? `<img class="promo-slide-photo" src="${escapeHtml(banner.image_url)}" alt="" loading="eager">` : `<div class="promo-slide-art" aria-hidden="true">${banner.theme === "food" ? "🥘" : banner.theme === "salon" ? "✂️" : banner.theme === "home" ? "🪴" : "🧺"}</div>`}<div class="promo-slide-shade"></div><div class="promo-slide-copy"><span class="promo-kicker">MADE FOR KIGALI</span><h2>${escapeHtml(banner.title)}</h2><p>${escapeHtml(banner.subtitle)}</p><button class="hero-button" data-category="${escapeHtml(banner.cta_category)}">${escapeHtml(banner.cta_label)} <span>→</span></button></div><span class="promo-slide-index">${String(state.bannerIndex + 1).padStart(2, "0")} <i>/ ${String(banners.length).padStart(2, "0")}</i></span></div>`;
  $("#hero-banner-dots").innerHTML = banners.map((_, index) => `<button class="banner-dot ${index === state.bannerIndex ? "active" : ""}" data-banner-slide="${index}" aria-label="Show promotion ${index + 1}"></button>`).join("");
  clearInterval(heroTimer);
  if (banners.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) heroTimer = setInterval(() => { state.bannerIndex = (state.bannerIndex + 1) % banners.length; renderHeroBanner(); }, 6500);
}

function openProductDetail(listing) {
  if (!listing) return;
  state.selectedListing = listing;
  const images = listing.imageUrls?.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : [];
  const isDemo = Boolean(listing.demo || !listing.id);
  $("#product-category").textContent = `${listing.category || listing.type || "Local find"} · ${isDemo ? "Sample listing" : "Kigali listing"}`;
  $("#product-name").textContent = listing.name || listing.title;
  $("#product-price").textContent = `RWF ${Number(listing.priceValue ?? listing.price_rwf ?? 0).toLocaleString()}`;
  $("#product-shop").textContent = `Sold by ${listing.shop?.name || listing.shopName || "Local business"}`;
  $("#product-short-description").textContent = listing.description || "Ask the seller for more information about this item.";
  $("#product-details-text").textContent = listing.details || "The seller has not added more product information yet.";
  $("#product-stock-note").textContent = Number.isInteger(listing.stock) ? `${listing.stock} available` : listing.duration_min ? `${listing.duration_min} minute service` : "Contact the seller for availability and delivery options.";
  $("#product-gallery-main").innerHTML = images.length ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(listing.name || listing.title)}">` : `<div class="product-gallery-placeholder ${escapeHtml(listing.tone || "market")}"><span>${escapeHtml(listing.icon || "▦")}</span><small>${escapeHtml(listing.shop?.name || listing.shopName || "Kigali business")}</small></div>`;
  $("#product-gallery-thumbs").innerHTML = images.slice(0, 5).map((url, index) => `<button class="product-thumb ${index === 0 ? "active" : ""}" data-product-thumb="${index}" aria-label="Show product photo ${index + 1}"><img src="${escapeHtml(url)}" alt=""></button>`).join("");
  const orderButton = $("#product-order-button");
  orderButton.disabled = Boolean(isDemo || listing.stock === 0);
  orderButton.textContent = isDemo ? "Preview item" : listing.stock === 0 ? "Out of stock" : "Order this item";
  orderButton.dataset.view = listing.name || listing.title;
  if (listing.id) orderButton.dataset.listingId = listing.id; else delete orderButton.dataset.listingId;
  $("#product-dialog").showModal();
}

async function initializeBackend() {
  try {
    const client = await getSupabase();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    state.session = session;
    updateAccountLabel();
    client.auth.onAuthStateChange((_event, nextSession) => {
      state.session = nextSession;
      state.profile = null;
      updateAccountLabel();
      queueMicrotask(async () => {
        const results = await Promise.allSettled([loadProfile(), refreshListings()]);
        results.filter((result) => result.status === "rejected").forEach((result) => { console.error(result.reason); toast(result.reason?.message || "Could not refresh TradeBridge data."); });
      });
    });
    const initialResults = await Promise.allSettled([loadProfile(), refreshListings(), loadSiteBanners()]);
    initialResults.filter((result) => result.status === "rejected").forEach((result) => { console.error(result.reason); });
  } catch (error) {
    console.error("TradeBridge backend is not available:", error);
    const notice = $(".preview-notice", $("#buyer-view"));
    if (notice) notice.innerHTML = '<span>✳</span><span><strong>Preview mode</strong> — Connect to the internet to load verified businesses and account features.</span>';
  }
}

async function showBuyerOrders() {
  if (!requireAccount()) return;
  try {
    const client = await getSupabase();
    const { data, error } = await client.from("orders")
      .select("id,status,fulfillment,address,total_rwf,created_at,shops(name),order_items(title,qty,price_rwf),order_payments(method,status,transaction_reference)")
      .eq("buyer_id", state.session.user.id).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    const list = $("#buyer-order-list");
    list.innerHTML = data.length ? data.map((order) => {
      const payment = order.order_payments?.[0];
      return `<article class="backend-list-item"><div><strong>${escapeHtml(order.shops?.name || "TradeBridge order")}</strong><small>${new Date(order.created_at).toLocaleString()} · ${escapeHtml(order.fulfillment)}</small><small>${(order.order_items || []).map((item) => `${escapeHtml(item.title)} × ${item.qty}`).join(", ")}</small><small>Payment: ${escapeHtml(payment?.status || "Not recorded")}${payment?.transaction_reference ? ` · ${escapeHtml(payment.transaction_reference)}` : ""}</small></div><span class="order-pill">${escapeHtml(order.status.replaceAll("_", " "))}</span><b>RWF ${Number(order.total_rwf).toLocaleString()}</b>${order.status === "new" ? `<button class="row-action" data-cancel-order="${escapeHtml(order.id)}">Cancel order</button>` : ""}</article>`;
    }).join("") : '<p class="empty-backend">Your placed orders will appear here.</p>';
    $("#buyer-orders-dialog").showModal();
  } catch (error) { toast(error.message || "Could not load your orders."); }
}

async function loadSellerWorkspace() {
  if (!requireAccount()) return;
  if (state.profile?.role !== "seller") {
    toast("Choose a seller account when creating your account to open Seller Studio.");
    openAuth("signup");
    $("#auth-form").elements.role.value = "seller";
    return;
  }
  try {
    const client = await getSupabase();
    const { data, error } = await client.from("shops").select("id,name,type,district,address,phone,status,created_at").eq("owner_id", state.session.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    state.businesses = data;
    const ids = data.map((shop) => shop.id);
    state.sellerListings = [];
    state.sellerOrders = [];
    state.sellerCustomers = [];
    if (ids.length) {
      const [listings, orders] = await Promise.all([
        client.from("listings").select("id,shop_id,title,category,description,details,image_url,image_urls,price_rwf,stock,duration_min,active,created_at").in("shop_id", ids).order("created_at", { ascending: false }),
        client.from("orders").select("id,shop_id,buyer_id,status,fulfillment,total_rwf,created_at,shops(name),order_items(title,qty),order_payments(status,method,transaction_reference)").in("shop_id", ids).order("created_at", { ascending: false }).limit(40)
      ]);
      if (listings.error) throw listings.error;
      if (orders.error) throw orders.error;
      state.sellerListings = listings.data;
      state.sellerOrders = orders.data;
      const buyerIds = [...new Set(orders.data.map((order) => order.buyer_id).filter(Boolean))];
      if (buyerIds.length) {
        const { data: customers, error: customerError } = await client.from("profiles").select("id,full_name,phone").in("id", buyerIds);
        if (customerError) throw customerError;
        state.sellerCustomers = customers;
      }
    }
    setRole("seller");
  } catch (error) { toast(error.message || "Could not load Seller Studio."); }
}

async function loadAdminWorkspace() {
  if (!requireAccount()) return;
  try {
    await loadProfile();
    if (state.profile?.role !== "admin") { toast("The admin portal is restricted to authorized administrators."); return; }
    const client = await getSupabase();
    const { data, error } = await client.from("shops").select("id,name,type,district,address,phone,status,created_at,profiles!shops_owner_id_fkey(full_name)").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    state.adminBusinesses = data;
    const [{ data: orders, error: orderError }, { data: customers, error: customerError }, { data: payments, error: paymentError }, { data: listings, error: listingsError }, { data: banners, error: bannersError }] = await Promise.all([
      client.from("orders").select("id,status,total_rwf,created_at,shops(name)").order("created_at", { ascending: false }).limit(100),
      client.from("profiles").select("id,full_name,phone,role,created_at").order("created_at", { ascending: false }).limit(100),
      client.from("order_payments").select("id,order_id,amount_rwf,method,status,transaction_reference,created_at,shops(name)").order("created_at", { ascending: false }).limit(100),
      client.from("listings").select("id,shop_id,title,category,description,details,image_url,image_urls,price_rwf,stock,duration_min,active,created_at,shops(name,status)").order("created_at", { ascending: false }).limit(200),
      client.from("site_banners").select("id,slug,title,subtitle,cta_label,cta_category,image_url,theme,sort_order,active").order("sort_order", { ascending: true })
    ]);
    if (orderError) throw orderError;
    if (customerError) throw customerError;
    if (paymentError) throw paymentError;
    if (listingsError) throw listingsError;
    if (bannersError) throw bannersError;
    state.adminOrders = orders;
    state.adminCustomers = customers;
    state.adminPayments = payments;
    state.adminListings = listings;
    state.adminBanners = banners;
    setRole("admin");
  } catch (error) { toast(error.message || "Could not load the admin portal."); }
}

async function openListingForm(item = null) {
  if (!requireAccount()) return;
  const isAdmin = state.profile?.role === "admin";
  if (state.profile?.role !== "seller" && !isAdmin) { toast("A seller account is required to add a listing."); return; }
  if (isAdmin && !item) { toast("Admins can edit existing marketplace listings from the Products tab."); return; }
  try {
    const client = await getSupabase();
    let query = client.from("shops").select("id,name,status").order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("owner_id", state.session.user.id);
    const { data, error } = await query;
    if (error) throw error;
    const form = $("#listing-form");
    form.reset();
    editingListingId = item?.id || null;
    listingOriginalUrls = item ? (item.image_urls?.length ? [...item.image_urls] : item.image_url ? [item.image_url] : []) : [];
    listingGallery = item ? listingOriginalUrls.map((url) => ({ url, file: null, isCover: url === item.image_url })) : [];
    if (listingGallery.length && !listingGallery.some((image) => image.isCover)) listingGallery[0].isCover = true;
    const select = $("#listing-form").elements.shop_id;
    select.innerHTML = data.map((shop) => `<option value="${escapeHtml(shop.id)}">${escapeHtml(shop.name)}${shop.status !== "approved" ? " (pending approval)" : ""}</option>`).join("");
    if (!data.length) { toast("Add your business first."); $("#business-dialog").showModal(); return; }
    if (item) {
      form.elements.shop_id.value = item.shop_id;
      form.elements.title.value = item.title;
      form.elements.category.value = item.category || "Other";
      form.elements.description.value = item.description || "";
      form.elements.details.value = item.details || "";
      form.elements.price_rwf.value = item.price_rwf;
      form.elements.stock.value = item.stock ?? "";
      form.elements.duration_min.value = item.duration_min ?? "";
    }
    renderListingGallery();
    $("#listing-title").textContent = item ? "Edit product listing" : "Add a listing";
    form.querySelector("button[type=submit]").textContent = item ? "Save product changes" : "Publish listing";
    $("#listing-dialog").showModal();
  } catch (error) { toast(error.message || "Could not load your businesses."); }
}

function renderListingGallery() {
  const host = $("#listing-image-gallery");
  if (!host) return;
  host.innerHTML = listingGallery.map((image, index) => `<article class="gallery-edit-card"><img src="${escapeHtml(image.url)}" alt="Product photo ${index + 1}"><div><strong>${image.isCover ? "Cover photo" : `Photo ${index + 1}`}</strong><button type="button" class="row-action" data-gallery-cover="${index}">${image.isCover ? "Selected cover" : "Use as cover"}</button><button type="button" class="row-action remove-photo" data-gallery-remove="${index}">Remove</button></div></article>`).join("");
}

function openBannerForm(banner = null) {
  if (!requireAccount() || state.profile?.role !== "admin") { toast("Only administrators can edit homepage promotions."); return; }
  if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
  bannerObjectUrl = null;
  const form = $("#banner-form");
  form.reset();
  editingBannerId = banner?.id || null;
  bannerImageUrl = banner?.image_url || null;
  $("#banner-editor-title").textContent = banner ? "Edit promotion" : "Add a promotion";
  form.elements.title.value = banner?.title || "";
  form.elements.subtitle.value = banner?.subtitle || "";
  form.elements.cta_label.value = banner?.cta_label || "Explore now";
  form.elements.cta_category.value = banner?.cta_category || "All";
  form.elements.theme.value = banner?.theme || "market";
  form.elements.sort_order.value = banner?.sort_order || (state.adminBanners.length + 1);
  form.elements.active.checked = banner?.active ?? true;
  const preview = $("#banner-image-preview");
  if (bannerImageUrl) { preview.querySelector("img").src = bannerImageUrl; preview.querySelector("span").textContent = "Current banner image"; preview.hidden = false; }
  else preview.hidden = true;
  $("#banner-dialog").showModal();
}

function setRole(role) {
  state.role = role;
  $("#breadcrumb-role").textContent = `${role[0].toUpperCase()}${role.slice(1)} portal`;
  $("#buyer-view").hidden = role !== "buyer";
  $("#seller-view").hidden = role !== "seller";
  $("#admin-view").hidden = role !== "admin";
  $$("[data-role]").forEach((button) => button.classList.toggle("active", button.dataset.role === role));
  if (role === "seller") renderSeller();
  if (role === "admin") renderAdmin();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { element.hidden = true; }, 2600);
}

function renderPlaces() {
  const grid = $("#listing-grid");
  const source = state.liveListings?.length ? state.liveListings : places;
  const filtered = source.filter((place) => {
    const matchesCategory = state.category === "All" || place.type === state.category;
    const matchesQuery = `${place.name} ${place.category || ""} ${place.type} ${place.tag}`.toLowerCase().includes(state.query.toLowerCase());
    return matchesCategory && matchesQuery;
  });
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><span>⌕</span><strong>No places found</strong><p>Try a different search or category.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map((place) => {
    const savedKey = place.id || place.name;
    const saved = state.saved.has(savedKey);
    const cardKey = place.id || place.name;
    return `<article class="listing-card" data-product-card="${escapeHtml(cardKey)}">
      <div class="listing-visual ${escapeHtml(place.tone || "market")}" data-product-open><span class="listing-category-pill">${escapeHtml(place.category || place.type)}</span>${place.imageUrl ? `<img class="listing-photo" src="${escapeHtml(place.imageUrl)}" alt="${escapeHtml(place.name)}" loading="lazy">` : `<span class="listing-emoji">${escapeHtml(place.icon || "🛍️")}</span>`}<span class="listing-badge"><span>✦</span> ${escapeHtml(place.badge || "Local")}</span><button aria-label="${saved ? "Remove" : "Save"} ${escapeHtml(place.name)}" class="save-button ${saved ? "saved" : ""}" data-save="${escapeHtml(savedKey)}" ${place.id ? `data-listing-id="${escapeHtml(place.id)}"` : ""}>${saved ? "♥" : "♡"}</button><span class="visual-deco">✳</span></div>
      <div class="listing-info"><button class="listing-title-button" data-product-open><h3>${escapeHtml(place.name)}</h3></button><p>${escapeHtml(place.shop?.name || place.shopName || place.tag)}</p><div class="listing-meta"><span>⌖ ${escapeHtml(place.distance || "Kigali")}</span><span>·</span><span>${escapeHtml(place.time || "Ask seller")}</span></div><div class="listing-bottom"><strong>RWF ${Number(place.priceValue || 0).toLocaleString()}</strong><button class="quick-view-button" aria-label="View details for ${escapeHtml(place.name)}" data-product-detail="${escapeHtml(cardKey)}">Details</button></div>${place.id ? `<button class="listing-order-button" data-view="${escapeHtml(place.name)}" data-listing-id="${escapeHtml(place.id)}">${place.fulfillment === "booking" ? "Book this service" : "Order now"}</button>` : `<button class="listing-order-button preview-order" disabled>Sample item</button>`}</div>
    </article>`;
  }).join("");
}

function renderSeller() {
  const tabs = ["Overview", "Orders", "Listings", "Customers"];
  const view = $("#seller-view");
  const tabButtons = tabs.map((tab) => `<button class="portal-tab ${state.sellerTab === tab ? "active" : ""}" data-seller-tab="${tab}">${tab}${tab === "Orders" && state.sellerOrders?.length ? `<span class="count-pill">${state.sellerOrders.length}</span>` : ""}</button>`).join("");
  const shops = state.businesses || [];
  const orders = state.sellerOrders || [];
  const listings = state.sellerListings || [];
  let body;
  if (state.sellerTab === "Overview") {
    body = shops.length ? `<section class="backend-list">${shops.map((shop) => `<article class="backend-list-item"><div><strong>${escapeHtml(shop.name)}</strong><small>${escapeHtml(shop.type)} · ${escapeHtml(shop.district || "Kigali")}</small></div><span class="order-pill">${escapeHtml(shop.status)}</span></article>`).join("")}</section><div class="metric-grid">${metric("Orders", orders.length, "Live", "from your businesses", "▤")}${metric("Listings", listings.length, "Live", "products and services", "▦")}${metric("Awaiting response", orders.filter((order) => order.status === "new").length, "Now", "new customer orders", "◷")}${metric("Business applications", shops.filter((shop) => shop.status === "pending").length, "Review", "awaiting approval", "⌂")}</div>` : '<section class="panel tab-placeholder"><span class="placeholder-icon">▦</span><h2>Set up your business</h2><p>Submit your shop, restaurant, or salon for review. You can add listings after creating your business.</p><button class="primary-button" data-action="add-business">＋ Add your business</button></section>';
  } else if (state.sellerTab === "Listings") {
    body = listings.length ? `<section class="backend-list">${listings.map((item) => `<article class="backend-list-item seller-listing-row">${item.image_url ? `<img class="seller-listing-thumb" src="${escapeHtml(item.image_url)}" alt="">` : '<span class="seller-listing-thumb seller-listing-placeholder">▦</span>'}<div><strong>${escapeHtml(item.title)}</strong><small>RWF ${Number(item.price_rwf).toLocaleString()} · ${item.stock === null ? "Stock not tracked" : `${item.stock} in stock`}</small></div><span class="order-pill">${item.active ? "Visible" : "Hidden"}</span><button class="row-action" data-edit-listing="${escapeHtml(item.id)}">Edit</button><button class="row-action" data-toggle-listing="${escapeHtml(item.id)}" data-active="${item.active}">${item.active ? "Hide" : "Publish"}</button></article>`).join("")}</section>` : '<p class="empty-backend">No listings yet. Add your first product, menu item, or service.</p>';
  } else if (state.sellerTab === "Orders") {
    body = orders.length ? `<section class="backend-list">${orders.map((order) => `<article class="backend-list-item"><div><strong>Order ${escapeHtml(order.id.slice(0, 8))} · ${escapeHtml(order.shops?.name || "Business")}</strong><small>${(order.order_items || []).map((item) => `${escapeHtml(item.title)} × ${item.qty}`).join(", ")} · ${escapeHtml(order.fulfillment)}</small><small>RWF ${Number(order.total_rwf).toLocaleString()} · ${new Date(order.created_at).toLocaleString()}</small><small>Payment: ${escapeHtml(order.order_payments?.[0]?.status || "Pending")}</small></div><label class="order-status-control"><span>${escapeHtml(order.status.replaceAll("_", " "))}</span><select aria-label="Update order status" data-order-status="${escapeHtml(order.id)}" data-current-status="${escapeHtml(order.status)}">${["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"].map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status.replaceAll("_", " ")}</option>`).join("")}</select></label></article>`).join("")}</section>` : '<p class="empty-backend">Customer orders will appear here.</p>';
  } else body = state.sellerCustomers?.length ? `<section class="backend-list">${state.sellerCustomers.map((customer) => { const customerOrders = orders.filter((order) => order.buyer_id === customer.id); return `<article class="backend-list-item"><div><strong>${escapeHtml(customer.full_name || "TradeBridge customer")}</strong><small>${escapeHtml(customer.phone || "No phone provided")}</small><small>${customerOrders.length} order${customerOrders.length === 1 ? "" : "s"} · RWF ${customerOrders.reduce((sum, order) => sum + Number(order.total_rwf || 0), 0).toLocaleString()} total</small></div>${customer.phone ? `<a class="row-action" href="tel:${escapeHtml(customer.phone)}">Call customer</a>` : ""}</article>`; }).join("")}</section>` : '<p class="empty-backend">Customer names and contact details appear here after your first order.</p>';
  view.innerHTML = `<section class="portal-heading"><div><div class="eyebrow"><span class="live-dot"></span> SELLER STUDIO</div><h1>Your business workspace</h1><p class="intro">Manage your businesses, listings, and customer orders.</p></div><button class="primary-button" data-action="add-business">＋ Add a business</button></section><div class="portal-tabs">${tabButtons}</div>${body}<footer class="footer"><span>© 2026 TradeBridge</span><span>Seller studio · Kigali</span><div><a href="#help" data-action="help">Help</a><a href="#terms" data-action="terms">Terms</a></div></footer>`;
}

function renderAdminOverview() {
  const businesses = state.adminBusinesses || [];
  const orders = state.adminOrders || [];
  const payments = state.adminPayments || [];
  const pending = businesses.filter((shop) => shop.status === "pending");
  return '<div class="admin-metrics">' +
    metric("Businesses", businesses.length, "Live", "registered vendors", "▦") +
    metric("Awaiting review", pending.length, "Action", "business applications", "◷", pending.length > 0) +
    metric("Open orders", orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length, "Live", "latest 100 orders", "▤") +
    metric("Payments to check", payments.filter((payment) => payment.status === "pending").length, "Review", "seller confirmations", "↗", payments.some((payment) => payment.status === "pending")) +
    '</div><div class="admin-overview-grid"><section class="panel"><div class="panel-heading"><div><h3>Business applications</h3><p>Review new vendors before they appear on TradeBridge.</p></div><button class="text-link" data-admin-tab="Businesses">View all</button></div><div class="backend-list">' +
    (pending.length ? pending.slice(0, 5).map((shop) => '<article class="backend-list-item"><div><strong>' + escapeHtml(shop.name) + '</strong><small>' + escapeHtml(shop.type) + ' · ' + escapeHtml(shop.district || "Kigali") + ' · ' + escapeHtml(shop.profiles?.full_name || "Seller") + '</small></div><button class="review-button" data-shop-review="' + escapeHtml(shop.id) + '" data-next-status="approved">Approve</button></article>').join("") : '<p class="empty-backend">No applications are waiting for review.</p>') +
    '</div></section><section class="panel"><div class="panel-heading"><div><h3>Recent orders</h3><p>Most recent marketplace activity.</p></div><button class="text-link" data-admin-tab="Orders">View all</button></div><div class="backend-list">' +
    (orders.length ? orders.slice(0, 5).map((order) => '<article class="backend-list-item"><div><strong>' + escapeHtml(order.shops?.name || "Business") + ' · ' + escapeHtml(order.id.slice(0, 8)) + '</strong><small>' + escapeHtml(order.status.replaceAll("_", " ")) + ' · ' + new Date(order.created_at).toLocaleDateString() + '</small></div><b>RWF ' + Number(order.total_rwf).toLocaleString() + '</b></article>').join("") : '<p class="empty-backend">Customer orders will appear here.</p>') +
    '</div></section></div>';
}

function renderAdmin() {
  const tabs = ["Overview", "Businesses", "Products", "Website", "Orders", "Payments", "Customers", "Reports"];
  const view = $("#admin-view");
  const tabButtons = tabs.map((tab) => `<button class="portal-tab ${state.adminTab === tab ? "active" : ""}" data-admin-tab="${tab}">${tab}${tab === "Businesses" ? `<span class="count-pill alert-count">${(state.adminBusinesses || []).filter((shop) => shop.status === "pending").length}</span>` : ""}</button>`).join("");
  const businesses = state.adminBusinesses || [];
  const body = state.adminTab === "Businesses"
    ? `<div class="admin-metrics">${metric("Businesses", businesses.length, "Live", "registered marketplace vendors", "▦")}${metric("Pending approval", businesses.filter((shop) => shop.status === "pending").length, "Review", "business applications", "◷")}${metric("Orders", (state.adminOrders || []).length, "Recent", "latest 100 recorded", "▤")}${metric("Marketplace volume", `RWF ${(state.adminOrders || []).reduce((total, order) => total + Number(order.total_rwf || 0), 0).toLocaleString()}`, "Recent", "latest 100 orders", "↗")}</div><section class="panel admin-business-panel"><div class="panel-heading"><div><h3>${state.adminTab === "Businesses" ? "All businesses" : "Business applications"}</h3><p>Approve or suspend marketplace vendors.</p></div></div><div class="backend-list">${businesses.length ? businesses.map((shop) => `<article class="backend-list-item"><div><strong>${escapeHtml(shop.name)}</strong><small>${escapeHtml(shop.type)} · ${escapeHtml(shop.district)} · ${escapeHtml(shop.profiles?.full_name || "Seller")}</small></div><span class="order-pill">${escapeHtml(shop.status)}</span><span>${shop.status === "pending" ? `<button class="review-button" data-shop-review="${escapeHtml(shop.id)}" data-next-status="approved">Approve</button>` : shop.status === "approved" ? `<button class="row-action" data-shop-review="${escapeHtml(shop.id)}" data-next-status="suspended">Suspend</button>` : `<button class="review-button" data-shop-review="${escapeHtml(shop.id)}" data-next-status="approved">Reinstate</button>`}</span></article>`).join("") : '<p class="empty-backend">No business applications yet.</p>'}</div></section>`
    : state.adminTab === "Products" ? `<div class="admin-tab-intro"><div><h2>Marketplace products</h2><p>Edit seller listings, prices, descriptions, product details, and photo galleries.</p></div><span>${(state.adminListings || []).length} listings</span></div><section class="backend-list admin-products-list">${(state.adminListings || []).map((item) => `<article class="backend-list-item admin-product-row">${item.image_url ? `<img class="seller-listing-thumb" src="${escapeHtml(item.image_url)}" alt="">` : '<span class="seller-listing-thumb seller-listing-placeholder">▦</span>'}<div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || "General")} · ${escapeHtml(item.shops?.name || "Business")} · RWF ${Number(item.price_rwf).toLocaleString()}</small><small>${item.image_urls?.length || (item.image_url ? 1 : 0)} photos · ${item.stock === null ? "Stock untracked" : `${item.stock} available`}</small></div><span class="order-pill">${item.active ? "Published" : "Hidden"}</span><button class="review-button" data-admin-edit-listing="${escapeHtml(item.id)}">Edit product</button><button class="row-action" data-admin-listing-toggle="${escapeHtml(item.id)}">${item.active ? "Hide" : "Publish"}</button></article>`).join("") || '<p class="empty-backend">Products published by approved businesses will appear here.</p>'}</section>`
    : state.adminTab === "Website" ? `<section class="panel website-manager"><div class="panel-heading"><div><h3>Homepage promotions</h3><p>These banners rotate on the buyer homepage. Add artwork or use the built-in illustrated themes.</p></div><button class="primary-button" data-action="add-banner">＋ Add promotion</button></div><div class="backend-list">${(state.adminBanners || []).map((banner) => `<article class="backend-list-item banner-admin-row">${banner.image_url ? `<img class="banner-admin-thumb" src="${escapeHtml(banner.image_url)}" alt="">` : `<span class="banner-admin-thumb theme-${escapeHtml(banner.theme)}">✦</span>`}<div><strong>${escapeHtml(banner.title)}</strong><small>${escapeHtml(banner.cta_category)} · ${escapeHtml(banner.theme)} artwork · Order ${banner.sort_order}</small></div><span class="order-pill">${banner.active ? "Showing" : "Hidden"}</span><button class="review-button" data-banner-edit="${escapeHtml(banner.id)}">Edit</button><button class="row-action" data-banner-toggle="${escapeHtml(banner.id)}">${banner.active ? "Hide" : "Show"}</button></article>`).join("") || '<p class="empty-backend">Add a promotion to feature it on the homepage.</p>'}</div></section><p class="website-manager-note">Promotions transition automatically. Visitors who prefer reduced motion will see the first slide without auto-rotation.</p>`
    : state.adminTab === "Overview" ? renderAdminOverview()
    : state.adminTab === "Orders" ? `<section class="backend-list">${(state.adminOrders || []).map((order) => `<article class="backend-list-item"><div><strong>${escapeHtml(order.shops?.name || "Business")} · ${escapeHtml(order.id.slice(0, 8))}</strong><small>${escapeHtml(order.status.replaceAll("_", " "))} · ${new Date(order.created_at).toLocaleString()}</small></div><b>RWF ${Number(order.total_rwf).toLocaleString()}</b><label class="order-status-control"><span>Update order</span><select aria-label="Update order status" data-admin-order-status="${escapeHtml(order.id)}" data-current-status="${escapeHtml(order.status)}">${["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"].map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status.replaceAll("_", " ")}</option>`).join("")}</select></label></article>`).join("") || '<p class="empty-backend">No orders yet.</p>'}</section>`
    : state.adminTab === "Payments" ? `<section class="backend-list">${(state.adminPayments || []).map((payment) => `<article class="backend-list-item"><div><strong>${escapeHtml(payment.shops?.name || "Seller")} · RWF ${Number(payment.amount_rwf).toLocaleString()}</strong><small>${escapeHtml(payment.method.replaceAll("_", " "))} · Order ${escapeHtml(payment.order_id.slice(0, 8))}</small><small>Reference: ${escapeHtml(payment.transaction_reference || "Not supplied")}</small></div><span class="order-pill">${escapeHtml(payment.status)}</span>${payment.status === "pending" ? `<button class="review-button" data-payment-id="${escapeHtml(payment.id)}" data-payment-review="paid">Confirm</button><button class="row-action" data-payment-id="${escapeHtml(payment.id)}" data-payment-review="rejected">Reject</button>` : ""}</article>`).join("") || '<p class="empty-backend">No payment records yet.</p>'}</section>`
    : state.adminTab === "Customers" ? `<section class="backend-list">${(state.adminCustomers || []).map((customer) => `<article class="backend-list-item"><div><strong>${escapeHtml(customer.full_name || "TradeBridge member")}</strong><small>${escapeHtml(customer.phone || "No phone added")}</small></div><span class="order-pill">${escapeHtml(customer.role)}</span><small>${new Date(customer.created_at).toLocaleDateString()}</small></article>`).join("") || '<p class="empty-backend">No accounts yet.</p>'}</section>`
    : `<div class="admin-metrics">${metric("Completed orders", (state.adminOrders || []).filter((order) => order.status === "completed").length, "All time", "marked complete", "✓")}${metric("Open orders", (state.adminOrders || []).filter((order) => !["completed", "cancelled"].includes(order.status)).length, "Now", "need fulfillment", "◷")}${metric("Paid records", (state.adminPayments || []).filter((payment) => payment.status === "paid").length, "Verified", "seller payments", "▤")}${metric("Pending payments", (state.adminPayments || []).filter((payment) => payment.status === "pending").length, "Review", "awaiting confirmation", "↗", true)}</div><section class="panel"><div class="panel-heading"><div><h3>Marketplace activity</h3><p>Orders placed in the last seven days · from the latest 100 records.</p></div><button class="outline-button" data-action="export">Download CSV</button></div><div class="backend-list">${Array.from({length: 7}, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i)); const dayOrders = (state.adminOrders || []).filter((o) => new Date(o.created_at).toDateString() === d.toDateString()); return `<article class="backend-list-item"><div><strong>${d.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}</strong><small>${dayOrders.length} order${dayOrders.length === 1 ? "" : "s"}</small></div><b>RWF ${dayOrders.reduce((sum,o) => sum + Number(o.total_rwf || 0), 0).toLocaleString()}</b></article>`; }).join("")}</div></section>`;
  view.innerHTML = `<section class="portal-heading"><div><div class="eyebrow"><span class="live-dot"></span> ADMIN CONSOLE</div><h1>Marketplace management</h1><p class="intro">Review applications, keep orders moving, and check seller payments.</p></div></section><div class="portal-tabs">${tabButtons}</div>${body}<footer class="footer"><span>© 2026 TradeBridge</span><span>Admin console · Kigali</span></footer>`;
}

function metric(label, value, change, sub, icon, warning = false) {
  return `<article class="metric-card"><div class="metric-top"><span>${label}</span><i>${icon}</i></div><strong class="metric-value">${value}</strong><div class="metric-foot"><b class="${warning ? "warning-change" : "positive-change"}">${change}</b><span>${sub}</span></div></article>`;
}

function showBuyerPanel(title, content) {
  let dialog = $("#buyer-panel-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog"); dialog.id = "buyer-panel-dialog"; dialog.className = "install-dialog orders-dialog";
    dialog.innerHTML = '<form method="dialog"><button class="dialog-close" aria-label="Close">×</button></form><p class="install-kicker">TRADEBRIDGE</p><h2 id="buyer-panel-title"></h2><div id="buyer-panel-content"></div>';
    document.body.append(dialog);
  }
  $("#buyer-panel-title", dialog).textContent = title;
  $("#buyer-panel-content", dialog).innerHTML = content;
  dialog.showModal();
}

function showSavedPlaces() {
  if (!requireAccount()) return;
  const items = (state.liveListings || []).filter((item) => state.saved.has(item.id));
  showBuyerPanel("Saved places", items.length ? `<section class="backend-list">${items.map((item) => `<article class="backend-list-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.shop.name)} · RWF ${item.priceValue.toLocaleString()}</small></div><button class="review-button" data-view="${escapeHtml(item.name)}" data-listing-id="${escapeHtml(item.id)}">Order</button><button class="row-action" data-unsave="${escapeHtml(item.id)}">Remove</button></article>`).join("")}</section>` : '<p class="empty-backend">Save a shop, meal or service from Explore and it will be kept here.</p>');
}

async function showBuyerMessages() {
  if (!requireAccount()) return;
  try {
    const { data, error } = await (await getSupabase()).from("orders").select("id,status,created_at,shops(name,phone)").eq("buyer_id", state.session.user.id).order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    const rows = data.map((order) => `<article class="backend-list-item"><div><strong>${escapeHtml(order.shops?.name || "Seller")}</strong><small>Order ${escapeHtml(order.id.slice(0,8))} · ${escapeHtml(order.status.replaceAll("_"," "))} · ${new Date(order.created_at).toLocaleDateString()}</small></div>${order.shops?.phone ? `<a class="row-action" href="https://wa.me/${encodeURIComponent(order.shops.phone.replace(/\D/g,""))}" target="_blank" rel="noopener">WhatsApp seller ↗</a>` : "<small>Seller contact not listed</small>"}</article>`).join("");
    showBuyerPanel("Seller contacts", `<p class="install-description">Your order updates are here. For a quick question, contact the business directly.</p>${rows ? `<section class="backend-list">${rows}</section>` : '<p class="empty-backend">Place an order to see seller contact options here.</p>'}`);
  } catch (error) { toast(error.message || "Could not load seller contacts."); }
}

document.addEventListener("click", (event) => {
  const productCard = event.target.closest("[data-product-card]");
  if (productCard && !event.target.closest("button, a")) {
    const key = productCard.dataset.productCard;
    const product = (state.liveListings?.length ? state.liveListings : places).find((item) => (item.id || item.name) === key);
    if (product) { openProductDetail(product); return; }
  }
  const button = event.target.closest("button, a");
  if (!button) return;
  if (button.hasAttribute("data-product-open") || button.dataset.productDetail) {
    const key = button.dataset.productDetail || button.closest("[data-product-card]")?.dataset.productCard;
    const product = (state.liveListings?.length ? state.liveListings : places).find((item) => (item.id || item.name) === key);
    if (product) openProductDetail(product);
    return;
  }
  if (button.hasAttribute("data-banner-prev") || button.hasAttribute("data-banner-next")) {
    const count = state.banners.length;
    if (count > 1) { state.bannerIndex = (state.bannerIndex + (button.hasAttribute("data-banner-prev") ? count - 1 : 1)) % count; renderHeroBanner(); }
    return;
  }
  if (button.dataset.bannerSlide !== undefined) { state.bannerIndex = Number(button.dataset.bannerSlide); renderHeroBanner(); return; }
  if (button.dataset.productThumb !== undefined) {
    const index = Number(button.dataset.productThumb);
    const images = state.selectedListing?.imageUrls || [];
    if (images[index]) {
      $("#product-gallery-main").innerHTML = `<img src="${escapeHtml(images[index])}" alt="${escapeHtml(state.selectedListing.name || state.selectedListing.title)}">`;
      $$(".product-thumb").forEach((thumb, i) => thumb.classList.toggle("active", i === index));
    }
    return;
  }
  if (button.dataset.role) {
    if (button.dataset.role === "buyer") setRole("buyer");
    if (button.dataset.role === "seller") loadSellerWorkspace();
    if (button.dataset.role === "admin") loadAdminWorkspace();
    return;
  }
  if (button.dataset.category) {
    state.category = button.dataset.category;
    $$(".category-tab").forEach((tab) => tab.classList.toggle("selected", tab === button));
    renderPlaces();
    return;
  }
  if (button.dataset.save) {
    const wasSaved = state.saved.has(button.dataset.save);
    if (button.dataset.listingId && !requireAccount()) return;
    wasSaved ? state.saved.delete(button.dataset.save) : state.saved.add(button.dataset.save);
    $("#saved-count").textContent = state.saved.size || "";
    renderPlaces();
    if (button.dataset.listingId) {
      (async () => {
        try {
          const client = await getSupabase();
          const query = wasSaved
            ? client.from("listing_feedback").update({ liked: false }).eq("buyer_id", state.session.user.id).eq("listing_id", button.dataset.listingId)
            : client.from("listing_feedback").upsert({ buyer_id: state.session.user.id, listing_id: button.dataset.listingId, liked: true }, { onConflict: "listing_id,buyer_id" });
          const { error } = await query;
          if (error) throw error;
        } catch (error) { toast(error.message || "Could not update your saved places."); }
      })();
    }
    return;
  }
  if (button.dataset.view) {
    if (!button.dataset.listingId) { toast(`Business details for ${button.dataset.view} will be connected when its seller joins.`); return; }
    if (!requireAccount()) return;
    state.selectedListing = state.liveListings.find((listing) => listing.id === button.dataset.listingId);
    if (!state.selectedListing) { toast("This listing is no longer available."); return; }
    if (state.selectedListing.stock === 0) { toast("This item is out of stock."); return; }
    state.selectedQuantity = 1;
    $("#checkout-item").textContent = `${state.selectedListing.name} · RWF ${state.selectedListing.priceValue.toLocaleString()} from ${state.selectedListing.shop.name}`;
    $("#checkout-quantity").textContent = "1";
    $("#quantity-availability").textContent = Number.isInteger(state.selectedListing.stock) ? `${state.selectedListing.stock} available` : "Choose quantity";
    updateCheckoutTotal();
    const fulfillment = $("#checkout-form").elements.fulfillment;
    fulfillment.value = state.selectedListing.fulfillment;
    $("#delivery-address-wrap").hidden = fulfillment.value !== "delivery";
    $("#booking-time-wrap").hidden = fulfillment.value !== "booking";
    $("#checkout-form").elements.delivery_address.required = fulfillment.value === "delivery";
    $("#checkout-form").elements.scheduled_at.required = fulfillment.value === "booking";
    const method = $("#checkout-form").elements.payment_method;
    const available = state.selectedListing.shop.payment_methods || ["momo", "bank_transfer"];
    method.innerHTML = available.map((entry) => {
      const value = entry === "momo" ? "mtn_momo" : entry;
      const label = value === "mtn_momo" ? "MTN Mobile Money" : value === "bank_transfer" ? "Bank transfer" : value;
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }).filter((option) => option.includes('value="mtn_momo"') || option.includes('value="bank_transfer"')).join("");
    if (!method.options.length) method.innerHTML = '<option value="mtn_momo">MTN Mobile Money</option><option value="bank_transfer">Bank transfer</option>';
    $("#payment-instructions").textContent = state.selectedListing.shop.payment_instructions || "Place your order, then ask the seller for their payment instructions.";
    $("#checkout-dialog").showModal();
    return;
  }
  if (button.dataset.shopReview) {
    (async () => {
      try {
        const { error } = await (await getSupabase()).from("shops").update({ status: button.dataset.nextStatus }).eq("id", button.dataset.shopReview);
        if (error) throw error;
        await loadAdminWorkspace();
        toast(`Business ${button.dataset.nextStatus}.`);
      } catch (error) { toast(error.message || "Could not update this business."); }
    })();
    return;
  }
  if (button.dataset.paymentReview) {
    (async () => {
      try {
        const { error } = await (await getSupabase()).from("order_payments").update({ status: button.dataset.paymentReview, verified_by: state.session.user.id, verified_at: new Date().toISOString() }).eq("id", button.dataset.paymentId);
        if (error) throw error;
        await loadAdminWorkspace();
        toast(button.dataset.paymentReview === "paid" ? "Payment confirmed." : "Payment marked for follow-up.");
      } catch (error) { toast(error.message || "Could not update the payment."); }
    })();
    return;
  }
  if (button.dataset.unsave) {
    (async () => { try { const { error } = await (await getSupabase()).from("listing_feedback").update({ liked: false }).eq("buyer_id", state.session.user.id).eq("listing_id", button.dataset.unsave); if (error) throw error; state.saved.delete(button.dataset.unsave); $("#saved-count").textContent = state.saved.size || ""; await loadProfile(); showSavedPlaces(); renderPlaces(); } catch (error) { toast(error.message || "Could not remove this saved place."); } })();
    return;
  }
  if (button.dataset.cancelOrder) {
    (async () => { try { const { error } = await (await getSupabase()).from("orders").update({ status: "cancelled" }).eq("id", button.dataset.cancelOrder).eq("buyer_id", state.session.user.id).eq("status", "new"); if (error) throw error; toast("Order cancelled."); await showBuyerOrders(); } catch (error) { toast(error.message || "Could not cancel this order."); } })();
    return;
  }
  if (button.dataset.toggleListing) {
    (async () => { try { const item = state.sellerListings.find((listing) => listing.id === button.dataset.toggleListing); const { error } = await (await getSupabase()).from("listings").update({ active: !item.active }).eq("id", item.id); if (error) throw error; await loadSellerWorkspace(); await refreshListings(); toast(item.active ? "Listing hidden from customers." : "Listing published."); } catch (error) { toast(error.message || "Could not update listing."); } })();
    return;
  }
  if (button.dataset.editListing) {
    const item = state.sellerListings.find((listing) => listing.id === button.dataset.editListing);
    if (!item) return;
    openListingForm(item);
    return;
  }
  if (button.dataset.adminEditListing) {
    const item = state.adminListings.find((listing) => listing.id === button.dataset.adminEditListing);
    if (item) openListingForm(item);
    return;
  }
  if (button.dataset.adminListingToggle) {
    const item = state.adminListings.find((listing) => listing.id === button.dataset.adminListingToggle);
    if (!item) return;
    (async () => {
      try {
        const { error } = await (await getSupabase()).from("listings").update({ active: !item.active }).eq("id", item.id);
        if (error) throw error;
        await loadAdminWorkspace(); await refreshListings(); toast(item.active ? "Product hidden from the storefront." : "Product published.");
      } catch (error) { toast(error.message || "Could not update this product."); }
    })();
    return;
  }
  if (button.dataset.bannerEdit) { const banner = state.adminBanners.find((item) => item.id === button.dataset.bannerEdit); if (banner) openBannerForm(banner); return; }
  if (button.dataset.bannerToggle) {
    const banner = state.adminBanners.find((item) => item.id === button.dataset.bannerToggle);
    if (!banner) return;
    (async () => {
      try {
        const { error } = await (await getSupabase()).from("site_banners").update({ active: !banner.active }).eq("id", banner.id);
        if (error) throw error;
        await loadAdminWorkspace(); await loadSiteBanners(); toast(banner.active ? "Promotion hidden from the homepage." : "Promotion shown on the homepage.");
      } catch (error) { toast(error.message || "Could not update this promotion."); }
    })();
    return;
  }
  if (button.dataset.sellerTab) { state.sellerTab = button.dataset.sellerTab; renderSeller(); return; }
  if (button.dataset.adminTab) { state.adminTab = button.dataset.adminTab; renderAdmin(); return; }
  if (button.dataset.review) { toast(`Opening ${button.dataset.review} application for review.`); return; }

  const action = button.dataset.action;
  const messages = {
    location: "Location settings will be available in a later step.", saved: "", orders: "", messages: "", help: "Help center coming soon.", profile: "", notifications: "",
    "edit-business": "Business profile editing will be added in a later step.", "add-listing": "", "add-business": "", inventory: "Inventory management will be added in a later step.", promotion: "Promotion tools coming soon.",
    "seller-next": "This seller workspace will be connected in a later step.", "admin-next": "Admin management will be connected in a later step.", export: "Report export coming soon.", insights: "Marketplace insights coming soon.",
    about: "TradeBridge connects customers with trusted local businesses.", privacy: "Privacy information will be added before launch.", terms: "Terms will be added before launch.", security: "Security tools coming soon.", "all-listings": "You’re seeing all available demo places."
  };
  if (action === "explore") { $("#discover").scrollIntoView({ behavior: "smooth" }); return; }
  if (action === "all-listings") { state.category = "All"; $$(".category-tab").forEach((tab) => tab.classList.toggle("selected", tab.dataset.category === "All")); renderPlaces(); $("#discover").scrollIntoView({ behavior: "smooth" }); return; }
  if (action === "orders") { showBuyerOrders(); return; }
  if (action === "saved") { showSavedPlaces(); return; }
  if (action === "messages") { showBuyerMessages(); return; }
  if (action === "notifications") { if (state.role === "buyer") showBuyerMessages(); else toast("Order status and payment updates are shown in your workspace tabs."); return; }
  if (action === "export") {
    const csv = [["Order ID", "Business", "Status", "Total RWF", "Created"], ...(state.adminOrders || []).map((order) => [order.id, order.shops?.name || "", order.status, order.total_rwf, order.created_at])].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "tradebridge-orders.csv"; link.click(); URL.revokeObjectURL(link.href); return;
  }
  if (action === "profile") {
    if (!state.session?.user) openAuth();
    else (async () => { const { error } = await (await getSupabase()).auth.signOut(); if (error) toast(error.message); else { state.session = null; state.profile = null; updateAccountLabel(); setRole("buyer"); toast("You have signed out."); } })();
    return;
  }
  if (action === "register") { openAuth("signup"); return; }
  if (action === "add-business") { if (requireAccount() && state.profile?.role === "seller") $("#business-dialog").showModal(); else if (state.profile?.role !== "seller") toast("Choose a seller account when creating your account."); return; }
  if (action === "add-listing") { openListingForm(); return; }
  if (action === "add-banner") { openBannerForm(); return; }
  if (action) toast(messages[action] || "This feature will be added in a later step.");
});

function updateCheckoutTotal() {
  if (!state.selectedListing) return;
  $("#checkout-quantity").textContent = String(state.selectedQuantity);
  $("#checkout-total").textContent = `Total · RWF ${(state.selectedListing.priceValue * state.selectedQuantity).toLocaleString()}`;
}

$("#quantity-decrease").addEventListener("click", () => {
  if (state.selectedQuantity <= 1) return;
  state.selectedQuantity -= 1;
  updateCheckoutTotal();
});

$("#quantity-increase").addEventListener("click", () => {
  const available = state.selectedListing?.stock;
  const maximum = Number.isInteger(available) ? available : 99;
  if (state.selectedQuantity >= maximum) {
    if (Number.isInteger(available)) toast(`Only ${available} available.`);
    return;
  }
  state.selectedQuantity += 1;
  updateCheckoutTotal();
});

$("#auth-switch").addEventListener("click", () => openAuth(state.authMode === "signup" ? "signin" : "signup"));

$("#forgot-password").addEventListener("click", async () => {
  const email = $("#auth-form").elements.email.value.trim();
  if (!email) { toast("Enter your email address first."); return; }
  try {
    const { error } = await (await getSupabase()).auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
    toast("If that account exists, a password reset link has been emailed.");
  } catch (error) { toast(error.message || "Could not send the reset email."); }
});

$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const submit = $("#auth-submit");
  submit.disabled = true;
  try {
    const client = await getSupabase();
    if (state.authMode === "signup") {
      const { data, error } = await client.auth.signUp({
        email: values.email, password: values.password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: values.full_name.trim(), phone: (values.phone || "").trim(), role: values.role || "buyer" } }
      });
      if (error) throw error;
      $("#auth-dialog").close();
      if (data.session) toast("Account created. You’re signed in.");
      else toast("Check your email to confirm the new account, then sign in.");
      form.reset();
    } else {
      const { error } = await client.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) throw error;
      $("#auth-dialog").close(); form.reset(); toast("You’re signed in.");
    }
  } catch (error) { toast(error.message || "Could not complete account sign in."); }
  finally { submit.disabled = false; }
});

$("#business-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAccount() || state.profile?.role !== "seller") { toast("Sign in with a seller account to submit a business."); return; }
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  try {
    const client = await getSupabase();
    const { error } = await client.from("shops").insert({
      owner_id: state.session.user.id, name: values.name.trim(), type: values.type,
      description: (values.description || "").trim(), district: values.district.trim(),
      address: values.address.trim(), phone: values.phone.trim()
    });
    if (error) throw error;
    $("#business-dialog").close(); form.reset();
    toast("Business submitted for admin review."); await loadSellerWorkspace();
  } catch (error) { toast(error.message || "Could not submit your business."); }
});

$("#listing-form").elements.images.addEventListener("change", (event) => {
  const files = [...(event.target.files || [])];
  const remaining = 5 - listingGallery.length;
  if (files.length > remaining) toast("A listing can have up to 5 photos.");
  for (const file of files.slice(0, remaining)) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      toast("Choose JPG, PNG or WebP photos under 3 MB each.");
      continue;
    }
    const url = URL.createObjectURL(file);
    listingGallery.push({ url, file, isCover: listingGallery.length === 0 });
  }
  event.target.value = "";
  renderListingGallery();
});

$("#listing-dialog").addEventListener("click", (event) => {
  const coverButton = event.target.closest("[data-gallery-cover]");
  if (coverButton) {
    const selected = Number(coverButton.dataset.galleryCover);
    listingGallery = listingGallery.map((image, index) => ({ ...image, isCover: index === selected }));
    renderListingGallery();
    return;
  }
  const removeButton = event.target.closest("[data-gallery-remove]");
  if (removeButton) {
    const [removed] = listingGallery.splice(Number(removeButton.dataset.galleryRemove), 1);
    if (removed?.file) URL.revokeObjectURL(removed.url);
    if (listingGallery.length && !listingGallery.some((image) => image.isCover)) listingGallery[0].isCover = true;
    renderListingGallery();
  }
});

$("#listing-dialog").addEventListener("close", () => {
  editingListingId = null;
  listingOriginalUrls = [];
  listingGallery.forEach((image) => { if (image.file) URL.revokeObjectURL(image.url); });
  listingGallery = [];
});

function listingStoragePath(url) {
  const marker = "/storage/v1/object/public/listing-images/";
  const index = (url || "").indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

$("#listing-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAccount()) return;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  let client = null;
  const uploadedPaths = [];
  const wasEditing = Boolean(editingListingId);
  const previousUrls = [...listingOriginalUrls];
  try {
    client = await getSupabase();
    const imageUrls = [];
    for (const image of listingGallery) {
      if (!image.file) { imageUrls.push(image.url); continue; }
      const extension = image.file.type === "image/jpeg" ? "jpg" : image.file.type.split("/")[1];
      const path = values.shop_id + "/" + crypto.randomUUID() + "." + extension;
      const { data: upload, error: uploadError } = await client.storage.from("listing-images").upload(path, image.file, { cacheControl: "3600", contentType: image.file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      imageUrls.push(client.storage.from("listing-images").getPublicUrl(upload.path).data.publicUrl);
    }
    const coverIndex = listingGallery.findIndex((image) => image.isCover);
    const imageUrl = coverIndex >= 0 ? imageUrls[coverIndex] : imageUrls[0] || null;
    const listingValues = {
      shop_id: values.shop_id, title: values.title.trim(), category: values.category, description: (values.description || "").trim(), details: (values.details || "").trim(), image_urls: imageUrls, image_url: imageUrl,
      price_rwf: Number(values.price_rwf), stock: values.stock === "" ? null : Number(values.stock),
      duration_min: values.duration_min === "" ? null : Number(values.duration_min)
    };
    const result = editingListingId
      ? await client.from("listings").update(listingValues).eq("id", editingListingId)
      : await client.from("listings").insert(listingValues);
    const { error } = result;
    if (error) throw error;
    $("#listing-dialog").close(); form.reset();
    const removedPaths = previousUrls.filter((url) => !imageUrls.includes(url)).map(listingStoragePath).filter(Boolean);
    if (removedPaths.length) await client.storage.from("listing-images").remove(removedPaths);
    toast(wasEditing ? "Product changes saved." : "Listing saved. It will be visible after its business is approved.");
    if (state.profile?.role === "admin") await loadAdminWorkspace(); else await loadSellerWorkspace();
    await refreshListings();
  } catch (error) {
    if (uploadedPaths.length && client) await client.storage.from("listing-images").remove(uploadedPaths);
    toast(error.message || "Could not save the listing.");
  }
});

$("#banner-form").elements.image.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  const preview = $("#banner-image-preview");
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
    event.target.value = "";
    toast("Choose a JPG, PNG or WebP banner under 3 MB.");
    return;
  }
  if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
  bannerObjectUrl = URL.createObjectURL(file);
  preview.querySelector("img").src = bannerObjectUrl;
  preview.querySelector("span").textContent = file.name;
  preview.hidden = false;
});

$("#banner-dialog").addEventListener("close", () => {
  if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
  bannerObjectUrl = null;
  editingBannerId = null;
  bannerImageUrl = null;
});

$("#banner-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAccount() || state.profile?.role !== "admin") { toast("Only administrators can publish homepage promotions."); return; }
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const editingId = editingBannerId;
  const oldImageUrl = bannerImageUrl;
  let client = null;
  let uploadedPath = null;
  try {
    client = await getSupabase();
    let imageUrl = oldImageUrl;
    const image = form.elements.image.files?.[0];
    if (image) {
      const extension = image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1];
      uploadedPath = `site/${crypto.randomUUID()}.${extension}`;
      const { data: upload, error: uploadError } = await client.storage.from("listing-images").upload(uploadedPath, image, { cacheControl: "3600", contentType: image.type, upsert: false });
      if (uploadError) throw uploadError;
      imageUrl = client.storage.from("listing-images").getPublicUrl(upload.path).data.publicUrl;
    }
    const banner = {
      title: values.title.trim(), subtitle: (values.subtitle || "").trim(), cta_label: values.cta_label.trim(),
      cta_category: values.cta_category, theme: values.theme, sort_order: Number(values.sort_order) || 1,
      image_url: imageUrl, active: form.elements.active.checked
    };
    const result = editingId
      ? await client.from("site_banners").update(banner).eq("id", editingId)
      : await client.from("site_banners").insert({ ...banner, slug: values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + crypto.randomUUID().slice(0, 6), created_by: state.session.user.id });
    if (result.error) throw result.error;
    $("#banner-dialog").close(); form.reset(); $("#banner-image-preview").hidden = true;
    if (image && oldImageUrl) { const oldPath = listingStoragePath(oldImageUrl); if (oldPath) await client.storage.from("listing-images").remove([oldPath]); }
    await loadAdminWorkspace(); await loadSiteBanners();
    toast(editingId ? "Homepage promotion updated." : "Homepage promotion added.");
  } catch (error) {
    if (uploadedPath && client) await client.storage.from("listing-images").remove([uploadedPath]);
    toast(error.message || "Could not save the homepage promotion.");
  }
});

$("#checkout-form").elements.fulfillment.addEventListener("change", (event) => {
  $("#delivery-address-wrap").hidden = event.target.value !== "delivery";
  $("#booking-time-wrap").hidden = event.target.value !== "booking";
  $("#checkout-form").elements.delivery_address.required = event.target.value === "delivery";
  $("#checkout-form").elements.scheduled_at.required = event.target.value === "booking";
});

$("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAccount() || !state.selectedListing) return;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const quantity = state.selectedQuantity;
  try {
    const client = await getSupabase();
    const { data: orderId, error } = await client.rpc("place_marketplace_order", {
      p_shop_id: state.selectedListing.shopId,
      p_fulfillment: values.fulfillment,
      p_address: values.delivery_address || "",
      p_contact_phone: values.contact_phone,
      p_note: values.note || "",
      p_scheduled_at: values.scheduled_at ? new Date(values.scheduled_at).toISOString() : null,
      p_items: [{ listingId: state.selectedListing.id, qty: quantity }]
    });
    if (error) throw error;
    let paymentError = null;
    if (state.selectedListing.priceValue > 0) {
      const result = await client.from("order_payments").insert({
        order_id: orderId, buyer_id: state.session.user.id, shop_id: state.selectedListing.shopId,
        amount_rwf: state.selectedListing.priceValue * quantity, method: values.payment_method,
        transaction_reference: values.transaction_reference || null
      });
      paymentError = result.error;
    }
    $("#checkout-dialog").close(); form.reset();
    toast(paymentError ? `Order placed (${String(orderId).slice(0, 8)}); payment record needs attention.` : `Order placed (${String(orderId).slice(0, 8)}). Follow the seller’s payment instructions.`);
    await refreshListings();
  } catch (error) { toast(error.message || "Could not place the order."); }
});

$("#admin-view").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-admin-order-status]");
  if (!select || select.value === select.dataset.currentStatus) return;
  try {
    const { error } = await (await getSupabase()).from("orders").update({ status: select.value }).eq("id", select.dataset.adminOrderStatus);
    if (error) throw error;
    toast("Order status updated.");
    await loadAdminWorkspace();
  } catch (error) {
    toast(error.message || "Could not update the order.");
    select.value = select.dataset.currentStatus;
  }
});

$("#seller-view").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select || select.value === select.dataset.currentStatus) return;
  const allowed = {
    new: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "out_for_delivery", "completed"], ready: ["out_for_delivery", "completed"],
    out_for_delivery: ["completed"]
  };
  if (!allowed[select.dataset.currentStatus]?.includes(select.value)) { toast("That order status change isn’t available."); select.value = select.dataset.currentStatus; return; }
  try {
    const { error } = await (await getSupabase()).from("orders").update({ status: select.value }).eq("id", select.dataset.orderStatus);
    if (error) throw error;
    toast("Order status updated."); await loadSellerWorkspace();
  } catch (error) { toast(error.message || "Could not update the order."); select.value = select.dataset.currentStatus; }
});

$("#search-input").addEventListener("input", (event) => { state.query = event.target.value.trim(); renderPlaces(); });
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#search-input").focus(); }
  if (event.key === "Escape") $("#search-input").blur();
});

let deferredInstallPrompt = null;
const installButton = $("#install-button");
const installDialog = $("#install-dialog");
const installSteps = $("#install-steps");

function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function showInstallInstructions() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) {
    installSteps.innerHTML = '<p><strong>On iPhone or iPad</strong></p><p>1. Open this page in <strong>Safari</strong>.</p><p>2. Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p><p>3. Turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</p>';
  } else if (/android/.test(userAgent)) {
    installSteps.innerHTML = '<p><strong>On Android</strong></p><p>In Chrome, tap the <strong>⋮ menu</strong>, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>';
  } else if (/macintosh|mac os x/.test(userAgent)) {
    installSteps.innerHTML = '<p><strong>On a Mac</strong></p><p>In Chrome or Edge, select the install icon in the address bar or open the browser menu and choose <strong>Install TradeBridge</strong>.</p><p>In Safari 17 or later, use <strong>File → Add to Dock</strong>.</p>';
  } else {
    installSteps.innerHTML = '<p><strong>On your computer</strong></p><p>In Chrome or Edge, select the install icon in the address bar or open the browser menu and choose <strong>Install TradeBridge</strong>.</p><p>The app will appear in your apps list and open in its own window.</p>';
  }
  installDialog.showModal();
}

if (isAppInstalled()) installButton.hidden = true;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    showInstallInstructions();
    return;
  }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (choice.outcome === "accepted") installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  toast("TradeBridge has been added to your apps.");
});

$("#install-done").addEventListener("click", () => installDialog.close());
installDialog.addEventListener("click", (event) => {
  if (event.target === installDialog) installDialog.close();
});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

renderPlaces();
renderHeroBanner();
updateAccountLabel();
initializeBackend();
