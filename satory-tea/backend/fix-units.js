const db = require('./db');

async function fix() {
  const prods = await db.products.find({});
  let n = 0;
  for (const p of prods) {
    let unit = 'г';
    const lowC = (p.category || '').toLowerCase();
    const lowN = (p.name || '').toLowerCase();
    
    if (lowC.includes('посуда') || lowC.includes('аксессуар')) {
      unit = lowN.includes('набор') ? 'набор' : 'шт';
    } else if (lowC.includes('еда')) {
      unit = 'шт';
    } else if (lowN.includes('упак') || lowN.includes('пачк') || lowN.includes('блин')) {
      unit = 'упак';
    }
    
    await db.products.update({ _id: p._id }, { $set: { unit } });
    n++;
  }
  console.log('Fixed ' + n + ' products');
  process.exit(0);
}

fix().catch(console.error);
