/**
 * telegramBot.js
 * Telegram-бот для отправки OTP-кодов пользователям.
 * Использует long polling — работает без HTTPS/webhook.
 */

const https = require('https');
const db = require('../db');

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const HTTPS_PROXY = process.env.HTTPS_PROXY || '';

let proxyAgent = null;
if (HTTPS_PROXY) {
  try {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    proxyAgent = new HttpsProxyAgent(HTTPS_PROXY);
    console.log('[telegram] Инициализирован прокси:', HTTPS_PROXY);
  } catch (e) {
    console.warn('[telegram] Не удалось загрузить https-proxy-agent:', e.message);
  }
}

// ─── HTTP утилита ─────────────────────────────────────────────────────────────

function tgRequest(method, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    if (proxyAgent) {
      options.agent = proxyAgent;
    }
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ ok: false, description: raw }); }
      });
    });
    req.on('error', (err) => {
      console.error('[telegram] Request error:', err.message);
      resolve({ ok: false, description: err.message });
    });
    req.setTimeout(35000, () => {
      req.destroy();
      console.error('[telegram] Request timeout');
      resolve({ ok: false, description: 'Telegram timeout' });
    });
    req.write(body);
    req.end();
  });
}

// ─── Отправить сообщение пользователю ────────────────────────────────────────

async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN) return false;
  const res = await tgRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
  if (!res.ok) console.error('[telegram] Ошибка отправки:', res.description);
  return res.ok;
}

// ─── Отправить OTP по номеру телефона ────────────────────────────────────────

async function sendOtpViaTelegram(phone, message) {
  const user = await db.users.findOne({ phone });
  if (!user || !user.telegram_chat_id) {
    console.log(`[telegram] Нет привязанного Telegram для ${phone} (user=${!!user}, chat_id=${user?.telegram_chat_id})`);
    return false;
  }
  return sendTelegramMessage(user.telegram_chat_id, `🔐 <b>${message}</b>`);
}

// ─── Получить имя бота ────────────────────────────────────────────────────────

let cachedBotUsername = null;
async function getBotUsername() {
  if (cachedBotUsername) return cachedBotUsername;
  if (!BOT_TOKEN) return null;
  try {
    const res = await tgRequest('getMe', {});
    if (res.ok) {
      cachedBotUsername = res.result.username;
      return cachedBotUsername;
    }
    console.error('[telegram] getMe error:', res.description);
    return null;
  } catch (e) {
    console.error('[telegram] getMe exception:', e.message);
    return null;
  }
}

// ─── Установка Webhook (если нужно) ──────────────────────────────────────────

async function setWebhook(url) {
  if (!BOT_TOKEN) return { ok: false, error: 'Token missing' };
  console.log(`[telegram] Установка webhook: ${url}`);
  const res = await tgRequest('setWebhook', { url, allowed_updates: ['message'] });
  if (res.ok) stopPolling(); // Если ставим вебхук — отключаем поллинг
  return res;
}

// ─── Обработка одного update ──────────────────────────────────────────────────

async function handleWebhook(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from?.first_name || 'Гость';
  const username = msg.from?.username || null;

  console.log(`[telegram] Входящее сообщение от ${chatId} (${username}): ${text.slice(0, 50)}`);

  if (text.startsWith('/start')) {
    const payload = text.split(' ')[1];

    if (payload) {
      const pending = await db.otp_codes.findOne({ tg_link_hash: payload });
      if (!pending) {
        await sendTelegramMessage(chatId, '❌ Ссылка устарела или недействительна.\n\nОткройте приложение Satori Tea и запросите код заново.');
        return;
      }
      if (Date.now() > pending.expires_at) {
        await sendTelegramMessage(chatId, '⏰ Ссылка истекла. Запросите код заново в приложении.');
        await db.otp_codes.remove({ tg_link_hash: payload });
        return;
      }

      // Пробуем привязать telegram_chat_id к существующему пользователю.
      const user = await db.users.findOne({ phone: pending.phone });
      if (user) {
        await db.users.update(
          { phone: pending.phone },
          { $set: { telegram_chat_id: chatId, telegram_username: username } }
        );
        console.log(`[telegram] Привязан chat_id=${chatId} к существующему пользователю ${pending.phone}`);
      } else {
        // Новый пользователь — запоминаем chat_id в OTP-записи
        await db.otp_codes.update(
          { tg_link_hash: payload },
          { $set: { tg_chat_id: chatId, tg_username: username } }
        );
        console.log(`[telegram] Сохранён chat_id=${chatId} для нового пользователя ${pending.phone}`);
      }

      await sendTelegramMessage(chatId,
        `👋 Привет, ${firstName}!\n\n` +
        `✅ Telegram привязан к вашему аккаунту Satori Tea.\n\n` +
        `🔐 Ваш код подтверждения:\n\n` +
        `<b>${pending.code}</b>\n\n` +
        `⏱ Код действителен 5 минут.`
      );

      // Очищаем hash чтобы ссылка не сработала повторно
      await db.otp_codes.update({ tg_link_hash: payload }, { $set: { tg_link_hash: null } });
      return;
    }

    // /start без payload — просто приветствие
    await sendTelegramMessage(chatId,
      `🍵 <b>Satori Tea</b>\n\n` +
      `Этот бот отправляет коды подтверждения для входа в приложение.\n\n` +
      `Откройте приложение Satori Tea и нажмите «Получить код в Telegram».`
    );
    return;
  }

  await sendTelegramMessage(chatId,
    `🍵 Откройте приложение <b>Satori Tea</b> и нажмите «Получить код в Telegram».`
  );
}

// ─── Long Polling ─────────────────────────────────────────────────────────────

let pollingOffset = 0;
let pollingActive = false;

async function startPolling() {
  if (!BOT_TOKEN) {
    console.log('[telegram] TG_BOT_TOKEN не задан — polling отключён');
    return;
  }

  // Удаляем webhook если был установлен (чтобы работал polling)
  try {
    const delRes = await tgRequest('deleteWebhook', { drop_pending_updates: false });
    if (delRes.ok) console.log('[telegram] Webhook удалён, запускаем polling...');
    else console.warn('[telegram] Ошибка удаления webhook:', delRes.description);
  } catch (e) {
    console.error('[telegram] Исключение при удалении webhook:', e.message);
  }

  pollingActive = true;
  console.log('[telegram] ✅ Long polling запущен');

  const poll = async () => {
    if (!pollingActive) return;
    try {
      const res = await tgRequest('getUpdates', {
        offset: pollingOffset,
        timeout: 25,
        allowed_updates: ['message'],
      });

      if (res.ok) {
        if (res.result && res.result.length > 0) {
          for (const update of res.result) {
            pollingOffset = update.update_id + 1;
            handleWebhook(update).catch(e => console.error('[telegram] Ошибка обработки:', e.message));
          }
        }
        // Успешный запрос — продолжаем
        if (pollingActive) setTimeout(poll, 100);
      } else {
        console.error('[telegram] Polling error response:', res.description);
        // Ошибка (например, 401 или 409) — ждём 10 сек перед повтором
        if (pollingActive) setTimeout(poll, 10000);
      }
    } catch (e) {
      if (!e.message.includes('timeout')) {
        console.error('[telegram] Polling exception:', e.message);
        if (pollingActive) setTimeout(poll, 5000);
      } else {
        // Таймаут — это нормально для long polling
        if (pollingActive) setTimeout(poll, 100);
      }
    }
  };

  poll();
}

function stopPolling() {
  pollingActive = false;
  console.log('[telegram] Long polling остановлен');
}

module.exports = { sendOtpViaTelegram, sendTelegramMessage, handleWebhook, getBotUsername, startPolling, stopPolling, setWebhook };

