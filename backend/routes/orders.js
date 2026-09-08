// routes/orders.js
const express = require("express");
const router = express.Router();
const cartStore = require("../services/cartStore");
const printful = require("../services/printful");

// POST /api/checkout
// body: { name, email, address1, city, state_code, country_code, zip }
//
// NOTE ON PAYMENT: this basic demo does not process a real charge — it
// treats "checkout" as the customer confirming their order. In a real
// store, you'd capture payment first (e.g. Stripe PaymentIntent), and only
// call printful.createOrder(...) with confirm:true after the charge
// succeeds. Where that goes is marked below.
router.post("/checkout", async (req, res) => {
  const cartId = req.cookies.cart_id;
  const items = cartStore.getCart(cartId);

  if (!items.length) {
    return res.status(400).json({ error: "Cart is empty." });
  }

  const { name, email, address1, city, state_code, country_code, zip } = req.body;
  if (!name || !email || !address1 || !city || !country_code || !zip) {
    return res.status(400).json({ error: "Missing required shipping fields." });
  }

  // --- Payment would happen here in a real store -------------------------
  // const paymentIntent = await stripe.paymentIntents.create({ ... });
  // if (paymentIntent.status !== "succeeded") return res.status(402).json({ error: "Payment failed" });
  // -------------------------------------------------------------------------

  try {
    const order = await printful.createOrder({
      recipient: { name, email, address1, city, state_code, country_code, zip },
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      confirm: process.env.ORDER_MODE === "confirm", // draft by default — see .env.example
    });

    cartStore.clearCart(cartId);
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not submit order to Printful." });
  }
});

module.exports = router;
