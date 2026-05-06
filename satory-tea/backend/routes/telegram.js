/**
 * routes/telegram.js
 * Webhook для Telegram-бота + эндпоинт для получения ссылки привязки.
 */
const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');
const { handleWebhook, setWebhook, getBotUsername } = require('../services/telegramBot');

const OTP_TTL = 5 * 60 * 1000;

// ─── POST /api/telegram/webhook — входящие сообщения от Telegram ──────────────
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Telegram требует быстрый ответ
  try {
    await handleWebhook(req.body);
  } catch (e) {
    console.error('[telegram webhook]', e.message);
  }
});

// ─── GET /api/telegram/link — получить ссылку для привязки Telegram ───────────
// Пользователь нажимает кнопку в приложении → получает ссылку → открывает бота
router.post('/send-otp', auth, async (req, res) => {
  if (!process.env.TG_BOT_TOKEN) {
    return res.status(503).json({ error: 'Telegram не настроен' });
  }

  const user = await db.users.findOne({ _id: req.user.id });
  if (!user || !user.phone) return res.status(400).json({ error: 'Телефон не привязан к аккаунту' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = crypto.randomBytes(16).toString('hex');
  const expires_at = Date.now() + OTP_TTL;

  // Сохраняем OTP с hash для привязки
  const existing = await db.otp_codes.findOne({ phone: user.phone });
  if (existing) {
    await db.otp_codes.update({ phone: user.phone }, { $set: { code, expires_at, attempts: 0, tg_link_hash: hash } });
  } else {
    await db.otp_codes.insert({ phone: user.phone, code, expires_at, attempts: 0, tg_link_hash: hash });
  }

  const botUsername = await getBotUsername();
  if (!botUsername) return res.status(500).json({ error: 'Не удалось получить имя бота' });

  // Если у пользователя уже привязан Telegram — отправляем код напрямую
  if (user.telegram_chat_id) {
    const { sendTelegramMessage } = require('../services/telegramBot');
    await sendTelegramMessage(user.telegram_chat_id,
      `🔐 Ваш код подтверждения Satori Tea:\n\n<b>${code}</b>\n\n⏱ Действителен 5 минут.`
    );
    const p = user.phone;
    const phone_masked = p.length >= 4 ? p.slice(0, 3) + '***' + p.slice(-2) : p;
    return res.json({ success: true, method: 'telegram_direct', phone_masked });
  }

  // Иначе — даём ссылку для первичной привязки
  const tg_link = `https://t.me/${botUsername}?start=${hash}`;
  res.json({ success: true, method: 'telegram_link', tg_link, bot_username: botUsername });
});

// ─── GET /api/telegram/setup — установить webhook (вызывается один раз) ───────
router.get('/setup', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== (process.env.ADMIN_SECRET || 'satory_admin_2026')) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  const appUrl = process.env.APP_URL || `https://satory-backend-production.up.railway.app`;
  const result = await setWebhook(`${appUrl}/api/telegram/webhook`);
  res.json(result);
});

module.exports = router;
