#!/usr/bin/env bash
set -e

# Final VPS setup for Satori Tea backend
# IP: 72.56.245.188

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root or with sudo."
  exit 1
fi

cd /app/satory-tea/backend

echo "=== Updating nginx configuration ==="
cat > /etc/nginx/sites-available/satory.conf <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name 72.56.245.188;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }
}
EOF

echo "=== Updating environment file ==="
cat > /etc/default/satory-backend <<'EOF'
NODE_ENV=production
PORT=3000
APP_URL=http://72.56.245.188

JWT_SECRET=satori_jwt_secret_key_2024
ADMIN_SECRET=satori_admin_secret_key_2024
QR_SECRET=satori_qr_secret_key_2024

SMS_PROVIDER=telegram
TG_BOT_TOKEN=
SMSRU_SENDER=Satori

GROQ_API_KEY=
IIKO_API_LOGIN=
IIKO_API_URL=https://api-ru.iiko.services/api/1
IIKO_ORGANIZATION_ID=
EOF

echo "=== Testing nginx configuration ==="
nginx -t

echo "=== Restarting nginx ==="
systemctl restart nginx

echo "=== Verifying backend ==="
sleep 2
curl http://127.0.0.1:3000/api/health

echo ""
echo "=== All done! ==="
echo "Backend: http://127.0.0.1:3000/api/health"
echo "Public:  http://72.56.245.188/"
echo ""
echo "Next steps:"
echo "1. Add real TG_BOT_TOKEN, GROQ_API_KEY, IIKO credentials to /etc/default/satory-backend"
echo "2. Restart backend: systemctl restart satory-backend"
echo "3. Check https with: certbot --nginx -d 72.56.245.188 (if needed)"
