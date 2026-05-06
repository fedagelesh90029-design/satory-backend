#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Обновляем код
if [ -d .git ]; then
  echo "Pull repository..."
  if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
    git pull --ff-only || true
  fi
fi

# Устанавливаем зависимости
if command -v npm >/dev/null 2>&1; then
  npm ci
else
  echo "ERROR: npm не найден. Установите Node.js/npm." >&2
  exit 1
fi

# Запускаем или перезапускаем через pm2
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "satory-backend"; then
    echo "Restarting satory-backend..."
    pm2 restart satory-backend --update-env
  else
    echo "Starting satory-backend..."
    pm2 start server.js --name satory-backend --update-env
  fi
  pm2 save
  echo "OK: backend запущен через pm2"
else
  echo "WARNING: pm2 не найден. Запустите проект вручную: npm start" >&2
fi
