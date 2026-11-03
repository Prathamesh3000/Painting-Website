# Admin + content API contract (v1.1)

This is the single source of truth shared by three workstreams. **Do not change it without telling the coordinator.**
Existing public endpoints (`POST /api/orders`, `GET /api/orders/:orderNumber?email=`, `POST /api/enquiries`, `GET /api/health`) keep working; additions are listed below.

All bodies are JSON (`Content-Type: application/json`) except media upload (multipart). Errors are always `{ "error": "human readable message" }` with a suitable status (400 validation, 401 not logged in, 403 CSRF/origin, 404, 409 conflict, 413 too large, 415 bad type, 429 rate limited, 500).
Lists return `{ items: [...], total, page, pageSize }` where paged (orders, enquiries, audit); other lists return `{ items: [...] }`. `pageSize` defaults to 20 and is **capped at 100** (larger values are clamped, not rejected); `page` is 1-based.

Body size limits: public endpoints 50 kB; `/api/admin/auth/*` before login 10 kB (a larger login body is **413**); authenticated admin JSON 1 MB; uploads 8 MB (413).

### Rate limiting (429)
Every 429 is `{ error }` plus a `Retry-After` header (seconds). CORS exposes `Retry-After` and `Content-Disposition` to the browser (`Access-Control-Expose-Headers`).

| What | Limit (env var) |
|---|---|
| `POST /api/admin/auth/login` | 5 failures per (ip,email) and 20 per ip per 15 min |
| `POST /api/admin/auth/change-password` | 5 wrong current passwords per (ip,admin) per 15 min |
| `GET /api/orders/:n` (tracking) | 30 wrong lookups per ip per 15 min |
| `POST /api/orders` | 10 requests per ip per hour, every request counts (`ORDER_RATE_LIMIT`, 0 = off) |
| `POST /api/enquiries` | 10 requests per ip per hour (`ENQUIRY_RATE_LIMIT`, 0 = off) |
| unpaid orders | at most 3 `pending-payment` orders per e-mail **or** per ip at once (`MAX_PENDING_ORDERS`, 0 = off) -> 429 |

The window for the two POST limits is `RATE_LIMIT_WINDOW_MINUTES` (default 60). Counters live in MongoDB (collection `ratehits`, TTL index) when connected, so they survive restarts and are shared by all processes; if MongoDB is unavailable (or `RATE_LIMIT_STORE=memory`) each process counts in memory. Behind a reverse proxy set `TRUST_PROXY` (e.g. `1`) or every client shares the proxy's ip.

### Unpaid-order auto-release
`POST /api/orders` creates `pending-payment` orders which keep originals off sale. A background job (every `HOLD_SWEEP_MINUTES`, default 10) cancels `pending-payment` orders older than the setting `holdHours` (default 48, `0` = never), re-lists their originals and appends `statusHistory { status: 'cancelled', by: 'system' }`.

## 1. Public read API (no auth, cacheable, never returns unpublished or internal fields)

| Method | Path | Response |
|---|---|---|
| GET | `/api/public/artworks` | `{ items: PublicArtwork[] }` published only, sorted by `order` asc |
| GET | `/api/public/poems` | `{ items: PublicPoem[] }` published only, sorted by `order` asc |
| GET | `/api/public/content` | `{ content: { [key]: string \| ListItem[] } }` only keys an admin has edited |
| GET | `/api/public/settings` | `{ shipping: { flat: int, freeAbove: int }, checkoutEnabled: boolean, holdHours: int }` |

**Caching:** all `/api/public/*` responses send `Cache-Control: public, max-age=5, stale-while-revalidate=30` and an `ETag` (conditional GET -> 304), so admin edits and sold-out changes show up within seconds.

```
PublicArtwork = { slug, title, type: 'original'|'print', medium, dimensions, price: int|null /* INR, null = on enquiry */,
  available: boolean, dispatch, description, ar: number /* width/height */, image: string|null, imageAlt: string,
  poemSlug: string|null, variants: [{ label, price }],
  imageSet: null | { srcset: string /* '/uploads/x-800.webp 800w, /uploads/x-1600.webp 1600w' */, variants: [{ width, url }] } }
PublicPoem    = { slug, lang: 'en'|'mr', title, theme, body /* keeps \n line breaks */ }
ListItem      = { [field]: string }   // e.g. { name, desc } for pillars
```

`imageSet` is non-null only for uploaded images (`/uploads/...`) that have generated WebP renditions; use it for `srcset` (prefix the API origin to the urls) and keep `image` as the fallback. It is also present on admin `GET /artworks` and `GET /artworks/:id`, but not on create/update/reorder responses.

`image` is either a path under the **API origin** starting with `/uploads/` (admin uploads) or a path under the **website origin** starting with `/art/` (bundled placeholder photos), or null (the site then draws its built-in SVG placeholder by slug if it has one).
`GET /api/orders/:n` additionally returns `trackingNote` (string). `POST /api/orders` returns 503 `{ error }` when `checkoutEnabled` is false, and computes shipping from the settings below.

## 2. Auth (cookie session)

* `POST /api/admin/auth/login` `{ email, password }` → 200 `{ user: { id, email, name, role: 'admin' } }` and `Set-Cookie: kj_admin=<id>.<expiresMs>.<hmac>; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800` (+`Secure` when `NODE_ENV=production`). 401 `{ error: 'Invalid email or password.' }` (same message for unknown email and wrong password). 429 with `Retry-After` after 5 failed attempts per (ip,email) in 15 min, or 20 per ip in 15 min. A login body over 10 kB is 413. Successful logins do not use up the allowance.
* `POST /api/admin/auth/logout` → 204, clears the cookie **and revokes that exact cookie server-side** (a copy replayed later gets 401; other sessions of the same user stay valid).
* `GET /api/admin/auth/me` → 200 `{ user }` or 401.
* `POST /api/admin/auth/change-password` `{ currentPassword, newPassword }` (new ≥ 12 chars, must differ) → 204. A wrong `currentPassword` is **400** `{ error: 'Current password is incorrect.' }` (not 401, so the client does not treat it as a logged-out session); a too short or identical new password is 400. Invalidates all other sessions (`passwordChangedAt`); the response re-issues this session's cookie.

**Every other `/api/admin/*` route requires a valid cookie (else 401).** State-changing methods (POST/PUT/PATCH/DELETE, including login) additionally require header `X-Requested-With: kj-admin` and, when an `Origin` header is present, it must equal `CLIENT_ORIGIN` (else 403). The browser client sends `credentials: 'include'`; CORS allows exactly `CLIENT_ORIGIN` with credentials and the `X-Requested-With` header.
First admin is created with `npm run create-admin -- --email you@example.com` (password from a hidden prompt or `ADMIN_PASSWORD` env var, min 12 chars). Passwords are hashed with Node `crypto.scrypt` (per-user random salt, constant-time compare). `ADMIN_SECRET` (≥ 32 chars) signs cookies; required when `NODE_ENV=production` (the server refuses to start without it). The e-mail may also come from `ADMIN_EMAIL`. Re-running it for an existing e-mail resets the password and ends that user's sessions.

In production the cookie also has `Secure`; behind a TLS-terminating proxy set `TRUST_PROXY` so `req.ip` is the real client.

## 3. Admin endpoints (all under `/api/admin`)

### Dashboard
`GET /dashboard` → `{ orders: { total, byStatus: {pending-payment,paid,dispatched,delivered,cancelled}, confirmedRevenue /* paid+dispatched+delivered, INR */, pendingValue }, artworks: { total, available, sold, onEnquiry }, enquiries: { unhandledGeneral, unhandledCustom, newsletterSubscribers }, recentOrders: Order[5], recentEnquiries: Enquiry[5] }`

### Artworks
`GET /artworks` → `{ items: AdminArtwork[] }` (all, incl. unpublished, sorted by order)
`POST /artworks` AdminArtworkInput → 201 AdminArtwork (omitted optional fields get defaults; a duplicate `slug` is **409**) · `GET /artworks/:id` · `PUT /artworks/:id` (**merges**: only the fields sent change, everything else is kept; the result is validated as a whole; `slug` is immutable → 400 if a different one is sent) · `DELETE /artworks/:id` (204; existing orders keep their own item snapshot) · `POST /artworks/reorder` `{ ids: [id,...] }` sets `order` by position and returns **`{ items: AdminArtwork[] }`** (the full list in the new order).
Concurrent PUTs are last-write-wins per request (each save is one atomic update, so a document is never a mix of two requests' fields; there is no version check).
```
AdminArtwork = PublicArtwork & { id, published: boolean, order: int, createdAt, updatedAt }
Validation: slug /^[a-z0-9]+(-[a-z0-9]+)*$/ ≤60 unique; title 1–120; type enum; medium ≤120; dimensions ≤60; price null or int 0–10000000;
available bool; dispatch ≤40; description ≤2000; ar number 0.3–3; image null or string ≤200 starting '/uploads/' or '/art/'; imageAlt ≤200;
poemSlug null or an existing poem slug; variants ≤10 {label 1–40, price int}. A type:'print' needs ≥1 variant.
```
Setting `available:false` on an original stops purchase; the order endpoint's atomic claim keeps working as before.
**Seed tombstones:** deleting a painting or poem records its slug so `npm run seed` does not re-create it (`npm run seed -- --force` ignores and clears the records). Creating an item with that slug again clears its record.

### Poems
`GET /poems` · `POST /poems` (duplicate slug 409) · `GET /poems/:id` · `PUT /poems/:id` (merges; slug immutable) · `DELETE /poems/:id` (409 if an artwork references it via `poemSlug`) · `POST /poems/reorder` (returns `{ items: AdminPoem[] }`)
```
AdminPoem = PublicPoem & { id, published, order, createdAt, updatedAt }
Validation: slug as above; lang en|mr; title 1–120; theme ≤40; body 1–5000 chars (preserve \n, strip \r).
```

### Orders
`GET /orders?status=&q=&page=1&pageSize=20` (q matches orderNumber, customer name/email/phone) → paged `AdminOrder[]` newest first
`GET /orders/:id` → AdminOrder · `PATCH /orders/:id` `{ status?, note?, trackingNote? }` → AdminOrder
```
AdminOrder = { id, orderNumber, customer: {name,email,phone,address,city,state,pin}, items: [{slug,title,type,variant,price,qty}],
  subtotal, shipping, total, status, note /* internal ≤2000 */, trackingNote /* shown to the customer ≤500 */,
  statusHistory: [{ status, at, by /* admin email */ }], createdAt, updatedAt }
status ∈ pending-payment | paid | dispatched | delivered | cancelled
```
Changing to `cancelled` re-lists every `original` in the order (`available: true`) exactly once (idempotent). Moving **out of** `cancelled` re-claims originals atomically; if any is no longer available → 409 `{ error }` and nothing changes. Every status change appends to `statusHistory` and the audit log.

### Enquiries (contact, custom-art, newsletter)
`GET /enquiries?kind=general|custom|newsletter&handled=true|false&q=&page=&pageSize=` · `PATCH /enquiries/:id` `{ handled: boolean }` · `DELETE /enquiries/:id` · `GET /enquiries/export?kind=` → `text/csv` download with `Content-Disposition: attachment` (`kind` defaults to **newsletter**: columns `email,createdAt`; for `general`/`custom`: `kind,name,email,style,size,budget,message,handled,createdAt`; unknown kind 400); cells starting with `= + - @` are prefixed with `'` (CSV injection). Newsletter sign-ups are de-duplicated by lower-cased email (public `POST /api/enquiries` with `kind:'newsletter'` upserts and still returns 201).
```
AdminEnquiry = { id, kind, name, email, style, size, budget, message, handled, handledAt, createdAt }
```

### Site content (editable text)
`GET /content` → `{ content: { [key]: value } }` · `PUT /content` `{ [key]: value, ... }` merges (≤ 50 keys per request) · `DELETE /content/:key` removes the override (site falls back to its built-in default text).
Key: `/^[a-z0-9]+(\.[A-Za-z0-9]+)*$/`, ≤ 80 chars, ≤ 300 keys total. Value: string ≤ 20000 chars, or array (≤ 30) of flat objects whose values are strings ≤ 2000. No HTML is ever interpreted by the site (React renders text only).
The list of editable keys, labels, groups and defaults lives in the frontend file `Frontend/src/content/schema.js` (`CONTENT_FIELDS`).

### Settings
`GET /settings` / `PUT /settings` → `{ shipping: { flat: int 0–100000 (default 250), freeAbove: int 0–10000000 (default 10000) }, checkoutEnabled: boolean (default true), holdHours: int 0–8760 (default 48; 0 = never auto-cancel unpaid orders) }`. PUT merges: send only what changes.

### Media
`GET /media` → `{ items: Media[] }` newest first · `POST /media` multipart field `file` (+ optional text field `alt` ≤200) → 201 Media · `PATCH /media/:id` `{ alt }` · `DELETE /media/:id` (204; deletes the file; 409 if an artwork's `image` still uses its url).
```
Media = { id, filename, url: '/uploads/<filename>', originalName, mime, size, alt, variants: [{ width, url }], createdAt }
```
Allowed: JPEG, PNG, WebP, AVIF — detected by **magic bytes**, not the filename or client mime; max 8 MB; SVG/GIF/HTML rejected (415). Files are stored under `UPLOAD_DIR` (default `Backend/uploads`, git-ignored) with random names (`crypto.randomBytes(16).toString('hex')` + canonical extension). `GET /uploads/<file>` is served statically with `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: cross-origin`, long cache. Images are processed with `sharp`: EXIF/GPS metadata is stripped (the stored original is re-encoded only when it carried metadata; orientation is applied first) and WebP renditions at 800 px and 1600 px width (never enlarged; a smaller image gets one rendition at its own width) are stored as `<name>-800.webp` / `<name>-1600.webp` and listed in `variants`. If processing fails the upload still succeeds with the original byte-for-byte and `variants: []`. `size` is the size of the stored original. Deleting the media deletes its renditions. The admin UI should still recommend ≤ 2000 px and warn above 1 MB.

### Audit log
`GET /audit?page=&pageSize=` (`pageSize` max 100) → paged `{ at, adminEmail, action: 'create'|'update'|'delete'|'status'|'login'|'logout'|'password', entity, entityId, summary }`. Written for every admin mutation and login/logout.

## 4. Frontend modules (shared interfaces)

* `Frontend/src/lib/ContentContext.jsx` (public site data layer) exports `ContentProvider`, hooks `useArtworks() -> { artworks, loading }`, `useArtwork(slug)`, `usePoems() -> { poems, loading }`, `usePoem(slug)`, `useContent(key) -> string | ListItem[]` (override from API, else schema default), `useSettings() -> { shipping, checkoutEnabled }`, and `mediaUrl(path)` which prefixes the API origin to paths starting `/uploads/` only.
* `Frontend/src/content/schema.js` exports `CONTENT_FIELDS: [{ key, group, label, type: 'text'|'textarea'|'list', default, help?, itemFields?: [{ key, label, type: 'text'|'textarea' }] }]` and `contentDefaults` (`key -> default`). Admin form generation and public defaults both read it.
* The admin SPA is `Frontend/src/admin/AdminApp.jsx` (default export), mounted by `App.jsx` at `/admin/*`, outside the public `Layout`. It has its own API client (`src/admin/adminApi.js`) using `credentials: 'include'` and the `X-Requested-With: kj-admin` header.
* The public site keeps working with **static fallback data** if the API is unreachable.

## 5. Ownership (to avoid edit collisions)

| Workstream | Owns |
|---|---|
| Backend | `Backend/**` |
| Admin UI | `Frontend/src/admin/**` |
| Public integration | `Frontend/src/lib/**`, `Frontend/src/content/**`, `Frontend/src/pages/**`, `Frontend/src/components/**`, `Frontend/src/api.js`, `Frontend/src/data/**`, `Frontend/src/context/**`, `Frontend/src/*.css` |
| Coordinator | `Frontend/src/App.jsx`, `Frontend/package.json`, `Backend/package.json` (Backend may add `multer` and scripts) |
