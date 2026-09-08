// app.js — talks to the backend at /api/*. No build step, no framework.
const API = ""; // same-origin; set e.g. "http://localhost:4000" if serving frontend separately

const grid = document.getElementById("product-grid");
const modeBanner = document.getElementById("mode-banner");
const cartDrawer = document.getElementById("cart-drawer");
const backdrop = document.getElementById("drawer-backdrop");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEl = document.getElementById("cart-count");
const checkoutModal = document.getElementById("checkout-modal");
const checkoutForm = document.getElementById("checkout-form");
const confirmModal = document.getElementById("confirm-modal");

const money = (n) => `$${Number(n).toFixed(2)}`;

// ---- Catalog -----------------------------------------------------------
async function loadProducts() {
  try {
    const res = await fetch(`${API}/api/products`);
    const data = await res.json();
    if (data.mockMode) {
      modeBanner.hidden = false;
      modeBanner.textContent =
        "Demo mode: showing sample products. Add a PRINTFUL_API_KEY in the backend .env to pull your real catalog.";
    }
    renderProducts(data.products || []);
  } catch (err) {
    grid.innerHTML = `<p class="loading">Could not reach the store backend. Is the server running?</p>`;
  }
}

function renderProducts(products) {
  if (!products.length) {
    grid.innerHTML = `<p class="loading">No products yet.</p>`;
    return;
  }
  grid.innerHTML = "";
  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const inStockVariants = product.variants.filter((v) => v.inStock);
    let selected = inStockVariants[0] || product.variants[0];

    card.innerHTML = `
      <img src="${product.thumbnail}" alt="${product.name}" loading="lazy" />
      <h3 class="product-name">${product.name}</h3>
      <div class="product-price" data-price>${selected ? money(selected.price) : "—"}</div>
      <div class="variant-row" data-variants></div>
      <button class="btn btn-primary" data-add ${selected ? "" : "disabled"}>Add to cart</button>
    `;

    const variantRow = card.querySelector("[data-variants]");
    product.variants.forEach((v) => {
      const btn = document.createElement("button");
      btn.className = "variant-btn";
      btn.type = "button";
      btn.textContent = v.size;
      btn.disabled = !v.inStock;
      btn.setAttribute("aria-pressed", v.variantId === selected?.variantId ? "true" : "false");
      btn.addEventListener("click", () => {
        selected = v;
        variantRow.querySelectorAll(".variant-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        card.querySelector("[data-price]").textContent = money(v.price);
      });
      variantRow.appendChild(btn);
    });

    card.querySelector("[data-add]").addEventListener("click", async () => {
      if (!selected) return;
      await addToCart({
        productId: product.id,
        variantId: selected.variantId,
        name: product.name,
        size: selected.size,
        price: selected.price,
        thumbnail: product.thumbnail,
        quantity: 1,
      });
      openCart();
    });

    grid.appendChild(card);
  });
}

// ---- Cart ----------------------------------------------------------------
async function addToCart(item) {
  const res = await fetch(`${API}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(item),
  });
  const data = await res.json();
  renderCart(data.items);
}

async function fetchCart() {
  const res = await fetch(`${API}/api/cart`, { credentials: "include" });
  const data = await res.json();
  renderCart(data.items);
}

async function setQuantity(variantId, quantity) {
  const res = await fetch(`${API}/api/cart/${variantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  renderCart(data.items);
}

async function removeFromCart(variantId) {
  const res = await fetch(`${API}/api/cart/${variantId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json();
  renderCart(data.items);
}

function renderCart(items) {
  cartCountEl.textContent = items.reduce((sum, i) => sum + i.quantity, 0);

  if (!items.length) {
    cartItemsEl.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    cartTotalEl.textContent = money(0);
    document.getElementById("checkout-open").disabled = true;
    return;
  }
  document.getElementById("checkout-open").disabled = false;

  cartItemsEl.innerHTML = "";
  let total = 0;
  items.forEach((item) => {
    total += item.price * item.quantity;
    const line = document.createElement("div");
    line.className = "cart-line";
    line.innerHTML = `
      <img src="${item.thumbnail}" alt="" />
      <div class="cart-line-info">
        <div class="cart-line-name">${item.name}</div>
        <div class="cart-line-meta">${item.size || ""} · ${money(item.price)}</div>
        <div class="qty-row">
          <button data-dec>−</button>
          <span>${item.quantity}</span>
          <button data-inc>+</button>
          <button class="remove-link" data-remove>Remove</button>
        </div>
      </div>
    `;
    line.querySelector("[data-dec]").addEventListener("click", () => setQuantity(item.variantId, item.quantity - 1));
    line.querySelector("[data-inc]").addEventListener("click", () => setQuantity(item.variantId, item.quantity + 1));
    line.querySelector("[data-remove]").addEventListener("click", () => removeFromCart(item.variantId));
    cartItemsEl.appendChild(line);
  });
  cartTotalEl.textContent = money(total);
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
}

document.getElementById("cart-toggle").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);

// ---- Checkout ------------------------------------------------------------
document.getElementById("checkout-open").addEventListener("click", () => {
  closeCart();
  checkoutModal.showModal();
});
document.getElementById("checkout-cancel").addEventListener("click", () => checkoutModal.close());

checkoutForm.addEventListener("submit", async (e) => {
  const formData = new FormData(checkoutForm);
  const payload = Object.fromEntries(formData.entries());

  const res = await fetch(`${API}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  checkoutModal.close();

  document.getElementById("confirm-text").textContent = res.ok
    ? `Thanks — order ${data.order.id} is in as a ${data.order.status}. Printful will handle printing and shipping.`
    : `Something went wrong: ${data.error || "please try again."}`;
  confirmModal.showModal();

  if (res.ok) {
    renderCart([]);
  }
});

document.getElementById("confirm-close").addEventListener("click", () => confirmModal.close());

// ---- Init ------------------------------------------------------------------
loadProducts();
fetchCart();
