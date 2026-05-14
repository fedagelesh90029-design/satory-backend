require('dotenv').config();
const path = require('path');
const https = require('https');
const Datastore = require('nedb-promises');
const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });

const PAGES = [
  { name: 'Ми Лань Сянь Дань Цун Гао Шань', slug: 'mi-lan-syan-dan-tsun-gao-shan-230444685-12397429' },
  { name: 'Шуй Ми Тао Жоу Гуй', slug: 'shuy-mi-tao-zhou-guy-230444685-12397428' },
  { name: 'Да У Е Дань Цун Гуандун, 2024', slug: 'da-u-e-dan-tsun-guandun-2024-230444685-12397427' },
  { name: 'УИ Хуан ГуаньИнь «Жёлтая ГуаньИнь»', slug: 'ui-khuan-guanin-zhyoltaya-guanin-230444685-12397426' },
  { name: 'Я Ши Сян Дань Цун', slug: 'ya-shi-syan-dan-tsun-230444685-12397420' },
  { name: 'Те Гуань Инь Ганьдэ Гао Шань, 2025', slug: 'te-guan-in-gande-gao-shan-2025-230444685-12397409' },
  { name: 'Лу Гу Дун Дин, 2024 год', slug: 'lu-gu-dun-din-2024-god-230444685-12397405' },
  { name: 'Бай Ча Ху Да Ю Линь', slug: 'bay-cha-khu-da-yu-lin-230444685-12397404' },
  { name: 'Хуан Чжи Сян', slug: 'khuan-chzhi-syan-230444685-12397403' },
  { name: 'Да Хун Пао «Золотая награда»', slug: 'da-khun-pao-zolotaya-nagrada-230444685-12397397' },
  { name: 'Алишань Цзя И, 2024', slug: 'alishan-tszya-i-2024-230444685-12397395' },
  { name: 'Те Гуань Инь Аньси Хуасян, 2025', slug: 'te-guan-in-ansi-khuasyan-2025-230444685-12397394' },
  { name: 'Ли Шань, 2025', slug: 'li-shan-2025-230444685-12397393' },
  { name: 'Пуэр Шу V93 сбор, 2019', slug: 'puer-shu-v93-sbor-2019-230444685-12397388' },
  { name: 'Шу Пуэр Лао Ча Тоу, 2012', slug: 'shu-puer-lao-cha-tou-2012-230444685-12397387' },
  { name: 'Шу Пуэр Лао Тун Чжи, 2021', slug: 'shu-puer-lao-tun-chzhi-2021-230444685-12397386' },
  { name: 'Шу Пуэр Юн Чжень «Гунтин», 2023', slug: 'shu-puer-yun-chzhen-guntin-2023-230444685-12397385' },
  { name: 'Шу Пуэр Юн Фа Гун Тин, 2011', slug: 'shu-puer-yun-fa-gun-tin-2011-230444685-12397384' },
  { name: 'Шу Пуэр Шу Дай Цзы «Чень Сян Мэнку», 2023', slug: 'shu-puer-shu-day-tszy-chen-syan-menku-2023-230444685-12397383' },
  { name: 'Шу Пуэр Шу Дай Цзы «Тай Хэ», 2021', slug: 'shu-puer-shu-day-tszy-tay-khe-2021-230444685-12397382' },
  { name: 'Шу Пуэр Шу Дай Цзы «Булан Гунтин», 2020', slug: 'shu-puer-shu-day-tszy-bulan-guntin-2020-230444685-12397381' },
  { name: 'Шу Пуэр Чэ Ши «Точа», 2018', slug: 'shu-puer-che-shi-tocha-2018-230444685-12397380' },
  { name: 'Шу Пуэр Чжун Ча 7581, 2021', slug: 'shu-puer-chzhun-cha-7581-2021-230444685-12397379' },
  { name: 'Шу Пуэр Чан Син «Чёрная Лошадь», 2020', slug: 'shu-puer-chan-sin-chernaya-loshad-2020-230444685-12397378' },
  { name: 'Шу Пуэр Хайвань «9988», 2021', slug: 'shu-puer-khayvan-9988-2021-230444685-12397377' },
  { name: 'Шу Пуэр Фермерский «Лао Ча Тоу», 2018', slug: 'shu-puer-fermerskiy-lao-cha-tou-2018-230444685-12397376' },
  { name: 'Шу Пуэр Лао Ши То «Лао Шуча», 2018', slug: 'shu-puer-lao-shi-to-lao-shucha-2018-230444685-12397375' },
  { name: 'Шу Пуэр Лао Ши То «Гу Шу», 2020', slug: 'shu-puer-lao-shi-to-gu-shu-2020-230444685-12397374' },
  { name: 'Шу Пуэр TAETEA Лао Ча Тоу, 2023', slug: 'shu-puer-taetea-lao-cha-tou-2023-230444685-12397373' },
  { name: 'Шу Пуэр «Отборный гунтин» от Гу И, 2016', slug: 'shu-puer-otbornyy-guntin-ot-gu-i-2016-230444685-12397372' },
  { name: 'Шен Пуэр Чан Син «Иу Ишань Мо», 2019', slug: 'shen-puer-chan-sin-iu-ishan-mo-2019-230444685-12397371' },
  { name: 'Люань Гуапянь', slug: 'luan-guapyan-230444685-12397370' },
  { name: 'Лун Цзин', slug: 'lun-tszin-230444685-12397369' },
  { name: 'Инь Сы', slug: 'in-sy-230444685-12397368' },
  { name: 'Е Шен Люй Ча', slug: 'e-shen-lyuy-cha-230444685-12397367' },
  { name: 'Би Ло Чунь', slug: 'bi-lo-chun-230444685-12397366' },
  { name: 'Чжу Е Цин', slug: 'chzhu-e-tsin-230444685-12397365' },
  { name: 'Цзыян Цуйфэн', slug: 'tszyan-tsuyfen-230444685-12397364' },
  { name: 'Сюэ Я Билочунь', slug: 'syue-ya-bilochun-230444685-12397363' },
  { name: 'Си Ху Лунцзин', slug: 'si-khu-luntsзin-230444685-12397362' },
  { name: 'Мэндин Люй Ча', slug: 'mendin-lyuy-cha-230444685-12397361' },
  { name: 'Габа Янтарь', slug: 'gaba-yantar-230444685-12397360' },
  { name: 'Габа Серебро', slug: 'gaba-serebro-230444685-12397359' },
  { name: 'Габа Опал', slug: 'gaba-opal-230444685-12397358' },
  { name: 'Габа Бриллиант', slug: 'gaba-brilliant-230444685-12397357' },
  { name: 'Габа Алишань', slug: 'gaba-alishan-230444685-12397356' },
  { name: 'Габа Сапфир', slug: 'gaba-safir-230444685-12397355' },
  { name: 'Габа Аметист', slug: 'gaba-ametist-230444685-12397354' },
  { name: 'Габа Диамант', slug: 'gaba-diamant-230444685-12397353' },
  { name: 'Габа Рубин', slug: 'gaba-rubin-230444685-12397352' },
  { name: 'Габа Платина', slug: 'gaba-platina-230444685-12397351' },
  { name: 'Чайник из глины Хей Ни с росписью', slug: 'chaynik-iz-glinyi-khey-ni-s-rospisyu-230444685-12397350' },
  { name: 'Чайник из Цинчжоуской глины (1)', slug: 'chaynik-iz-tsinchzhouskoy-glinyi-1-230444685-12397349' },
  { name: 'Чайник из Цинчжоуской глины (2)', slug: 'chaynik-iz-tsinchzhouskoy-glinyi-2-230444685-12397348' },
  { name: 'Чайник из Нисинской глины', slug: 'chaynik-iz-nizinskoy-glinyi-230444685-12397347' },
  { name: 'Пиала из глины Цзы Ни', slug: 'piala-iz-glinyi-tszy-ni-230444685-12397346' },
  { name: 'Чайник из глины Цзы Ни', slug: 'chaynik-iz-glinyi-tszy-ni-230444685-12397345' },
  { name: 'Чайник фабричной работы', slug: 'chaynik-fabrichnoy-rabotyi-230444685-12397344' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchPage(slug) {
  return new Promise((resolve) => {
    const url = `https://vk.com/market/product/${slug}`;
    const options = {
      hostname: 'vk.com',
      path: `/market/product/${slug}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.end();
  });
}

function extractImageUrl(html) {
  // Match img with alt="main image"
  const match = html.match(/img[^>]+alt="main image"[^>]+src="([^"?]+)/);
  if (match) return match[1];
  // Also try src before alt
  const match2 = html.match(/img[^>]+src="(https:\/\/sun\d+\.userapi\.com\/[^"?]+)/);
  if (match2) return match2[1];
  return null;
}

async function run() {
  const IMAGES = {};
  let fetched = 0;
  let failed = [];

  console.log(`Fetching ${PAGES.length} pages from VK...`);

  for (let i = 0; i < PAGES.length; i++) {
    const { name, slug } = PAGES[i];
    process.stdout.write(`[${i+1}/${PAGES.length}] ${name}... `);
    
    let url = null;
    let attempts = 0;
    while (!url && attempts < 3) {
      if (attempts > 0) {
        process.stdout.write(`retry ${attempts}... `);
        await sleep(5000 * attempts);
      }
      const html = await fetchPage(slug);
      url = extractImageUrl(html);
      attempts++;
      if (!url && attempts < 3) await sleep(2000);
    }

    if (url) {
      IMAGES[name] = url;
      fetched++;
      console.log(`✓`);
    } else {
      failed.push(name);
      console.log(`✗ (not found)`);
    }

    // Delay between requests to avoid rate limiting
    if (i < PAGES.length - 1) await sleep(1500);
  }

  console.log(`\nFetched ${fetched}/${PAGES.length} images`);
  if (failed.length) console.log(`Failed: ${failed.join(', ')}`);

  // Update DB
  let updated = 0;
  for (const [name, imageUrl] of Object.entries(IMAGES)) {
    const n = await db.update({ name }, { $set: { image_url: imageUrl } }, {});
    if (n) updated++;
  }
  console.log('✅ Обновлено ' + updated + ' фото');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
