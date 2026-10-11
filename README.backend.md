# Kanlungan Coffee: Backend

A small, **dependency-free** backend (Node's built-in `http` + `node:sqlite`). Requires **Node >= 22.13** (your `.mise.toml` already pins Node 22).

## Run it

```bash
npm install

# Development: two terminals
npm run dev:server                      # API on http://localhost:3001
npm run dev                             # Vite on :5173, proxies /api -> :3001

# Production: one process serves the site and the API
npm run build
ADMIN_TOKEN=pick-a-long-random-string npm start
```

Data lives in `data/kanlungan.db` (SQLite, auto-created, git-ignored). Override with `DB_FILE` and `PORT`.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/menu` | Menu from the database |
| `POST /api/orders` | Place a pickup order. Returns an order code like `KC-7QX2` |
| `GET /api/orders/:code` | Customer looks up order status (phone number is not exposed) |
| `POST /api/messages` | Contact form |
| `GET /api/admin/orders[?status=]` | Staff: list orders with full details |
| `PATCH /api/admin/orders/:id` | Staff: `{"status":"preparing"}` (received, preparing, ready, completed, cancelled) |
| `GET /api/admin/messages`, `PATCH /api/admin/messages/:id` | Staff: read / mark handled `{"handled":true}` |
| `PATCH /api/admin/menu/:id` | Staff: `{"price":130,"available":false}` |

Admin routes need `Authorization: Bearer <ADMIN_TOKEN>`. If `ADMIN_TOKEN` is unset they are disabled.

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" "localhost:3001/api/admin/orders?status=received"
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
     -d '{"status":"ready"}' localhost:3001/api/admin/orders/1
```

## Design notes

- **The server owns the prices.** The browser only sends item ids and quantities. The server looks up prices, applies the 20% student discount to Food items, and computes the total, so the total can't be edited in DevTools.
- Validation: PH mobile numbers are normalized to `09XXXXXXXXX`, with quantity caps, length limits and a 32 KB body limit.
- Per-IP rate limits (in-memory, reset on restart).
- The menu lives in **one place**: `public/products.json`. The website fetches it, and the server reads the same file to seed the database. After the first run the database is the source of truth for prices (edit via the admin endpoint, or delete `data/` to reseed from the JSON).

## Limits / next steps

- No online payments (the site says "pay at the counter"), no accounts, no email/SMS notifications.
- Admin is one shared token and there is no staff dashboard UI yet.
- Rate limiting is per process; move it to a proxy or Redis if you run several servers.
