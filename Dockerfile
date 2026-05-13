FROM node:20-slim

# Создаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY satory-tea/backend/package*.json ./

# Устанавливаем зависимости
RUN npm install --production

# Копируем остальные файлы бэкенда
COPY satory-tea/backend/ ./

# Проверяем наличие server.js (для отладки)
RUN ls -la

# Экспонируем порт
EXPOSE 3000

# Команда запуска
CMD ["node", "server.js"]
