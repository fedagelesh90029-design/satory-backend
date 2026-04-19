/**
 * paymentService.js
 * Платёжный сервис: ЮKassa (карта + СБП) + наличные.
 *
 * Переменные окружения:
 *   YOOKASSA_SHOP_ID     — shopId из личного кабинета ЮKassa (обязательно)
 *   YOOKASSA_SECRET_KEY  — секретный ключ ЮKassa (обязательно)
 *
 * СБП подключается через ЮKassa — отдельный ключ не нужен.
 * В личном кабинете ЮKassa нужно включить метод оплаты «СБП».
 */

const https = require('https');
const crypto = require('crypto');

const YOOKASSA_HOST = 'api.yookassa.ru';
const YOOKASSA_BASE = '/v3';

class PaymentService {
  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID || '';
    this.secretKey = process.env.YOOKASSA_SECRET_KEY || '';
    this._testMode = !this.shopId || this.shopId.startsWith('test');
  }

  // ─── ЮKassa: HTTP ──────────────────────────────────────────────────────────

  _ykRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
      const body = data ? JSON.stringify(data) : null;

      const options = {
        hostname: YOOKASSA_HOST,
        port: 443,
        path: YOOKASSA_BASE + path,
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Idempotence-Key': crypto.randomUUID(),
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
            else reject(new Error(json.description || `ЮKassa ${res.statusCode}`));
          } catch {
            reject(new Error(`ЮKassa parse error: ${raw.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('ЮKassa timeout')); });
      if (body) req.write(body);
      req.end();
    });
  }

  // ─── Создать платёж картой ─────────────────────────────────────────────────

  async createYookassaPayment(amount, description, orderId, returnUrl) {
    if (this._testMode) {
      console.log('[payment] ЮKassa в тест-режиме (YOOKASSA_SHOP_ID не задан)');
      return {
        success: true,
        payment_id: `yk_test_${Date.now()}`,
        confirmation_url: `${returnUrl}?test=1`,
        status: 'pending',
      };
    }

    try {
      const payment = await this._ykRequest('POST', '/payments', {
        amount: { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        capture: true,
        description,
        metadata: { order_id: orderId },
        payment_method_data: { type: 'bank_card' },
      });

      return {
        success: true,
        payment_id: payment.id,
        confirmation_url: payment.confirmation.confirmation_url,
        status: payment.status,
      };
    } catch (e) {
      console.error('[payment] createYookassaPayment:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ─── Создать платёж через СБП (ЮKassa) ────────────────────────────────────
  //
  // ЮKassa возвращает QR-ссылку (sbp_url) — её нужно показать пользователю
  // как QR-код или кнопку «Открыть в банке».
  // Документация: https://yookassa.ru/developers/payment-methods/sbp

  async createSbpPayment(amount, description, orderId, returnUrl) {
    if (this._testMode) {
      console.log('[payment] СБП в тест-режиме');
      return {
        success: true,
        payment_id: `sbp_test_${Date.now()}`,
        sbp_url: `https://qr.nspk.ru/TEST?amount=${amount}&order=${orderId}`,
        qr_code: `https://qr.nspk.ru/TEST?amount=${amount}&order=${orderId}`,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }

    try {
      const payment = await this._ykRequest('POST', '/payments', {
        amount: { value: amount.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        capture: true,
        description,
        metadata: { order_id: orderId },
        payment_method_data: { type: 'sbp' },
      });

      // ЮKassa возвращает confirmation.confirmation_url — это и есть sbp:// ссылка
      const sbpUrl = payment.confirmation?.confirmation_url || null;

      return {
        success: true,
        payment_id: payment.id,
        sbp_url: sbpUrl,
        qr_code: sbpUrl, // фронт рендерит QR из этой строки
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: payment.status,
      };
    } catch (e) {
      console.error('[payment] createSbpPayment:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ─── Проверить статус платежа ──────────────────────────────────────────────

  async checkPayment(paymentId) {
    if (this._testMode || paymentId.startsWith('yk_test_') || paymentId.startsWith('sbp_test_')) {
      return { success: true, status: 'pending', paid: false, amount: 0 };
    }

    try {
      const payment = await this._ykRequest('GET', `/payments/${paymentId}`);
      return {
        success: true,
        status: payment.status,
        paid: payment.status === 'succeeded',
        amount: parseFloat(payment.amount.value),
        metadata: payment.metadata || {},
        payment_method: payment.payment_method?.type || null,
      };
    } catch (e) {
      console.error('[payment] checkPayment:', e.message);
      return { success: false, error: e.message };
    }
  }

  // Алиас для обратной совместимости
  async checkYookassaPayment(paymentId) {
    return this.checkPayment(paymentId);
  }

  // ─── Webhook от ЮKassa ─────────────────────────────────────────────────────

  async handleYookassaWebhook(body, signature) {
    try {
      // Проверяем IP-адрес на стороне Express (185.71.76.0/27, 185.71.77.0/27, 77.75.153.0/25)
      // Здесь проверяем подпись тела
      if (signature && this.secretKey) {
        const expected = crypto
          .createHmac('sha256', this.secretKey)
          .update(JSON.stringify(body))
          .digest('hex');
        if (signature !== expected) {
          return { success: false, error: 'Неверная подпись webhook' };
        }
      }

      const payment = body.object;
      if (!payment) return { success: false, error: 'Нет объекта платежа' };

      return {
        success: true,
        payment_id: payment.id,
        status: payment.status,
        amount: parseFloat(payment.amount.value),
        metadata: payment.metadata || {},
        payment_method: payment.payment_method?.type || null,
      };
    } catch (e) {
      console.error('[payment] handleYookassaWebhook:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ─── Возврат платежа ───────────────────────────────────────────────────────

  async refundPayment(paymentId, amount, reason = 'Возврат по заявке клиента') {
    if (this._testMode) {
      return { success: true, refund_id: `refund_test_${Date.now()}`, status: 'succeeded', amount };
    }

    try {
      const refund = await this._ykRequest('POST', '/refunds', {
        amount: { value: amount.toFixed(2), currency: 'RUB' },
        payment_id: paymentId,
        description: reason,
      });

      return {
        success: true,
        refund_id: refund.id,
        status: refund.status,
        amount: parseFloat(refund.amount.value),
      };
    } catch (e) {
      console.error('[payment] refundPayment:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ─── Устаревший метод (обратная совместимость) ─────────────────────────────

  async createSbpQrCode(amount, description, orderId) {
    const returnUrl = `${process.env.APP_URL || 'https://satory-tea.ru'}/payment-result`;
    const result = await this.createSbpPayment(amount, description, orderId, returnUrl);
    // Маппим поля для старого кода
    return {
      ...result,
      qr_id: result.payment_id,
    };
  }
}

module.exports = new PaymentService();
