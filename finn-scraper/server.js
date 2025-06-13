const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const fs = require("fs");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

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

    // Nye felter - prøv flere mulige selektorer
    const bruksareal = await page.$eval('[data-testid="info-usable-area"]', el => el.textContent.trim()).catch(() => '');
    const eierform = await page.$eval('[data-testid="info-ownership-type"]', el => el.textContent.trim()).catch(() => '');
    const byggeaar = await page.$eval('[data-testid="info-construction-year"]', el => el.textContent.trim()).catch(() => '');
    const kommunaleAvg = await page.$eval('[data-testid="pricing-municipal-fees"]', el => el.textContent.trim()).catch(() => '');
    const eiendomsskatt = await page.$eval('[data-testid="pricing-estate-tax"]', el => el.textContent.trim()).catch(() => '');
    const felleskostnader = await page.$eval('[data-testid="pricing-common-monthly-cost"]', el => el.textContent.trim()).catch(() => '');
    const boligtype = await page.$eval('[data-testid="info-property-type"]', el => el.textContent.trim()).catch(() => '');
    
    // Prøv flere mulige selektorer for fellesgjeld
    let fellesgjeld = '';
    try {
      fellesgjeld = await page.$eval('[data-testid="pricing-shared-debt"]', el => el.textContent.trim());
    } catch {
      try {
        // Prøv alternativ måte - se etter tekst som inneholder "Fellesgjeld"
        fellesgjeld = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          for (const el of elements) {
            if (el.textContent && el.textContent.includes('Fellesgjeld') && el.nextElementSibling) {
              const nextText = el.nextElementSibling.textContent;
              if (nextText && /\d/.test(nextText)) {
                return nextText.trim();
              }
            }
          }
          return '';
        });
      } catch {
        fellesgjeld = '';
      }
    }

    await browser.close();

    const resultData = {
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
      boligtype,
      fellesgjeld
    };
    
    console.log('Scraped data:', resultData);
    
    return res.json(resultData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Noe gikk galt under scraping." });
  }
});

app.post("/api/analyse-takst", (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  console.log("Mottok request til /api/analyse-takst");
  try {
    let tekst = "";
    if (req.file) {
      // PDF-opplasting
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        tekst = pdfData.text;
        fs.unlinkSync(req.file.path); // Slett fil etter bruk
        console.log("PDF-tekstlengde:", tekst.length);
      } catch (pdfErr) {
        console.error("Feil ved pdf-parse:", pdfErr);
        return res.status(400).json({ error: "Feil ved lesing av PDF.", details: pdfErr.message });
      }
    } else if (req.body.text) {
      // Manuell tekst
      tekst = req.body.text;
      console.log("Manuell tekstlengde:", tekst.length);
    } else {
      return res.status(400).json({ error: "Ingen PDF eller tekst mottatt." });
    }

    // Sjekk om tekst er tilstrekkelig
    if (!tekst || tekst.length < 20) {
      console.warn("For kort eller tom tekst fra PDF/innliming.", { tekstlengde: tekst.length });
      return res.status(400).json({ error: "Kunne ikke lese tekst fra PDF eller tekst er for kort.", tekstlengde: tekst.length });
    }

    // OpenAI-analyse
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      // Returner dummy-data hvis ingen API-nøkkel
      return res.json({
        sammendrag: "Dette er et eksempel på sammendrag fra AI-analyse.",
        avvik: [
          { beskrivelse: "Fukt i kjeller", tg: "TG2" },
          { beskrivelse: "Råte i vindu", tg: "TG3" }
        ],
        risiko: "Moderat risiko. TG3-avvik bør utbedres snarlig.",
        forslagTittel: "Takstrapport for Eksempelveien 1"
      });
    }
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const prompt = `Du er en erfaren norsk boligrådgiver og takstekspert. Du skal analysere innholdet i en takstrapport fra en bolig (rapporten er limt inn under). Oppsummer de viktigste punktene og gi brukeren en tydelig og informativ rapport.\n\n**Oppgaven din:**\n- Gå gjennom teksten og hent ut de viktigste forholdene, avvikene og eventuelle risikoer.\n- Fremhev spesielt alle funn med tilstandsgrad 2 eller 3 (TG2/TG3), avvik, feil eller ting som kan koste penger å utbedre.\n- Lag en punktliste med maks 10 avvik og anbefalte tiltak. Hver avvik skal ha et felt 'tg' med verdien 'TG2' eller 'TG3' (ikke bare tall).\n- Gi et utfyllende sammendrag (det kan være langt) og en grundig risikovurdering.\n- Bruk et enkelt og forståelig språk (ingen faguttrykk).\n- Er du usikker, informer om at rapporten ikke er komplett og anbefal brukeren å lese hele takstrapporten selv.\n\nSvar alltid i gyldig, komplett JSON (ingen trailing commas, ingen kommentarer, ingen avbrutte arrays/objekter) med feltene: sammendrag, avvik (array med beskrivelse og tg), risiko, forslagTittel.\n\nHer er rapporten:\n${tekst}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Du er en hjelpsom boligekspert." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });
    // Finn JSON i svaret
    let jsonString = completion.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonString) {
      console.error("AI-svar mangler JSON:", completion.choices[0].message.content);
      return res.status(500).json({ error: "AI-svar mangler JSON.", aiSvar: completion.choices[0].message.content });
    }
    // Prøv å fjerne trailing commas og whitespace
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    try {
      const json = JSON.parse(jsonString);
      return res.json(json);
    } catch (err) {
      console.error("Kunne ikke parse AI-JSON:", err, "\nAI-svar:\n", jsonString);
      return res.status(500).json({ error: "Kunne ikke tolke AI-svar fra OpenAI.", aiSvar: jsonString });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Kunne ikke analysere takstrapport." });
  }
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Express-server kjører på http://localhost:${PORT}`);
});