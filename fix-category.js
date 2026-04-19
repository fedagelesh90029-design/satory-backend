require('dotenv').config();
const path = require('path');
const Datastore = require('nedb-promises');
const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });

db.update({ name: 'Чай с собой' }, { $set: { category: 'Улун' } }, {}).then(n => {
  console.log('Обновлено:', n);
  process.exit(0);
});
