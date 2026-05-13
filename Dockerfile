FROM node:20-slim

# Создаем рабочую директорию
WORKDIR /app

# Копируем ТОЛЬКО файлы бэкенда из нужной папки в корень контейнера
COPY satory-tea/backend/package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем все остальные файлы бэкенда
COPY satory-tea/backend/ ./

# Явно указываем, что запускать серверный файл
# (это гарантирует, что Amvera не запустит мобилку из корня)
CMD ["node", "server.js"]
