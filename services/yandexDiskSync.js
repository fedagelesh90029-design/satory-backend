// Заглушка для Яндекс.Диск синхронизации
function initYandexSync() {
  if (!process.env.YANDEX_TOKEN) {
    console.log('[yandexDiskSync] Yandex.Disk token not configured, skipping');
    return;
  }
  console.log('[yandexDiskSync] Yandex.Disk sync initialized');
}

module.exports = { initYandexSync };
