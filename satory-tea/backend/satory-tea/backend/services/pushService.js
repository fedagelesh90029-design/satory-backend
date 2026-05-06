/**
 * pushService.js
 * Отправка Expo Push Notifications.
 * Документация: https://docs.expo.dev/push-notifications/sending-notifications/
 */
const https = require('https');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Отправляет push-уведомление одному или нескольким токенам.
 * @param {string|string[]} tokens — Expo push token(s)
 * @param {string} title
 * @param {string} body
 * @param {object} data — дополнительные данные (для навигации)
 */
async function sendPush(tokens, title, body, data = {}) {
  const list = Array.isArray(tokens) ? tokens : [tokens];
  const valid = list.filter(t => t && t.startsWith('ExponentPushToken'));
  if (!valid.length) return;

  const messages = valid.map(to => ({
    to, title, body, data,
    sound: 'default',
    badge: 1,
    channelId: 'default',
  }));

  return new Promise((resolve) => {
    const payload = JSON.stringify(messages);
    const req = https.request(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    }, (res) => {
      res.resume();
      resolve();
    });
    req.on('error', () => resolve());
    req.setTimeout(10000, () => { req.destroy(); resolve(); });
    req.write(payload);
    req.end();
  });
}

/**
 * Отправляет пуш всем пользователям у которых есть токен.
 * Фильтрует по настройке (settingKey).
 */
async function broadcastPush(db, title, body, data = {}, settingKey = null) {
  try {
    const query = { push_token: { $exists: true } };
    const users = await db.users.find(query);

    const tokens = users
      .filter(u => {
        if (!u.push_token) return false;
        // Проверяем настройку пользователя если указана
        if (settingKey && u.push_settings) {
          return u.push_settings[settingKey] !== false;
        }
        return true;
      })
      .map(u => u.push_token);

    if (tokens.length) {
      await sendPush(tokens, title, body, data);
      console.log(`[push] Отправлено ${tokens.length} уведомлений: "${title}"`);
    }
  } catch (e) {
    console.error('[push] Ошибка broadcastPush:', e.message);
  }
}

/**
 * Отправляет пуш конкретному пользователю по _id.
 */
async function sendPushToUser(db, userId, title, body, data = {}) {
  try {
    const user = await db.users.findOne({ _id: userId });
    if (!user?.push_token) return;
    await sendPush(user.push_token, title, body, data);
  } catch (e) {
    console.error('[push] Ошибка sendPushToUser:', e.message);
  }
}

module.exports = { sendPush, broadcastPush, sendPushToUser };
