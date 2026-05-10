/**
 * telegramBot.js
 * Telegram-бот для отправки OTP-кодов пользователям.
 * Использует long polling — работает без HTTPS/webhook.
 */

const https = require('https');
const db = require('../db');

const BOT_TOKEN = process.env.TG_BOT_TOKEN;

// ─── HTTP утилита ─────────────────────────────────────────────────────────────

function tgRequest(method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ ok: false, description: raw }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(35000, () => { req.destroy(); reject(new Error('Telegram timeout')); });
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
    console.log(`[telegram] Нет привязанного Telegram для ${phone}`);
    return false;
  }
  return sendTelegramMessage(user.telegram_chat_id, `🔐 <b>${message}</b>`);
}

// ─── Получить имя бота ────────────────────────────────────────────────────────

async function getBotUsername() {
  if (!BOT_TOKEN) return null;
  try {
    const res = await tgRequest('getMe', {});
    return res.ok ? res.result.username : null;
  } catch { return null; }
}

// ─── Обработка одного update ──────────────────────────────────────────────────

async function handleWebhook(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from?.first_name || 'Гость';

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
      // Если пользователь новый (ещё не зарегистрирован) — сохраняем chat_id
      // в OTP-записи, чтобы verify-otp применил его при создании аккаунта.
      const user = await db.users.findOne({ phone: pending.phone });
      if (user) {
        await db.users.update(
          { phone: pending.phone },
          { $set: { telegram_chat_id: chatId, telegram_username: msg.from?.username || null } }
        );
        console.log(`[telegram] Привязан chat_id=${chatId} к существующему пользователю ${pending.phone}`);
      } else {
        // Новый пользователь — запоминаем chat_id в OTP-записи
        await db.otp_codes.update(
          { tg_link_hash: payload },
          { $set: { tg_chat_id: chatId, tg_username: msg.from?.username || null } }
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

  // Удаляем webhook если был установлен
  try {
    await tgRequest('deleteWebhook', { drop_pending_updates: false });
    console.log('[telegram] Webhook удалён, запускаем polling...');
  } catch (e) {
    console.error('[telegram] Ошибка удаления webhook:', e.message);
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

      if (res.ok && res.result && res.result.length > 0) {
        for (const update of res.result) {
          pollingOffset = update.update_id + 1;
          handleWebhook(update).catch(e => console.error('[telegram] Ошибка обработки:', e.message));
        }
      }
      // Сразу следующий запрос (long polling — блокируется на 25с на сервере Telegram)
      if (pollingActive) setTimeout(poll, 100);
    } catch (e) {
      if (!e.message.includes('timeout')) {
        console.error('[telegram] Polling error:', e.message);
      }
      // При сетевой ошибке — пауза 5 секунд перед повтором
      if (pollingActive) setTimeout(poll, 5000);
    }
  };

  poll();
}

function stopPolling() {
  pollingActive = false;
}

module.exports = { sendOtpViaTelegram, sendTelegramMessage, handleWebhook, getBotUsername, startPolling, stopPolling };
