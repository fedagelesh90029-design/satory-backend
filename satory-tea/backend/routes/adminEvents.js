/**
 * routes/adminEvents.js
 * CRUD для событий — только для администратора.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { broadcastPush } = require('../services/pushService');

router.use(adminAuth);

function validate(body, res) {
  if (!body.title || !String(body.title).trim())
    return res.status(400).json({ error: 'title обязателен' });
  if (!body.date)
    return res.status(400).json({ error: 'date обязателен' });
  return null;
}

function sanitize(body) {
  return {
    title:       String(body.title || '').trim(),
    description: String(body.description || ''),
    image_url:   String(body.image_url || ''),
    date:        body.date,
    price:       Number(body.price) || 0,
    seats_total: Number(body.seats_total) || 0,
    conditions:  String(body.conditions || ''),
    is_active:   body.is_active !== undefined ? Boolean(body.is_active) : true,
    // Поля для планировщика push-уведомлений
    scheduled_push_time: body.scheduled_push_time || null,
    push_template: String(body.push_template || '').trim(),
    push_target: String(body.push_target || 'all'), // all, registered, vip
    push_sent: body.push_sent || false,
    // Новые поля для отложенной публикации
    scheduled_publish_time: body.scheduled_publish_time || null,
    is_published: body.is_published !== undefined ? Boolean(body.is_published) : true,
    auto_publish: body.auto_publish !== undefined ? Boolean(body.auto_publish) : false,
  };
}

// GET /api/admin/events
router.get('/', async (_req, res) => {
  const events = await db.events.find({});
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(events);
});

// POST /api/admin/events
router.post('/', async (req, res) => {
  if (validate(req.body, res)) return;
  const now = new Date().toISOString();
  const event = await db.events.insert({
    ...sanitize(req.body),
    seats_taken: 0,
    created_at: now,
    updated_at: now,
  });

  // Новая логика push-уведомлений с планировщиком
  if (event.is_active !== false && event.push_template) {
    // Если время не указано - отправляем сейчас
    if (!event.scheduled_push_time) {
      try {
        let sentCount = 0;
        const template = event.push_template;
        const target = event.push_target || 'all';

        if (target === 'all') {
          // Отправить всем пользователям
          const users = await db.users.find({ push_token: { $exists: true } });
          const tokens = users
            .filter(u => u.push_token && u.push_settings?.push_events !== false)
            .map(u => u.push_token);
          
          if (tokens.length) {
            await broadcastPush(db, '🍵 Satori Tea', template, 
              { screen: 'event', id: event._id }, 'push_events');
            sentCount = tokens.length;
          }
        } else if (target === 'vip') {
          // Отправить VIP пользователям
          const users = await db.users.find({ 
            push_token: { $exists: true },
            bonus_balance: { $gte: 1000 }
          });
          const tokens = users
            .filter(u => u.push_token && u.push_settings?.push_events !== false)
            .map(u => u.push_token);
          
          if (tokens.length) {
            await broadcastPush(db, '🍵 Satori Tea VIP', template, 
              { screen: 'event', id: event._id });
            sentCount = tokens.length;
          }
        }
        // target === 'registered' не имеет смысла при создании события

        // Помечаем как отправленное
        await db.events.update({ _id: event._id }, {
          $set: {
            push_sent: true,
            last_push_sent: now,
            last_push_count: sentCount,
            updated_at: now
          }
        });

        console.log(`[events] Push отправлен при создании события "${event.title}" (${sentCount} получателей)`);
      } catch (error) {
        console.error('[events] Ошибка отправки push при создании:', error);
      }
    } else {
      console.log(`[events] Push для события "${event.title}" запланирован на ${event.scheduled_push_time}`);
    }
  } else if (event.is_active !== false && !event.push_template) {
    // Если push_template не указан, отправляем стандартное уведомление (обратная совместимость)
    broadcastPush(db,
      '🍵 Новое мероприятие',
      event.title,
      { screen: 'event', id: event._id },
      'push_events'
    ).catch(() => {});
  }

  res.status(201).json(event);
});

// GET /api/admin/events/:id
router.get('/:id', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  res.json(event);
});

// PUT /api/admin/events/:id
router.put('/:id', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (validate(req.body, res)) return;

  await db.events.update({ _id: req.params.id }, {
    $set: { ...sanitize(req.body), updated_at: new Date().toISOString() },
  });
  res.json(await db.events.findOne({ _id: req.params.id }));
});

// PATCH /api/admin/events/:id/toggle — быстрое вкл/выкл
router.patch('/:id/toggle', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  await db.events.update({ _id: req.params.id }, {
    $set: { is_active: !event.is_active, updated_at: new Date().toISOString() },
  });
  res.json({ is_active: !event.is_active });
});

// DELETE /api/admin/events/:id
router.delete('/:id', async (req, res) => {
  const n = await db.events.remove({ _id: req.params.id });
  if (!n) return res.status(404).json({ error: 'Событие не найдено' });
  res.json({ success: true });
});

// POST /api/admin/events/:id/schedule-push — запланировать push-уведомление
router.post('/:id/schedule-push', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  const { scheduled_push_time, push_template, push_target } = req.body;
  
  if (!scheduled_push_time) {
    return res.status(400).json({ error: 'Время отправки обязательно' });
  }

  await db.events.update({ _id: req.params.id }, {
    $set: {
      scheduled_push_time,
      push_template: push_template || `🍵 Напоминание о событии "${event.title}"`,
      push_target: push_target || 'all',
      push_sent: false,
      updated_at: new Date().toISOString()
    }
  });

  res.json({ success: true, message: 'Push-уведомление запланировано' });
});

// POST /api/admin/events/:id/send-push-now — отправить push сейчас
router.post('/:id/send-push-now', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  const { push_template, push_target } = req.body;
  const template = push_template || `🍵 ${event.title}`;
  const target = push_target || 'all';

  try {
    let sentCount = 0;

    if (target === 'all') {
      // Отправить всем пользователям
      const users = await db.users.find({ push_token: { $exists: true } });
      const tokens = users
        .filter(u => u.push_token && u.push_settings?.push_events !== false)
        .map(u => u.push_token);
      
      if (tokens.length) {
        await broadcastPush(db, '🍵 Satori Tea', template, 
          { screen: 'event', id: event._id }, 'push_events');
        sentCount = tokens.length;
      }
    } else if (target === 'registered') {
      // Отправить только зарегистрированным на событие
      const registrations = await db.registrations.find({ event_id: req.params.id });
      const userIds = registrations.map(r => r.user_id);
      
      if (userIds.length) {
        const users = await db.users.find({ 
          _id: { $in: userIds }, 
          push_token: { $exists: true } 
        });
        const tokens = users
          .filter(u => u.push_token && u.push_settings?.push_events !== false)
          .map(u => u.push_token);
        
        if (tokens.length) {
          await broadcastPush(db, '🍵 Satori Tea', template, 
            { screen: 'event', id: event._id });
          sentCount = tokens.length;
        }
      }
    } else if (target === 'vip') {
      // Отправить VIP пользователям (с бонусами > 1000)
      const users = await db.users.find({ 
        push_token: { $exists: true },
        bonus_balance: { $gte: 1000 }
      });
      const tokens = users
        .filter(u => u.push_token && u.push_settings?.push_events !== false)
        .map(u => u.push_token);
      
      if (tokens.length) {
        await broadcastPush(db, '🍵 Satori Tea VIP', template, 
          { screen: 'event', id: event._id });
        sentCount = tokens.length;
      }
    }

    // Логируем отправку
    await db.events.update({ _id: req.params.id }, {
      $set: {
        last_push_sent: new Date().toISOString(),
        last_push_count: sentCount,
        updated_at: new Date().toISOString()
      }
    });

    res.json({ 
      success: true, 
      message: `Push отправлен ${sentCount} пользователям`,
      sent_count: sentCount 
    });
  } catch (error) {
    console.error('[push] Ошибка отправки:', error);
    res.status(500).json({ error: 'Ошибка отправки push-уведомления' });
  }
});

// GET /api/admin/events/:id/push-history — история push-уведомлений
router.get('/:id/push-history', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  const history = {
    scheduled_push_time: event.scheduled_push_time,
    push_template: event.push_template,
    push_target: event.push_target,
    push_sent: event.push_sent,
    last_push_sent: event.last_push_sent,
    last_push_count: event.last_push_count || 0,
  };

  res.json(history);
});

// GET /api/admin/events/scheduler/stats — статистика планировщика
router.get('/scheduler/stats', async (req, res) => {
  const eventScheduler = require('../services/eventScheduler');
  const stats = await eventScheduler.getStats();
  res.json(stats);
});

// POST /api/admin/events/:id/publish-now — опубликовать событие сейчас
router.post('/:id/publish-now', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  await db.events.update({ _id: req.params.id }, {
    $set: {
      is_published: true,
      scheduled_publish_time: null,
      auto_publish: false,
      updated_at: new Date().toISOString()
    }
  });

  res.json({ success: true, message: 'Событие опубликовано' });
});

// POST /api/admin/events/:id/schedule-publish — запланировать публикацию
router.post('/:id/schedule-publish', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  const { scheduled_publish_time } = req.body;
  
  if (!scheduled_publish_time) {
    return res.status(400).json({ error: 'Время публикации обязательно' });
  }

  await db.events.update({ _id: req.params.id }, {
    $set: {
      scheduled_publish_time,
      is_published: false,
      auto_publish: true,
      updated_at: new Date().toISOString()
    }
  });

  res.json({ success: true, message: 'Публикация запланирована' });
});

// POST /api/admin/events/:id/unpublish — снять с публикации
router.post('/:id/unpublish', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  await db.events.update({ _id: req.params.id }, {
    $set: {
      is_published: false,
      scheduled_publish_time: null,
      auto_publish: false,
      updated_at: new Date().toISOString()
    }
  });

  res.json({ success: true, message: 'Событие снято с публикации' });
});

// POST /api/admin/events/test-push — Отправить тестовый пуш всем (для отладки)
router.post('/test-push', adminAuth, async (req, res) => {
  const { title, body } = req.body;
  const users = await db.users.find({ push_token: { $exists: true, $ne: null } });
  
  console.log(`[push] Тестовая отправка на ${users.length} устройств`);
  
  const { broadcastPush } = require('../services/pushService');
  await broadcastPush(title || 'Тест', body || 'Проверка пушей', { type: 'test' });
  
  res.json({ success: true, sent_to: users.length });
});

// GET /api/admin/events/:id/registrations — список записей на событие
router.get('/:id/registrations', async (req, res) => {
  try {
    const registrations = await db.registrations.find({ event_id: req.params.id });
    const userIds = registrations.map(r => r.user_id);
    const users = await db.users.find({ _id: { $in: userIds } });

    const list = registrations.map(r => {
      const user = users.find(u => u._id === r.user_id) || {};
      return {
        _id: r._id,
        user_id: r.user_id,
        name: user.name || '—',
        phone: user.phone || '—',
        payment_status: r.payment_status || 'unpaid',
        created_at: r.created_at || r.confirmed_at || null
      };
    });

    res.json(list);
  } catch (error) {
    console.error('[admin-events] Error getting registrations:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении записей' });
  }
});

// DELETE /api/admin/events/:eventId/registrations/:registrationId — отменить запись
router.delete('/:eventId/registrations/:registrationId', async (req, res) => {
  try {
    const reg = await db.registrations.findOne({ _id: req.params.registrationId });
    if (!reg) return res.status(404).json({ error: 'Запись не найдена' });

    await db.registrations.remove({ _id: req.params.registrationId });

    // Уменьшаем seats_taken на событии
    const event = await db.events.findOne({ _id: req.params.eventId });
    if (event) {
      const taken = Math.max(0, (event.seats_taken || 0) - 1);
      await db.events.update({ _id: req.params.eventId }, { $set: { seats_taken: taken } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[admin-events] Error deleting registration:', error);
    res.status(500).json({ error: 'Ошибка сервера при удалении записи' });
  }
});

// PUT /api/admin/events/:eventId/registrations/:registrationId/payment — изменить статус оплаты записи
router.put('/:eventId/registrations/:registrationId/payment', async (req, res) => {
  const { payment_status } = req.body;
  if (!payment_status || !['paid', 'unpaid'].includes(payment_status)) {
    return res.status(400).json({ error: 'Неверный статус оплаты' });
  }

  try {
    const reg = await db.registrations.findOne({ _id: req.params.registrationId });
    if (!reg) return res.status(404).json({ error: 'Запись не найдена' });

    await db.registrations.update(
      { _id: req.params.registrationId },
      { $set: { payment_status, updated_at: new Date().toISOString() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[admin-events] Error updating registration payment:', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении статуса оплаты' });
  }
});

module.exports = router;
