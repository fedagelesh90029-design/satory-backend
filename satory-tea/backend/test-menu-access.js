/**
 * Тестовый скрипт для проверки доступа к меню через API
 */

const API_URL = 'http://localhost:3000';
const ADMIN_SECRET = 'satory_admin_2026';

async function testMenuAccess() {
  console.log('🔍 Тестируем доступ к меню...\n');

  try {
    // Способ 1: Используем x-admin-secret
    console.log('📋 Способ 1: x-admin-secret');
    const response1 = await fetch(`${API_URL}/api/admin/products`, {
      headers: {
        'x-admin-secret': ADMIN_SECRET,
      },
    });

    console.log(`Статус: ${response1.status} ${response1.statusText}`);
    
    if (response1.ok) {
      const products = await response1.json();
      console.log(`✅ Успешно! Получено товаров: ${products.length}`);
      
      if (products.length > 0) {
        console.log('\n📦 Первые 3 товара:');
        products.slice(0, 3).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} - ${p.price}₽ (${p.category})`);
        });
      }
    } else {
      const error = await response1.json();
      console.log(`❌ Ошибка: ${JSON.stringify(error)}`);
    }

  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.log('\n💡 Убедитесь, что сервер запущен на порту 3000');
    console.log('   Запустите: cd satory-tea/backend && npm start');
  }
}

testMenuAccess();
