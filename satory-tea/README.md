# Satori Tea App

Мобильное приложение для чайной **Satori** (iOS + Android) + бэкенд.

## Запуск бэкенда

```bash
cd backend
npm install
npm run dev
# Сервер: http://localhost:3000
```

## Запуск на VPS (Ubuntu)

1. Скопируйте `.env.production.example` в `.env` и заполните реальные значения.
2. Зайдите в папку backend:

```bash
cd backend
```

3. Обновите код и зависимости:

```bash
./deploy-vps.sh
```

4. Если используете systemd, создайте юнит на сервере на базе `satory-backend.service.example`.

5. Проверьте, что приложение работает:

```bash
curl http://127.0.0.1:3000/api/health
```

> Файлы `deploy-vps.sh` и `satory-backend.service.example` уже добавлены в проект.

## Запуск мобильного приложения

```bash
cd mobile
npm install
npx expo start
# Сканируйте QR в Expo Go (iOS/Android)
```

> Для работы с реальным устройством замените `localhost` в `mobile/constants/api.ts`
> на IP вашего компьютера, например: `http://192.168.1.100:3000/api`

## Структура

- `backend/` — Node.js + Express + SQLite
- `mobile/` — React Native (Expo Router)
  - Главная, Каталог, События, Профиль
  - Чат с чайным советником
  - Авторизация / регистрация
