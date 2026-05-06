/**
 * iikoFileParser.js
 * Изолированный парсер файлов выгрузки iiko (xlsx/xls/csv).
 * Чистые функции без side-эффектов — легко тестируются независимо.
 */
const XLSX = require('xlsx');

// ─── Утилиты ────────────────────────────────────────────────────────────────

/**
 * Нормализует номер телефона к формату +7XXXXXXXXXX.
 * Принимает: 8XXXXXXXXXX, +7XXXXXXXXXX, 7XXXXXXXXXX, 8 (XXX) XXX-XX-XX и т.д.
 * @param {string} raw
 * @returns {string|null}
 */
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    return '+7' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '+7' + digits;
  }
  return null;
}

/**
 * Рассчитывает статус лояльности по балансу.
 * @param {number} balance
 * @returns {'Бронза'|'Серебро'|'Золото'}
 */
function calcLoyaltyStatus(balance) {
  if (balance >= 1000) return 'Золото';
  if (balance >= 500) return 'Серебро';
  return 'Бронза';
}

/**
 * Читает файл xlsx/xls/csv и возвращает массив объектов (первая строка — заголовки).
 * @param {string} filePath
 * @returns {Array<Object>}
 */
function readFile(filePath) {
  let workbook;
  try {
    workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
  } catch (e) {
    throw new Error(`Не удалось прочитать файл "${filePath}": ${e.message}`);
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Файл "${filePath}" не содержит листов`);

  // Сначала пробуем стандартный парсинг
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length > 0) {
    const firstKey = Object.keys(rows[0])[0] || '';
    // Если первая строка — не заголовок (например "Товары"), ищем строку с реальными заголовками
    const headerKeywords = ['название', 'наименование', 'name', 'артикул', 'код'];
    const hasHeader = headerKeywords.some(k => firstKey.toLowerCase().includes(k));
    if (hasHeader) return rows;
  }

  // Ищем строку с заголовками (перебираем первые 10 строк)
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  let headerRow = 0;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i].map(c => String(c).toLowerCase().trim());
    if (row.some(c => ['название', 'наименование', 'name', 'артикул', 'код'].includes(c))) {
      headerRow = i;
      break;
    }
  }

  // Парсим начиная с найденной строки заголовков
  return XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRow });
}

/**
 * Находит значение строки по возможным именам колонок (case-insensitive, trim).
 * @param {Object} row
 * @param {string[]} aliases
 * @returns {string}
 */
function col(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find(k => k.trim().toLowerCase() === alias.trim().toLowerCase());
    if (found !== undefined) return String(row[found] ?? '').trim();
  }
  return '';
}

// ─── Парсер товаров ──────────────────────────────────────────────────────────

/**
 * Парсит файл выгрузки товаров iiko.
 * Ожидаемые колонки: Наименование, Цена, Остаток, Группа, Код, Описание, Единица
 * @param {string} filePath
 * @returns {Promise<Array<{iiko_id,name,category,price,stock,description,unit}>>}
 */
async function parseProductsFile(filePath) {
  const rows = readFile(filePath);
  if (rows.length === 0) throw new Error('Файл товаров пуст или не содержит данных');

  const result = [];
  let skipped = 0;

  for (const row of rows) {
    const name    = col(row, ['наименование', 'название', 'name']).replace(/^\d+\s+/, '');
    const iiko_id = col(row, ['код', 'артикул', 'code', 'id']);
    if (!name || !iiko_id) { skipped++; continue; }

    const priceRaw = col(row, ['цена, р.', 'цена', 'price', 'стоимость']);
    const stockRaw = col(row, ['остаток', 'stock', 'количество', 'кол-во']);

    // Определяем категорию: из файла или по названию
    let category = col(row, ['группа', 'категория', 'group', 'category']);
    if (!category) {
      const n = name.toLowerCase();
      if (/пуэр|шу |шэн |пу эр/.test(n)) category = 'Пуэр';
      else if (/улун|габа|те гуань|дань цун|жоу гуй|да хун пао|фо шоу|ши жу|уи |вулкан|алишань|ли шань|молочный/.test(n)) category = 'Улун';
      else if (/зелён|люй ча|матча|лун цзин|би ло|сюэ я|тай пин|мэндин|цзи бянь/.test(n)) category = 'Зелёный чай';
      else if (/красный|хун ча|дянь хун|цзинь цзюнь|да цзинь|мэй чжань|вай шань|янь сюнь|бандун|е шен|фэнцин|цзыян|цзю до|цимень|жи юэ|мо чжень|лао пин/.test(n)) category = 'Красный чай';
      else if (/белый|бай |инь чжень|бай му дань|я бао|е шен я|юэ гуан|улян шань/.test(n)) category = 'Белый чай';
      else if (/лю бао|аньхуа|хей ча/.test(n)) category = 'Тёмный чай';
      else if (/гайвань|чайник|пиала|чахай|чабань|чахэ|сервиз|набор посуды|набор чайный|шиборидаси|бутылка|кружка/.test(n)) category = 'Посуда';
      else if (/торт|чизкейк|конфета|шоколад|кукис|банановый|сливочный|травяной|дубайский|ассорти/.test(n)) category = 'Еда';
      else if (/благовон|подставка|полотенце|сито|щипцы|шило|венчик|ёршик|бомбилья|инструмент|мерная ложка|фигурка/.test(n)) category = 'Аксессуары';
      else if (/иван чай|анчан|гибискус|лаванда|лимон|бергамот|саган|ягодно|гречишный|жасмин/.test(n)) category = 'Травы и добавки';
      else if (/чай в зале|чай в vip|церемония|чай с собой|доп-гость|enso|матча-лате/.test(n)) category = 'Услуги';
      else category = 'Прочее';
    }

    result.push({
      iiko_id,
      name,
      category,
      price:       Math.round(parseFloat(priceRaw.replace(',', '.')) || 0),
      stock:       stockRaw !== '' ? parseFloat(stockRaw.replace(',', '.')) : null,
      description: col(row, ['описание', 'description']) || '',
      unit:        col(row, ['единица', 'ед.', 'unit', 'ед. измерения']) || '',
    });
  }

  return result;
}

// ─── Парсер бонусного журнала ────────────────────────────────────────────────

/**
 * Парсит файл журнала бонусных операций iikoCard.
 * Ожидаемые колонки: Телефон, Имя/Гость, Баланс после операции, Начислено, Списано, Дата
 * @param {string} filePath
 * @returns {Promise<Array<{phone,guest_name,date,operation_type,accrued,spent,balance}>>}
 */
async function parseBonusesFile(filePath) {
  const rows = readFile(filePath);
  if (rows.length === 0) throw new Error('Файл бонусного журнала пуст или не содержит данных');

  const result = [];
  let skipped = 0;

  for (const row of rows) {
    const rawPhone = col(row, ['телефон', 'phone', 'номер телефона', 'номер']);
    const phone = normalizePhone(rawPhone);
    if (!phone) { skipped++; continue; }

    const balanceRaw = col(row, ['баланс после операции', 'баланс', 'balance', 'остаток баллов']);
    const accruedRaw = col(row, ['начислено', 'сумма начисления', 'accrued', 'начисление']);
    const spentRaw   = col(row, ['списано', 'сумма списания', 'spent', 'списание']);
    const dateRaw    = col(row, ['дата операции', 'дата', 'date', 'время']);
    const opType     = col(row, ['тип операции', 'операция', 'operation_type', 'тип']) || 'unknown';

    result.push({
      phone,
      guest_name:     col(row, ['имя', 'гость', 'name', 'клиент', 'фио']) || '',
      date:           dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
      operation_type: opType,
      accrued:        parseFloat(String(accruedRaw).replace(',', '.')) || 0,
      spent:          parseFloat(String(spentRaw).replace(',', '.')) || 0,
      balance:        parseFloat(String(balanceRaw).replace(',', '.')) || 0,
    });
  }

  return result;
}

module.exports = { parseProductsFile, parseBonusesFile, normalizePhone, calcLoyaltyStatus };
