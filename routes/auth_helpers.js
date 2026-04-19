/**
 * Общий SMS-хелпер — поддерживает sms.ru, smsaero.ru, smsc.ru, МТС Exolve
 */
const https = require('https');

async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER;

  // ── МТС Exolve (exolve.ru) ────────────────────────────────
  // Документация: https://exolve.ru/docs/
  // Переменные: MTS_API_KEY, MTS_SENDER (имя отправителя, напр. SatoriTea)
  if (provider === 'mts' && process.env.MTS_API_KEY) {
    // from — только если имя отправителя зарегистрировано в Exolve
    const payload = { number: phone, destination: phone, text: message };
    if (process.env.MTS_SENDER) payload.from = process.env.MTS_SENDER;

    const body = JSON.stringify(payload);

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.exolve.ru',
        path: '/messaging/v1/SendSMS',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MTS_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', d => (raw += d));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (res.statusCode === 200) {
              console.log(`[mts] SMS отправлено на ${phone}, id: ${data.message_id || '—'}`);
            } else {
              console.error(`[mts] Ошибка ${res.statusCode}:`, data);
            }
          } catch {
            console.error('[mts] Ошибка парсинга:', raw);
          }
          resolve();
        });
      });

      req.on('error', e => { console.error('[mts] Сетевая ошибка:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
      req.write(body);
      req.end();
    });
  }

  // ── SMSC.ru ───────────────────────────────────────────────
  if (provider === 'smsc' && process.env.SMSC_LOGIN && process.env.SMSC_PASSWORD) {
    const params = new URLSearchParams({
      login:   process.env.SMSC_LOGIN,
      psw:     process.env.SMSC_PASSWORD,
      phones:  phone,
      mes:     message,
      fmt:     '3', // JSON ответ
      charset: 'utf-8',
    });
    const url = `https://smsc.ru/sys/send.php?${params.toString()}`;
    return new Promise((resolve) => {
      const req = https.get(url, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.error) console.error(`[smsc] Ошибка: ${data.error_code} — ${data.error}`);
            else console.log(`[smsc] SMS отправлено на ${phone}, id: ${data.id}`);
          } catch { console.error('[smsc] Ошибка парсинга:', body); }
          resolve();
        });
      });
      req.on('error', e => { console.error('[smsc] Сетевая ошибка:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── SMS Aero ──────────────────────────────────────────────
  if (provider === 'smsaero' && process.env.SMSAERO_EMAIL && process.env.SMSAERO_API_KEY) {
    const email  = process.env.SMSAERO_EMAIL;
    const apiKey = process.env.SMSAERO_API_KEY;
    const sign   = process.env.SMSAERO_SIGN || 'SMS Aero';
    const params = new URLSearchParams({
      number:  phone.replace('+', ''),
      text:    message,
      sign:    sign,
      channel: 'INFORM',
    });
    const auth = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const url  = `https://gate.smsaero.ru/v2/sms/send?${params.toString()}`;
    return new Promise((resolve) => {
      const req = https.get(url, { headers: { Authorization: `Basic ${auth}` } }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.success) console.log(`[smsaero] SMS отправлено на ${phone}`);
            else console.error(`[smsaero] Ошибка:`, data.message || body);
          } catch { console.error('[smsaero] Ошибка парсинга:', body); }
          resolve();
        });
      });
      req.on('error', e => { console.error('[smsaero] Сетевая ошибка:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── SMS.ru ────────────────────────────────────────────────
  if (provider === 'smsru' && process.env.SMS_API_KEY) {
    const encoded = encodeURIComponent(message);
    const url = `https://sms.ru/sms/send?api_id=${process.env.SMS_API_KEY}&to=${phone}&msg=${encoded}&json=1`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status !== 'OK') console.error(`[sms.ru] Ошибка:`, data);
      else console.log(`[sms.ru] SMS отправлено на ${phone}`);
    } catch (e) { console.error(`[sms.ru] Ошибка:`, e.message); }
    return;
  }

  // ── DEV: вывод в консоль ──────────────────────────────────
  console.log(`\n📱 SMS для ${phone}: ${message}\n`);
}

module.exports = { sendSms };

async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER;

  // ── SMSC.ru ───────────────────────────────────────────────
  if (provider === 'smsc' && process.env.SMSC_LOGIN && process.env.SMSC_PASSWORD) {
    const params = new URLSearchParams({
      login:   process.env.SMSC_LOGIN,
      psw:     process.env.SMSC_PASSWORD,
      phones:  phone,
      mes:     message,
      fmt:     '3', // JSON ответ
      charset: 'utf-8',
    });
    const url = `https://smsc.ru/sys/send.php?${params.toString()}`;
    return new Promise((resolve) => {
      const req = https.get(url, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.error) console.error(`[smsc] Ошибка: ${data.error_code} — ${data.error}`);
            else console.log(`[smsc] SMS отправлено на ${phone}, id: ${data.id}`);
          } catch { console.error('[smsc] Ошибка парсинга:', body); }
          resolve();
        });
      });
      req.on('error', e => { console.error('[smsc] Сетевая ошибка:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── SMS Aero ──────────────────────────────────────────────
  if (provider === 'smsaero' && process.env.SMSAERO_EMAIL && process.env.SMSAERO_API_KEY) {
    const email  = process.env.SMSAERO_EMAIL;
    const apiKey = process.env.SMSAERO_API_KEY;
    const sign   = process.env.SMSAERO_SIGN || 'SMS Aero';
    const params = new URLSearchParams({
      number:  phone.replace('+', ''),
      text:    message,
      sign:    sign,
      channel: 'INFORM',
    });
    const auth = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const url  = `https://gate.smsaero.ru/v2/sms/send?${params.toString()}`;
    return new Promise((resolve) => {
      const req = https.get(url, { headers: { Authorization: `Basic ${auth}` } }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.success) console.log(`[smsaero] SMS отправлено на ${phone}`);
            else console.error(`[smsaero] Ошибка:`, data.message || body);
          } catch { console.error('[smsaero] Ошибка парсинга:', body); }
          resolve();
        });
      });
      req.on('error', e => { console.error('[smsaero] Сетевая ошибка:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── SMS.ru ────────────────────────────────────────────────
  if (provider === 'smsru' && process.env.SMS_API_KEY) {
    const encoded = encodeURIComponent(message);
    const url = `https://sms.ru/sms/send?api_id=${process.env.SMS_API_KEY}&to=${phone}&msg=${encoded}&json=1`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status !== 'OK') console.error(`[sms.ru] Ошибка:`, data);
      else console.log(`[sms.ru] SMS отправлено на ${phone}`);
    } catch (e) { console.error(`[sms.ru] Ошибка:`, e.message); }
    return;
  }

  // ── DEV: вывод в консоль ──────────────────────────────────
  console.log(`\n📱 SMS для ${phone}: ${message}\n`);
}

module.exports = { sendSms };
