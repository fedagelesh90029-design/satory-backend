/**
 * fileWatcher.js
 * Cron-задачи для автоматической синхронизации из папки uploads/iiko/.
 * Запускается при старте сервера если заданы переменные окружения.
 */
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'iiko');

function initWatcher() {
  const menuCron   = process.env.IIKO_SYNC_CRON;
  const bonusCron  = process.env.IIKO_BONUS_SYNC_CRON;

  if (!menuCron && !bonusCron) {
    console.log('[iiko-cron] Переменные IIKO_SYNC_CRON и IIKO_BONUS_SYNC_CRON не заданы — автосинхронизация отключена');
    return;
  }

  // Ленивый импорт чтобы избежать циклических зависимостей
  const { runProductSync, runBonusSync } = require('../routes/iiko');

  if (menuCron) {
    if (!cron.validate(menuCron)) {
      console.error(`[iiko-cron] Неверный cron для IIKO_SYNC_CRON: "${menuCron}"`);
    } else {
      cron.schedule(menuCron, async () => {
        console.log(`[iiko-cron] Запуск Product_Sync по расписанию: ${menuCron}`);
        const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('products_latest'));
        if (!files.length) {
          console.log('[iiko-cron] Product_Sync: файл выгрузки не найден, пропускаем');
          return;
        }
        try {
          const delta = await runProductSync(path.join(UPLOAD_DIR, files[0]));
          console.log(`[iiko-cron] Product_Sync завершён:`, delta);
        } catch (e) {
          console.error(`[iiko-cron] Product_Sync ошибка: ${e.message}`);
        }
      });
      console.log(`[iiko-cron] Product_Sync запланирован: ${menuCron}`);
    }
  }

  if (bonusCron) {
    if (!cron.validate(bonusCron)) {
      console.error(`[iiko-cron] Неверный cron для IIKO_BONUS_SYNC_CRON: "${bonusCron}"`);
    } else {
      cron.schedule(bonusCron, async () => {
        console.log(`[iiko-cron] Запуск Bonus_Sync по расписанию: ${bonusCron}`);
        const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('bonuses_latest'));
        if (!files.length) {
          console.log('[iiko-cron] Bonus_Sync: файл выгрузки не найден, пропускаем');
          return;
        }
        try {
          const delta = await runBonusSync(path.join(UPLOAD_DIR, files[0]));
          console.log(`[iiko-cron] Bonus_Sync завершён:`, delta);
        } catch (e) {
          console.error(`[iiko-cron] Bonus_Sync ошибка: ${e.message}`);
        }
      });
      console.log(`[iiko-cron] Bonus_Sync запланирован: ${bonusCron}`);
    }
  }
}

module.exports = { initWatcher };
