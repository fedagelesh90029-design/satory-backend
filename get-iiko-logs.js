/**
 * Сбор логов для поддержки iiko
 */

const RAILWAY_URL = 'https://satory-backend-production.up.railway.app';
const ADMIN_SECRET = 'satory_admin_2026';

async function getLogs() {
  const lines = [];

  const log = (str = '') => {
    lines.push(str);
    process.stdout.write(str + '\n');
  };

  log('============================================================');
  log('IIKO API INTEGRATION LOGS');
  log('Date: ' + new Date().toISOString());
  log('App: Satory Tea Mobile Backend');
  log('Server: https://satory-backend-production.up.railway.app');
  log('Organization ID: d8ad09fc-0c90-47e2-b715-a4f1b2d2b8b4');
  log('============================================================');

  // 1. Статус
  log('\n[1] iiko API STATUS');
  const statusRes = await fetch(`${RAILWAY_URL}/api/iiko/status`);
  const status = await statusRes.json();
  log('HTTP ' + statusRes.status);
  log(JSON.stringify(status, null, 2));

  // 2. Попытка синхронизации через nomenclature
  log('\n[2] SYNC ATTEMPT via /api/1/nomenclature');
  log('Request: POST /api/iiko/sync/api');
  log('Headers: x-admin-secret: ***');
  const syncRes = await fetch(`${RAILWAY_URL}/api/iiko/sync/api`, {
    method: 'POST',
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  const syncData = await syncRes.json();
  log('HTTP ' + syncRes.status);
  log(JSON.stringify(syncData, null, 2));

  // 3. История синхронизаций
  log('\n[3] SYNC HISTORY (last 5 attempts)');
  const logsRes = await fetch(`${RAILWAY_URL}/api/admin/sync/status`, {
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  const logs = await logsRes.json();
  logs.slice(0, 5).forEach((entry, i) => {
    log(`  [${i+1}] ${entry.created_at} | type: ${entry.type} | status: ${entry.status} | rows: ${entry.rows_processed}`);
  });

  log('\n============================================================');
  log('END OF LOGS');
  log('============================================================');

  // Сохраняем в файл
  const fs = require('fs');
  fs.writeFileSync('iiko-logs-for-support.txt', lines.join('\n'), 'utf8');
  console.log('\n✅ Логи сохранены в файл: iiko-logs-for-support.txt');
}

getLogs().catch(console.error);
