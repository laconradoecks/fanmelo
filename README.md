# FANMELO landing page

Waitlist landing page for FANMELO ("Where fans contribute towards creators' needs"), a Yosaki company.
React + Vite, prerendered to static HTML at build time, with a small self-hosted waitlist backend.
Planned hosting: the **yosaki** DigitalOcean droplet (`138.197.117.174`), next to yosaki.com and distractapp.com.

```
src/                      # React page (markup and CSS match fanmelo-waitlist.html exactly)
  waitlist.ts             # form → /api/waitlist client
public/
  privacy/index.html      # privacy policy, served at /privacy/
  fonts/                  # self-hosted Bricolage Grotesque + Montserrat
scripts/prerender.mjs     # renders the page to HTML and inlines the CSS after `vite build`
fanmelo-waitlist.html     # the client's design file (source of truth for wording and layout)
deploy/
  waitlist/app.py                     # waitlist service (Python stdlib + SQLite)
  waitlist/fanmelo-waitlist.service   # systemd unit
  nginx/fanmelo.conf                  # nginx server block
  nginx/waitlist-locations.conf       # /api/waitlist + /admin/ (sign-in page and dashboard)
  nginx/waitlist-ratelimit.conf       # 10 waitlist requests/min per IP, 6 sign-in attempts/min
  deploy.sh                           # build on your Mac, upload, restart the service
```

## Working on it locally

```bash
npm install
python3 deploy/waitlist/app.py      # waitlist API on 127.0.0.1:8788, writes ./waitlist.db
npm run dev                         # http://localhost:5173 (proxies /api and /admin to the API)
```

`npm run build` writes the finished site to `dist/`; `npm run preview` serves it (also proxied to the API).
To sign in to `/admin/` locally, make a password file and point the API at it (use your dev server's address
in `ADMIN_ORIGINS` so Remove and Sign out work):

```bash
echo "fanmelo:$(openssl passwd -apr1)" > admin.htpasswd
ADMIN_PASSWORD_FILE=admin.htpasswd ADMIN_ORIGINS=http://localhost:5174 python3 deploy/waitlist/app.py
```

## Waitlist

The form POSTs to `/api/waitlist`; nginx forwards it to the Python service on `127.0.0.1:8788`
(systemd unit `fanmelo-waitlist`). Sign-ups are stored in SQLite at `/var/lib/fanmelo/waitlist.db`.

- **Fields saved:** email, creator or fan, handle (optional), country, sign-up time.
- **Duplicates:** the same email can't join twice; the form shows "This email is already on the list."
- **Bots:** a hidden "website" field (invisible to people and screen readers) catches bots; the server pretends to accept them and saves nothing. nginx also limits each IP to 10 requests a minute.
- **Counts:** the page asks `GET /api/waitlist` for totals and shows "N creators waiting" once there are more than 50.

**See who joined:** open `https://DOMAIN/admin/` and sign in on the FANMELO sign-in page (username `fanmelo` and the admin password).
The dashboard shows totals (everyone, creators, fans, joined in the last 7 days), the top countries, a searchable
list with a Creators/Fans filter, a **Remove** button per person (for unsubscribe or deletion requests) and
**Download CSV** for Excel or Google Sheets. Signing in lasts 7 days on that browser; **Sign out** ends it.
After 5 wrong passwords an IP has to wait 15 minutes.

**Privacy:** the policy is `public/privacy/index.html` (linked from the footer). It names
`privacy@fanmelo.com` as the contact; set up that address (or change it on the page) before going live.
Update the page and its date if what's collected changes.

## First-time setup on the droplet

Run as root on the droplet (DigitalOcean web console or SSH).

1. **Code and folders**

   ```bash
   mkdir -p /var/www/fanmelo/site
   git clone https://github.com/laconradoecks/fanmelo.git /var/www/fanmelo/repo
   ```

   If the repo is private, the droplet needs a GitHub deploy key or token to clone and pull.

2. **Admin password** (asks twice, never shown on screen)

   ```bash
   mkdir -p /etc/fanmelo
   echo "fanmelo:$(openssl passwd -apr1)" > /etc/fanmelo/admin.htpasswd && chmod 600 /etc/fanmelo/admin.htpasswd
   ```

   To change it later, run the same `echo` line again, then `systemctl restart fanmelo-waitlist`.

3. **Waitlist service**

   ```bash
   cp /var/www/fanmelo/repo/deploy/waitlist/fanmelo-waitlist.service /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now fanmelo-waitlist
   curl -s http://127.0.0.1:8788/api/waitlist    # → {"ok": true, "total": 0, "creators": 0}
   ```

4. **nginx**

   ```bash
   cp /var/www/fanmelo/repo/deploy/nginx/waitlist-ratelimit.conf /etc/nginx/conf.d/fanmelo-waitlist-ratelimit.conf
   cp /var/www/fanmelo/repo/deploy/nginx/waitlist-locations.conf /etc/nginx/snippets/fanmelo-waitlist.conf
   cp /var/www/fanmelo/repo/deploy/nginx/fanmelo.conf /etc/nginx/sites-available/fanmelo
   # Until the domain points here, use a test address (sslip.io resolves it to the droplet IP):
   sed -i 's/server_name DOMAIN_HERE www.DOMAIN_HERE;/server_name fanmelo.138.197.117.174.sslip.io;/' /etc/nginx/sites-available/fanmelo
   ln -s /etc/nginx/sites-available/fanmelo /etc/nginx/sites-enabled/fanmelo
   nginx -t && systemctl reload nginx
   ```

5. **Upload the site** from your Mac (needs SSH key access to the droplet):

   ```bash
   DROPLET=root@138.197.117.174 SSH_KEY=~/.ssh/yosaki_ops ./deploy/deploy.sh
   ```

   Test URL: `http://fanmelo.138.197.117.174.sslip.io`. To try **Remove** on the test URL, add it to
   `ADMIN_ORIGINS` in `/etc/systemd/system/fanmelo-waitlist.service`, then
   `systemctl daemon-reload && systemctl restart fanmelo-waitlist`.

## Going live on the domain

1. At the domain registrar, add A records `@` and `www` → `138.197.117.174`.
2. On the droplet:

   ```bash
   sed -i 's/server_name fanmelo.138.197.117.174.sslip.io;/server_name fanmelo.com www.fanmelo.com fanmelo.138.197.117.174.sslip.io;/' /etc/nginx/sites-available/fanmelo
   nginx -t && systemctl reload nginx
   certbot --nginx --non-interactive --redirect -d fanmelo.com -d www.fanmelo.com
   ```

3. Check that the new HTTPS server block in `/etc/nginx/sites-available/fanmelo` still has
   `include snippets/fanmelo-waitlist.conf;` (certbot copies the block, so it normally does).

Certbot renews the certificate automatically. After this, edit `/etc/nginx/sites-available/fanmelo` on the server
directly; `deploy/nginx/fanmelo.conf` is only the starting template.

## Updating

```bash
git push
DROPLET=root@138.197.117.174 SSH_KEY=~/.ssh/yosaki_ops ./deploy/deploy.sh   # builds, uploads dist/, pulls the repo, restarts the waitlist service
```

**Back up the list:** `sqlite3 /var/lib/fanmelo/waitlist.db .dump > fanmelo-waitlist-backup.sql` (or download the CSV).
