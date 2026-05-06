// Заглушка для fileWatcher — реальная синхронизация через iiko API
function initWatcher() {
  console.log('[fileWatcher] File watcher disabled (using iiko API sync instead)');
}

module.exports = { initWatcher };
