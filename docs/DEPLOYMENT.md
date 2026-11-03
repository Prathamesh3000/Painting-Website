# Deployment guide

For the developer or owner who will host the site. Everything below was checked against the code in `Backend/` and `Frontend/`; things that could not be tested here are marked **(not tested)**.

## 1. What you are deploying

Three parts:

1. **MongoDB** - all data except images.
2. **Backend** - a Node.js process (`node index.js`) that serves `/api/*` and `/uploads/*`.
3. **Frontend** - static files produced by `npm run build` in `Frontend/dist/`, served by a normal web server.

The recommended layout is **one public domain** (for example `https://example.com`) where a reverse proxy sends `/api/` and `/uploads/` to the backend and everything else to the static files. Reasons this is the safest layout, all from the code:

* The admin login cookie is `HttpOnly; SameSite=Strict; Path=/api` (and `Secure` in production). With the site and API on the same origin there are no cross-site cookie problems. If the API is on a completely different site (for example a different registrable domain) the browser will not send the cookie and admin login will not work.
* Admin requests are accepted only if their `Origin` header equals `CLIENT_ORIGIN` exactly.
* The site finds uploaded images by taking `VITE_API_URL`, removing the trailing `/api`, and putting `/uploads/...` after it.

## 2. Requirements

* Node.js (developed on v24; the package files do not pin a version, so use a current LTS **(not tested on other versions)**).
* MongoDB reachable from the backend (self-hosted, or a hosted cluster such as Atlas).
* A server where you can run a long-lived process and a reverse proxy with an HTTPS certificate.
* Disk space for the upload folder.

## 3. MongoDB

Set `MONGODB_URI` to your connection string, including the database name (the example uses `kalpana`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/kalpana
```

* If MongoDB is hosted with a password, put the credentials in the URI and keep `.env` private (it is git-ignored in `Backend/.gitignore`).
* Do not expose MongoDB's port to the internet. Only the backend needs to reach it.
* The backend creates collections on demand. A few are internal: `ratehits` (rate-limit counters, expire automatically) and `revokedsessions` (logged-out cookies, expire automatically).

## 4. Backend

```bash
cd Backend
npm ci --omit=dev        # or: npm install --omit=dev
cp .env.example .env     # then edit, see below
npm run seed
npm run create-admin -- --email owner@example.com --name "Kalpana Jagtap"
NODE_ENV=production npm start
```

Use a process manager so the backend restarts after a crash or reboot (for example systemd or pm2) **(not tested here)**. The backend must be running continuously: it also runs a periodic job that cancels unpaid orders (see "Unpaid order holds").

`sharp` (image processing) is listed as a dependency and loaded optionally. If it cannot be loaded on your server, uploads still work but are stored untouched, with no resized copies and no metadata stripping.

### 4.1 Environment variables

| Variable | Default | What to set in production |
|---|---|---|
| `NODE_ENV` | none | `production`. Adds `Secure` to the login cookie and makes `ADMIN_SECRET` mandatory |
| `PORT` | `5000` | Any free port; the reverse proxy forwards to it |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/kalpana` | Your real connection string |
| `CLIENT_ORIGIN` | `http://localhost:5173` | The public site origin: scheme + host (+ port), no path, no trailing slash. Example `https://example.com` |
| `ADMIN_SECRET` | none | At least 32 random characters. See 4.2 |
| `UPLOAD_DIR` | `Backend/uploads` | An absolute path outside the code folder is easier to back up and survives redeploys |
| `TRUST_PROXY` | off | `1` when exactly one reverse proxy sits in front. See 4.3 |

Optional tuning (all read in the code; none are in `.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `HOLD_SWEEP_MINUTES` | `10` | How often the backend looks for unpaid orders to cancel |
| `RATE_LIMIT_WINDOW_MINUTES` | `60` | Window for the order and enquiry limits |
| `ORDER_RATE_LIMIT` | `10` | Order attempts per IP per window; `0` turns it off |
| `ENQUIRY_RATE_LIMIT` | `10` | Contact / custom-art / newsletter submissions per IP per window; `0` turns it off |
| `MAX_PENDING_ORDERS` | `3` | Unpaid orders one email or one IP may hold at once; `0` turns it off |
| `RATE_LIMIT_STORE` | MongoDB | Set to `memory` to keep rate-limit counters in process memory instead |

### 4.2 ADMIN_SECRET

`ADMIN_SECRET` signs the admin login cookie.

* With `NODE_ENV=production`, the backend **refuses to start** if it is missing or shorter than 32 characters.
* Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
* Keep it private and stable. If you change it, every admin is signed out. In development without it, a random secret is used per process and sessions end on every restart.

### 4.3 TRUST_PROXY

Behind a reverse proxy, the backend sees the proxy's address for every request unless `TRUST_PROXY` is set. Then:

* all visitors share one IP, so the login throttle and the order / enquiry rate limits would apply to everybody together (one abuser could lock out the admin login, and legitimate customers could hit the limit);
* the recorded order IP is the proxy's.

Set `TRUST_PROXY=1` for a single proxy hop. The accepted values in the code are a number (hops), `true`, `false`, or any other string, which is passed straight to Express's `trust proxy` setting (for example a subnet). Make sure your proxy sets `X-Forwarded-For`, and that the backend port is not reachable directly from the internet, otherwise clients could forge their IP.

### 4.4 Create the first admin

```bash
npm run create-admin -- --email owner@example.com --name "Kalpana Jagtap"
```

* It asks for a password with a hidden prompt (minimum 12 characters). Non-interactively, set `ADMIN_PASSWORD` in the environment for that one command instead; do not leave it in `.env`.
* The e-mail may also come from `ADMIN_EMAIL`.
* Running it again for an existing e-mail resets that user's password and signs them out everywhere. That is the recovery route if the password is forgotten.
* There is no sign-up page; this command is the only way to add an admin. Run it once per person.

### 4.5 Seeding

```bash
npm run seed
```

Inserts the starter paintings and poems (`Backend/data/*.json`) and the default settings, but only where the slug does not exist yet. It never modifies existing records, so it is safe to re-run. Paintings or poems an admin has deleted are remembered and not re-inserted; `npm run seed -- --force` forgets that and inserts them again. Site text is not seeded: the site has built-in default text until an admin edits it.

You can skip seeding and add everything through the admin panel, but the default settings (shipping 250, free above 10000, checkout on, unpaid orders cancelled after 48 hours) are also applied automatically if no settings record exists.

### 4.6 Uploads folder

* Images are written to `UPLOAD_DIR` (created automatically) with random names, and served by the backend at `/uploads/<file>` with a one-year immutable cache.
* Allowed types: JPEG, PNG, WebP, AVIF, up to 8 MB each. The type is decided from the file contents.
* When `sharp` is available, each upload also gets WebP copies (800 px and 1600 px wide, or the original width if smaller) and photo metadata (EXIF / GPS) is removed from the stored file. These copies are extra files in the same folder.
* The folder is **not in git** (`Backend/.gitignore`). Give the backend user write permission to it and make sure a redeploy does not wipe it (hence an absolute `UPLOAD_DIR` outside the code folder).

### 4.7 Backups

Back up **both**, together, on a schedule:

1. The database: `mongodump --uri "$MONGODB_URI" --out backup/`
2. The whole `UPLOAD_DIR` folder (copy or rsync).

Image records point to files by name, so restoring only one leaves broken images or orphaned files. Test a restore at least once. Keep copies off the server.

### 4.8 Unpaid order holds

When a buyer places an order, any original (one-of-a-kind) painting in it is taken off sale immediately. Because there is no online payment, an order stays "Pending payment" until the owner marks it paid. The Settings page has "Cancel unpaid orders after (hours)" (default 48, `0` = never). The running backend checks every `HOLD_SWEEP_MINUTES` and cancels older unpaid orders, putting their originals back on sale. If the backend is stopped, nothing is released until it runs again.

## 5. Frontend

```bash
cd Frontend
npm ci
cp .env.example .env
# edit .env:  VITE_API_URL=https://example.com/api
npm run build
```

* `VITE_API_URL` is compiled into the files at build time. Changing it later means rebuilding. If you leave it unset the build points at `http://localhost:5000/api`, which will not work for visitors.
* Use the **same-origin form** `https://your-domain/api` when the reverse proxy forwards `/api` and `/uploads` (section 6). Images will then load from `https://your-domain/uploads/...`.
* Output is `Frontend/dist/`: `index.html`, `assets/`, `fonts/`, `art/` (bundled placeholder photos), `favicon.svg`, `icons.svg`, `robots.txt`. Copy the whole folder to where the web server reads from.
* `npm run preview` serves `dist/` locally for a quick check **(it does not proxy `/api`)**.

### 5.1 Serving the single-page app (fallback to index.html)

The site uses client-side routing (`/art/some-painting`, `/poetry/...`, `/order/...`, `/admin/...`). A direct visit or a page refresh on such a URL asks the server for a file that does not exist, so the web server must answer with `index.html` instead of a 404. Real files (`/assets/*`, `/fonts/*`, `/robots.txt`, `/favicon.svg`) must still be served as files.

### 5.2 robots.txt

`Frontend/public/robots.txt` is copied into `dist/` and contains:

```
User-agent: *
Disallow: /admin
```

* It only asks well-behaved crawlers to skip `/admin`; it is not security. The admin panel also adds a `noindex,nofollow` meta tag while it is open, and every admin API route requires login.
* Make sure the SPA fallback does not swallow `/robots.txt` (serve existing files first, as in the example below).
* There is no sitemap in the project.

## 6. Reverse proxy with HTTPS

Example for nginx **(not tested; adjust paths and domain)**. The same idea applies to Caddy, Apache or a hosting panel.

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name example.com;
    # ssl_certificate / ssl_certificate_key: for example from Let's Encrypt (certbot)

    root /var/www/kalpana/dist;          # contents of Frontend/dist
    index index.html;

    # API and uploaded images go to the Node backend
    location /api/ {
        client_max_body_size 10m;        # uploads allow 8 MB; nginx's default of 1 MB would reject them
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    # Static site with fallback to index.html (existing files first)
    location / {
        try_files $uri /index.html;
    }
}
```

Points that matter:

* Do not strip or rewrite the `/api` prefix; the backend routes start with `/api`, and the login cookie is limited to `Path=/api`.
* `CLIENT_ORIGIN` must match the address people type: if you serve `https://example.com` and also let `https://www.example.com` open the site, the www version will fail CORS and admin login. Redirect one to the other (as above) and set `CLIENT_ORIGIN` to the one you keep.
* Set `TRUST_PROXY=1` in the backend `.env` (section 4.3). Also keep the backend port closed to the outside (bind it to `127.0.0.1` at the firewall / network level).
* Optionally cache `/assets/*` for a long time (the file names change when the code changes). Do not cache `index.html` for long.
* The backend sets its own security headers (no-sniff, no-referrer, frame denial and no-store on admin routes). It does not set HSTS or a Content-Security-Policy for the website pages; add those at the proxy if you want them.

### 6.1 Cookie behaviour over HTTPS

* In production (`NODE_ENV=production`) the login cookie `kj_admin` has the `Secure` flag, so browsers only keep and send it over HTTPS. **Logging in over plain `http://` on a real domain will appear to succeed and then immediately drop you back to the login page.** Always use HTTPS in production.
* The cookie is `HttpOnly` (not readable by page scripts), `SameSite=Strict`, `Path=/api`, lasts 8 hours, and logout revokes that exact cookie on the server.
* Changing a password signs out every other session.
* To test the production build locally over plain http you would need `NODE_ENV` other than `production` (and then `ADMIN_SECRET` is optional, but sessions end on every restart if it is unset). Do not run that way on the internet.

### 6.2 Avoiding port conflicts (port 5000)

* The backend listens on `PORT` (default 5000). On some systems something else already uses 5000 (for example the AirPlay Receiver on macOS, or another dev server), and the backend will fail to start or answer from the wrong program **(the exact message was not tested)**. Pick a free port, e.g. `PORT=5100`.
* Then update everything that points at it: the proxy's `proxy_pass`, and for local development `VITE_API_URL=http://localhost:5100/api` (restart `npm run dev`). In production with the same-origin setup the browser only sees `https://example.com/api`, so the number does not matter to visitors.
* Two copies of the backend (for example an old process left running) cannot share a port; stop the old one first.
* The Vite dev server uses port 5173, which is also what `CLIENT_ORIGIN` expects in development. If Vite picks another port because 5173 is taken, set `CLIENT_ORIGIN` to the new one or admin actions will be refused with "Origin not allowed".

## 7. Updating the site later

1. Back up the database and `UPLOAD_DIR` (section 4.7).
2. Pull / copy the new code. In `Backend`, run `npm ci --omit=dev` and restart the process. In `Frontend`, run `npm run build` and replace the files in the web root.
3. `npm run seed` is safe to run again but is only needed if the starter data changed.

Edits made in the admin panel (paintings, poems, site text, settings) are stored in MongoDB, so deploying new code does not erase them. Public pages may take a few seconds to a minute to show an admin edit because the public API responses are cached briefly.

## 8. Checklist before go-live

Server and config

- [ ] `NODE_ENV=production`
- [ ] `ADMIN_SECRET` set, 32+ random characters, private
- [ ] `CLIENT_ORIGIN` equals the exact public address (`https://...`, no trailing slash, matches www / non-www choice)
- [ ] `MONGODB_URI` points to the production database; MongoDB is not open to the internet
- [ ] `TRUST_PROXY=1` (or the right value) when behind a proxy; backend port not publicly reachable
- [ ] `UPLOAD_DIR` is writable, outside the code folder, and included in backups
- [ ] Backend runs under a process manager and restarts on reboot
- [ ] `GET https://your-domain/api/health` returns `{"ok":true}`

Frontend and proxy

- [ ] `VITE_API_URL` set to `https://your-domain/api` **before** `npm run build`; the new `dist/` is deployed
- [ ] Refreshing `https://your-domain/art`, `/poetry` and `/admin/login` works (SPA fallback)
- [ ] `https://your-domain/robots.txt` shows the `Disallow: /admin` rule
- [ ] HTTP redirects to HTTPS; the certificate is valid and renewal is automated
- [ ] Proxy allows request bodies of at least 8 MB on `/api/` (image upload test passes)

Content and accounts

- [ ] `npm run seed` run (or content added by hand)
- [ ] Admin created with a strong password; admin can log in on the live HTTPS site
- [ ] Placeholder text replaced in Admin > Site content. Several built-in defaults are explicitly placeholders: About sections 3 and 4, Shipping and returns, the FAQ footnote, Privacy policy and Terms (the last two say they must be written before launch). All are editable under the "About" and "Pages" groups
- [ ] Settings checked: shipping charge, free-shipping amount, checkout on or off, unpaid-order hours
- [ ] Test order placed and cancelled from the admin panel; the painting returned to "Available"
- [ ] Test uploaded image displays on a painting page
- [ ] Contact, custom-art and newsletter forms tested; entries appear under Enquiries
- [ ] Backup run once and a restore tested
- [ ] The owner understands: no payments and no emails are sent by the system (see `docs/ADMIN_GUIDE.md`)
