[README.md](https://github.com/user-attachments/files/31933690/README.md)
# Ridge & Run — Basic Print-on-Demand Store

A minimal but complete e-commerce site: product catalog, cart, and checkout,
wired up to **Printful** for print-on-demand fulfillment. No frameworks or
build step on the frontend — plain HTML/CSS/JS talking to a small Node/Express
API. Runs out of the box in **mock mode** with sample products, so you can see
it working before connecting a real Printful account.

## How the POD integration works

1. You design products and create them in your **Printful** dashboard (or any
   POD provider — see "swapping providers" below), which gives you a live
   catalog with variants (sizes, colors) and retail prices.
2. This backend calls Printful's API to **list those products** (`GET /store/products`)
   and show them on your site.
3. When a customer checks out, the backend calls Printful's **create order**
   API (`POST /orders`). Printful then prints, packs, and ships the item
   directly to the customer — you never touch inventory.
4. Orders are created as **drafts** by default (`ORDER_MODE=draft`) so you can
   review them in the Printful dashboard before they go to production. Set
   `ORDER_MODE=confirm` once you're ready to auto-submit orders (only do this
   after you've added real payment capture — see below).

## Project structure

```
pod-store/
├── backend/
│   ├── server.js            # Express app entry point
│   ├── routes/
│   │   ├── products.js      # GET /api/products
│   │   ├── cart.js          # GET/POST/PATCH/DELETE /api/cart
│   │   └── orders.js        # POST /api/checkout
│   ├── services/
│   │   ├── printful.js      # Printful API calls + mock-mode fallback
│   │   └── cartStore.js     # in-memory cart, keyed by a cookie
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Running it

Requires Node 18+ (for built-in `fetch`).

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Then open **http://localhost:4000** — the backend also serves the frontend
directly, so one server is all you need for local dev.

Without any `.env` changes it runs in **mock mode**: three sample products,
fake images, and a checkout that logs a mock order instead of calling
Printful. This is the fastest way to see the whole flow working.

## Connecting a real Printful store

1. Create a free [Printful](https://www.printful.com) account and sync at
   least one product to your store.
2. In Printful, go to **Settings → Stores → API** and generate an API key.
3. In `backend/.env`, set:
   ```
   PRINTFUL_API_KEY=your_real_key
   ```
4. Restart the server. The console will confirm it's using the live catalog,
   and `/api/products` will return your real synced products and prices.

## Adding real payments

This demo intentionally does **not** charge a card — checkout just collects
a shipping address and creates a draft Printful order, so you can wire up
whichever payment processor you prefer. The spot to add it is marked clearly
in `backend/routes/orders.js`:

```js
// const paymentIntent = await stripe.paymentIntents.create({ ... });
// if (paymentIntent.status !== "succeeded") return res.status(402).json({ error: "Payment failed" });
```

Typical flow for a production build:
1. Frontend collects card details via Stripe Elements (or your processor's
   equivalent) and gets a payment method/token.
2. Backend creates and confirms a PaymentIntent for the cart total.
3. Only once payment succeeds does the backend call
   `printful.createOrder({ ..., confirm: true })`.

## Swapping in a different POD provider

Printful was picked because it has the most common/well-documented API, but
the integration is isolated in `backend/services/printful.js` — it exposes
just two functions, `listProducts()` and `createOrder()`. To use Printify,
Gooten, or another provider, write a new service file with the same two
function signatures and swap the `require("./services/printful")` calls in
`routes/products.js` and `routes/orders.js`.

## Limitations (this is a *basic* starting point)

- Cart storage is in-memory (a JS `Map`) — it resets if the server restarts
  and won't work across multiple server instances. Swap in Redis/Postgres for
  production.
- No payment processing is wired in (see above).
- No user accounts/login — carts are anonymous, tracked by a cookie.
- No automated tests.

These are the natural next steps once the basic flow above is working end to
end.
