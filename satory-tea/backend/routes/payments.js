/**
 * routes/payments.js
 * API для обработки платежей (заказы и события)
 */
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const paymentService = require('../services/paymentService');

// Получить доступные способы оплаты
router.get('/methods', async (req, res) => {
  const methods = [
    {
      id: 'card',
      name: 'Банковская карта',
      description: 'Visa, MasterCard, МИР',
      icon: '💳',
      enabled: true,
      fee: 0 // Без комиссии
    },
    {
      id: 'sbp',
      name: 'СБП (Быстрые платежи)',
      description: 'Оплата по QR-коду',
      icon: '📱',
      enabled: true,
      fee: 0 // Без комиссии
    },
    {
      id: 'cash',
      name: 'Наличные при получении',
      description: 'Оплата курьеру или в точке выдачи',
      icon: '💵',
      enabled: true,
      fee: 0
    }
  ];
  
  res.json(methods);
});

// Создать платеж для заказа
router.post('/orders/:orderId/pay', auth, async (req, res) => {
  try {
    const { payment_method } = req.body;
    
    const order = await db.orders.findOne({ _id: req.params.orderId, user_id: req.user.id });
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Заказ уже оплачен' });
    }

    const user = await db.users.findOne({ _id: req.user.id });
    const totalAmount = order.total;

    // Обработка платежа
    const paymentResult = await processOrderPayment(order, user, payment_method, totalAmount);

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Если требуется подтверждение (карта/СБП), сохраняем как pending
    if (paymentResult.requires_confirmation) {
      // Создаем запись о платеже в статусе ожидания
      await db.orders.update({ _id: order._id }, {
        $set: {
          payment_status: 'pending',
          payment_method: paymentResult.method,
          payment_id: paymentResult.payment_id,
          amount_to_pay: totalAmount,
          payment_created_at: new Date().toISOString()
        }
      });

      return res.json({
        success: true,
        payment_id: paymentResult.payment_id,
        payment_status: 'pending',
        confirmation_url: paymentResult.confirmation_url,
        qr_code: paymentResult.qr_code,
        expires_at: paymentResult.expires_at,
        amount_to_pay: totalAmount
      });
    }

    // Если не требуется подтверждение (наличные)
    await db.orders.update({ _id: order._id }, {
      $set: {
        payment_status: 'paid',
        payment_method: paymentResult.method,
        payment_id: paymentResult.payment_id,
        amount_paid: order.total,
        paid_at: new Date().toISOString(),
        status: order.status === 'pending' ? 'confirmed' : order.status
      }
    });

    // Начисляем бонусы за покупку (1% от суммы)
    const earnedBonus = Math.floor(order.total * 0.01);
    if (earnedBonus > 0) {
      await db.users.update({ _id: req.user.id }, {
        $inc: { bonus_balance: earnedBonus }
      });
      
      await db.bonus_transactions.insert({
        user_id: req.user.id,
        type: 'earn',
        amount: earnedBonus,
        description: `Начисление за заказ #${order._id.slice(-6)}`,
        order_id: order._id,
        created_at: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      payment_id: paymentResult.payment_id,
      amount_paid: order.total,
      bonus_earned: earnedBonus,
      order_status: 'confirmed'
    });

  } catch (error) {
    console.error('[payments] Ошибка оплаты заказа:', error);
    res.status(500).json({ error: 'Ошибка обработки платежа' });
  }
});

// Создать платеж для события
router.post('/events/:eventId/pay', auth, async (req, res) => {
  try {
    const { payment_method } = req.body;
    
    const event = await db.events.findOne({ _id: req.params.eventId });
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    if (event.price <= 0) {
      return res.status(400).json({ error: 'Событие бесплатное' });
    }

    const existing = await db.registrations.findOne({ 
      user_id: req.user.id, 
      event_id: req.params.eventId 
    });
    if (existing) {
      return res.status(400).json({ error: 'Вы уже зарегистрированы' });
    }

    const user = await db.users.findOne({ _id: req.user.id });
    const totalAmount = event.price;
    
    // Обработка платежа
    const paymentResult = await processEventPayment(event, user, payment_method, totalAmount);

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Если требуется подтверждение (карта/СБП), сохраняем как pending
    if (paymentResult.requires_confirmation) {
      // Создаем регистрацию в статусе ожидания оплаты
      await db.registrations.insert({
        user_id: req.user.id,
        event_id: req.params.eventId,
        registered_at: new Date().toISOString(),
        payment_amount: event.price,
        payment_method: paymentResult.method,
        payment_id: paymentResult.payment_id,
        payment_status: 'pending'
      });

      return res.json({
        success: true,
        payment_id: paymentResult.payment_id,
        payment_status: 'pending',
        confirmation_url: paymentResult.confirmation_url,
        qr_code: paymentResult.qr_code,
        expires_at: paymentResult.expires_at,
        amount_to_pay: totalAmount
      });
    }

    // Регистрируем на событие (для наличных - не используется для событий)
    await db.registrations.insert({
      user_id: req.user.id,
      event_id: req.params.eventId,
      registered_at: new Date().toISOString(),
      payment_amount: event.price,
      payment_method: paymentResult.method,
      payment_id: paymentResult.payment_id,
      payment_status: 'paid'
    });

    // Обновляем количество мест
    await db.events.update({ _id: req.params.eventId }, {
      $inc: { seats_taken: 1 }
    });

    res.json({
      success: true,
      payment_id: paymentResult.payment_id,
      amount_paid: event.price,
      event_title: event.title
    });

  } catch (error) {
    console.error('[payments] Ошибка оплаты события:', error);
    res.status(500).json({ error: 'Ошибка обработки платежа' });
  }
});

// Получить историю платежей пользователя
router.get('/history', auth, async (req, res) => {
  try {
    // Платежи за заказы
    const orders = await db.orders.find({ 
      user_id: req.user.id, 
      payment_status: 'paid' 
    });

    // Платежи за события
    const eventRegistrations = await db.registrations.find({ 
      user_id: req.user.id, 
      payment_status: 'paid' 
    });

    const payments = [];

    // Добавляем заказы
    for (const order of orders) {
      payments.push({
        id: order.payment_id,
        type: 'order',
        title: `Заказ #${order._id.slice(-6)}`,
        amount: order.amount_paid || order.total,
        method: order.payment_method,
        date: order.paid_at || order.created_at,
        status: 'paid'
      });
    }

    // Добавляем события
    for (const reg of eventRegistrations) {
      const event = await db.events.findOne({ _id: reg.event_id });
      if (event) {
        payments.push({
          id: reg.payment_id,
          type: 'event',
          title: event.title,
          amount: reg.payment_amount,
          method: reg.payment_method,
          date: reg.registered_at,
          status: 'paid'
        });
      }
    }

    // Сортируем по дате
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(payments);

  } catch (error) {
    console.error('[payments] Ошибка получения истории:', error);
    res.status(500).json({ error: 'Ошибка получения истории платежей' });
  }
});

// Функции обработки платежей с реальной интеграцией
async function processOrderPayment(order, user, method, amount) {
  try {
    const orderId = order._id;
    const description = `Заказ #${orderId.slice(-6)} в Satori Tea`;
    const returnUrl = `${process.env.APP_URL || 'https://satory-tea.ru'}/orders/${orderId}/payment-result`;

    switch (method) {
      case 'card':
        // Оплата картой через ЮKassa
        const cardPayment = await paymentService.createYookassaPayment(
          amount, 
          description, 
          orderId, 
          returnUrl
        );
        
        if (!cardPayment.success) {
          return { success: false, error: cardPayment.error };
        }

        return {
          success: true,
          payment_id: cardPayment.payment_id,
          method: 'card',
          amount: amount,
          confirmation_url: cardPayment.confirmation_url,
          requires_confirmation: true
        };

      case 'sbp': {
        // Оплата через СБП (ЮKassa)
        const sbpPayment = await paymentService.createSbpPayment(
          amount,
          description,
          orderId,
          returnUrl
        );

        if (!sbpPayment.success) {
          return { success: false, error: sbpPayment.error };
        }

        return {
          success: true,
          payment_id: sbpPayment.payment_id,
          method: 'sbp',
          amount: amount,
          sbp_url: sbpPayment.sbp_url,
          qr_code: sbpPayment.qr_code,
          expires_at: sbpPayment.expires_at,
          requires_confirmation: true,
        };
      }

      case 'cash':
        // Наличные при получении
        return {
          success: true,
          payment_id: `cash_${Date.now()}`,
          method: 'cash',
          amount: amount,
          requires_confirmation: false
        };

      default:
        return { success: false, error: 'Неподдерживаемый способ оплаты' };
    }
  } catch (error) {
    console.error('[payment] Ошибка обработки платежа заказа:', error);
    return { success: false, error: 'Ошибка обработки платежа' };
  }
}

async function processEventPayment(event, user, method, amount) {
  try {
    const eventId = event._id;
    const description = `Событие "${event.title}" в Satori Tea`;
    const returnUrl = `${process.env.APP_URL || 'https://satory-tea.ru'}/events/${eventId}/payment-result`;

    switch (method) {
      case 'card':
        // Оплата картой через ЮKassa
        const cardPayment = await paymentService.createYookassaPayment(
          amount, 
          description, 
          eventId, 
          returnUrl
        );
        
        if (!cardPayment.success) {
          return { success: false, error: cardPayment.error };
        }

        return {
          success: true,
          payment_id: cardPayment.payment_id,
          method: 'card',
          amount: amount,
          confirmation_url: cardPayment.confirmation_url,
          requires_confirmation: true
        };

      case 'sbp': {
        // Оплата через СБП (ЮKassa)
        const sbpPayment = await paymentService.createSbpPayment(
          amount,
          description,
          eventId,
          returnUrl
        );

        if (!sbpPayment.success) {
          return { success: false, error: sbpPayment.error };
        }

        return {
          success: true,
          payment_id: sbpPayment.payment_id,
          method: 'sbp',
          amount: amount,
          sbp_url: sbpPayment.sbp_url,
          qr_code: sbpPayment.qr_code,
          expires_at: sbpPayment.expires_at,
          requires_confirmation: true,
        };
      }

      default:
        return { success: false, error: 'Наличные недоступны для событий' };
    }
  } catch (error) {
    console.error('[payment] Ошибка обработки платежа события:', error);
    return { success: false, error: 'Ошибка обработки платежа' };
  }
}

// Webhook для обработки уведомлений от ЮKassa
router.post('/webhook/yookassa', async (req, res) => {
  try {
    const signature = req.headers['x-yookassa-signature'];
    const webhookResult = await paymentService.handleYookassaWebhook(req.body, signature);
    
    if (!webhookResult.success) {
      return res.status(400).json({ error: webhookResult.error });
    }

    const { payment_id, status, amount, metadata } = webhookResult;
    
    if (status === 'succeeded') {
      // Платеж успешен
      if (metadata.order_id) {
        // Это платеж за заказ
        await handleSuccessfulOrderPayment(metadata.order_id, payment_id, amount);
      } else if (metadata.event_id) {
        // Это платеж за событие
        await handleSuccessfulEventPayment(metadata.event_id, payment_id, amount);
      }
    } else if (status === 'canceled') {
      // Платеж отменен
      if (metadata.order_id) {
        await handleFailedOrderPayment(metadata.order_id, payment_id);
      } else if (metadata.event_id) {
        await handleFailedEventPayment(metadata.event_id, payment_id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[webhook] Ошибка обработки webhook:', error);
    res.status(500).json({ error: 'Ошибка обработки webhook' });
  }
});

// Проверить статус платежа
router.get('/status/:paymentId', auth, async (req, res) => {
  try {
    const paymentStatus = await paymentService.checkYookassaPayment(req.params.paymentId);
    
    if (!paymentStatus.success) {
      return res.status(400).json({ error: paymentStatus.error });
    }

    res.json({
      payment_id: req.params.paymentId,
      status: paymentStatus.status,
      paid: paymentStatus.paid,
      amount: paymentStatus.amount
    });
  } catch (error) {
    console.error('[payment] Ошибка проверки статуса:', error);
    res.status(500).json({ error: 'Ошибка проверки статуса платежа' });
  }
});

// Отменить платеж
router.post('/cancel/:paymentId', auth, async (req, res) => {
  try {
    // Находим платеж в заказах или событиях
    const order = await db.orders.findOne({ 
      payment_id: req.params.paymentId, 
      user_id: req.user.id,
      payment_status: 'pending'
    });

    const eventReg = await db.registrations.findOne({ 
      payment_id: req.params.paymentId, 
      user_id: req.user.id,
      payment_status: 'pending'
    });

    if (!order && !eventReg) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    if (order) {
      await handleFailedOrderPayment(order._id, req.params.paymentId);
    } else if (eventReg) {
      await handleFailedEventPayment(eventReg.event_id, req.params.paymentId);
    }

    res.json({ success: true, message: 'Платеж отменен' });
  } catch (error) {
    console.error('[payment] Ошибка отмены платежа:', error);
    res.status(500).json({ error: 'Ошибка отмены платежа' });
  }
});

// Вспомогательные функции для обработки успешных и неуспешных платежей
async function handleSuccessfulOrderPayment(orderId, paymentId, amount) {
  try {
    const order = await db.orders.findOne({ _id: orderId, payment_id: paymentId });
    if (!order) return;

    // Обновляем статус заказа
    await db.orders.update({ _id: orderId }, {
      $set: {
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        status: order.status === 'pending' ? 'confirmed' : order.status
      }
    });

    // Начисляем бонусы за покупку (1% от суммы)
    const earnedBonus = Math.floor(amount * 0.01);
    if (earnedBonus > 0) {
      await db.users.update({ _id: order.user_id }, {
        $inc: { bonus_balance: earnedBonus }
      });
      
      await db.bonus_transactions.insert({
        user_id: order.user_id,
        type: 'earn',
        amount: earnedBonus,
        description: `Начисление за заказ #${orderId.slice(-6)}`,
        order_id: orderId,
        created_at: new Date().toISOString()
      });
    }

    console.log(`[payment] Заказ ${orderId} успешно оплачен на сумму ${amount} руб.`);
  } catch (error) {
    console.error('[payment] Ошибка обработки успешного платежа заказа:', error);
  }
}

async function handleSuccessfulEventPayment(eventId, paymentId, amount) {
  try {
    const registration = await db.registrations.findOne({ 
      event_id: eventId, 
      payment_id: paymentId 
    });
    if (!registration) return;

    // Обновляем статус регистрации
    await db.registrations.update({ 
      event_id: eventId, 
      payment_id: paymentId 
    }, {
      $set: {
        payment_status: 'paid',
        confirmed_at: new Date().toISOString()
      }
    });

    console.log(`[payment] Событие ${eventId} успешно оплачено на сумму ${amount} руб.`);
  } catch (error) {
    console.error('[payment] Ошибка обработки успешного платежа события:', error);
  }
}

async function handleFailedOrderPayment(orderId, paymentId) {
  try {
    const order = await db.orders.findOne({ _id: orderId, payment_id: paymentId });
    if (!order) return;

    // Обновляем статус заказа
    await db.orders.update({ _id: orderId }, {
      $set: {
        payment_status: 'failed',
        payment_failed_at: new Date().toISOString()
      }
    });

    console.log(`[payment] Платеж за заказ ${orderId} отменен`);
  } catch (error) {
    console.error('[payment] Ошибка обработки неуспешного платежа заказа:', error);
  }
}

async function handleFailedEventPayment(eventId, paymentId) {
  try {
    const registration = await db.registrations.findOne({ 
      event_id: eventId, 
      payment_id: paymentId 
    });
    if (!registration) return;

    // Удаляем регистрацию и освобождаем место
    await db.registrations.remove({ event_id: eventId, payment_id: paymentId });
    await db.events.update({ _id: eventId }, { $inc: { seats_taken: -1 } });

    console.log(`[payment] Платеж за событие ${eventId} отменен`);
  } catch (error) {
    console.error('[payment] Ошибка обработки неуспешного платежа события:', error);
  }
}

module.exports = router;