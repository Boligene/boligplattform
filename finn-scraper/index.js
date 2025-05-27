const puppeteer = require('puppeteer');
const fs = require('fs');

async function hentBoligdata(finnUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(finnUrl, { waitUntil: 'networkidle2' });

  // FINN PRIS
  const pris = await page.$$eval('[data-testid="pricing-details"] span', spans => {
    const match = spans.find(s => !s.textContent.includes("Prisantydning") && /\d/.test(s.textContent));
    return match ? match.textContent.trim() : '';
  });

  const adresse = await page.$eval('[data-testid="object-address"]', el => el.textContent.trim()).catch(() => '');
  const tittel = await page.$eval('[data-testid="object-title"]', el => el.textContent.trim()).catch(() => '');
  const bilde = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => '');

  await browser.close();

  const boligData = { adresse, pris, tittel, bilde };
  fs.writeFileSync('bolig.json', JSON.stringify(boligData, null, 2), 'utf-8');
  console.log('✅ Boligdata lagret til bolig.json');
  return boligData;
}

const finnUrl = 'https://www.finn.no/realestate/homes/ad.html?finnkode=407990760';
hentBoligdata(finnUrl).then(console.log).catch(console.error);
