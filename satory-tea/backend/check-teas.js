const db = require('./db');

const CATEGORY_MAPPING = {
  'Еда': ['ДЕСЕРТЫ'],
  'Посуда': [
    'ПИАЛЫ', 'ГАЙВАНИ', 'ЧАЙНИКИ', 'ЧАХАИ', 'ЧАБАНИ', 'ЧАХЭ', 
    'СИТО', 'ВОРОНКИ-СИФОНЫ-СТАНЦИИ', 'ТЕРМОСЫ- БУТЫЛКИ-КРУЖКИ', 'НАБОРЫ'
  ],
  'Аксессуары': [
    'БЛАГОВОНИЯ', 'ФИГУРКИ', 'ИНСТРУМЕНТЫ', 'СУМКИ', 'ПОЛОТЕНЦА', 
    'ПОДСТАВКИ', 'ХРАНЕНИЕ-УПАКОВКА', 'ПРОЧЕЕ'
  ],
  'Услуги': ['УСЛУГИ'],
  'Чай': ['МАТЭ'],
};

function getParentCategory(subCategory) {
  for (const [parent, subs] of Object.entries(CATEGORY_MAPPING)) {
    if (subs.includes(subCategory)) return parent;
  }
  return 'Чай';
}

function isTeaProduct(product) {
  const name = product.name.toLowerCase();
  const cat = (product.category_override ?? product.category).toUpperCase();
  const parent = getParentCategory(cat);

  if (parent !== 'Чай') return false;

  const nonTeaKeywords = ['ёршик', 'бомбилья', 'трубочка', 'калебас', 'набор', 'щетка'];
  if (nonTeaKeywords.some(k => name.includes(k))) return false;

  return true;
}

db.products.find({active: true}).then(ps => {
  const teas = ps.filter(p => isTeaProduct(p));
  
  const categories = {};
  
  teas.forEach(t => {
    const name = t.name.toLowerCase();
    const cat = (t.category || '').toLowerCase();
    
    let sub = 'Unknown';
    if (name.includes('шу')) sub = 'Шу';
    else if (name.includes('шэн')) sub = 'Шэн';
    else if (cat.includes('белый') || name.includes('белый')) sub = 'Белый';
    else if (cat.includes('красный') || name.includes('красный')) sub = 'Красный';
    else if (cat.includes('тайвань') || cat.includes('уишань') || cat.includes('гуандун') || name.includes('улун')) sub = 'Улун';
    else if (cat.includes('травы') || name.includes('травы') || cat.includes('добавки') || cat.includes('травы-добавки')) sub = 'Травы';
    
    categories[sub] = (categories[sub] || 0) + 1;
    if (sub === 'Unknown') {
        console.log(`Unknown: ${t.name} (Cat: ${t.category})`);
    }
  });
  
  console.log(categories);
});
