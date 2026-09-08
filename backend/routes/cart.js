// routes/cart.js
const express = require("express");
const router = express.Router();
const cartStore = require("../services/cartStore");

// Every request gets/keeps a cart_id cookie so the server knows whose cart it is.
router.use((req, res, next) => {
  let cartId = req.cookies.cart_id;
  if (!cartId) {
    cartId = require("uuid").v4();
    res.cookie("cart_id", cartId, { httpOnly: true, sameSite: "lax" });
  }
  req.cartId = cartId;
  next();
});

// GET /api/cart — current cart contents
router.get("/", (req, res) => {
  res.json({ items: cartStore.getCart(req.cartId) });
});

// POST /api/cart — add an item { productId, variantId, name, size, price, thumbnail, quantity }
router.post("/", (req, res) => {
  const { productId, variantId, name, size, price, thumbnail, quantity = 1 } = req.body;
  if (!variantId || !name || !price) {
    return res.status(400).json({ error: "variantId, name, and price are required." });
  }
  const items = cartStore.addItem(req.cartId, {
    productId,
    variantId,
    name,
    size,
    price,
    thumbnail,
    quantity: Number(quantity),
  });
  res.json({ items });
});

// PATCH /api/cart/:variantId — update quantity { quantity }
router.patch("/:variantId", (req, res) => {
  const { quantity } = req.body;
  const items = cartStore.updateQuantity(req.cartId, req.params.variantId, Number(quantity));
  res.json({ items });
});

// DELETE /api/cart/:variantId — remove a line item
router.delete("/:variantId", (req, res) => {
  const items = cartStore.removeItem(req.cartId, req.params.variantId);
  res.json({ items });
});

module.exports = router;
