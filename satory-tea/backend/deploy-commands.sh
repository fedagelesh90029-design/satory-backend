#!/bin/bash
# Выполни эти команды на VPS через SSH

# 1. Перейди в папку бэкенда
cd /app/satory-tea/backend
# или попробуй:
# cd ~/satory-backend
# cd /var/www/satory-backend

# 2. Подтяни последний код с GitHub
git pull origin master

# 3. Добавь новый ключ Cerebras в .env
# (если GROQ_API_KEY устарел — замени его)
grep -q "CEREBRAS_API_KEY" .env || echo "CEREBRAS_API_KEY=csk-rk5v8tt8yw5d9wndc28mkyhevfc5fnen2m6rd5eedw63v8f2" >> .env

# Убедись что ключ записался:
grep CEREBRAS_API_KEY .env

# 4. Перезапусти сервер через pm2
pm2 restart satory-backend --update-env
# если имя процесса другое:
# pm2 list            — посмотреть имя
# pm2 restart all --update-env

# 5. Проверь что всё работает:
pm2 logs satory-backend --lines 30
# И через 5 секунд проверь health:
curl http://localhost:3000/api/health
