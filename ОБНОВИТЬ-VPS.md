# Обновление бэкенда на VPS

## Подключитесь к VPS по SSH:
```
ssh root@72.56.245.188
```

## Выполните команды:
```bash
cd /app/satory-tea/backend
git pull origin master
npm ci
pm2 restart satory-backend --update-env
pm2 save
```

## Проверьте что всё работает:
```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/user/profile
```

## Если pm2 не запущен — запустите:
```bash
pm2 start server.js --name satory-backend
pm2 save
pm2 startup
```
