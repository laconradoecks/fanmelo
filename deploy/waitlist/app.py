"""FANMELO waitlist: stores sign-ups in SQLite, shows them on a password-protected admin page.

Python standard library only. Runs behind nginx on 127.0.0.1, which handles
HTTPS, rate limiting and the password on /admin/.

  POST /api/waitlist   {"email","role","handle","country","website"}
                       -> {"ok": true} | {"ok": false, "error": "duplicate" | "invalid"}
  GET  /api/waitlist   -> {"ok": true, "total": n, "creators": n}   (the page shows counts over 50)
  GET  /admin/                sign-up list with totals, search, remove buttons, CSV download
  GET  /admin/waitlist.csv    all sign-ups as CSV
  POST /admin/remove          {"email": "..."} -> {"ok": true, "removed": 1}
"""
import csv
import datetime as dt
import html
import io
import json
import os
import re
import sqlite3
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

    def do_POST(self):
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

    def remove(self):
        # The admin page sends this with fetch + a custom header; other sites can't, even
        # though the browser would attach the admin password to their requests.
        if (self.headers.get("X-Waitlist-Admin") != "1"
                or self.headers.get("Origin") not in ADMIN_ORIGINS):
            return self.json(403, {"ok": False, "error": "forbidden"})
        data = self.read_json()
        if data is None:
            return self.json(400, {"ok": False, "error": "bad_request"})
        email = str(data.get("email") or "").strip().lower()
        with db() as conn:
            removed = conn.execute("DELETE FROM signups WHERE email = ?", (email,)).rowcount
        return self.json(200, {"ok": True, "removed": removed})

    def do_GET(self):
        if self.path == "/api/waitlist":
            with db() as conn:
                total, creators = conn.execute(
                    "SELECT COUNT(*), COALESCE(SUM(role = 'creator'), 0) FROM signups"
                ).fetchone()
            return self.json(200, {"ok": True, "total": total, "creators": creators})

        if self.path == "/admin/waitlist.csv":
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

        if self.path in ("/admin", "/admin/"):
            with db() as conn:
                rows = conn.execute(
                    "SELECT created_at, email, role, handle, country FROM signups ORDER BY created_at DESC"
                ).fetchall()
            creators = sum(1 for r in rows if r[2] == "creator")
            items = "".join(
                '<tr data-search="%(q)s" data-email="%(e)s"><td><time>%(t)s</time></td><td class="e">%(e)s</td>'
                '<td><span class="role %(r)s">%(r)s</span></td><td>%(h)s</td><td>%(c)s</td>'
                '<td><button type="button" class="rm">Remove</button></td></tr>'
                % {
                    "t": html.escape(t), "e": html.escape(e), "r": html.escape(r),
                    "h": html.escape(h), "c": html.escape(c),
                    "q": html.escape(" ".join((e, r, h, c)).lower()),
                }
                for t, e, r, h, c in rows
            )
            return self.send(
                200,
                ADMIN_PAGE % {"total": len(rows), "creators": creators, "fans": len(rows) - creators, "items": items},
                "text/html; charset=utf-8",
            )

        return self.json(404, {"ok": False, "error": "not_found"})

    def log_message(self, fmt, *args):
        # Keep emails out of the logs; nginx already logs requests.
        pass


ADMIN_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>FANMELO waitlist</title><link rel="icon" href="/favicon.svg">
<style>
:root{--ink:#2A1B5C;--night:#1B1530;--muted:#5B5675;--line:#ECE6F8;--vio:#8A3FE4;--pink:#C2185B;--ok:#0E7A4E}
body{margin:0;background:#FAF8FF;color:var(--night);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1000px;margin:0 auto;padding:40px 20px 64px;display:flex;flex-direction:column;gap:24px}
h1{margin:0;font-size:26px;letter-spacing:-.02em}.brand .m{color:#B0127A}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.stat{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px 18px;box-shadow:0 6px 18px rgba(42,27,92,.05)}
.n{font-size:40px;font-weight:800;line-height:1.05;color:var(--ink)}.stat p{margin:2px 0 0;color:var(--muted);font-size:14px}
.top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
a.btn{display:inline-flex;align-items:center;min-height:44px;background:var(--ink);color:#fff;font-weight:700;padding:0 20px;border-radius:999px;text-decoration:none}
input{width:100%%;box-sizing:border-box;font:inherit;color:var(--night);background:#fff;border:1px solid #E2DBF2;border-radius:14px;min-height:48px;padding:0 14px}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid rgba(138,63,228,.45);outline-offset:2px}
label{display:block;font-weight:700;font-size:14px;margin-bottom:6px}
.wrap{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:16px}
table{width:100%%;border-collapse:collapse;min-width:720px;font-size:14px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
tr:last-child td{border-bottom:0}td.e{overflow-wrap:anywhere}time{color:var(--muted);white-space:nowrap}
.role{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;text-transform:capitalize}
.role.creator{background:#F3ECFF;color:var(--vio)}.role.fan{background:#FDE7F1;color:var(--pink)}
button.rm{font:inherit;font-size:13px;color:#B3123E;background:transparent;border:1px solid #F3C2D2;border-radius:8px;padding:5px 10px;cursor:pointer}
button.rm:hover{background:#FDF0F4}button.rm:disabled{opacity:.5;cursor:default}
.empty{padding:16px 12px;color:var(--muted)}#note{min-height:1.5em;margin:0;color:var(--ok)}
@media (max-width:560px){.stats{grid-template-columns:1fr}}
</style></head><body><main>
<div class="top"><h1><span class="brand">FAN<span class="m">M</span>ELO</span> waitlist</h1>
<a class="btn" href="/admin/waitlist.csv">Download CSV</a></div>
<div class="stats">
<div class="stat"><div class="n" id="total">%(total)s</div><p>signed up</p></div>
<div class="stat"><div class="n" id="creators">%(creators)s</div><p>creators</p></div>
<div class="stat"><div class="n" id="fans">%(fans)s</div><p>fans</p></div>
</div>
<div><label for="q">Search</label><input id="q" type="search" placeholder="Email, handle, country or role" autocomplete="off"></div>
<p id="note" role="status"></p>
<div class="wrap"><table><thead><tr><th>Signed up</th><th>Email</th><th>Role</th><th>Handle</th><th>Country</th><th></th></tr></thead>
<tbody id="rows">%(items)s</tbody></table>
<div class="empty" id="empty" hidden>No sign-ups match.</div></div>
</main>
<script>
var rows = document.getElementById('rows'), q = document.getElementById('q'),
    empty = document.getElementById('empty'), note = document.getElementById('note');
function filter() {
  var term = q.value.trim().toLowerCase(), shown = 0;
  Array.prototype.forEach.call(rows.rows, function (tr) {
    var hit = tr.dataset.search.indexOf(term) !== -1; tr.hidden = !hit; if (hit) shown++;
  });
  empty.hidden = shown > 0;
}
function recount() {
  var c = 0, all = rows.rows.length;
  Array.prototype.forEach.call(rows.rows, function (tr) { if (tr.querySelector('.role.creator')) c++; });
  document.getElementById('total').textContent = all;
  document.getElementById('creators').textContent = c;
  document.getElementById('fans').textContent = all - c;
}
q.addEventListener('input', filter); filter();
rows.addEventListener('click', function (e) {
  var b = e.target.closest('button.rm'); if (!b) return;
  var tr = b.closest('tr'), email = tr.dataset.email;
  if (!confirm('Remove ' + email + ' from the waitlist? This cannot be undone.')) return;
  b.disabled = true; b.textContent = 'Removing…';
  fetch('/admin/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Waitlist-Admin': '1' },
    body: JSON.stringify({ email: email }) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) throw new Error();
      tr.remove(); recount(); filter();
      note.style.color = '#0E7A4E'; note.textContent = 'Removed ' + email + '.';
    })
    .catch(function () {
      b.disabled = false; b.textContent = 'Remove';
      note.style.color = '#B3123E'; note.textContent = "Couldn't remove " + email + '. Reload the page and try again.';
    });
});
</script></body></html>"""


if __name__ == "__main__":
    db().close()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
