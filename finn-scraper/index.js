const express = require("express");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/parse-finn", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("finn.no")) return res.status(400).json({ error: "Mangler eller feil URL" });

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Prøv å hente ut de viktigste feltene. Her kan du utvide!
    const pris = $('[data-testid="object-price"]').text().trim();
    const adresse = $('[data-testid="address"]').text().trim();
    const bilde = $('img[data-testid="gallery-image"]').attr("src");
    const felleskost = $('dt:contains("Felleskost/mnd.")').next("dd").text().trim() ||
                       $('dt:contains("Felleskostnader")').next("dd").text().trim();
    const areal = $('[data-testid="object-area-primary"]').text().trim();

    res.json({
      pris,
      adresse,
      bilde,
      felleskost,
      areal,
      // Legg til mer ved behov!
    });
  } catch (error) {
    res.status(500).json({ error: "Klarte ikke hente FINN-data" });
  }
});

const PORT = process.env.PORT || 4444;
app.listen(PORT, () => console.log("FINN-scraper server kjører på port", PORT));
