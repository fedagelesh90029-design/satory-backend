#!/usr/bin/env bash
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root or with sudo."
  exit 1
fi

cd "$(dirname "$0")"

# Install required packages
if ! command -v nginx >/dev/null 2>&1; then
  apt update
  apt install -y nginx
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt update
  apt install -y certbot python3-certbot-nginx
fi

if ! command -v pm2 >/dev/null 2>&1; then
  if command -v npm >/dev/null 2>&1; then
    npm install -g pm2
  else
    echo "WARNING: npm is not installed, please install Node.js/npm first." >&2
  fi
fi

NGINX_CONF=/etc/nginx/sites-available/satory.conf
if [ ! -f "$NGINX_CONF" ]; then
  cat > "$NGINX_CONF" <<'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/satory.conf
fi

systemctl restart nginx || true

SERVICE_FILE=/etc/systemd/system/satory-backend.service
if [ ! -f "$SERVICE_FILE" ]; then
  cat > "$SERVICE_FILE" <<'EOF'
[Unit]
Description=Satori Tea backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/app/satory-tea/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
EnvironmentFile=/etc/default/satory-backend

[Install]
WantedBy=multi-user.target
EOF
fi

ENV_FILE=/etc/default/satory-backend
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
NODE_ENV=production
PORT=3000
APP_URL=https://YOUR_DOMAIN

JWT_SECRET=replace_with_a_strong_jwt_secret
ADMIN_SECRET=replace_with_a_strong_admin_secret
QR_SECRET=replace_with_a_strong_qr_secret

SMS_PROVIDER=telegram
TG_BOT_TOKEN=replace_with_your_tg_bot_token
SMSRU_SENDER=Satori

GROQ_API_KEY=replace_with_your_groq_api_key
IIKO_API_LOGIN=replace_with_your_iiko_api_login
IIKO_API_URL=https://api-ru.iiko.services/api/1
IIKO_ORGANIZATION_ID=replace_with_your_iiko_organization_id
EOF
  echo "Created placeholder environment file: $ENV_FILE"
  echo "Edit it with real values before starting the service."
fi

systemctl daemon-reload
systemctl enable --now satory-backend || true
systemctl status satory-backend --no-pager

nginx -t

cat <<'EOF'

Setup complete. Next steps:
1. Edit /etc/default/satory-backend and replace placeholders with real values.
2. If you use your own domain, update server_name in /etc/nginx/sites-available/satory.conf.
3. Run ./deploy-vps.sh from /app/satory-tea/backend after updating the env file.
4. Obtain HTTPS with certbot:
   sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru
EOF
