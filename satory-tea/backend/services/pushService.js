// Push-уведомления через Expo Push API
const https = require('https');

async function sendExpoPush(token, title, body, data = {}) {
  if (!token || !token.startsWith('ExponentPushToken')) return;

  const payload = JSON.stringify({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendPushToUser(db, userId, title, body, data = {}) {
  try {
    const user = await db.users.findOne({ _id: userId });
    if (!user || !user.push_token) return;
    await sendExpoPush(user.push_token, title, body, data);
  } catch (e) {
    console.error('[pushService] Error:', e.message);
  }
}

async function sendPushToAll(db, title, body, data = {}) {
  try {
    const users = await db.users.find({ push_token: { $exists: true } });
    const tokens = users.filter(u => u.push_token).map(u => u.push_token);
    for (const token of tokens) {
      await sendExpoPush(token, title, body, data).catch(() => {});
    }
    console.log(`[pushService] Sent push to ${tokens.length} users`);
  } catch (e) {
    console.error('[pushService] Error:', e.message);
  }
}

module.exports = { sendExpoPush, sendPushToUser, sendPushToAll };
