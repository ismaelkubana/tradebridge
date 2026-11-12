const places = [
  { name: "Kigali Fresh Market", type: "Shops", tag: "Groceries · Fresh daily", rating: "4.9", distance: "0.8 km", time: "15–25 min", price: "From RWF 2,500", tone: "market", icon: "🥑", badge: "Popular" },
  { name: "Umurava Kitchen", type: "Restaurants", tag: "Rwandan · Grill", rating: "4.8", distance: "1.2 km", time: "25–35 min", price: "From RWF 4,000", tone: "kitchen", icon: "🍲", badge: "Free delivery" },
  { name: "Atelier Hair Studio", type: "Salons", tag: "Hair · Beauty", rating: "5.0", distance: "2.1 km", time: "Book a slot", price: "Services from RWF 8,000", tone: "salon", icon: "✂️", badge: "Open today" },
  { name: "Makuza Home & Living", type: "Shops", tag: "Home · Lifestyle", rating: "4.7", distance: "1.6 km", time: "Same-day delivery", price: "From RWF 6,000", tone: "home", icon: "🪴", badge: "Verified" },
  { name: "Inzora Coffee House", type: "Restaurants", tag: "Coffee · Bakery", rating: "4.9", distance: "0.5 km", time: "10–20 min", price: "From RWF 1,500", tone: "coffee", icon: "☕", badge: "Nearby" },
  { name: "The Curl Corner", type: "Salons", tag: "Natural hair · Nails", rating: "4.8", distance: "3.0 km", time: "Book a slot", price: "Services from RWF 5,000", tone: "curl", icon: "💇🏽‍♀️", badge: "Top rated" },
];

const state = { role: "buyer", category: "All", query: "", saved: new Set(), sellerTab: "Overview", adminTab: "Overview", session: null, profile: null, liveListings: null, businesses: [], selectedListing: null, authMode: "signin" };
let editingListingId = null;
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
    .select("id,shop_id,title,description,price_rwf,stock,duration_min,active,shops!inner(name,type,district,address,phone,status,payment_methods,payment_instructions)")
    .eq("active", true).eq("shops.status", "approved").order("created_at", { ascending: false });
  if (error) throw error;
  const categoryNames = { shop: "Shops", restaurant: "Restaurants", salon: "Salons" };
  const icons = { shop: "🛍️", restaurant: "🍲", salon: "✂️" };
  state.liveListings = data.map((listing, index) => ({
    id: listing.id, shopId: listing.shop_id, name: listing.title,
    type: categoryNames[listing.shops.type] || "Shops",
    tag: `${listing.shops.name} · ${listing.duration_min ? `${listing.duration_min} min service` : "Local listing"}`,
    rating: "New", distance: listing.shops.district || "Kigali", time: listing.shops.type === "salon" ? "Book a slot" : "Pickup",
    price: `RWF ${Number(listing.price_rwf).toLocaleString()}`,
    priceValue: Number(listing.price_rwf), tone: ["market", "kitchen", "salon", "home", "coffee", "curl"][index % 6], icon: icons[listing.shops.type] || "🛍️", badge: listing.stock === 0 ? "Out of stock" : "Local",
    description: listing.description, shop: listing.shops, fulfillment: listing.shops.type === "salon" ? "booking" : "pickup"
  }));
  renderPlaces();
  const notice = $(".preview-notice", $("#buyer-view"));
  if (notice) notice.innerHTML = state.liveListings.length
    ? '<span>✳</span><span><strong>Live marketplace</strong> — These listings are published by TradeBridge businesses.</span>'
    : '<span>✳</span><span><strong>No verified listings yet</strong> — Sample places are shown while sellers add their businesses.</span>';
}

async function initializeBackend() {
  try {
    const client = await getSupabase();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    state.session = session;
    client.auth.onAuthStateChange((_event, nextSession) => {
      state.session = nextSession;
      queueMicrotask(async () => {
        const results = await Promise.allSettled([loadProfile(), refreshListings()]);
        results.filter((result) => result.status === "rejected").forEach((result) => { console.error(result.reason); toast(result.reason?.message || "Could not refresh TradeBridge data."); });
      });
    });
    const initialResults = await Promise.allSettled([loadProfile(), refreshListings()]);
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
        client.from("listings").select("id,shop_id,title,description,price_rwf,stock,duration_min,active,created_at").in("shop_id", ids).order("created_at", { ascending: false }),
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
    const [{ data: orders, error: orderError }, { data: customers, error: customerError }, { data: payments, error: paymentError }] = await Promise.all([
      client.from("orders").select("id,status,total_rwf,created_at,shops(name)").order("created_at", { ascending: false }).limit(100),
      client.from("profiles").select("id,full_name,phone,role,created_at").order("created_at", { ascending: false }).limit(100),
      client.from("order_payments").select("id,order_id,amount_rwf,method,status,transaction_reference,created_at,shops(name)").order("created_at", { ascending: false }).limit(100)
    ]);
    if (orderError) throw orderError;
    if (customerError) throw customerError;
    if (paymentError) throw paymentError;
    state.adminOrders = orders;
    state.adminCustomers = customers;
    state.adminPayments = payments;
    setRole("admin");
  } catch (error) { toast(error.message || "Could not load the admin portal."); }
}

async function openListingForm() {
  if (!requireAccount()) return;
  if (state.profile?.role !== "seller") { toast("A seller account is required to add a listing."); return; }
  try {
    const client = await getSupabase();
    const { data, error } = await client.from("shops").select("id,name,status").eq("owner_id", state.session.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    const select = $("#listing-form").elements.shop_id;
    select.innerHTML = data.map((shop) => `<option value="${escapeHtml(shop.id)}">${escapeHtml(shop.name)}${shop.status !== "approved" ? " (pending approval)" : ""}</option>`).join("");
    if (!data.length) { toast("Add your business first."); $("#business-dialog").showModal(); return; }
    if (!editingListingId) { $("#listing-form").reset(); $("#listing-title").textContent = "Add a listing"; $("#listing-form").querySelector("button[type=submit]").textContent = "Save listing"; }
    $("#listing-dialog").showModal();
  } catch (error) { toast(error.message || "Could not load your businesses."); }
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
    const matchesQuery = `${place.name} ${place.type} ${place.tag}`.toLowerCase().includes(state.query.toLowerCase());
    return matchesCategory && matchesQuery;
  });
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><span>⌕</span><strong>No places found</strong><p>Try a different search or category.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map((place) => {
    const savedKey = place.id || place.name;
    const saved = state.saved.has(savedKey);
    return `<article class="listing-card">
      <div class="listing-visual ${escapeHtml(place.tone)}"><span class="listing-emoji">${escapeHtml(place.icon)}</span><span class="listing-badge"><span>✦</span> ${escapeHtml(place.badge)}</span><button aria-label="${saved ? "Remove" : "Save"} ${escapeHtml(place.name)}" class="save-button ${saved ? "saved" : ""}" data-save="${escapeHtml(savedKey)}" ${place.id ? `data-listing-id="${escapeHtml(place.id)}"` : ""}>${saved ? "♥" : "♡"}</button><span class="visual-deco">✳</span></div>
      <div class="listing-info"><div class="listing-title-row"><h3>${escapeHtml(place.name)}</h3><span class="rating">${place.id ? "New" : `★ ${escapeHtml(place.rating)}`}</span></div><p>${escapeHtml(place.tag)}</p><div class="listing-meta"><span>⌖ ${escapeHtml(place.distance)}</span><span>·</span><span>${escapeHtml(place.time)}</span></div><div class="listing-bottom"><span>${escapeHtml(place.price)}</span><button aria-label="${place.id ? "Order" : "View"} ${escapeHtml(place.name)}" data-view="${escapeHtml(place.name)}" ${place.id ? `data-listing-id="${escapeHtml(place.id)}"` : ""}>${place.id ? "Order" : "↗"}</button></div></div>
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
    body = listings.length ? `<section class="backend-list">${listings.map((item) => `<article class="backend-list-item"><div><strong>${escapeHtml(item.title)}</strong><small>RWF ${Number(item.price_rwf).toLocaleString()} · ${item.stock === null ? "Stock not tracked" : `${item.stock} in stock`}</small></div><span class="order-pill">${item.active ? "Visible" : "Hidden"}</span><button class="row-action" data-edit-listing="${escapeHtml(item.id)}">Edit</button><button class="row-action" data-toggle-listing="${escapeHtml(item.id)}" data-active="${item.active}">${item.active ? "Hide" : "Publish"}</button></article>`).join("")}</section>` : '<p class="empty-backend">No listings yet. Add your first product, menu item, or service.</p>';
  } else if (state.sellerTab === "Orders") {
    body = orders.length ? `<section class="backend-list">${orders.map((order) => `<article class="backend-list-item"><div><strong>Order ${escapeHtml(order.id.slice(0, 8))} · ${escapeHtml(order.shops?.name || "Business")}</strong><small>${(order.order_items || []).map((item) => `${escapeHtml(item.title)} × ${item.qty}`).join(", ")} · ${escapeHtml(order.fulfillment)}</small><small>RWF ${Number(order.total_rwf).toLocaleString()} · ${new Date(order.created_at).toLocaleString()}</small><small>Payment: ${escapeHtml(order.order_payments?.[0]?.status || "Pending")}</small></div><label class="order-status-control"><span>${escapeHtml(order.status.replaceAll("_", " "))}</span><select aria-label="Update order status" data-order-status="${escapeHtml(order.id)}" data-current-status="${escapeHtml(order.status)}">${["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"].map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status.replaceAll("_", " ")}</option>`).join("")}</select></label></article>`).join("")}</section>` : '<p class="empty-backend">Customer orders will appear here.</p>';
  } else body = state.sellerCustomers?.length ? `<section class="backend-list">${state.sellerCustomers.map((customer) => { const customerOrders = orders.filter((order) => order.buyer_id === customer.id); return `<article class="backend-list-item"><div><strong>${escapeHtml(customer.full_name || "TradeBridge customer")}</strong><small>${escapeHtml(customer.phone || "No phone provided")}</small><small>${customerOrders.length} order${customerOrders.length === 1 ? "" : "s"} · RWF ${customerOrders.reduce((sum, order) => sum + Number(order.total_rwf || 0), 0).toLocaleString()} total</small></div>${customer.phone ? `<a class="row-action" href="tel:${escapeHtml(customer.phone)}">Call customer</a>` : ""}</article>`; }).join("")}</section>` : '<p class="empty-backend">Customer names and contact details appear here after your first order.</p>';
  view.innerHTML = `<section class="portal-heading"><div><div class="eyebrow"><span class="live-dot"></span> SELLER STUDIO</div><h1>Your business workspace</h1><p class="intro">Manage your businesses, listings, and customer orders.</p></div><button class="primary-button" data-action="add-business">＋ Add a business</button></section><div class="portal-tabs">${tabButtons}</div>${body}<footer class="footer"><span>© 2026 TradeBridge</span><span>Seller studio · Kigali</span><div><a href="#help" data-action="help">Help</a><a href="#terms" data-action="terms">Terms</a></div></footer>`;
}

function renderAdmin() {
  const tabs = ["Overview", "Businesses", "Orders", "Payments", "Customers", "Reports"];
  const view = $("#admin-view");
  const tabButtons = tabs.map((tab) => `<button class="portal-tab ${state.adminTab === tab ? "active" : ""}" data-admin-tab="${tab}">${tab}${tab === "Businesses" ? `<span class="count-pill alert-count">${(state.adminBusinesses || []).filter((shop) => shop.status === "pending").length}</span>` : ""}</button>`).join("");
  const businesses = state.adminBusinesses || [];
  const body = state.adminTab === "Overview" || state.adminTab === "Businesses"
    ? `<div class="admin-metrics">${metric("Businesses", businesses.length, "Live", "registered marketplace vendors", "▦")}${metric("Pending approval", businesses.filter((shop) => shop.status === "pending").length, "Review", "business applications", "◷")}${metric("Orders", (state.adminOrders || []).length, "Live", "tracked customer orders", "▤")}${metric("Marketplace volume", `RWF ${(state.adminOrders || []).reduce((total, order) => total + Number(order.total_rwf || 0), 0).toLocaleString()}`, "Live", "orders recorded", "↗")}</div><section class="panel admin-business-panel"><div class="panel-heading"><div><h3>${state.adminTab === "Businesses" ? "All businesses" : "Business applications"}</h3><p>Approve or suspend marketplace vendors.</p></div></div><div class="backend-list">${businesses.length ? businesses.map((shop) => `<article class="backend-list-item"><div><strong>${escapeHtml(shop.name)}</strong><small>${escapeHtml(shop.type)} · ${escapeHtml(shop.district)} · ${escapeHtml(shop.profiles?.full_name || "Seller")}</small></div><span class="order-pill">${escapeHtml(shop.status)}</span><span>${shop.status === "pending" ? `<button class="review-button" data-shop-review="${escapeHtml(shop.id)}" data-next-status="approved">Approve</button>` : shop.status === "approved" ? `<button class="row-action" data-shop-review="${escapeHtml(shop.id)}" data-next-status="suspended">Suspend</button>` : `<button class="review-button" data-shop-review="${escapeHtml(shop.id)}" data-next-status="approved">Reinstate</button>`}</span></article>`).join("") : '<p class="empty-backend">No business applications yet.</p>'}</div></section>`
    : state.adminTab === "Orders" ? `<section class="backend-list">${(state.adminOrders || []).map((order) => `<article class="backend-list-item"><div><strong>${escapeHtml(order.shops?.name || "Business")} · ${escapeHtml(order.id.slice(0, 8))}</strong><small>${escapeHtml(order.status)} · ${new Date(order.created_at).toLocaleString()}</small></div><b>RWF ${Number(order.total_rwf).toLocaleString()}</b></article>`).join("") || '<p class="empty-backend">No orders yet.</p>'}</section>`
    : state.adminTab === "Payments" ? `<section class="backend-list">${(state.adminPayments || []).map((payment) => `<article class="backend-list-item"><div><strong>${escapeHtml(payment.shops?.name || "Seller")} · RWF ${Number(payment.amount_rwf).toLocaleString()}</strong><small>${escapeHtml(payment.method.replaceAll("_", " "))} · Order ${escapeHtml(payment.order_id.slice(0, 8))}</small><small>Reference: ${escapeHtml(payment.transaction_reference || "Not supplied")}</small></div><span class="order-pill">${escapeHtml(payment.status)}</span>${payment.status === "pending" ? `<button class="review-button" data-payment-id="${escapeHtml(payment.id)}" data-payment-review="paid">Confirm</button><button class="row-action" data-payment-id="${escapeHtml(payment.id)}" data-payment-review="rejected">Reject</button>` : ""}</article>`).join("") || '<p class="empty-backend">No payment records yet.</p>'}</section>`
    : state.adminTab === "Customers" ? `<section class="backend-list">${(state.adminCustomers || []).map((customer) => `<article class="backend-list-item"><div><strong>${escapeHtml(customer.full_name || "TradeBridge member")}</strong><small>${escapeHtml(customer.phone || "No phone added")}</small></div><span class="order-pill">${escapeHtml(customer.role)}</span><small>${new Date(customer.created_at).toLocaleDateString()}</small></article>`).join("") || '<p class="empty-backend">No accounts yet.</p>'}</section>`
    : `<div class="admin-metrics">${metric("Completed orders", (state.adminOrders || []).filter((order) => order.status === "completed").length, "All time", "marked complete", "✓")}${metric("Open orders", (state.adminOrders || []).filter((order) => !["completed", "cancelled"].includes(order.status)).length, "Now", "need fulfillment", "◷")}${metric("Paid records", (state.adminPayments || []).filter((payment) => payment.status === "paid").length, "Verified", "seller payments", "▤")}${metric("Pending payments", (state.adminPayments || []).filter((payment) => payment.status === "pending").length, "Review", "awaiting confirmation", "↗", true)}</div><section class="panel"><div class="panel-heading"><div><h3>Marketplace activity</h3><p>Orders placed in the last seven days · from the latest 100 records.</p></div><button class="outline-button" data-action="export">Download CSV</button></div><div class="backend-list">${Array.from({length: 7}, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i)); const dayOrders = (state.adminOrders || []).filter((o) => new Date(o.created_at).toDateString() === d.toDateString()); return `<article class="backend-list-item"><div><strong>${d.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}</strong><small>${dayOrders.length} order${dayOrders.length === 1 ? "" : "s"}</small></div><b>RWF ${dayOrders.reduce((sum,o) => sum + Number(o.total_rwf || 0), 0).toLocaleString()}</b></article>`; }).join("")}</div></section>`;
  view.innerHTML = `<section class="portal-heading"><div><div class="eyebrow"><span class="live-dot"></span> ADMIN CONSOLE</div><h1>Marketplace management</h1><p class="intro">Review businesses and monitor orders.</p></div></section><div class="portal-tabs">${tabButtons}</div>${body}<footer class="footer"><span>© 2026 TradeBridge</span><span>Admin console · Kigali</span></footer>`;
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
  const button = event.target.closest("button, a");
  if (!button) return;
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
    $("#checkout-item").textContent = `${state.selectedListing.name} · RWF ${state.selectedListing.priceValue.toLocaleString()} from ${state.selectedListing.shop.name}`;
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
    (async () => { await openListingForm(); editingListingId = item.id; const form = $("#listing-form"); form.elements.shop_id.value = item.shop_id; form.elements.title.value = item.title; form.elements.description.value = item.description || ""; form.elements.price_rwf.value = item.price_rwf; form.elements.stock.value = item.stock ?? ""; form.elements.duration_min.value = item.duration_min ?? ""; $("#listing-title").textContent = "Edit listing"; form.querySelector("button[type=submit]").textContent = "Save changes"; })();
    return;
  }
  if (button.dataset.sellerTab) { state.sellerTab = button.dataset.sellerTab; renderSeller(); return; }
  if (button.dataset.adminTab) { state.adminTab = button.dataset.adminTab; renderAdmin(); return; }
  if (button.dataset.review) { toast(`Opening ${button.dataset.review} application for review.`); return; }

  const action = button.dataset.action;
  const messages = {
    location: "Location settings will be available in a later step.", saved: "", orders: "", messages: "", help: "Help center coming soon.", profile: "", notifications: "You’re all caught up.",
    "edit-business": "Business profile editing will be added in a later step.", "add-listing": "", "add-business": "", inventory: "Inventory management will be added in a later step.", promotion: "Promotion tools coming soon.",
    "seller-next": "This seller workspace will be connected in a later step.", "admin-next": "Admin management will be connected in a later step.", export: "Report export coming soon.", insights: "Marketplace insights coming soon.",
    about: "TradeBridge connects customers with trusted local businesses.", privacy: "Privacy information will be added before launch.", terms: "Terms will be added before launch.", security: "Security tools coming soon.", "all-listings": "You’re seeing all available demo places."
  };
  if (action === "explore") { $("#discover").scrollIntoView({ behavior: "smooth" }); return; }
  if (action === "orders") { showBuyerOrders(); return; }
  if (action === "saved") { showSavedPlaces(); return; }
  if (action === "messages") { showBuyerMessages(); return; }
  if (action === "export") {
    const csv = [["Order ID", "Business", "Status", "Total RWF", "Created"], ...(state.adminOrders || []).map((order) => [order.id, order.shops?.name || "", order.status, order.total_rwf, order.created_at])].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "tradebridge-orders.csv"; link.click(); URL.revokeObjectURL(link.href); return;
  }
  if (action === "profile") {
    if (!state.session?.user) openAuth();
    else (async () => { const { error } = await (await getSupabase()).auth.signOut(); if (error) toast(error.message); else { state.session = null; state.profile = null; updateAccountLabel(); setRole("buyer"); toast("You have signed out."); } })();
    return;
  }
  if (action === "add-business") { if (requireAccount() && state.profile?.role === "seller") $("#business-dialog").showModal(); else if (state.profile?.role !== "seller") toast("Choose a seller account when creating your account."); return; }
  if (action === "add-listing") { openListingForm(); return; }
  if (action) toast(messages[action] || "This feature will be added in a later step.");
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

$("#listing-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAccount()) return;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  try {
    const client = await getSupabase();
    const listingValues = {
      shop_id: values.shop_id, title: values.title.trim(), description: (values.description || "").trim(),
      price_rwf: Number(values.price_rwf), stock: values.stock === "" ? null : Number(values.stock),
      duration_min: values.duration_min === "" ? null : Number(values.duration_min)
    };
    const result = editingListingId
      ? await client.from("listings").update(listingValues).eq("id", editingListingId)
      : await client.from("listings").insert(listingValues);
    const { error } = result;
    if (error) throw error;
    $("#listing-dialog").close(); form.reset();
    const wasEditing = Boolean(editingListingId); editingListingId = null;
    toast(wasEditing ? "Listing changes saved." : "Listing saved. It will be visible after its business is approved."); await loadSellerWorkspace(); await refreshListings();
  } catch (error) { toast(error.message || "Could not save the listing."); }
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
  try {
    const client = await getSupabase();
    const { data: orderId, error } = await client.rpc("place_marketplace_order", {
      p_shop_id: state.selectedListing.shopId,
      p_fulfillment: values.fulfillment,
      p_address: values.delivery_address || "",
      p_contact_phone: values.contact_phone,
      p_note: values.note || "",
      p_scheduled_at: values.scheduled_at ? new Date(values.scheduled_at).toISOString() : null,
      p_items: [{ listingId: state.selectedListing.id, qty: 1 }]
    });
    if (error) throw error;
    let paymentError = null;
    if (state.selectedListing.priceValue > 0) {
      const result = await client.from("order_payments").insert({
        order_id: orderId, buyer_id: state.session.user.id, shop_id: state.selectedListing.shopId,
        amount_rwf: state.selectedListing.priceValue, method: values.payment_method,
        transaction_reference: values.transaction_reference || null
      });
      paymentError = result.error;
    }
    $("#checkout-dialog").close(); form.reset();
    toast(paymentError ? `Order placed (${String(orderId).slice(0, 8)}); payment record needs attention.` : `Order placed (${String(orderId).slice(0, 8)}). Follow the seller’s payment instructions.`);
    await refreshListings();
  } catch (error) { toast(error.message || "Could not place the order."); }
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
updateAccountLabel();
initializeBackend();
