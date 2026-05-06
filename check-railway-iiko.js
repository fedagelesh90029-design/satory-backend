/**
 * Скрипт для проверки настройки iiko API на Railway
 */

const RAILWAY_URL = 'https://satory-backend-production.up.railway.app';

async function checkRailwayIiko() {
  console.log('🔍 Проверяем настройку iiko API на Railway...\n');
  console.log(`📡 URL: ${RAILWAY_URL}\n`);

  try {
    // 1. Проверяем статус
    console.log('1️⃣ Проверяем статус iiko...');
    const statusRes = await fetch(`${RAILWAY_URL}/api/iiko/status`);
    
    if (!statusRes.ok) {
      console.log(`❌ Ошибка: ${statusRes.status} ${statusRes.statusText}`);
      return;
    }

    const status = await statusRes.json();
    console.log(`   Режим: ${status.mode === 'api' ? '🌐 API' : '📁 Файловый'}`);
    console.log(`   API настроен: ${status.api_configured ? '✅ Да' : '❌ Нет'}`);
    
    if (status.last_products_sync) {
      const syncDate = new Date(status.last_products_sync);
      console.log(`   Последняя синхронизация: ${syncDate.toLocaleString('ru-RU')}`);
    } else {
      console.log(`   Последняя синхронизация: ❌ Не было`);
    }

    // 2. Проверяем товары
    console.log('\n2️⃣ Проверяем товары в базе...');
    const productsRes = await fetch(`${RAILWAY_URL}/api/products`);
    
    if (productsRes.ok) {
      const products = await productsRes.json();
      console.log(`   Всего товаров: ${products.length}`);
      
      if (products.length > 0) {
        console.log(`   Первый товар: ${products[0].name} - ${products[0].price}₽`);
      }
    }

    // 3. Рекомендации
    console.log('\n📋 Рекомендации:\n');
    
    if (!status.api_configured) {
      console.log('❌ iiko API не настроен!');
      console.log('   Добавьте в Railway переменные:');
      console.log('   - IIKO_API_LOGIN=ваш_api_логин');
      console.log('   - IIKO_ORGANIZATION_ID=ваш_uuid_организации');
      console.log('\n   Инструкция: ИНСТРУКЦИЯ-IIKO-RAILWAY.md');
    } else if (!status.last_products_sync) {
      console.log('⚠️  API настроен, но синхронизация не запускалась');
      console.log('   Запустите вручную:');
      console.log(`   curl -X POST ${RAILWAY_URL}/api/iiko/sync/api \\`);
      console.log(`     -H "x-admin-secret: satory_admin_2026"`);
    } else {
      console.log('✅ Всё настроено правильно!');
      console.log('   Автоматическая синхронизация работает каждые 6 часов');
    }

  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.log('\n💡 Возможные причины:');
    console.log('   - Сервер на Railway не запущен');
    console.log('   - Неверный URL');
    console.log('   - Проблемы с интернет-соединением');
  }
}

checkRailwayIiko();
