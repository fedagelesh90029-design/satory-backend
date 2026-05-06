# Implementation Tasks

## Tasks

- [x] 1. Установить зависимости и обновить db.js
  - [x] 1.1 Установить multer, xlsx, node-cron в backend
  - [x] 1.2 Добавить коллекцию bonus_transactions в db.js
  - [x] 1.3 Создать директорию backend/uploads/iiko/ и backend/public/

- [x] 2. Реализовать backend/services/iikoFileParser.js
  - [x] 2.1 Функция normalizePhone(raw) — нормализация телефона к +7XXXXXXXXXX
  - [x] 2.2 Функция calcLoyaltyStatus(balance) — расчёт статуса лояльности
  - [x] 2.3 Функция parseProductsFile(filePath) — парсинг Excel товаров
  - [x] 2.4 Функция parseBonusesFile(filePath) — парсинг Excel бонусного журнала

- [x] 3. Обновить backend/routes/iiko.js
  - [x] 3.1 Добавить multer middleware для загрузки файлов
  - [x] 3.2 POST /api/iiko/upload/products — загрузка + Product_Sync
  - [x] 3.3 POST /api/iiko/upload/bonuses — загрузка + Bonus_Sync
  - [x] 3.4 POST /api/iiko/sync/products и /sync/bonuses — ручной запуск
  - [x] 3.5 Обновить GET /api/iiko/status — добавить новые поля, сохранить старые

- [x] 4. Создать backend/routes/bonus.js
  - [x] 4.1 GET /api/bonus/balance — баланс + история + loyalty_status
  - [x] 4.2 GET /api/bonus/transactions — полная история
  - [x] 4.3 GET /api/bonus/qr — генерация QR с HMAC-SHA256
  - [x] 4.4 POST /api/bonus/qr/verify — верификация QR для кассы

- [x] 5. Создать backend/routes/admin.js
  - [x] 5.1 Middleware проверки x-admin-secret
  - [x] 5.2 POST /api/admin/bonus/adjust — ручная корректировка баланса

- [x] 6. Создать backend/services/fileWatcher.js
  - [x] 6.1 Cron-задача для Product_Sync по IIKO_SYNC_CRON
  - [x] 6.2 Cron-задача для Bonus_Sync по IIKO_BONUS_SYNC_CRON

- [x] 7. Создать backend/public/cashier.html
  - [x] 7.1 Страница с html5-qrcode сканером
  - [x] 7.2 Отправка QR на /api/bonus/qr/verify и отображение данных гостя

- [x] 8. Подключить новые роуты в server.js

- [x] 9. Создать mobile/app/qr.tsx
  - [x] 9.1 Запрос GET /api/bonus/qr при монтировании
  - [x] 9.2 Отображение QR через react-native-qrcode-svg
  - [x] 9.3 Таймер обратного отсчёта 5 минут с кнопкой обновления

- [x] 10. Обновить .env.example и написать инструкцию
