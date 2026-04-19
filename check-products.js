const Datastore = require('nedb-promises');
const path = require('path');
const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });
db.find({}).then(p => {
  console.log('Товаров:', p.length);
  p.forEach(x => console.log(x.name, '|', x.image_url || 'NO IMAGE'));
  process.exit(0);
});
