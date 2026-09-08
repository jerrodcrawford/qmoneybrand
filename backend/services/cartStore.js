// services/cartStore.js
//
// Minimal in-memory cart storage, keyed by a cart id stored in a cookie.
// Good enough for a basic/demo store. For production, swap this Map for
// a real database (Redis, Postgres, etc.) so carts survive a server restart
// and work across multiple server instances.

const carts = new Map(); // cartId -> [{ productId, variantId, name, size, price, quantity, thumbnail }]

function getCart(cartId) {
  return carts.get(cartId) || [];
}

function saveCart(cartId, items) {
  carts.set(cartId, items);
}

function addItem(cartId, item) {
  const items = getCart(cartId);
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }
  saveCart(cartId, items);
  return items;
}

function removeItem(cartId, variantId) {
  const items = getCart(cartId).filter((i) => i.variantId !== variantId);
  saveCart(cartId, items);
  return items;
}

function updateQuantity(cartId, variantId, quantity) {
  const items = getCart(cartId);
  const item = items.find((i) => i.variantId === variantId);
  if (item) item.quantity = quantity;
  const filtered = items.filter((i) => i.quantity > 0);
  saveCart(cartId, filtered);
  return filtered;
}

function clearCart(cartId) {
  carts.set(cartId, []);
}

module.exports = { getCart, saveCart, addItem, removeItem, updateQuantity, clearCart };
