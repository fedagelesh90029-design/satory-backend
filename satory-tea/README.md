# Satory Tea App

Мобильное приложение для чайной **Satory** (iOS + Android) + бэкенд.

## Запуск бэкенда

```bash
cd backend
npm install
npm run dev
# Сервер: http://localhost:3000
```

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
