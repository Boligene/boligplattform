const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/parse-finn", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("finn.no")) {
    return res.status(400).json({ error: "Ugyldig FINN-lenke." });
  }

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2" });

    // Hent ut hovedfeltene
    const pris = await page.$$eval('[data-testid="pricing-details"] span', spans => {
      const match = spans.find(s => !s.textContent.includes("Prisantydning") && /\d/.test(s.textContent));
      return match ? match.textContent.trim() : '';
    });

    const adresse = await page.$eval('[data-testid="object-address"]', el => el.textContent.trim()).catch(() => '');
    const tittel = await page.$eval('[data-testid="object-title"]', el => el.textContent.trim()).catch(() => '');
    const bilde = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => '');

    // Nye felter
    const bruksareal = await page.$eval('[data-testid="info-usable-area"]', el => el.textContent.trim()).catch(() => '');
    const eierform = await page.$eval('[data-testid="info-ownership-type"]', el => el.textContent.trim()).catch(() => '');
    const byggeaar = await page.$eval('[data-testid="info-construction-year"]', el => el.textContent.trim()).catch(() => '');
    const kommunaleAvg = await page.$eval('[data-testid="pricing-municipal-fees"]', el => el.textContent.trim()).catch(() => '');
    const eiendomsskatt = await page.$eval('[data-testid="pricing-estate-tax"]', el => el.textContent.trim()).catch(() => '');
    const felleskostnader = await page.$eval('[data-testid="pricing-common-monthly-cost"]', el => el.textContent.trim()).catch(() => '');
    const boligtype = await page.$eval('[data-testid="info-property-type"]', el => el.textContent.trim()).catch(() => '');

    await browser.close();

    return res.json({
      adresse,
      pris,
      tittel,
      bilde,
      bruksareal,
      eierform,
      byggeaar,
      kommunaleAvg,
      eiendomsskatt,
      felleskostnader,
      boligtype
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Noe gikk galt under scraping." });
  }
});

const PORT = 4444;
app.listen(PORT, () => {
  console.log(`🚀 Express-server kjører på http://localhost:${PORT}`);
});
