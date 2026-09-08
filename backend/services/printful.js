// services/printful.js
//
// Thin wrapper around the Printful API (https://developers.printful.com).
// Two responsibilities:
//   1. List the products/variants you've synced in your Printful store.
//   2. Submit an order so Printful prints, packs, and ships it to the customer.
//
// If no PRINTFUL_API_KEY is set, every function falls back to MOCK DATA so the
// site is runnable and demoable with zero external accounts. Swap in a real
// key and everything below starts talking to the live API automatically.

const API_BASE = "https://api.printful.com";

const isMockMode = () => !process.env.PRINTFUL_API_KEY;

function authHeaders() {
  const headers = {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    "Content-Type": "application/json",
  };
  // Only needed if your Printful account has multiple stores.
  if (process.env.PRINTFUL_STORE_ID) {
    headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
  }
  return headers;
}

// ---- Mock catalog -----------------------------------------------------
// Shaped to look like what /store/products + /store/products/{id} return,
// flattened into what the frontend actually needs.
const MOCK_PRODUCTS = [
  {
    id: "mock-1",
    name: "Field Notes Tee",
    thumbnail: "https://picsum.photos/seed/tee1/600/600",
    variants: [
      { variantId: "mock-1-s", size: "S", price: "24.00", inStock: true },
      { variantId: "mock-1-m", size: "M", price: "24.00", inStock: true },
      { variantId: "mock-1-l", size: "L", price: "24.00", inStock: true },
      { variantId: "mock-1-xl", size: "XL", price: "26.00", inStock: true },
    ],
  },
  {
    id: "mock-2",
    name: "Trail Map Poster",
    thumbnail: "https://picsum.photos/seed/poster2/600/600",
    variants: [
      { variantId: "mock-2-12x16", size: '12"x16"', price: "18.00", inStock: true },
      { variantId: "mock-2-18x24", size: '18"x24"', price: "28.00", inStock: true },
    ],
  },
  {
    id: "mock-3",
    name: "Ridge Line Mug",
    thumbnail: "https://picsum.photos/seed/mug3/600/600",
    variants: [
      { variantId: "mock-3-11oz", size: "11oz", price: "16.00", inStock: true },
      { variantId: "mock-3-15oz", size: "15oz", price: "18.00", inStock: false },
    ],
  },
];

// ---- Public API ---------------------------------------------------------

/**
 * Returns the store's sellable products, normalized to:
 * { id, name, thumbnail, variants: [{ variantId, size, price, inStock }] }
 */
async function listProducts() {
  if (isMockMode()) return MOCK_PRODUCTS;

  // 1. Get the list of synced products.
  const listRes = await fetch(`${API_BASE}/store/products`, {
    headers: authHeaders(),
  });
  if (!listRes.ok) {
    throw new Error(`Printful list products failed: ${listRes.status}`);
  }
  const { result: products } = await listRes.json();

  // 2. Fetch each product's variants/pricing in parallel.
  const detailed = await Promise.all(
    products.map(async (p) => {
      const detailRes = await fetch(`${API_BASE}/store/products/${p.id}`, {
        headers: authHeaders(),
      });
      if (!detailRes.ok) return null;
      const { result } = await detailRes.json();
      return {
        id: String(result.sync_product.id),
        name: result.sync_product.name,
        thumbnail: result.sync_product.thumbnail_url,
        variants: result.sync_variants.map((v) => ({
          variantId: String(v.id),
          size: v.size || v.name,
          price: v.retail_price,
          inStock: v.availability_status === "active",
        })),
      };
    })
  );

  return detailed.filter(Boolean);
}

/**
 * Creates an order in Printful for the given cart + shipping address.
 * items: [{ variantId, quantity }]
 * recipient: { name, address1, city, state_code, country_code, zip, email }
 *
 * confirm=false (default) creates a DRAFT you can review in the Printful
 * dashboard before it goes to print. confirm=true submits it straight to
 * production — only do that once real payment has been captured.
 */
async function createOrder({ recipient, items, confirm = false }) {
  if (isMockMode()) {
    return {
      id: `mock-order-${Date.now()}`,
      status: confirm ? "submitted (mock)" : "draft (mock)",
      recipient,
      items,
      note: "PRINTFUL_API_KEY not set — this order was not actually sent to Printful.",
    };
  }

  const body = {
    recipient,
    items: items.map((i) => ({
      sync_variant_id: Number(i.variantId),
      quantity: i.quantity,
    })),
    confirm, // false = draft order, true = send straight to fulfillment
  };

  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Printful create order failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

module.exports = { listProducts, createOrder, isMockMode };
