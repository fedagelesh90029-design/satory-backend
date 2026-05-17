const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

async function withMeta(product) {
  const meta = await db.products_meta.findOne({ product_id: product._id }) || {};
  // Применяем override поля
  const effectivePrice    = product.price_override    ?? product.price;
  const effectiveCategory = product.category_override ?? product.category;
  return {
    ...product,
    price:    effectivePrice,
    category: effectiveCategory,
    meta: {
      full_description: meta.full_description || '',
      images:           meta.images           || [],
      brewing_tips:     meta.brewing_tips     || '',
      origin:           meta.origin           || '',
      is_handmade:      meta.is_handmade      || false,
    },
  };
}

const CATEGORY_MAPPING = {
  'Еда': ['ДЕСЕРТЫ', 'ЕДА', 'ЗАКУСКИ', 'ВЫПЕЧКА', 'СЛАДОСТИ'],
  'Посуда': [
    'ПИАЛЫ', 'ГАЙВАНИ', 'ЧАЙНИКИ', 'ЧАХАИ', 'ЧАБАНИ', 'ЧАХЭ', 
    'СИТО', 'ВОРОНКИ-СИФОНЫ-СТАНЦИИ', 'ТЕРМОСЫ- БУТЫЛКИ-КРУЖКИ', 'НАБОРЫ',
    'ПОСУДА', 'КЕРАМИКА', 'ГЛИНА'
  ],
  'Аксессуары': [
    'БЛАГОВОНИЯ', 'ФИГУРКИ', 'ИНСТРУМЕНТЫ', 'СУМКИ', 'ПОЛОТЕНЦА', 
    'ПОДСТАВКИ', 'ХРАНЕНИЕ-УПАКОВКА', 'ПРОЧЕЕ', 'АКСЕССУАРЫ'
  ],
  'Услуги': ['УСЛУГИ', 'ЦЕРЕМОНИИ', 'МАСТЕР-КЛАССЫ', 'VIP-ЗАЛ', 'АРЕНДА'],
  'Чай': ['МАТЭ', 'ПУЭР', 'ШУ ПУЭР', 'ШЭН ПУЭР', 'УЛУН', 'ЗЕЛЕНЫЙ ЧАЙ', 'БЕЛЫЙ ЧАЙ', 'КРАСНЫЙ ЧАЙ', 'ТРАВЫ'],
};

function getParentCategory(subCategory) {
  const sub = String(subCategory || '').toUpperCase();
  for (const [parent, subs] of Object.entries(CATEGORY_MAPPING)) {
    if (subs.includes(sub)) return parent;
  }
  // Если категория содержит ключевые слова
  if (sub.includes('ЧАЙ') || sub.includes('ПУЭР') || sub.includes('УЛУН')) return 'Чай';
  if (sub.includes('ПОСУДА') || sub.includes('ЧАЙНИК')) return 'Посуда';
  if (sub.includes('ЕДА') || sub.includes('ДЕСЕРТ')) return 'Еда';
  
  return 'Чай';
}

function isTeaProduct(product) {
  const name = product.name.toLowerCase();
  const cat = (product.category_override ?? product.category).toUpperCase();
  const parent = getParentCategory(cat);

  if (parent !== 'Чай') return false;

  // Исключаем аксессуары, которые могли попасть в категорию чая
  const nonTeaKeywords = [
    'ёршик', 'ершик', 'бомбилья', 'трубочка', 'калебас', 'набор', 'щетка', 
    'венчик', 'лодка', 'книга', 'ложка', 'часаку', 'тясаку', 'нож'
  ];
  
  // Если в названии есть любое из этих слов — это не чай
  if (nonTeaKeywords.some(k => name.includes(k))) return false;
  
  // Специальная проверка для матчи — исключаем всё, что не является самим порошком
  if (cat.includes('МАТЧА') || name.includes('матча')) {
    const isAccessory = ['венчик', 'ложка', 'часаку', 'тясаку', 'набор', 'пиала', 'чаша'].some(k => name.includes(k));
    if (isAccessory) return false;
  }

  return true;
}

function getDisplayUnit(product) {
  const name = product.name.toLowerCase();

  // Единица измерения только для чая (за исключением VIP-зала, там тоже можно скрыть или оставить)
  // Пользователь попросил: "нигде единицы не будем писать только в чае граммы"
  if (isTeaProduct(product) && !name.includes('vip') && !name.includes('вип')) {
    return 'г';
  }

  return '';
}

router.get('/', async (req, res) => {
  const { category, search, excludeCategory, teaOnly } = req.query;
  const query = { active: { $ne: false } };
  if (search) query.name = new RegExp(search, 'i');

  let products = await db.products.find(query);

  // Фильтр по категории с учётом override
  if (category && category !== 'Все') {
    products = products.filter(p => {
      const cat = p.category_override ?? p.category;
      return cat === category || getParentCategory(cat) === category;
    });
  }
  
  if (teaOnly === '1') {
    products = products.filter(p => isTeaProduct(p));
  }

  if (excludeCategory) {
    products = products.filter(p => {
      const cat = p.category_override ?? p.category;
      return cat !== excludeCategory && getParentCategory(cat) !== excludeCategory;
    });
  }

  // Применяем override цены, категории и вычисляем единицы измерения
  res.json(products.map(p => ({
    ...p,
    price:    p.price_override    ?? p.price,
    category: p.category_override ?? p.category,
    unit:     getDisplayUnit(p)
  })));
});

router.get('/favorites/list', auth, async (req, res) => {
  const favs = await db.favorites.find({ user_id: req.user.id });
  const ids = favs.map(f => f.product_id);
  const products = await db.products.find({ _id: { $in: ids } });
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Не найдено' });
  res.json(await withMeta(product));
});

router.post('/:id/favorite', auth, async (req, res) => {
  const existing = await db.favorites.findOne({ user_id: req.user.id, product_id: req.params.id });
  if (existing) {
    await db.favorites.remove({ _id: existing._id });
    res.json({ favorited: false });
  } else {
    await db.favorites.insert({ user_id: req.user.id, product_id: req.params.id });
    res.json({ favorited: true });
  }
});

module.exports = router;
