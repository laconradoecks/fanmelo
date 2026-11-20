"""FANMELO waitlist: stores sign-ups in SQLite, shows them on a password-protected admin dashboard.

Python standard library only. Runs behind nginx on 127.0.0.1, which handles HTTPS and rate limiting.
The admin password is an htpasswd line (user:$apr1$...) read from ADMIN_PASSWORD_FILE.

  POST /api/waitlist   {"email","role","handle","country","website"}
                       -> {"ok": true} | {"ok": false, "error": "duplicate" | "invalid"}
  GET  /api/waitlist   -> {"ok": true, "total": n, "creators": n}   (the page shows counts over 50)
  GET  /admin/login           sign-in page; POST it {password} to sign in, POST /admin/logout to sign out
  GET  /admin/                dashboard: totals, countries, search, remove buttons, CSV download
  GET  /admin/waitlist.csv    all sign-ups as CSV
  POST /admin/remove          {"email": "..."} -> {"ok": true, "removed": 1}
"""
import base64
import csv
import datetime as dt
import hashlib
import hmac
import html
import io
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import Counter
from urllib.parse import parse_qs
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.environ.get("WAITLIST_DB", "waitlist.db")
HOST = os.environ.get("WAITLIST_HOST", "127.0.0.1")
PORT = int(os.environ.get("WAITLIST_PORT", "8788"))
MAX_BODY = 4096
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[a-z]{2,}$", re.I)
HANDLE_RE = re.compile(r"[^@A-Za-z0-9._]")
ROLES = {"creator", "fan"}
# Must match the list in src/waitlist.ts.
COUNTRIES = {
    "Uganda", "United States", "Kenya", "Nigeria", "Rwanda", "Tanzania", "South Africa", "Ghana",
    "United Kingdom", "Canada", "Germany", "France", "Netherlands", "Ireland",
    "India", "Philippines", "Brazil", "Australia", "United Arab Emirates", "Other",
}
# /admin/remove only accepts requests from these origins (blocks cross-site form tricks).
ADMIN_ORIGINS = set(
    os.environ.get("ADMIN_ORIGINS", "https://fanmelo.com,https://www.fanmelo.com").split(",")
)

# Admin sign-in. The password file holds one htpasswd line ("fanmelo:$apr1$..."), made with
# `openssl passwd -apr1`. systemd hands it to the service via LoadCredential.
ADMIN_PASSWORD_FILE = os.environ.get("ADMIN_PASSWORD_FILE") or os.path.join(
    os.environ.get("CREDENTIALS_DIRECTORY", "/nonexistent"), "admin.htpasswd")
SESSION_COOKIE = "fanmelo_admin"
SESSION_SECONDS = 7 * 24 * 3600
MAX_FAILS, FAIL_WINDOW = 5, 15 * 60   # 5 wrong passwords per IP per 15 minutes, then wait


def _session_key():
    # Kept next to the database so a restart (every deploy) doesn't sign the owner out.
    path = os.path.join(os.path.dirname(os.path.abspath(DB_PATH)), "session.key")
    try:
        with open(path, "rb") as f:
            key = f.read()
        if len(key) >= 32:
            return key
    except OSError:
        pass
    key = secrets.token_bytes(32)
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(key)
    except OSError:
        pass  # fall back to a key that lasts until the next restart
    return key


SESSION_KEY = _session_key()
_fails = {}
_fails_lock = threading.Lock()

_ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def apr1(password, salt):
    """Apache's MD5 password hash ($apr1$), as written by `openssl passwd -apr1`."""
    pw, salt = password.encode(), salt.encode()[:8]
    ctx = pw + b"$apr1$" + salt
    alt = hashlib.md5(pw + salt + pw).digest()
    n = len(pw)
    while n > 0:
        ctx += alt[:min(16, n)]
        n -= 16
    n = len(pw)
    while n:
        ctx += b"\0" if n & 1 else pw[:1]
        n >>= 1
    final = hashlib.md5(ctx).digest()
    for i in range(1000):
        c = (pw if i & 1 else final)
        if i % 3:
            c += salt
        if i % 7:
            c += pw
        c += final if i & 1 else pw
        final = hashlib.md5(c).digest()
    out = ""
    for a, b, c in ((0, 6, 12), (1, 7, 13), (2, 8, 14), (3, 9, 15), (4, 10, 5)):
        v = (final[a] << 16) | (final[b] << 8) | final[c]
        for _ in range(4):
            out += _ITOA64[v & 0x3F]
            v >>= 6
    v = final[11]
    for _ in range(2):
        out += _ITOA64[v & 0x3F]
        v >>= 6
    return "$apr1$%s$%s" % (salt.decode(), out)


def check_password(password):
    try:
        with open(ADMIN_PASSWORD_FILE, encoding="utf-8") as f:
            stored = f.readline().strip().split(":", 1)[-1]
    except OSError:
        return False
    parts = stored.split("$")
    if len(parts) != 4 or parts[1] != "apr1" or not password:
        return False
    return hmac.compare_digest(apr1(password, parts[2]), stored)


def make_session():
    expires = str(int(time.time()) + SESSION_SECONDS)
    sig = hmac.new(SESSION_KEY, expires.encode(), hashlib.sha256).hexdigest()
    return expires + "." + sig


def valid_session(value):
    expires, _, sig = (value or "").partition(".")
    if not expires.isdigit() or int(expires) < time.time():
        return False
    good = hmac.new(SESSION_KEY, expires.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, good)


def too_many_fails(ip):
    with _fails_lock:
        recent = [t for t in _fails.get(ip, []) if t > time.time() - FAIL_WINDOW]
        _fails[ip] = recent
        return len(recent) >= MAX_FAILS


def note_fail(ip):
    with _fails_lock:
        _fails.setdefault(ip, []).append(time.time())


def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS signups (
               email      TEXT PRIMARY KEY,
               role       TEXT NOT NULL,
               handle     TEXT NOT NULL DEFAULT '',
               country    TEXT NOT NULL,
               created_at TEXT NOT NULL
           )"""
    )
    return conn


def now_utc():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def clean_handle(raw):
    h = HANDLE_RE.sub("", raw.strip())[:40]
    return "@" + h if h and not h.startswith("@") else h


def csv_safe(value):
    # Stop spreadsheet apps from treating a cell as a formula.
    return "'" + value if value[:1] in ("=", "+", "-", "@", "\t", "\r") else value


class Handler(BaseHTTPRequestHandler):
    server_version = "waitlist"

    def send(self, status, body, ctype="application/json", extra=None):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def json(self, status, obj):
        self.send(status, json.dumps(obj))

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return None
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8", "replace"))
        except ValueError:
            return None
        return data if isinstance(data, dict) else None

    # ---- admin helpers -------------------------------------------------------------

    def client_ip(self):
        return self.headers.get("X-Real-IP") or self.client_address[0]

    def signed_in(self):
        for part in (self.headers.get("Cookie") or "").split(";"):
            name, _, value = part.strip().partition("=")
            if name == SESSION_COOKIE and valid_session(value):
                return True
        return False

    def cookie(self, value, max_age):
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
        return "%s=%s; Max-Age=%d; Path=/admin; HttpOnly; SameSite=Strict%s" % (
            SESSION_COOKIE, value, max_age, secure)

    def redirect(self, location, cookie=None):
        extra = {"Location": location}
        if cookie:
            extra["Set-Cookie"] = cookie
        self.send(303, "", "text/plain", extra)

    def same_site_post(self):
        return self.headers.get("Origin") in ADMIN_ORIGINS

    def read_form(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return {}
        raw = self.rfile.read(length).decode("utf-8", "replace")
        return {k: v[0] for k, v in parse_qs(raw).items()}

    def page(self, status, body):
        self.send(status, body, "text/html; charset=utf-8",
                  {"X-Frame-Options": "DENY", "Referrer-Policy": "same-origin"})

    # ---- routes ----------------------------------------------------------------------

    def do_POST(self):
        if self.path == "/admin/login":
            return self.login()
        if self.path == "/admin/logout":
            if not self.same_site_post():
                return self.json(403, {"ok": False, "error": "forbidden"})
            return self.redirect("/admin/login", self.cookie("", 0))
        if self.path == "/admin/remove":
            return self.remove()
        if self.path != "/api/waitlist":
            return self.json(404, {"ok": False, "error": "not_found"})
        data = self.read_json()
        if data is None:
            return self.json(400, {"ok": False, "error": "bad_request"})

        # Bot trap: people never see the "website" field, bots fill it in. Pretend it worked.
        if str(data.get("website") or "").strip():
            return self.json(200, {"ok": True})

        email = str(data.get("email") or "").strip().lower()
        if len(email) > 254 or not EMAIL_RE.match(email):
            return self.json(422, {"ok": False, "error": "invalid"})
        role = str(data.get("role") or "")
        role = role if role in ROLES else "creator"
        country = str(data.get("country") or "")
        if country not in COUNTRIES:
            return self.json(422, {"ok": False, "error": "invalid"})
        handle = clean_handle(str(data.get("handle") or ""))

        with db() as conn:
            added = conn.execute(
                "INSERT OR IGNORE INTO signups (email, role, handle, country, created_at) VALUES (?, ?, ?, ?, ?)",
                (email, role, handle, country, now_utc()),
            ).rowcount
        if not added:
            return self.json(409, {"ok": False, "error": "duplicate"})
        return self.json(200, {"ok": True})

    def login(self):
        ip = self.client_ip()
        if too_many_fails(ip):
            return self.page(429, login_page("Too many wrong passwords. Wait 15 minutes, then try again."))
        password = self.read_form().get("password", "")
        if not check_password(password):
            note_fail(ip)
            time.sleep(1)  # slows down guessing
            return self.page(401, login_page("That password isn't right. Check it and try again."))
        return self.redirect("/admin/", self.cookie(make_session(), SESSION_SECONDS))

    def remove(self):
        # Signed-in cookie (SameSite=Strict) plus a custom header and our own Origin:
        # other sites can't send this request on the owner's behalf.
        if not self.signed_in():
            return self.json(401, {"ok": False, "error": "signed_out"})
        if self.headers.get("X-Waitlist-Admin") != "1" or not self.same_site_post():
            return self.json(403, {"ok": False, "error": "forbidden"})
        data = self.read_json()
        if data is None:
            return self.json(400, {"ok": False, "error": "bad_request"})
        email = str(data.get("email") or "").strip().lower()
        with db() as conn:
            removed = conn.execute("DELETE FROM signups WHERE email = ?", (email,)).rowcount
        return self.json(200, {"ok": True, "removed": removed})

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/waitlist":
            with db() as conn:
                total, creators = conn.execute(
                    "SELECT COUNT(*), COALESCE(SUM(role = 'creator'), 0) FROM signups"
                ).fetchone()
            return self.json(200, {"ok": True, "total": total, "creators": creators})

        if path == "/admin/login":
            if self.signed_in():
                return self.redirect("/admin/")
            return self.page(200, login_page())

        if path in ("/admin", "/admin/", "/admin/waitlist.csv") and not self.signed_in():
            return self.redirect("/admin/login")

        if path == "/admin/waitlist.csv":
            with db() as conn:
                rows = conn.execute(
                    "SELECT created_at, email, role, handle, country FROM signups ORDER BY created_at"
                ).fetchall()
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(["signed_up_at", "email", "role", "handle", "country"])
            for t, e, r, h, c in rows:
                # Handles are stored as "@name"; a leading @ can make Excel read the cell as a
                # formula, so export the bare name (handles only contain letters, digits, . and _).
                w.writerow([csv_safe(v) for v in (t, e, r, h.lstrip("@"), c)])
            name = "fanmelo-waitlist-%s.csv" % dt.date.today().isoformat()
            # BOM so Excel opens it as UTF-8.
            return self.send(200, "﻿" + out.getvalue(), "text/csv; charset=utf-8",
                             {"Content-Disposition": 'attachment; filename="%s"' % name})

        if path in ("/admin", "/admin/"):
            with db() as conn:
                rows = conn.execute(
                    "SELECT created_at, email, role, handle, country FROM signups ORDER BY created_at DESC"
                ).fetchall()
            return self.page(200, dashboard_page(rows))

        return self.json(404, {"ok": False, "error": "not_found"})

    def log_message(self, fmt, *args):
        # Keep emails out of the logs; nginx already logs requests.
        pass


def parse_time(t):
    try:
        return dt.datetime.strptime(t, "%Y-%m-%d %H:%M:%S UTC").replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None


def nice_time(t):
    d = parse_time(t)
    return d.strftime("%-d %b %Y, %H:%M") if d else t


def login_page(error=""):
    err = '<p class="err" role="alert">%s</p>' % html.escape(error) if error else ""
    return LOGIN_PAGE % {"error": err}


def dashboard_page(rows):
    creators = sum(1 for r in rows if r[2] == "creator")
    week_ago = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
    this_week = sum(1 for r in rows if (parse_time(r[0]) or week_ago) > week_ago)
    countries = Counter(r[4] for r in rows).most_common(6)
    top = max([n for _, n in countries] or [1])
    country_html = "".join(
        '<li><span class="cn">%s</span><span class="cbar"><i style="width:%d%%"></i></span>'
        '<b>%d</b></li>' % (html.escape(c), max(4, round(100 * n / top)), n)
        for c, n in countries
    ) or '<li class="none">Countries appear here once people join.</li>'
    items = "".join(
        '<tr data-search="%(q)s" data-email="%(e)s" data-role="%(r)s"><td><time title="%(raw)s">%(t)s</time></td>'
        '<td class="e">%(e)s</td><td><span class="role %(r)s">%(r)s</span></td><td>%(h)s</td><td>%(c)s</td>'
        '<td><button type="button" class="rm">Remove</button></td></tr>'
        % {
            "raw": html.escape(t), "t": html.escape(nice_time(t)), "e": html.escape(e), "r": html.escape(r),
            "h": html.escape(h) or '<span class="dim">–</span>', "c": html.escape(c),
            "q": html.escape(" ".join((e, r, h, c)).lower()),
        }
        for t, e, r, h, c in rows
    )
    return DASHBOARD_PAGE % {
        "total": len(rows), "creators": creators, "fans": len(rows) - creators,
        "week": this_week, "countries": country_html, "items": items,
        "has_rows": "" if rows else "hidden", "no_rows": "hidden" if rows else "",
    }


SHARED_CSS = """
@font-face{font-family:'Bricolage Grotesque';font-weight:600 800;font-display:swap;src:url('/fonts/bricolage-grotesque.woff2') format('woff2')}
@font-face{font-family:'Montserrat';font-weight:600 800;font-display:swap;src:url('/fonts/montserrat.woff2') format('woff2')}
:root{--ink:#2A1B5C;--night:#1B1530;--muted:#5B5675;--line:#ECE6F8;--vio:#8A3FE4;--pink:#C2185B;--ok:#0E7A4E;--bad:#B3123E;
--head:'Bricolage Grotesque',Montserrat,system-ui,sans-serif;--ui:Montserrat,system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:#FAF8FF;color:var(--night);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.logo{display:block;height:28px;width:123px;background:url(/logo.png) left center/contain no-repeat;color:transparent;overflow:hidden;white-space:nowrap;text-indent:120%%}
.btn{font:800 .95rem var(--ui);border:0;border-radius:999px;min-height:48px;padding:0 22px;background:linear-gradient(180deg,#3A2775,#2A1B5C);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-shadow:0 10px 24px rgba(42,27,92,.22)}
.btn.ghost{background:rgba(255,255,255,.7);color:var(--ink);border:1px solid rgba(42,27,92,.14);box-shadow:none}
input{font:inherit;color:var(--night);background:#fff;border:1px solid #E2DBF2;border-radius:14px;min-height:52px;padding:0 16px;width:100%%;box-shadow:0 2px 10px rgba(42,27,92,.05)}
input:focus{outline:none;border-color:var(--vio);box-shadow:0 0 0 4px rgba(138,63,228,.16)}
button:focus-visible,a:focus-visible{outline:3px solid rgba(138,63,228,.45);outline-offset:3px}
[hidden]{display:none!important}
"""

LOGIN_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Sign in · FANMELO waitlist</title><link rel="icon" href="/favicon.svg">
<style>""" + SHARED_CSS + """
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;
background:radial-gradient(640px 420px at 100%% 0%%,rgba(255,255,255,.55),transparent 60%%),linear-gradient(165deg,#E9DEFF 0%%,#D4C2FF 45%%,#BFA6FF 100%%)}
.card{width:100%%;max-width:400px;background:#fff;border-radius:28px;padding:36px 30px 30px;box-shadow:0 30px 70px rgba(42,27,92,.22);display:flex;flex-direction:column;gap:22px}
h1{font:800 1.9rem/1.05 var(--head);letter-spacing:-.025em;margin:0}
.sub{margin:6px 0 0;color:var(--muted)}
label{display:block;font:700 .85rem var(--ui);margin-bottom:8px;color:var(--ink)}
form{display:flex;flex-direction:column;gap:16px}
.err{margin:0;color:var(--bad);font-size:.92rem;background:#FDF0F4;border-radius:12px;padding:10px 14px}
.back{font:700 .85rem var(--ui);color:var(--muted);text-decoration:none;text-align:center}
.back:hover{color:var(--ink)}
</style></head><body>
<main class="card">
<span class="logo">FANMELO</span>
<div><h1>Waitlist dashboard</h1><p class="sub">Sign in to see who has joined.</p></div>
%(error)s
<form method="post" action="/admin/login">
<input type="text" name="username" value="fanmelo" autocomplete="username" hidden>
<div><label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus></div>
<button class="btn" type="submit">Sign in</button>
</form>
<a class="back" href="/">Back to fanmelo.com</a>
</main></body></html>"""

DASHBOARD_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Waitlist · FANMELO</title><link rel="icon" href="/favicon.svg">
<style>""" + SHARED_CSS + """
.bar{background:linear-gradient(165deg,#E9DEFF 0%%,#D4C2FF 60%%,#C9B4FF 100%%);padding:18px 0 84px}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.top form{margin:0}
.top .btn{min-height:42px;padding:0 18px;font-size:.85rem}
.hello{margin-top:34px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.eyebrow{display:block;font:700 .74rem/1 var(--ui);letter-spacing:.14em;text-transform:uppercase;color:var(--vio);margin-bottom:10px}
h1{font:800 clamp(2rem,5vw,2.8rem)/1.02 var(--head);letter-spacing:-.03em;margin:0;color:var(--night)}
main{margin-top:-60px;padding-bottom:64px}
main .wrap{display:flex;flex-direction:column;gap:18px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.panel{background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 10px 30px rgba(42,27,92,.07)}
.stat{padding:18px 20px}
.stat .n{font:800 2.4rem/1 var(--head);letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums}
.stat p{margin:8px 0 0;font:700 .8rem var(--ui);color:var(--muted)}
.stat.lead{background:linear-gradient(160deg,#2A1B5C,#43307F);border-color:transparent}
.stat.lead .n{color:#fff}.stat.lead p{color:#D6CCF2}
.panel h2{font:800 1.1rem var(--head);letter-spacing:-.01em;margin:0}
.ph{padding:18px 20px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.tools{padding:14px 20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.tools input{flex:1 1 220px;min-height:44px}
.chips{display:flex;gap:6px}
.chip{font:700 .8rem var(--ui);border:1px solid var(--line);background:#fff;color:var(--muted);border-radius:999px;min-height:40px;padding:0 14px;cursor:pointer}
.chip[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}
.tbl{overflow-x:auto;border-top:1px solid var(--line)}
table{width:100%%;border-collapse:collapse;min-width:680px;font-size:.9rem}
th,td{text-align:left;padding:12px 20px;border-bottom:1px solid var(--line);vertical-align:middle}
th{font:700 .7rem var(--ui);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);background:#FCFAFF}
tr:last-child td{border-bottom:0}
td.e{font-weight:600;white-space:nowrap}time{color:var(--muted);white-space:nowrap}.dim{color:#B7B0CC}
.role{display:inline-block;border-radius:999px;padding:3px 10px;font:700 .72rem var(--ui);text-transform:capitalize}
.role.creator{background:#F3ECFF;color:var(--vio)}.role.fan{background:#FDE7F1;color:var(--pink)}
button.rm{font:600 .8rem var(--ui);color:var(--bad);background:transparent;border:1px solid #F3C2D2;border-radius:10px;padding:6px 12px;cursor:pointer}
button.rm:hover{background:#FDF0F4}button.rm:disabled{opacity:.5;cursor:default}
.empty{padding:28px 20px;color:var(--muted);text-align:center}
#note{min-height:0;margin:0;padding:0 20px;font-weight:600}#note:not(:empty){padding-bottom:12px}
.countries{list-style:none;margin:0;padding:16px 20px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px 28px}
.countries li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;font-size:.9rem;align-items:center}
.countries .cn{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.countries b{font-variant-numeric:tabular-nums;color:var(--ink)}
.cbar{grid-column:1/-1;height:8px;border-radius:4px;background:#EFEAF8;overflow:hidden;order:3}
.cbar i{display:block;height:100%%;border-radius:4px;background:linear-gradient(90deg,#E0157A,#8A3FE4 60%%,#1E6BFF)}
.countries .none{display:block;color:var(--muted);grid-column:1/-1}
.welcome{padding:30px 24px;text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center}
.welcome p{margin:0;color:var(--muted);max-width:46ch}
@media (max-width:860px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head><body>
<div class="bar"><div class="wrap">
<div class="top"><a class="logo" href="/">FANMELO</a>
<form method="post" action="/admin/logout"><button class="btn ghost" type="submit">Sign out</button></form></div>
<div class="hello"><div><span class="eyebrow">Waitlist dashboard</span><h1>Who's joined so far</h1></div>
<a class="btn" href="/admin/waitlist.csv">Download CSV</a></div>
</div></div>
<main><div class="wrap">
<div class="stats">
<div class="panel stat lead"><div class="n" id="total">%(total)s</div><p>People on the waitlist</p></div>
<div class="panel stat"><div class="n" id="creators">%(creators)s</div><p>Creators</p></div>
<div class="panel stat"><div class="n" id="fans">%(fans)s</div><p>Fans</p></div>
<div class="panel stat"><div class="n">%(week)s</div><p>Joined in the last 7 days</p></div>
</div>
<section class="panel" aria-label="Top countries"><div class="ph"><h2>Top countries</h2></div><ul class="countries">%(countries)s</ul></section>
<section class="panel">
<div class="ph"><h2>Sign-ups</h2></div>
<div class="welcome" %(no_rows)s><h2>No one has joined yet</h2><p>As soon as someone fills in the form on fanmelo.com they'll show up here, newest first.</p></div>
<div %(has_rows)s>
<div class="tools">
<label for="q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search sign-ups</label>
<input id="q" type="search" placeholder="Search email, handle or country" autocomplete="off">
<div class="chips" role="group" aria-label="Show">
<button type="button" class="chip" data-f="" aria-pressed="true">All</button>
<button type="button" class="chip" data-f="creator" aria-pressed="false">Creators</button>
<button type="button" class="chip" data-f="fan" aria-pressed="false">Fans</button></div>
</div>
<p id="note" role="status"></p>
<div class="tbl"><table><thead><tr><th>Joined (UTC)</th><th>Email</th><th>Role</th><th>Handle</th><th>Country</th><th></th></tr></thead>
<tbody id="rows">%(items)s</tbody></table>
<div class="empty" id="empty" hidden>No sign-ups match.</div></div>
</div>
</section>
</div></main>
<script>
var rows = document.getElementById('rows'), q = document.getElementById('q'), role = '',
    empty = document.getElementById('empty'), note = document.getElementById('note');
function filter() {
  var term = q.value.trim().toLowerCase(), shown = 0;
  Array.prototype.forEach.call(rows.rows, function (tr) {
    var hit = tr.dataset.search.indexOf(term) !== -1 && (!role || tr.dataset.role === role);
    tr.hidden = !hit; if (hit) shown++;
  });
  empty.hidden = shown > 0;
}
function recount() {
  var c = 0, all = rows.rows.length;
  Array.prototype.forEach.call(rows.rows, function (tr) { if (tr.dataset.role === 'creator') c++; });
  document.getElementById('total').textContent = all;
  document.getElementById('creators').textContent = c;
  document.getElementById('fans').textContent = all - c;
}
q.addEventListener('input', filter);
document.querySelectorAll('.chip').forEach(function (b) {
  b.addEventListener('click', function () {
    role = b.dataset.f;
    document.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    filter();
  });
});
rows.addEventListener('click', function (e) {
  var b = e.target.closest('button.rm'); if (!b) return;
  var tr = b.closest('tr'), email = tr.dataset.email;
  if (!confirm('Remove ' + email + ' from the waitlist? This cannot be undone.')) return;
  b.disabled = true; b.textContent = 'Removing…';
  fetch('/admin/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Waitlist-Admin': '1' },
    body: JSON.stringify({ email: email }) })
    .then(function (r) { if (r.status === 401) { location.href = '/admin/login'; throw 0; } return r.json(); })
    .then(function (d) {
      if (!d.ok) throw new Error();
      tr.remove(); recount(); filter();
      note.style.color = '#0E7A4E'; note.textContent = 'Removed ' + email + '.';
    })
    .catch(function (err) {
      if (err === 0) return;
      b.disabled = false; b.textContent = 'Remove';
      note.style.color = '#B3123E'; note.textContent = "Couldn't remove " + email + '. Reload the page and try again.';
    });
});
</script></body></html>"""


if __name__ == "__main__":
    db().close()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
