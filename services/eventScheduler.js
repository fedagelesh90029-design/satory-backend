/**
 * eventScheduler.js
 * Планировщик для автоматической отправки push-уведомлений о событиях
 */
const db = require('../db');
const { broadcastPush } = require('./pushService');

class EventScheduler {
  constructor() {
    this.interval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    console.log('[scheduler] Запуск планировщика событий...');
    this.isRunning = true;
    
    // Проверяем каждую минуту
    this.interval = setInterval(() => {
      this.checkScheduledPushes().catch(console.error);
    }, 60 * 1000);

    // Первая проверка сразу
    this.checkScheduledPushes().catch(console.error);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[scheduler] Планировщик остановлен');
  }

  async checkScheduledPushes() {
    try {
      const now = new Date();
      
      // 1. Проверяем события с запланированными push-уведомлениями
      const pushEvents = await db.events.find({
        scheduled_push_time: { $exists: true, $ne: null },
        push_sent: { $ne: true },
        is_active: { $ne: false }
      });

      for (const event of pushEvents) {
        const pushTime = new Date(event.scheduled_push_time);
        
        // Если время пришло (с погрешностью в 1 минуту)
        if (pushTime <= now) {
          await this.sendScheduledPush(event);
        }
      }

      // 2. Проверяем события с запланированной публикацией
      const publishEvents = await db.events.find({
        scheduled_publish_time: { $exists: true, $ne: null },
        is_published: { $ne: true },
        auto_publish: true
      });

      for (const event of publishEvents) {
        const publishTime = new Date(event.scheduled_publish_time);
        
        // Если время пришло (с погрешностью в 1 минуту)
        if (publishTime <= now) {
          await this.publishScheduledEvent(event);
        }
      }
    } catch (error) {
      console.error('[scheduler] Ошибка проверки запланированных задач:', error);
    }
  }

  async sendScheduledPush(event) {
    try {
      console.log(`[scheduler] Отправка запланированного push для события: ${event.title}`);
      
      const template = event.push_template || `🍵 Напоминание о событии "${event.title}"`;
      const target = event.push_target || 'all';
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
        const registrations = await db.registrations.find({ event_id: event._id });
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

      // Помечаем как отправленное
      await db.events.update({ _id: event._id }, {
        $set: {
          push_sent: true,
          last_push_sent: new Date().toISOString(),
          last_push_count: sentCount,
          updated_at: new Date().toISOString()
        }
      });

      console.log(`[scheduler] Push отправлен ${sentCount} пользователям для события: ${event.title}`);
    } catch (error) {
      console.error(`[scheduler] Ошибка отправки push для события ${event.title}:`, error);
    }
  }

  async publishScheduledEvent(event) {
    try {
      console.log(`[scheduler] Публикация запланированного события: ${event.title}`);
      
      // Публикуем событие
      await db.events.update({ _id: event._id }, {
        $set: {
          is_published: true,
          scheduled_publish_time: null,
          auto_publish: false,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      console.log(`[scheduler] Событие "${event.title}" успешно опубликовано`);

      // Если у события есть push-шаблон и нет запланированного времени push - отправляем сейчас
      if (event.push_template && !event.scheduled_push_time && !event.push_sent) {
        console.log(`[scheduler] Отправляем push-уведомление для опубликованного события: ${event.title}`);
        
        let sentCount = 0;
        const template = event.push_template;
        const target = event.push_target || 'all';

        if (target === 'all') {
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

        // Помечаем push как отправленный
        await db.events.update({ _id: event._id }, {
          $set: {
            push_sent: true,
            last_push_sent: new Date().toISOString(),
            last_push_count: sentCount,
            updated_at: new Date().toISOString()
          }
        });

        console.log(`[scheduler] Push отправлен ${sentCount} пользователям для события: ${event.title}`);
      }
    } catch (error) {
      console.error(`[scheduler] Ошибка публикации события ${event.title}:`, error);
    }
  }

  // Метод для получения статистики планировщика
  async getStats() {
    const scheduledPushCount = await db.events.count({
      scheduled_push_time: { $exists: true, $ne: null },
      push_sent: { $ne: true },
      is_active: { $ne: false }
    });

    const scheduledPublishCount = await db.events.count({
      scheduled_publish_time: { $exists: true, $ne: null },
      is_published: { $ne: true },
      auto_publish: true
    });

    const sentPushCount = await db.events.count({
      push_sent: true
    });

    const publishedCount = await db.events.count({
      is_published: true
    });

    return {
      isRunning: this.isRunning,
      scheduledPushCount,
      scheduledPublishCount,
      sentPushCount,
      publishedCount,
      lastCheck: new Date().toISOString()
    };
  }
}

// Создаем единственный экземпляр планировщика
const scheduler = new EventScheduler();

module.exports = scheduler;