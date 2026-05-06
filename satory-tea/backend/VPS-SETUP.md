# VPS Setup for Satori Tea Backend

Этот файл содержит готовые инструкции и шаблоны для настройки сервера на Ubuntu.

## Что есть

- `setup-vps.sh` — автоматический скрипт для установки nginx, certbot, systemd-юнита и placeholder env.
- `nginx-satory.conf.example` — пример nginx-конфига.
- `satory-backend.service.example` — пример systemd-юнита.

## Быстрая последовательность

1. Перейдите в каталог бэкенда:

```bash
cd /app/satory-tea/backend
```

2. Сделайте скрипт исполняемым:

```bash
sudo chmod +x setup-vps.sh
```

3. Запустите скрипт:

```bash
sudo ./setup-vps.sh
```

4. Отредактируйте файлы:

- `/etc/default/satory-backend`
- `/etc/nginx/sites-available/satory.conf`

5. Перезапустите сервисы:

```bash
sudo systemctl daemon-reload
sudo systemctl restart satory-backend
sudo systemctl restart nginx
```

6. Запустите backend через deploy-скрипт:

```bash
./deploy-vps.sh
```

7. Проверьте:

```bash
curl http://127.0.0.1:3000/api/health
```

## Пример содержимого `/etc/default/satory-backend`

```bash
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.ru

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
```

## HTTPS

После настройки nginx запусти:

```bash
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

Если домена пока нет, то сначала настрой /etc/nginx/sites-available/satory.conf на `YOUR_DOMAIN` и проверь nginx.
