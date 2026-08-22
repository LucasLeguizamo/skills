#!/usr/bin/env bash
# Publish the built site behind nginx + Let's Encrypt.
# Run it FROM the project directory (the one holding boards.py / site/).
#
#   <skill>/publish.sh            # deploy + reload nginx
#   <skill>/publish.sh --cert     # also issue/renew the certificate first
#
# Config lives in ./.publish.env (created on first run; keep it out of git).
set -euo pipefail
SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CFG=.publish.env
if [[ ! -f $CFG ]]; then
  cat > "$CFG" <<EOF
# non-default HTTPS port (anything but 443)
PORT=$(shuf -i 20000-60000 -n 1)
# hostname: sslip.io resolves <dashed-ip>.sslip.io -> the IP, so no DNS panel needed
HOST=$(curl -s https://api.ipify.org | tr '.' '-').sslip.io
WEBROOT=/var/www/whiteboard
ACMEROOT=/var/www/acme
EOF
  echo "wrote $CFG"
fi
# shellcheck disable=SC1090
source "$CFG"

[[ -f site/.token ]] || python3 "$SKILL/build.py"
TOKEN=$(cat site/.token)

install -d -m 755 "$ACMEROOT"
rm -rf "$WEBROOT"
install -d -m 755 "$WEBROOT"
cp -a site/. "$WEBROOT"/
rm -f "$WEBROOT/.token" "$WEBROOT/manifest.json"
chown -R www-data:www-data "$WEBROOT" "$ACMEROOT"

CERT=/etc/letsencrypt/live/$HOST/fullchain.pem

# --- phase 1: port 80 serves ONLY the ACME challenge, everything else is dropped
cat > /etc/nginx/sites-available/whiteboard <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    location ^~ /.well-known/acme-challenge/ { root $ACMEROOT; }
    location / { return 444; }
}
EOF

if [[ "${1:-}" == "--cert" || ! -f $CERT ]]; then
  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/whiteboard /etc/nginx/sites-enabled/whiteboard
  nginx -t && systemctl reload nginx
  certbot certonly --webroot -w "$ACMEROOT" -d "$HOST" \
    --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
fi

# --- phase 2: the real vhost on the non-default port
cat >> /etc/nginx/sites-available/whiteboard <<EOF

# Unknown SNI on the secret port: refuse the TLS handshake outright.
server {
    listen $PORT ssl default_server;
    listen [::]:$PORT ssl default_server;
    http2 on;
    ssl_reject_handshake on;
}

server {
    listen $PORT ssl;
    listen [::]:$PORT ssl;
    http2 on;
    server_name $HOST;

    ssl_certificate     $CERT;
    ssl_certificate_key /etc/letsencrypt/live/$HOST/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:2m;

    server_tokens off;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-Robots-Tag "noindex, nofollow" always;

    root $WEBROOT;
    access_log /var/log/nginx/whiteboard.log;

    # ONLY the secret path is served; anything else kills the connection.
    location = /$TOKEN { return 301 https://\$host:$PORT/$TOKEN/; }
    location ^~ /$TOKEN/ {
        try_files \$uri \$uri/index.html @drop;
        gzip on;
        gzip_types text/css image/svg+xml application/json;
    }
    location / { return 444; }
    location @drop { return 444; }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/whiteboard /etc/nginx/sites-enabled/whiteboard
nginx -t
systemctl reload nginx

echo
echo "https://$HOST:$PORT/$TOKEN/"
