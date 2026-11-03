# Kalpana Jagtap - website

A website for the artist Kalpana Jagtap: a public gallery of paintings, a poetry journal (English and Marathi), a guest checkout that records orders, contact / custom-art / newsletter forms, and a private admin panel where the owner manages everything without touching code.

This repository has two apps:

| Folder | What it is |
|---|---|
| `Frontend/` | React 19 + Vite 8 + Tailwind 4 single-page app (public site, plus the admin panel under `/admin`) |
| `Backend/` | Express 5 + Mongoose 9 API on MongoDB (orders, enquiries, catalogue, site text, settings, image uploads, admin login) |

Other documents:

* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - how to host it (for the developer / owner who runs the server).
* [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) - plain-language guide for Kalpana (for day-to-day use of the admin panel).
* [`Backend/README.md`](Backend/README.md) and [`Backend/docs/ADMIN_API.md`](Backend/docs/ADMIN_API.md) - backend details and the API contract.

## What is and is not included

Included:

* Public pages: Home, About, Art (gallery) and each painting, Poetry and each poem, Cart, Checkout, Order confirmation, Track an order, Contact, Custom art, FAQs, Shipping and returns, Privacy, Terms.
* Guest checkout that creates an order and (for one-of-a-kind originals) reserves the painting so two people cannot buy it.
* Admin panel (`/admin`): Dashboard, Artworks, Poems, Orders, Enquiries (general, custom art, newsletter with CSV export), Site content, Media library, Settings, Audit log, Account (change password).
* Admin sign-in with an 8-hour session cookie.

**Not included:**

* **No payment gateway.** Placing an order does not take money. The default checkout text tells the buyer that the team will contact them with payment details. The owner marks an order as paid by hand in the admin panel.
* **No email sending.** The backend has no mail code. Customers and the owner are not emailed about orders or enquiries; the default order confirmation text says a confirmation will be sent "once email delivery is set up". The owner must check the admin panel (or contact buyers herself).
* No customer accounts (checkout is guest only), no stock levels for prints, no automated shipping carrier integration.

## Quick start (local development)

Requirements: Node.js (developed on v24; neither `package.json` pins a version) and a MongoDB server (local, or a connection string to a hosted one).

```bash
# 1. Backend
cd Backend
npm install
cp .env.example .env            # edit MONGODB_URI if needed
npm run seed                    # inserts the starter paintings, poems and default settings
npm run create-admin -- --email you@example.com --name "Your Name"   # asks for a password (min 12 characters)
npm run dev                     # API on http://localhost:5000

# 2. Frontend (second terminal)
cd Frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:5000/api
npm run dev                     # site on http://localhost:5173
```

Open `http://localhost:5173` for the site and `http://localhost:5173/admin` for the admin panel.

The defaults line up: the backend allows the origin `http://localhost:5173` (`CLIENT_ORIGIN`) and the frontend talks to `http://localhost:5000/api`. If you change the backend `PORT` (for example because something else already uses 5000) you must also change `VITE_API_URL` and restart the Vite dev server.

If the API cannot be reached, the public site falls back to its bundled content, so a blank site usually means the browser could not load data, not that the frontend is broken.

## Scripts

Backend (`Backend/package.json`):

| Command | What it does |
|---|---|
| `npm start` | Run the API (`node index.js`) |
| `npm run dev` | Run with nodemon (restarts on file changes) |
| `npm run seed` | Insert-only load of starter paintings, poems and default settings. Never changes existing data. `-- --force` re-inserts starter items an admin deleted |
| `npm run create-admin -- --email you@example.com [--name "Name"]` | Create an admin, or reset the password of an existing one (this also signs that user out everywhere) |
| `npm test` | Test suite; needs a MongoDB, e.g. `MONGODB_URI=mongodb://127.0.0.1:27017/ npm test` (throwaway databases are created and dropped) |

Frontend (`Frontend/package.json`):

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (port 5173 by default) |
| `npm run build` | Production build into `Frontend/dist/` |
| `npm run preview` | Serve the built `dist/` locally to check it |
| `npm run lint` | ESLint |

## Environment variables

Backend (`Backend/.env`, template in `Backend/.env.example`). Full explanations are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

| Variable | Notes |
|---|---|
| `PORT` | Default 5000 |
| `MONGODB_URI` | Default `mongodb://127.0.0.1:27017/kalpana` |
| `CLIENT_ORIGIN` | The exact website origin, e.g. `https://example.com` |
| `ADMIN_SECRET` | 32+ random characters; required when `NODE_ENV=production` |
| `NODE_ENV` | `production` makes the login cookie `Secure` |
| `UPLOAD_DIR` | Image folder (default `Backend/uploads`) |
| `TRUST_PROXY` | Set when behind a reverse proxy (e.g. `1`) |

Optional tuning variables that exist in the code but are not in `.env.example`: `HOLD_SWEEP_MINUTES`, `RATE_LIMIT_WINDOW_MINUTES`, `ORDER_RATE_LIMIT`, `ENQUIRY_RATE_LIMIT`, `MAX_PENDING_ORDERS`, `RATE_LIMIT_STORE`.

Frontend (`Frontend/.env`): `VITE_API_URL`, the API base URL including `/api`. It is baked into the build, so rebuild after changing it.

## How it fits together

* The browser loads the static site from `Frontend/dist/`. All pages are client-side routes, so the web server must fall back to `index.html` for unknown paths.
* The site calls the API at `VITE_API_URL`. Uploaded images are served by the API at `/uploads/...` on the same origin as the API URL (the site derives the image origin by removing `/api` from `VITE_API_URL`).
* The admin panel is part of the same app at `/admin`. It signs in with an `HttpOnly`, `SameSite=Strict` cookie limited to the path `/api`.
* Paintings, poems, orders, enquiries, settings and the editable site text live in MongoDB. Uploaded images live in the upload folder. Both must be backed up together.
