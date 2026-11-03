# Kalpana Jagtap - backend API

Express 5 + Mongoose 9 (CommonJS) + MongoDB. Serves the public site (orders, enquiries, read-only catalogue/content/settings) and the admin API used by the admin panel. Contract: `docs/ADMIN_API.md`.

## Setup

```
cd Backend
npm install
cp .env.example .env        # then edit
npm run seed                # inserts missing catalogue/poems/default settings; never modifies existing data;
                            # skips items an admin deleted (add -- --force to bring those back)
npm run create-admin -- --email you@example.com --name "Your Name"
npm run dev                 # or: npm start
```

`create-admin` reads the password from the `ADMIN_PASSWORD` env var or asks for it with a hidden prompt (min 12 characters). Running it again for an existing e-mail resets the password and signs that user out everywhere.

## Environment variables

| Var | Meaning |
|---|---|
| `PORT` | HTTP port (default 5000) |
| `MONGODB_URI` | Mongo connection string |
| `CLIENT_ORIGIN` | The website origin, e.g. `https://example.com`. The only origin allowed by CORS and by the admin CSRF check |
| `ADMIN_SECRET` | >= 32 random characters; signs admin cookies. **Required** when `NODE_ENV=production` (the server refuses to start without it). In development a random per-process secret is used (sessions end on restart) and a warning is logged |
| `UPLOAD_DIR` | Where uploaded images are stored (default `Backend/uploads`) |
| `NODE_ENV` | `production` adds the `Secure` flag to the session cookie |
| `TRUST_PROXY` | Express `trust proxy` value (`1`, `true`, a subnet...). Set it behind a reverse proxy so rate limits use the real client ip |
| `ORDER_RATE_LIMIT` | `POST /api/orders` per ip per window (default 10, 0 = off) |
| `ENQUIRY_RATE_LIMIT` | `POST /api/enquiries` per ip per window (default 10, 0 = off) |
| `RATE_LIMIT_WINDOW_MINUTES` | Window for the two limits above (default 60) |
| `MAX_PENDING_ORDERS` | Unpaid orders one e-mail or ip may hold at once (default 3, 0 = off) |
| `RATE_LIMIT_STORE` | `memory` forces per-process in-memory rate limiting (default: MongoDB when connected) |
| `HOLD_SWEEP_MINUTES` | How often unpaid orders older than the `holdHours` setting are auto-cancelled (default 10) |

## Endpoint overview

* Public: `GET /api/health`, `POST /api/orders`, `GET /api/orders/:n?email=`, `POST /api/enquiries`, `GET /api/public/{artworks,poems,content,settings}`, `GET /uploads/<file>`.
* Admin (`/api/admin`, cookie session): `auth/{login,logout,me,change-password}`, `dashboard`, `artworks`, `poems` (+ `/reorder`), `orders`, `enquiries` (+ `/export`), `content`, `settings`, `media`, `audit`.

See `docs/ADMIN_API.md` for fields, validation and status codes. Errors are always `{ "error": "..." }`.

## Tests

`npm test` runs `node:test` against the real app in-process. By default each test file starts its own `mongodb-memory-server` (random port, binary downloaded on first run); set `MONGODB_URI` (e.g. `mongodb://127.0.0.1:27017/`) to use a real server instead (a throwaway database with a random name is created and dropped). The public-POST throttles are switched off in the harness except in `test/throttle.test.js`. The `create-admin` prompt is tested over a piped stdin (no pty), so terminal echo suppression itself is not covered.

## Security notes

* Passwords: scrypt (N=16384, r=8, p=1) with a per-user random salt; constant-time comparison; unknown e-mails cost the same time as known ones; hashes are never returned.
* Session: `kj_admin=<id>.<expiresMs>.<HMAC-SHA256>` cookie, HttpOnly, SameSite=Strict, Path=/api, 8 h, Secure in production. Changing the password invalidates every older session.
* Throttling: login (5 failures per ip+email, 20 per ip / 15 min), password change, order tracking, and the public `POST /api/orders` / `POST /api/enquiries` (10 per ip per hour each) answer 429 + `Retry-After` (exposed to browsers via CORS). Counters are stored in MongoDB (`ratehits`, TTL index) so they survive restarts and are shared by processes, with an in-memory fallback. Set `TRUST_PROXY` behind a reverse proxy, otherwise all clients share the proxy's ip.
* Hoarding: an e-mail or ip can hold at most `MAX_PENDING_ORDERS` unpaid orders, and unpaid orders older than the `holdHours` setting (default 48, 0 = never) are cancelled automatically by a job started in `index.js`, which re-lists the originals (history entry by `system`).
* CSRF: every POST/PUT/PATCH/DELETE under `/api/admin` needs `X-Requested-With: kj-admin` and, when an `Origin` header is present, it must equal `CLIENT_ORIGIN`.
* Any JSON body key starting with `$` or containing `.` is rejected (NoSQL operator injection); the content editor's dotted top-level keys are the only exception and are validated by regex.
* Uploads: type decided by magic bytes (JPEG/PNG/WebP/AVIF only), 8 MB, random file names, served with `nosniff`, `Cross-Origin-Resource-Policy: cross-origin` and a locked-down CSP. `sharp` strips EXIF/GPS and generates 800 px and 1600 px WebP renditions (`variants`, public `imageSet`); if processing fails the original is stored untouched.
* Security headers are set by a small hand-written middleware; `x-powered-by` is disabled; errors never include stack traces.
* Public read endpoints send `Cache-Control: public, max-age=5, stale-while-revalidate=30` plus an `ETag`, so admin edits show on the site within a few seconds.

## Backups

State lives in two places and they must be backed up together: the MongoDB database (`mongodump --uri "$MONGODB_URI" --out backup/`) and the `UPLOAD_DIR` folder (copy/rsync it). Media records refer to files by name, so restoring only one of the two leaves broken images.
