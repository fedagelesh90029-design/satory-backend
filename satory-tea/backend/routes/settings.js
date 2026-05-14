/**
 * routes/settings.js
 * Настройки отображения — публичный GET и защищённый PUT.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');

const DEFAULTS = {
  show_full_description: true,
  show_brewing_tips:     true,
  show_origin:           true,
  show_images:           true,
  show_price:            true,
  show_category:         true,
};

async function getSettings() {
  const s = await db.app_settings.findOne({ key: 'display' });
  return { ...DEFAULTS, ...(s?.value || {}) };
}

// GET /api/settings/display — публичный
router.get('/display', async (_req, res) => {
  res.json(await getSettings());
});

// GET /api/admin/settings/display — для админки (через mount /api/admin/settings)
// Обратите внимание: если в server.js стоит app.use('/api/admin/settings', ...),
// то путь ниже '/' соответствует '/api/admin/settings'
router.get('/', adminAuth, async (_req, res) => {
  res.json(await getSettings());
});

// PUT /api/admin/settings/display
router.put('/', adminAuth, async (req, res) => {
  const allowed = Object.keys(DEFAULTS);
  const value = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) value[k] = Boolean(req.body[k]);
  }
  const existing = await db.app_settings.findOne({ key: 'display' });
  if (existing) {
    await db.app_settings.update({ key: 'display' }, { $set: { value: { ...existing.value, ...value } } });
  } else {
    await db.app_settings.insert({ key: 'display', value: { ...DEFAULTS, ...value } });
  }
  res.json(await getSettings());
});

module.exports = router;
