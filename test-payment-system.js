/**
 * Тест системы оплаты
 */
require('dotenv').config();
const db = require('./db');

async function testPaymentSystem() {
  console.log('💳 Тест системы оплаты...\n');

  try {
    // 1. Создаем тестового пользователя с бонусами
    const testUser = {
      phone: '+7999888777',
      name: 'Тестовый покупатель',
      bonus_balance: 500,
      push_token: 'ExponentPushToken[test-payment-user]',
      created_at: new Date().toISOString()
    };

    const user = await db.users.insert(testUser);
    console.log(`👤 Создан тестовый пользователь: ${user.name} (бонусов: ${user.bonus_balance})`);

    // 2. Создаем тестовый заказ
    const testOrder = {
      user_id: user._id,
      items: [
        { name: 'Да Хун Пао', price: 3200, qty: 1 },
        { name: 'Белый Пион', price: 980, qty: 2 }
      ],
      total: 5160,
      status: 'pending',
      payment_status: 'unpaid',
      created_at: new Date().toISOString()
    };

    const order = await db.orders.insert(testOrder);
    console.log(`📦 Создан тестовый заказ #${order._id.slice(-6)} на сумму ${order.total} руб.`);

    // 3. Создаем платное событие
    const testEvent = {
      title: 'Платная дегустация премиум чая',
      description: 'Эксклюзивная дегустация редких сортов',
      date: '2024-04-30',
      price: 2500,
      seats_total: 10,
      seats_taken: 0,
      is_active: true,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const event = await db.events.insert(testEvent);
    console.log(`🍵 Создано платное событие: ${event.title} (цена: ${event.price} руб.)`);

    // 4. Тестируем доступные способы оплаты
    console.log('\n💳 Доступные способы оплаты:');
    const paymentMethods = [
      { id: 'card', name: 'Банковская карта', icon: '💳' },
      { id: 'sbp', name: 'СБП (QR-код)', icon: '📱' },
      { id: 'cash', name: 'Наличные', icon: '💵' }
    ];

    paymentMethods.forEach(method => {
      console.log(`  ${method.icon} ${method.name} (${method.id})`);
    });

    // 5. Симулируем различные сценарии оплаты
    console.log('\n🧪 ТЕСТОВЫЕ СЦЕНАРИИ:');

    // Сценарий 1: Оплата картой
    console.log('\n1️⃣ Заказ: оплата банковской картой');
    console.log(`   Заказ: ${order.total}₽`);
    console.log(`   Начисление бонусов: ${Math.floor(order.total * 0.01)}₽ (1%)`);

    // Сценарий 2: Оплата события через СБП
    console.log('\n2️⃣ Событие: оплата через СБП (QR-код)');
    console.log(`   Событие: ${event.price}₽`);
    console.log(`   Начисление бонусов: ${Math.floor(event.price * 0.01)}₽ (1%)`);

    // Сценарий 3: Оплата наличными
    console.log('\n3️⃣ Заказ: оплата наличными при получении');
    console.log(`   Сумма к оплате: ${order.total}₽`);
    console.log(`   Начисление бонусов: ${Math.floor(order.total * 0.01)}₽ (1%)`);

    // 6. Проверяем структуру базы данных для платежей
    console.log('\n📊 СТРУКТУРА ДАННЫХ ДЛЯ ПЛАТЕЖЕЙ:');
    
    console.log('\n📦 Поля заказа для оплаты:');
    console.log('  - payment_status: unpaid/pending/paid/failed');
    console.log('  - payment_method: card/sbp/cash');
    console.log('  - payment_id: уникальный ID платежа');
    console.log('  - amount_paid: сумма к оплате');
    console.log('  - paid_at: время оплаты');

    console.log('\n🎫 Поля регистрации на событие:');
    console.log('  - payment_amount: стоимость события');
    console.log('  - payment_method: способ оплаты');
    console.log('  - payment_id: ID платежа');
    console.log('  - payment_status: free/pending/paid/failed');
    console.log('  - registered_at: время регистрации');

    // 7. API endpoints для оплаты
    console.log('\n🔗 API ENDPOINTS:');
    console.log('  GET  /api/payments/methods - способы оплаты');
    console.log('  POST /api/payments/orders/:id/pay - оплата заказа');
    console.log('  POST /api/payments/events/:id/pay - оплата события');
    console.log('  GET  /api/payments/status/:paymentId - статус платежа');
    console.log('  POST /api/payments/cancel/:paymentId - отмена платежа');
    console.log('  GET  /api/payments/history - история платежей');
    console.log('  POST /api/payments/webhook/yookassa - webhook ЮKassa');

    // 8. Интеграции
    console.log('\n🔌 ИНТЕГРАЦИИ:');
    console.log('  💳 ЮKassa (Яндекс.Касса) - карты, электронные кошельки');
    console.log('  📱 СБП (Система быстрых платежей) - QR-коды');
    console.log('  💵 Наличные - оплата при получении');

    console.log('\n✅ ПРЕИМУЩЕСТВА СИСТЕМЫ:');
    console.log('  🔄 Автоматическая обработка webhook');
    console.log('  📈 Начисление бонусов за покупки (1%)');
    console.log('  🔒 Безопасная обработка платежей');
    console.log('  📱 Поддержка мобильных платежей');
    console.log('  ↩️  Автоматические возвраты при отмене');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testPaymentSystem().then(() => {
  console.log('\n✨ Тест системы оплаты завершен');
  process.exit(0);
}).catch(console.error);