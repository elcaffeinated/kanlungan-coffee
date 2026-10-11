# Kanlungan Coffee Co.

Vite + React + Tailwind marketing site for a student-friendly café.

## Data integration (Part IV)

The site demonstrates **GET** requests for two datasets, both fetched on page load and displayed:

| Dataset | File | Shown in |
|---|---|---|
| 1. Products | `public/products.json` | Menu section (name, category, price, description, availability, order button) |
| 2. Customer information | `public/customers.json` | "Kanlungan regulars" section (name, role, member since, visits/week, usual order, rating, quote) |

Fetching is in `src/api.ts`. The customers in `customers.json` are fictional sample data.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Forms

Copy `.env.example` to `.env` and set `VITE_FORMSPREE_ID` (free account at formspree.io). The contact form and pickup orders are then emailed to you. Without it, the forms run in **demo mode** (success screen, nothing sent).

## Hosting

The default build is fully static, so it works on GitHub Pages, Netlify, or Vercel.
For GitHub Pages under `https://user.github.io/repo/`, set `base: '/repo/'` in `vite.config.ts`.

## Optional Node backend

`server/` is an optional Express-free Node + SQLite API (orders, messages, admin). It reads the same `public/products.json`.
Set `VITE_USE_BACKEND=true` to use it. See `README.backend.md`.
