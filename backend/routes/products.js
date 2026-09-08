// routes/products.js
const express = require("express");
const router = express.Router();
const printful = require("../services/printful");

// GET /api/products — list every product available to sell
router.get("/", async (req, res) => {
  try {
    const products = await printful.listProducts();
    res.json({ products, mockMode: printful.isMockMode() });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not load products from Printful." });
  }
});

module.exports = router;
