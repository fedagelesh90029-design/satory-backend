const db = require('./db');

async function diag() {
  const all = await db.products.find({});
  console.log('Total in DB: ' + all.length);
  
  const manual = all.filter(p => p.is_manual);
  console.log('is_manual: true count: ' + manual.length);
  
  const noIiko = all.filter(p => !p.iiko_id);
  console.log('No iiko_id count: ' + noIiko.length);
  
  const activeOnly = all.filter(p => p.active !== false);
  console.log('Active (not false) count: ' + activeOnly.length);
  
  if (noIiko.length > 0) {
    console.log('Samples without iiko_id:');
    noIiko.slice(0, 5).forEach(p => console.log(` - ${p.name} [${p.category}]`));
  }
  
  process.exit(0);
}

diag().catch(console.error);
