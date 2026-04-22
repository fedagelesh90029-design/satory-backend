/**
 * Общий SMS-хелпер — поддерживает sms.ru, smsaero.ru, smsc.ru, МТС Exolve
 */
const https = require('https');

async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER;

  // ── МТС Exolve ────────────────────────────────────────────
  if (provider === 'mts' && process.env.MTS_API_KEY) {
    const key = process.env.MTS_API_KEY.trim();
    const sender = (process.env.MTS_SENDER || '').replace(/^\+/, '');
    const cleanPhone = phone.replace(/^\+/, '');
    if (!sender) { console.log(`[dev] SMS (нет MTS_SENDER): ${message}`); return; }

    const payload = JSON.stringify({ number: sender, destination: cleanPhone, text: message });
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.exolve.ru',
        path: '/messaging/v1/SendSMS',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', d => (raw += d));
        res.on('end', () => {
          console.log(`[mts] status=${res.statusCode}, body=${raw.slice(0, 200)}`);
          resolve();
        });
      });
      req.on('error', e => { console.error('[mts] error:', e.message); resolve(); });
      req.setTimeout(15000, () => { console.error('[mts] timeout'); req.destroy(); resolve(); });
      req.write(payload);
      req.end();
    });
  }

  // ── SMSC.ru ───────────────────────────────────────────────
  if (provider === 'smsc' && process.env.SMSC_LOGIN && process.env.SMSC_PASSWORD) {
    const params = new URLSearchParams({
      login: process.env.SMSC_LOGIN, psw: process.env.SMSC_PASSWORD,
      phones: phone, mes: message, fmt: '3', charset: 'utf-8',
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
      req.on('error', e => { console.error('[smsc] error:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── SMS Aero ──────────────────────────────────────────────
  if (provider === 'smsaero' && process.env.SMSAERO_EMAIL && process.env.SMSAERO_API_KEY) {
    const params = new URLSearchParams({
      number: phone.replace('+', ''), text: message,
      sign: process.env.SMSAERO_SIGN || 'SMS Aero', channel: 'INFORM',
    });
    const auth = Buffer.from(`${process.env.SMSAERO_EMAIL}:${process.env.SMSAERO_API_KEY}`).toString('base64');
    const url = `https://gate.smsaero.ru/v2/sms/send?${params.toString()}`;
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
      req.on('error', e => { console.error('[smsaero] error:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── SMS.ru ────────────────────────────────────────────────
  if (provider === 'smsru' && process.env.SMS_API_KEY) {
    const url = `https://sms.ru/sms/send?api_id=${process.env.SMS_API_KEY}&to=${phone}&msg=${encodeURIComponent(message)}&json=1`;
    return new Promise((resolve) => {
      const req = https.get(url, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            console.log(`[sms.ru] Ответ:`, JSON.stringify(data));
            if (data.status !== 'OK') console.error(`[sms.ru] Ошибка:`, data);
            else console.log(`[sms.ru] SMS отправлено на ${phone}`);
          } catch { console.error('[sms.ru] Ошибка парсинга:', body); }
          resolve();
        });
      });
      req.on('error', e => { console.error('[sms.ru] error:', e.message); resolve(); });
      req.setTimeout(10000, () => { req.destroy(); resolve(); });
    });
  }

  // ── DEV ───────────────────────────────────────────────────
  console.log(`\n📱 SMS для ${phone}: ${message}\n`);
}

module.exports = { sendSms };
