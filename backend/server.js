// server.js — entry point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const productsRoute = require("./routes/products");
const cartRoute = require("./routes/cart");
const ordersRoute = require("./routes/orders");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve the static frontend (so you can run one server for the whole demo).
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api/products", productsRoute);
app.use("/api/cart", cartRoute);
app.use("/api", ordersRoute); // exposes POST /api/checkout

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`POD store backend running at http://localhost:${PORT}`);
  console.log(
    process.env.PRINTFUL_API_KEY
      ? "Printful API key detected — using live catalog."
      : "No PRINTFUL_API_KEY set — serving mock demo products."
  );
});
