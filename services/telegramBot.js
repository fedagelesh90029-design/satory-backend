/**
 * telegramBot.js
 * Telegram-бот для отправки OTP-кодов пользователям.
 *
 * Схема работы:
 * 1. Пользователь нажимает "Получить код в Telegram" в приложении
 * 2. Приложение открывает ссылку: https://t.me/ВАШ_БОТ?start=PHONE_HASH
 * 3. Пользователь нажимает /start в боте
 * 4. Бот привязывает chat_id к номеру телефона и отправляет код
 *
 * Переменные окружения:
 *   TG_BOT_TOKEN — токен бота от @BotFather
 */

const https = require('https');
const db = require('../db');

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

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
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Telegram timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── Отправить сообщение пользователю ────────────────────────────────────────

async function sendTelegramMessage(chatId, text) {
  const res = await tgRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
  if (!res.ok) console.error('[telegram] Ошибка отправки:', res.description);
  return res.ok;
}

// ─── Отправить OTP по номеру телефона ────────────────────────────────────────

async function sendOtpViaTelegram(phone, message) {
  // Ищем привязанный chat_id по номеру телефона
  const user = await db.users.findOne({ phone });
  if (!user || !user.telegram_chat_id) {
    console.log(`[telegram] Нет привязанного Telegram для ${phone}`);
    return false;
  }
  return sendTelegramMessage(user.telegram_chat_id, `🔐 <b>${message}</b>`);
}

// ─── Обработка webhook от Telegram ───────────────────────────────────────────

async function handleWebhook(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from?.first_name || 'Гость';

  // /start PHONE_HASH — привязка телефона
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const payload = parts[1]; // phone hash

    if (payload) {
      // Ищем pending привязку по hash
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

      // Привязываем chat_id к пользователю
      await db.users.update({ phone: pending.phone }, { $set: { telegram_chat_id: chatId, telegram_username: msg.from?.username || null } });

      // Отправляем код
      await sendTelegramMessage(chatId,
        `👋 Привет, ${firstName}!\n\n` +
        `✅ Telegram привязан к вашему аккаунту Satori Tea.\n\n` +
        `🔐 Ваш код подтверждения:\n\n` +
        `<b style="font-size:24px">${pending.code}</b>\n\n` +
        `⏱ Код действителен 5 минут.`
      );

      // Удаляем hash (код остаётся в otp_codes)
      await db.otp_codes.update({ tg_link_hash: payload }, { $set: { tg_link_hash: null } });

      console.log(`[telegram] Привязан chat_id=${chatId} к телефону ${pending.phone}`);
    } else {
      // Просто /start без payload
      await sendTelegramMessage(chatId,
        `🍵 <b>Satori Tea</b>\n\n` +
        `Этот бот отправляет коды подтверждения для входа в приложение.\n\n` +
        `Откройте приложение Satori Tea и нажмите "Получить код в Telegram".`
      );
    }
    return;
  }

  // Любое другое сообщение
  await sendTelegramMessage(chatId,
    `🍵 Откройте приложение <b>Satori Tea</b> и нажмите "Получить код в Telegram".`
  );
}

// ─── Установить webhook ───────────────────────────────────────────────────────

async function setWebhook(url) {
  const res = await tgRequest('setWebhook', { url, allowed_updates: ['message'] });
  console.log('[telegram] setWebhook:', res.ok ? '✅ OK' : `❌ ${res.description}`);
  return res;
}

// ─── Получить username бота ───────────────────────────────────────────────────

async function getBotUsername() {
  if (!BOT_TOKEN) return null;
  try {
    const res = await tgRequest('getMe', {});
    return res.ok ? res.result.username : null;
  } catch { return null; }
}

module.exports = { sendOtpViaTelegram, sendTelegramMessage, handleWebhook, setWebhook, getBotUsername };
