#!/usr/bin/env bash
# Build the site on this Mac and publish it to the droplet. Run after `git push`.
#
#   DROPLET=root@138.197.117.174 SSH_KEY=~/.ssh/yosaki_ops ./deploy/deploy.sh
#
# SSH_KEY is optional; leave it out if your default SSH key already works.
# 1. Builds dist/ (prerendered HTML) locally.
# 2. Uploads dist/ to /var/www/fanmelo/site (what nginx serves).
# 3. Pulls the repo on the droplet (for the waitlist service) and restarts it.
# First-time setup on the droplet is in README.md.
set -euo pipefail

: "${DROPLET:?Set DROPLET=user@droplet-ip}"
APP_DIR="${APP_DIR:-/var/www/fanmelo}"
cd "$(dirname "$0")/.."
SSH=(ssh)
[ -n "${SSH_KEY:-}" ] && SSH=(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes)

npm run build
rsync -az --delete -e "${SSH[*]}" dist/ "$DROPLET:$APP_DIR/site/"
"${SSH[@]}" "$DROPLET" "git -C '$APP_DIR/repo' pull --ff-only && systemctl restart fanmelo-waitlist && git -C '$APP_DIR/repo' log -1 --oneline"
echo "Deployed. nginx serves $APP_DIR/site directly, so no reload is needed."
