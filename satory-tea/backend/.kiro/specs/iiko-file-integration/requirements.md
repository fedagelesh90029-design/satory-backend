# Requirements Document

## Introduction

Интеграция приложения чайной Satory с системой iiko без использования платного API.
Данные о товарах и бонусных операциях получаются через файловые выгрузки (Excel/CSV),
которые iiko умеет формировать штатными средствами. Бэкенд (Node.js + Express + nedb)
парсит эти файлы и обновляет локальную БД, которую затем читает мобильное приложение (React Native / Expo).

Существующий роут `/api/iiko/sync` переориентируется с платного REST API на файловый парсинг.

## Glossary

- **File_Importer**: модуль бэкенда, отвечающий за чтение и парсинг файлов выгрузки iiko
- **Product_Sync**: процесс обновления коллекции `products` в nedb из файла выгрузки товаров
- **Bonus_Sync**: процесс обновления бонусных балансов пользователей из файла журнала операций iikoCard
- **Upload_Dir**: директория `backend/uploads/iiko/`, в которую помещаются файлы выгрузки
- **iiko_id**: уникальный идентификатор товара или гостя в системе iiko, используется как ключ при upsert
- **Delta**: набор изменений (добавленные, обновлённые, удалённые записи) за один цикл синхронизации
- **Bonus_Transaction**: запись о начислении или списании бонусов для конкретного гостя
- **Round_Trip**: свойство: файл → парсинг → объект → сериализация → файл того же формата
- **QR_Payload**: JSON-объект `{userId, phone, timestamp, signature}`, закодированный в QR-код для идентификации гостя на кассе
- **QR_Signature**: HMAC-SHA256 подпись `userId + phone + timestamp` на серверном секрете, защищающая QR от подделки
- **Bonus_Balance**: актуальный бонусный баланс пользователя в поле `bonus_balance` коллекции `users`, обновляемый через Bonus_Sync

---

## Requirements

### Requirement 1: Загрузка файла выгрузки товаров

**User Story:** Как администратор чайной, я хочу загружать файл выгрузки товаров из iiko на сервер, чтобы данные о товарах обновлялись без ручного редактирования БД.

#### Acceptance Criteria

1. THE File_Importer SHALL принимать файлы форматов `.xlsx`, `.xls` и `.csv` через эндпоинт `POST /api/iiko/upload/products`.
2. WHEN файл загружен, THE File_Importer SHALL сохранять его в директорию Upload_Dir с именем `products_latest.<ext>`.
3. IF загруженный файл имеет расширение, отличное от `.xlsx`, `.xls`, `.csv`, THEN THE File_Importer SHALL вернуть HTTP 400 с описанием допустимых форматов.
4. IF размер загруженного файла превышает 10 МБ, THEN THE File_Importer SHALL вернуть HTTP 413 и отклонить файл.
5. THE File_Importer SHALL создавать директорию Upload_Dir автоматически при первом запуске, если она не существует.

---

### Requirement 2: Парсинг файла товаров

**User Story:** Как разработчик, я хочу, чтобы File_Importer корректно читал структуру выгрузки iiko, чтобы данные о товарах попадали в БД без ручной правки.

#### Acceptance Criteria

1. WHEN файл товаров содержит строку заголовков, THE File_Importer SHALL определять колонки по именам без учёта регистра и пробелов по краям.
2. THE File_Importer SHALL маппировать колонки iiko на поля nedb согласно таблице: `Наименование` → `name`, `Цена` → `price`, `Остаток` → `stock`, `Группа` → `category`, `Код` → `iiko_id`, `Описание` → `description`, `Единица` → `unit`.
3. IF строка товара не содержит значений в колонках `Наименование` и `Код`, THEN THE File_Importer SHALL пропускать эту строку и увеличивать счётчик `skipped`.
4. THE File_Importer SHALL преобразовывать значение колонки `Цена` в целое число (округление до рублей).
5. THE File_Importer SHALL преобразовывать значение колонки `Остаток` в число с плавающей точкой; при отсутствии значения устанавливать `stock = null`.
6. FOR ALL валидных строк файла товаров, парсинг SHALL производить объект с полями `iiko_id`, `name`, `category`, `price`, `stock`, `description`, `unit`.

---

### Requirement 3: Синхронизация товаров в БД (Product_Sync)

**User Story:** Как администратор, я хочу, чтобы после загрузки файла товары в приложении обновлялись автоматически, чтобы клиенты видели актуальный каталог.

#### Acceptance Criteria

1. WHEN Product_Sync запущен, THE Product_Sync SHALL выполнять upsert каждого товара по полю `iiko_id`: обновлять существующий или вставлять новый.
2. WHEN Product_Sync завершён, THE Product_Sync SHALL возвращать Delta с полями `added`, `updated`, `skipped`, `total`.
3. THE Product_Sync SHALL сохранять поля `rating`, `reviews_count`, `badge`, `year` существующего документа при обновлении (не перезаписывать).
4. WHILE Product_Sync выполняется, THE Product_Sync SHALL обрабатывать строки последовательно и не блокировать event loop дольше 100 мс на батч из 50 записей.
5. IF в файле отсутствует товар с `iiko_id`, который есть в БД, THEN THE Product_Sync SHALL устанавливать полю `active = false` для этого товара (мягкое удаление).
6. WHEN Product_Sync завершён успешно, THE Product_Sync SHALL записывать метку времени последней синхронизации в файл `Upload_Dir/last_sync.json`.

---

### Requirement 4: Загрузка и парсинг журнала бонусных операций (Bonus_Sync)

**User Story:** Как администратор, я хочу загружать журнал операций iikoCard, чтобы бонусные балансы гостей в приложении соответствовали данным iiko.

#### Acceptance Criteria

1. THE File_Importer SHALL принимать файл журнала бонусных операций через эндпоинт `POST /api/iiko/upload/bonuses` в форматах `.xlsx`, `.xls`, `.csv`.
2. THE File_Importer SHALL маппировать колонки журнала на поля Bonus_Transaction: `Гость` → `guest_name`, `Телефон` → `phone`, `Дата` → `date`, `Тип операции` → `operation_type`, `Начислено` → `accrued`, `Списано` → `spent`, `Баланс` → `balance`.
3. IF строка журнала не содержит значения в колонке `Телефон`, THEN THE File_Importer SHALL пропускать эту строку.
4. THE File_Importer SHALL нормализовывать номер телефона: удалять пробелы, скобки, дефисы, приводить к формату `+7XXXXXXXXXX`.
5. WHEN Bonus_Sync запущен, THE Bonus_Sync SHALL обновлять поле `bonus_balance` пользователя в коллекции `users` по совпадению нормализованного `phone`, используя последнее по дате значение `balance` из журнала.
6. WHEN Bonus_Sync завершён, THE Bonus_Sync SHALL возвращать Delta с полями `matched`, `unmatched`, `total`.
7. THE Bonus_Sync SHALL сохранять каждую строку журнала как Bonus_Transaction в отдельную коллекцию `bonus_transactions` для истории операций.

---

### Requirement 5: Эндпоинт ручного запуска синхронизации

**User Story:** Как администратор, я хочу запускать синхронизацию вручную через API, чтобы контролировать момент обновления данных.

#### Acceptance Criteria

1. THE File_Importer SHALL предоставлять эндпоинт `POST /api/iiko/sync/products`, который запускает Product_Sync из последнего загруженного файла `products_latest.*`.
2. THE File_Importer SHALL предоставлять эндпоинт `POST /api/iiko/sync/bonuses`, который запускает Bonus_Sync из последнего загруженного файла бонусов.
3. IF файл `products_latest.*` отсутствует в Upload_Dir при вызове `POST /api/iiko/sync/products`, THEN THE File_Importer SHALL вернуть HTTP 404 с сообщением `"Файл выгрузки не найден. Загрузите файл через POST /api/iiko/upload/products"`.
4. WHEN синхронизация завершена, THE File_Importer SHALL возвращать JSON с Delta и полем `synced_at` (ISO 8601 timestamp).
5. THE File_Importer SHALL предоставлять эндпоинт `GET /api/iiko/status`, возвращающий: `last_products_sync`, `last_bonuses_sync`, `products_file_exists`, `bonuses_file_exists`.

---

### Requirement 6: Совместимость с существующим роутом `/api/iiko/sync`

**User Story:** Как разработчик, я хочу, чтобы переход на файловую интеграцию не сломал существующий код, чтобы не требовалось менять клиентскую часть.

#### Acceptance Criteria

1. THE File_Importer SHALL сохранять эндпоинт `POST /api/iiko/sync` работоспособным: при наличии файла `products_latest.*` — запускать Product_Sync; при его отсутствии — возвращать понятное сообщение об ошибке.
2. THE File_Importer SHALL сохранять эндпоинт `GET /api/iiko/status` с теми же полями ответа (`connected`, `configured`), добавляя новые поля без удаления старых.
3. IF переменная окружения `IIKO_API_KEY` задана, THEN THE File_Importer SHALL логировать предупреждение о том, что файловый режим активен и API-ключ игнорируется.

---

### Requirement 7: Парсер как изолированный модуль (Round-Trip)

**User Story:** Как разработчик, я хочу, чтобы парсер файлов был изолированным модулем с предсказуемым поведением, чтобы его можно было тестировать независимо.

#### Acceptance Criteria

1. THE File_Importer SHALL экспортировать функции `parseProductsFile(filePath)` и `parseBonusesFile(filePath)` как отдельный модуль `backend/services/iikoFileParser.js`.
2. FOR ALL валидных файлов товаров, `parseProductsFile` SHALL возвращать массив объектов, каждый из которых содержит поля `iiko_id`, `name`, `price` с ненулевыми значениями.
3. FOR ALL валидных файлов журнала бонусов, `parseBonusesFile` SHALL возвращать массив объектов, каждый из которых содержит поля `phone`, `balance`, `date`.
4. IF файл повреждён или не читается, THEN `parseProductsFile` и `parseBonusesFile` SHALL выбрасывать ошибку с описательным сообщением, а не возвращать пустой массив молча.

---

### Requirement 8: Расписание автоматической синхронизации

**User Story:** Как администратор, я хочу, чтобы синхронизация запускалась по расписанию, чтобы не запускать её вручную каждый раз.

#### Acceptance Criteria

1. WHERE переменная окружения `IIKO_SYNC_CRON` задана, THE File_Importer SHALL запускать Product_Sync по указанному cron-расписанию.
2. WHERE переменная окружения `IIKO_BONUS_SYNC_CRON` задана, THE File_Importer SHALL запускать Bonus_Sync по указанному cron-расписанию.
3. IF автоматическая синхронизация завершается с ошибкой, THEN THE File_Importer SHALL логировать ошибку в stdout с префиксом `[iiko-cron]` и продолжать работу (не падать).
4. WHEN автоматическая синхронизация завершена успешно, THE File_Importer SHALL логировать Delta в stdout с префиксом `[iiko-cron]`.

---

### Requirement 9: Отображение бонусного баланса в приложении

**User Story:** Как пользователь приложения, я хочу видеть свой актуальный бонусный баланс, чтобы знать, сколько бонусов у меня накоплено после посещения чайной.

#### Acceptance Criteria

1. THE бэкенд SHALL предоставлять эндпоинт `GET /api/bonus/balance`, защищённый JWT, возвращающий `{ bonus_balance, last_updated, loyalty_status }`.
2. WHEN пользователь открывает экран профиля, приложение SHALL запрашивать `GET /api/bonus/balance` и отображать полученное значение `bonus_balance`.
3. THE приложение SHALL отображать рядом с балансом метку `last_updated` в формате "Обновлено: ЧЧ:ММ ДД.ММ.ГГГГ", чтобы пользователь понимал актуальность данных.
4. IF `bonus_balance` равен `null` или пользователь не найден в выгрузке iiko, THE приложение SHALL отображать "—" вместо числа и подсказку "Баланс появится после первого посещения".
5. THE эндпоинт `GET /api/bonus/balance` SHALL также возвращать последние 10 записей из `bonus_transactions` для данного пользователя (по совпадению `phone`) в поле `history`.
6. WHEN Bonus_Sync обновляет `bonus_balance` пользователя, THE бэкенд SHALL также пересчитывать `loyalty_status` по правилу: 0–499 → "Бронза", 500–999 → "Серебро", 1000+ → "Золото".

---

### Requirement 10: Генерация QR-кода для идентификации на кассе

**User Story:** Как пользователь приложения, я хочу показывать QR-код кассиру, чтобы он мог найти меня в iiko и начислить или списать бонусы.

#### Acceptance Criteria

1. THE бэкенд SHALL предоставлять эндпоинт `GET /api/bonus/qr`, защищённый JWT, возвращающий `{ qr_data, expires_at }`.
2. THE QR_Payload SHALL содержать поля `{ userId, phone, timestamp, signature }`, где `timestamp` — Unix-время генерации, `signature` — HMAC-SHA256 от строки `userId:phone:timestamp` с секретом `QR_SECRET` из `.env`.
3. THE QR_Payload SHALL быть действителен 5 минут: IF `Date.now()/1000 - timestamp > 300`, THE бэкенд SHALL считать QR устаревшим при верификации.
4. THE приложение SHALL отображать QR-код на отдельном экране `/qr`, генерируя его из строки `qr_data` с помощью библиотеки `react-native-qrcode-svg`.
5. THE экран QR SHALL показывать таймер обратного отсчёта до истечения QR и кнопку "Обновить QR" для генерации нового.
6. THE экран QR SHALL отображать имя пользователя и последние 4 цифры телефона под QR-кодом, чтобы кассир мог сверить личность.
7. THE бэкенд SHALL предоставлять эндпоинт `POST /api/bonus/qr/verify` (для будущей интеграции с кассовым терминалом), принимающий `{ qr_data }` и возвращающий `{ valid, userId, phone, expires_at }` без изменения баланса.

---

### Requirement 11: Ручное начисление бонусов администратором (обходной путь)

**User Story:** Как администратор чайной, я хочу вручную корректировать бонусный баланс пользователя в приложении, чтобы синхронизировать данные с iiko без ожидания следующей выгрузки.

#### Acceptance Criteria

1. THE бэкенд SHALL предоставлять эндпоинт `POST /api/admin/bonus/adjust`, защищённый отдельным `ADMIN_SECRET` заголовком `x-admin-secret`, принимающий `{ phone, delta, comment }`.
2. WHEN `POST /api/admin/bonus/adjust` вызван с `delta > 0`, THE бэкенд SHALL увеличивать `bonus_balance` пользователя на `delta` и записывать Bonus_Transaction с `operation_type = "manual_accrual"`.
3. WHEN `POST /api/admin/bonus/adjust` вызван с `delta < 0`, THE бэкенд SHALL уменьшать `bonus_balance` пользователя на `|delta|`, но не ниже 0, и записывать Bonus_Transaction с `operation_type = "manual_deduction"`.
4. IF пользователь с указанным `phone` не найден в коллекции `users`, THE бэкенд SHALL вернуть HTTP 404.
5. WHEN баланс скорректирован, THE бэкенд SHALL пересчитывать `loyalty_status` по тем же правилам, что и Bonus_Sync (Requirement 9, критерий 6).
6. THE эндпоинт SHALL возвращать `{ new_balance, loyalty_status, transaction_id }`.
