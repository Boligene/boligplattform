/**
 * BOLIG-SCRAPER MED PRIORITERT SALGSOPPGAVE-ANALYSE
 * 
 * VIKTIG DATAKILDEPRIORITET:
 * 1. SALGSOPPGAVE (HOVEDKILDE) - Ekstrahert fra PDF/dokument med robuste regex
 * 2. SCRAPING (FALLBACK) - Henter data fra Finn.no-siden hvis salgsoppgave ikke finnes
 * 
 * Alle endepunkter prøver å kombinere disse kildene med prioritering av salgsoppgave-data.
 */

const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// **REDIS CACHING SETUP** - Intelligent cache med fallback
let redis = null;
try {
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    showFriendlyErrorStack: true,
    connectTimeout: 5000,
    retryDelayOnFailover: 100
  });
  
  redis.on('connect', () => {
    console.log('✅ Redis tilkoblet - caching aktivert');
  });
  
  redis.on('error', (err) => {
    console.log('⚠️ Redis tilkobling feilet:', err.message);
    console.log('💾 Fortsetter uten cache-funksjonalitet');
    redis = null; // Disable caching hvis Redis ikke virker
  });
  
  redis.on('close', () => {
    console.log('📴 Redis tilkobling lukket');
  });
} catch (error) {
  console.log('⚠️ Redis ikke tilgjengelig:', error.message);
  console.log('💾 Fortsetter uten cache-funksjonalitet');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for salgsoppgaver
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for salgsoppgave analyse
const systemPrompt = `
Du er en norsk boligekspert og eiendomsmegler med lang erfaring. Du får en full salgsoppgave fra Finn.no/DNB/andre kilder.

**VIKTIG:** Du vil få både strukturerte fakta og full tekst fra salgsoppgaven. PRIORITER ALLTID de strukturerte faktaene som er ekstrahert direkte fra salgsoppgaven - disse er mest nøyaktige.

Analyser informasjonen grundig og gi en profesjonell vurdering på:

1. TEKNISK TILSTAND: Vurder bygningens tekniske standard, vedlikeholdsbehov, installasoner (VVS, elektro, etc.)
2. RISIKOFAKTORER: Identifiser potensielle problemer, fremtidige kostnader, juridiske forhold
3. PRISVURDERING: Sammenlign med markedet, vurder pris per m², markedsposisjon
4. OPPUSSINGSBEHOV: Identifiser nødvendige og ønskede oppgraderinger med estimerte kostnader
5. ANBEFALTE SPØRSMÅL: Viktige spørsmål å stille under visning eller til megler

Gi svaret som strukturert JSON med disse feltene:
{
  "tekniskTilstand": {
    "score": 1-10,
    "sammendrag": "kort sammendrag",
    "detaljer": "detaljert analyse",
    "hovedFunn": ["liste", "med", "hovedpunkter"]
  },
  "risiko": {
    "score": 1-10,
    "sammendrag": "kort sammendrag", 
    "risikoer": ["liste", "med", "risikoer"],
    "anbefalinger": ["liste", "med", "anbefalinger"]
  },
  "prisvurdering": {
    "score": 1-10,
    "sammendrag": "kort sammendrag",
    "prisPerM2Vurdering": "analyse av pris per m²",
    "markedsvurdering": "sammenligning med markedet"
  },
  "oppussingBehov": {
    "nodvendig": ["liste", "med", "nødvendige", "tiltak"],
    "onsket": ["liste", "med", "ønskede", "oppgraderinger"],
    "estimertKostnad": "estimat på totalkostnader"
  },
  "anbefalteSporsmal": [
    "Viktige spørsmål til visning",
    "Spørsmål om teknisk tilstand",
    "Spørsmål om økonomi og vedlikehold"
  ],
  "konklusjon": "samlet vurdering og anbefaling"
}

Vær kritisk og realistisk i vurderingene. Base deg på norske forhold og standarder.
`;

// Hjelpefunksjon for å hente tekst fra element med fallback
async function safeGetText(page, selectors, fallback = '') {
  // Hvis selectors er en string, gjør den til array
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }
  
  for (const selector of selectors) {
    try {
      // Hvis selector inneholder :contains, bruk evaluate
      if (selector.includes(':contains')) {
        const searchText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
        if (searchText) {
          const result = await page.evaluate((text) => {
            const elements = Array.from(document.querySelectorAll('*'));
            for (const el of elements) {
              if (el.textContent && el.textContent.includes(text) && el.children.length === 0) {
                return el.textContent.trim();
              }
            }
            return '';
          }, searchText);
          if (result && result.length > 0) {
            return result;
          }
        }
      } else {
        const result = await page.$eval(selector, el => el.textContent.trim());
        if (result && result.length > 0) {
          return result;
        }
      }
    } catch {
      // Prøv neste selector
    }
  }
  return fallback;
}

// Hjelpefunksjon for å hente attributt fra element
async function safeGetAttribute(page, selectors, attribute, fallback = '') {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }
  
  for (const selector of selectors) {
    try {
      const result = await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
      if (result && result.length > 0) {
        return result;
      }
    } catch {
      // Prøv neste selector
    }
  }
  return fallback;
}

// Hjelpefunksjon for å finne tekst som inneholder spesifikke ord
async function findTextContaining(page, searchTerms) {
  try {
    return await page.evaluate((terms) => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const term of terms) {
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && text.toLowerCase().includes(term.toLowerCase()) && text.length < 200) {
            // Sjekk om dette ser ut som riktig data
            if (text.includes(':') || text.includes('kr') || text.includes('m²')) {
              return text;
            }
          }
        }
      }
      return '';
    }, searchTerms);
  } catch {
    return '';
  }
}

// Hjelpefunksjon for å hente alle bilder
async function getAllImages(page) {
  try {
    return await page.evaluate(() => {
      const images = [];
      
      // Hent hovedbilde fra meta tag
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && ogImage.content) {
        images.push(ogImage.content);
      }
      
      // Hent bilder fra bildegalleri - flere selektorer
      const gallerySelectors = [
        'img[src*="images.finncdn.no"]',
        '.image-gallery img',
        '[data-testid*="image"] img',
        '.gallery img',
        '.carousel img',
        'img[alt*="bilde"]'
      ];
      
      gallerySelectors.forEach(selector => {
        const galleryImages = document.querySelectorAll(selector);
        galleryImages.forEach(img => {
          if (img.src && img.src.includes('http') && !images.includes(img.src)) {
            images.push(img.src);
          }
        });
      });
      
      return images.slice(0, 20); // Maks 20 bilder
    });
  } catch {
    return [];
  }
}

// Hjelpefunksjon for å hente beskrivelse/annonsetekst
async function getDescription(page) {
  try {
    return await page.evaluate(() => {
      // Prøv forskjellige selektorer for beskrivelse
      const selectors = [
        '[data-testid="description"]',
        '.description',
        '.ad-text',
        '.object-description',
        '[class*="description"]',
        '[class*="Description"]',
        'section p',
        'article p'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 50) {
          return element.textContent.trim();
        }
      }
      
      // Fallback: se etter lange tekstblokker
      const paragraphs = document.querySelectorAll('p, div');
      for (const p of paragraphs) {
        const text = p.textContent.trim();
        if (text.length > 100 && (text.includes('bolig') || text.includes('leilighet') || text.includes('hus'))) {
          return text;
        }
      }
      
      return '';
    });
  } catch {
    return '';
  }
}

// Hjelpefunksjon for å hente alle nøkkeldata
async function getKeyValueData(page) {
  try {
    return await page.evaluate(() => {
      const data = {};
      
      // Hent alle tekstelementer og se etter mønstre
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent?.trim();
        if (!text || text.length > 200) return;
        
        // Se etter mønstre som "Nøkkel: Verdi" eller "Nøkkel Verdi"
        const patterns = [
          /^(Bruksareal|Primærareal|Totalareal|Areal)[\s:]+(.+)$/i,
          /^(Antall rom|Rom)[\s:]+(.+)$/i,
          /^(Antall soverom|Soverom)[\s:]+(.+)$/i,
          /^(Byggeår|Bygget)[\s:]+(.+)$/i,
          /^(Eierform)[\s:]+(.+)$/i,
          /^(Boligtype|Type)[\s:]+(.+)$/i,
          /^(Felleskostnader|Fellesutgifter)[\s:]+(.+)$/i,
          /^(Kommunale avgifter|Kommunale avg\.)[\s:]+(.+)$/i,
          /^(Eiendomsskatt)[\s:]+(.+)$/i,
          /^(Fellesgjeld)[\s:]+(.+)$/i,
          /^(Energimerking)[\s:]+(.+)$/i,
          /^(Etasje)[\s:]+(.+)$/i,
          /^(Parkering)[\s:]+(.+)$/i,
          /^(Balkong|Terrasse|Hage)[\s:]+(.+)$/i
        ];
        
        patterns.forEach(pattern => {
          const match = text.match(pattern);
          if (match) {
            const key = match[1].toLowerCase().replace(/[^a-zæøå]/g, '');
            data[key] = match[2].trim();
          }
        });
      });
      
      return data;
    });
  } catch {
    return {};
  }
}

// Hjelpefunksjon for å ekstraktere Finn-kode fra URL
function extractFinnCode(url) {
  const match = url.match(/finnkode=(\d+)/);
  return match ? match[1] : null;
}

// Hjelpefunksjon for å validere at et dokument tilhører riktig eiendom
async function validateDocumentForProperty(documentUrl, originalFinnUrl, page) {
  const finnCode = extractFinnCode(originalFinnUrl);
  if (!finnCode) return true; // Hvis vi ikke kan finne finn-kode, godta dokumentet
  
  // **FORBEDRET VALIDERING MED LENGRE TIMEOUT OG BEDRE FEILHÅNDTERING**
  try {
    console.log(`🔍 Validerer dokument: ${documentUrl.substring(0, 100)}...`);
    
    const tempPage = await page.browser().newPage();
    
    // Sett mer realistisk timeout og user agent
    await tempPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Øk timeout til 30 sekunder og bruk mindre streng waitUntil
    await tempPage.goto(documentUrl, { 
      waitUntil: 'domcontentloaded', // Mindre streng enn networkidle0
      timeout: 30000 // 30 sekunder i stedet for 10
    });
    
    // Vent litt ekstra for at siden skal bli ferdig lastet
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Hent både tekst og metadata fra siden
    const validation = await tempPage.evaluate((expectedFinnCode) => {
      const pageText = document.body.textContent.toLowerCase();
      const pageHtml = document.body.innerHTML.toLowerCase();
      const pageTitle = document.title.toLowerCase();
      
      // Sjekk forskjellige måter finn-koden kan være referert til
      const checks = {
        directFinnCode: pageText.includes(expectedFinnCode),
        finnUrl: pageText.includes(`finnkode=${expectedFinnCode}`),
        finnReference: pageText.includes('finn.no') && pageText.includes(expectedFinnCode),
        htmlFinnCode: pageHtml.includes(expectedFinnCode),
        dataAttributes: pageHtml.includes(`"${expectedFinnCode}"`),
        titleFinnCode: pageTitle.includes(expectedFinnCode),
        // Sjekk også URL-en selv
        urlFinnCode: window.location.href.includes(expectedFinnCode)
      };
      
      // Ekstra sjekk for megler-spesifikke estate-IDs eller referanser
      let hasValidReference = Object.values(checks).some(check => check);
      
      // Hvis ingen direkte referanse, men det er en megler-side, godkjenn den
      // (mange meglere bruker interne IDs i stedet for finn-koder)
      if (!hasValidReference && (
        pageText.includes('salgsoppgave') || 
        pageText.includes('prospekt') ||
        pageText.includes('eiendomsmegler') ||
        pageHtml.includes('eiendomsmegler')
      )) {
        hasValidReference = true;
        checks.meglerSide = true;
        console.log('   - Godkjent som megler-side med salgsoppgave-innhold');
      }
      
      return {
        checks: checks,
        hasValidReference: hasValidReference,
        pageTextPreview: pageText.substring(0, 300),
        url: window.location.href,
        title: document.title
      };
    }, finnCode);
    
    await tempPage.close();
    
    console.log(`🔍 Validering for Finn-kode ${finnCode}:`);
    console.log('   - Direkte finn-kode:', validation.checks.directFinnCode ? '✅' : '❌');
    console.log('   - Finn URL:', validation.checks.finnUrl ? '✅' : '❌');
    console.log('   - Finn referanse:', validation.checks.finnReference ? '✅' : '❌');
    console.log('   - HTML finn-kode:', validation.checks.htmlFinnCode ? '✅' : '❌');
    console.log('   - URL finn-kode:', validation.checks.urlFinnCode ? '✅' : '❌');
    console.log('   - Megler-side:', validation.checks.meglerSide ? '✅' : '❌');
    console.log('   - Resultat:', validation.hasValidReference ? '✅ GODKJENT' : '❌ FORKASTET');
    
    if (!validation.hasValidReference) {
      console.log('   - Side tittel:', validation.title);
      console.log('   - Innhold (preview):', validation.pageTextPreview.substring(0, 150));
    }
    
    return validation.hasValidReference;
  } catch (error) {
    console.log('⚠️ Validering feilet:', error.message);
    
    // **MINDRE STRENG FALLBACK**: Godkjenn dokumentet hvis det er fra en kjent megler-side
    if (documentUrl.includes('eiendomsmegler') || documentUrl.includes('em1sr')) {
      console.log('   - Godkjent som kjent megler-side tross validering-feil');
      return true;
    }
    
    return false;
  }
}

// Hjelpefunksjon for å søke etter iframe og object tags med PDF-innhold
async function findIframeAndObjectPDFs(page) {
  console.log('🔍 Søker etter PDF-er i iframe og object tags...');
  
  return await page.evaluate(() => {
    const pdfs = [];
    
    // Søk etter iframe tags
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src || iframe.getAttribute('data-src');
      if (src && (src.includes('.pdf') || src.includes('pdf'))) {
        pdfs.push({
          url: src,
          text: iframe.title || iframe.getAttribute('aria-label') || 'PDF i iframe',
          type: 'iframe_pdf',
          element: 'iframe'
        });
        console.log('📄 Fant PDF i iframe:', src);
      }
    });
    
    // Søk etter object tags
    const objects = document.querySelectorAll('object');
    objects.forEach(obj => {
      const data = obj.data || obj.getAttribute('data-src');
      if (data && (data.includes('.pdf') || data.includes('pdf'))) {
        pdfs.push({
          url: data,
          text: obj.title || obj.getAttribute('aria-label') || 'PDF i object',
          type: 'object_pdf',
          element: 'object'
        });
        console.log('📄 Fant PDF i object:', data);
      }
    });
    
    // Søk etter embed tags
    const embeds = document.querySelectorAll('embed');
    embeds.forEach(embed => {
      const src = embed.src || embed.getAttribute('data-src');
      if (src && (src.includes('.pdf') || src.includes('pdf'))) {
        pdfs.push({
          url: src,
          text: embed.title || embed.getAttribute('aria-label') || 'PDF i embed',
          type: 'embed_pdf',
          element: 'embed'
        });
        console.log('📄 Fant PDF i embed:', src);
      }
    });
    
    return pdfs;
  });
}

// Hjelpefunksjon for å "force open" PDF fra viewer-sider
async function forceOpenPDFFromViewer(viewerUrl, browser) {
  console.log('🔄 Forsøker å åpne PDF fra viewer-side:', viewerUrl);
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Lytt til nettverksrespons for å fange PDF-filer
    const pdfResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      if (contentType.includes('application/pdf') || url.includes('.pdf')) {
        pdfResponses.push({
          url: url,
          contentType: contentType,
          status: response.status()
        });
        console.log('📄 Fanget PDF-respons fra viewer:', url);
      }
    });
    
    await page.goto(viewerUrl, { 
      waitUntil: 'networkidle0',
      timeout: 20000 
    });
    
    // Vent litt for å fange eventuelle PDF-er
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Søk etter PDF-er på viewer-siden
    const viewerPDFs = await findIframeAndObjectPDFs(page);
    
    // Prøv å klikke på nedlastingsknapper
    const downloadButtons = await page.evaluate(() => {
      const buttons = [];
      const selectors = [
        'a[href*=".pdf"]',
        'button[onclick*="download"]',
        'a[download]',
        '[class*="download"]',
        '[id*="download"]',
        'a[href*="download"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.href || el.getAttribute('onclick')) {
            buttons.push({
              url: el.href || el.getAttribute('onclick'),
              text: el.textContent.trim(),
              type: 'download_button'
            });
          }
        });
      });
      
      return buttons;
    });
    
    await page.close();
    
    // Kombiner alle funn
    const allPDFs = [...pdfResponses, ...viewerPDFs, ...downloadButtons];
    
    if (allPDFs.length > 0) {
      console.log('✅ Fant PDF-er fra viewer-side:', allPDFs.length);
      return allPDFs;
    } else {
      console.log('⚠️ Ingen PDF-er funnet på viewer-siden');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Feil ved force open PDF fra viewer:', error.message);
    return [];
  }
}

// Forbedret funksjon for å finne salgsoppgaver via nettverkstrafikk og dokumentlenker
async function findSalgsoppgavePDF(page, url) {
  console.log('🔍 === STARTER UTVIDET DOKUMENTSØK ===');
  console.log('🔍 Leter etter salgsoppgave på:', url);
  const finnCode = extractFinnCode(url);
  console.log('🏷️ Finn-kode:', finnCode);
  
  try {
    const dokumenter = [];
    const nettverksResponser = [];
    
    // 1. Sett opp nettverkslyttere for å fange API-kall og JSON-responsere
    page.on('response', async (response) => {
      const responseUrl = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      try {
        // Se etter JSON-responser som kan inneholde dokument-data
        if (contentType.includes('application/json') && (
          responseUrl.includes('document') ||
          responseUrl.includes('pdf') ||
          responseUrl.includes('attachment') ||
          responseUrl.includes('file') ||
          responseUrl.includes('prospect') ||
          responseUrl.includes('salgsoppgave')
        )) {
          const jsonData = await response.json();
          nettverksResponser.push({
            url: responseUrl,
            data: jsonData,
            type: 'json'
          });
          console.log('📡 Fanget JSON-respons:', responseUrl);
        }
        
        // Se etter direkte PDF-responser
        if (contentType.includes('application/pdf') || responseUrl.includes('.pdf')) {
          nettverksResponser.push({
            url: responseUrl,
            type: 'pdf',
            contentType: contentType
          });
          console.log('📄 Fanget PDF-respons:', responseUrl);
        }
        
        // Se etter base64-encodede dokumenter i JSON
        if (contentType.includes('application/json')) {
          try {
            const text = await response.text();
            if (text.includes('base64') || text.includes('JVBERi')) { // JVBERi er starten på PDF i base64
              nettverksResponser.push({
                url: responseUrl,
                type: 'base64',
                data: text
              });
              console.log('📦 Fanget base64-dokument:', responseUrl);
            }
          } catch (e) {
            // Ignorer feil ved tekstlesing
          }
        }
      } catch (error) {
        // Ignorer feil ved JSON-parsing
      }
    });
    
    // 2. Se etter dokumentlenker i DOM med forbedret søk
    const domLenker = await page.evaluate(() => {
      const lenker = [];
      
      // Søk etter alle lenker
      const alleAnker = document.querySelectorAll('a, button, [role="button"]');
      
      alleAnker.forEach(element => {
        const href = element.href || element.getAttribute('data-href') || element.getAttribute('onclick');
        const tekst = element.textContent.trim().toLowerCase();
        const ariaLabel = element.getAttribute('aria-label') || '';
        
        // Utvidede søkekriterier for norske termer
        const dokumentTerm = [
          'salgsoppgave', 'prospekt', 'dokument', 'vedlegg', 'pdf',
          'takst', 'tilstandsrapport', 'energiattest', 'situasjonsplan',
          'plantegning', 'tegning', 'oversikt', 'faktaark', 'brosjyre',
          'last ned', 'download', 'vis dokument', 'åpne dokument'
        ];
        
        const harDokumentTerm = dokumentTerm.some(term => 
          tekst.includes(term) || ariaLabel.toLowerCase().includes(term)
        );
        
        if (href && harDokumentTerm) {
          lenker.push({
            url: href,
            text: tekst,
            ariaLabel: ariaLabel,
            type: 'dom_link'
          });
        }
        
        // Spesiell håndtering for onclick-hendelser som kan åpne dokumenter
        if (element.getAttribute('onclick') && harDokumentTerm) {
          const onclick = element.getAttribute('onclick');
          lenker.push({
            url: onclick,
            text: tekst,
            type: 'onclick'
          });
        }
      });
      
      // Søk etter data-attributter som kan peke på dokumenter
      const alleElementer = document.querySelectorAll('*');
      alleElementer.forEach(el => {
        const attributes = el.attributes;
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          if (attr.name.startsWith('data-') && 
              (attr.value.includes('pdf') || 
               attr.value.includes('document') || 
               attr.value.includes('attachment'))) {
            lenker.push({
              url: attr.value,
              text: el.textContent.trim(),
              type: 'data_attribute',
              attribute: attr.name
            });
          }
        }
      });
      
      return lenker;
    });
    
    // **STEG 4**: Unngå duplisering - opprett set for å tracke URLs
    const seenUrls = new Set();
    const uniqueDokumenter = [];
    
    // Legg til DOM-lenker med duplikatsjekk
    for (const dokument of domLenker) {
      if (dokument.url && !seenUrls.has(dokument.url)) {
        seenUrls.add(dokument.url);
        uniqueDokumenter.push(dokument);
      } else if (dokument.url) {
        console.log('🚫 Hopper over duplikat dokument-URL:', dokument.url.substring(0, 80));
      }
    }
    
    dokumenter.push(...uniqueDokumenter);
    
    // 3. **NY FUNKSJONALITET**: Søk etter iframe/object/embed PDF-er
    console.log('🔍 === SØKER ETTER IFRAME/OBJECT PDF-ER ===');
    const iframePDFs = await findIframeAndObjectPDFs(page);
    if (iframePDFs.length > 0) {
      console.log('✅ Fant PDF-er i iframe/object tags:', iframePDFs.length);
      
      // **STEG 4**: Legg til iframe PDF-er med duplikatsjekk
      for (const iframePDF of iframePDFs) {
        if (iframePDF.url && !seenUrls.has(iframePDF.url)) {
          seenUrls.add(iframePDF.url);
          dokumenter.push(iframePDF);
        } else if (iframePDF.url) {
          console.log('🚫 Hopper over duplikat iframe PDF-URL:', iframePDF.url.substring(0, 80));
        }
      }
    }
    
    // 4. Vent litt for å fange opp nettverkstrafikk
    console.log('⏳ Venter på nettverkstrafikk...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. **FORBEDRET**: Test dokumentlenker med force opening for viewer-sider
    console.log('🔍 === TESTER DOKUMENTLENKER MED FORCE OPENING ===');
    for (const lenke of domLenker.slice(0, 5)) { // Økt til 5 lenker
      if (lenke.type === 'dom_link' && lenke.url.startsWith('http')) {
        try {
          console.log('🖱️ Tester dokumentlenke:', lenke.text, '|', lenke.url.substring(0, 80));
          
          // Først validér at dokumentet tilhører riktig eiendom
          const isValidDocument = await validateDocumentForProperty(lenke.url, url, page);
          
          if (!isValidDocument) {
            console.log('❌ Dokumentet tilhører ikke riktig eiendom - hopper over');
            continue;
          }
          
          // **NY LOGIKK**: Sjekk om dette ser ut til å være en viewer-side
          const isViewerUrl = lenke.url.includes('viewer') || 
                             lenke.url.includes('document') || 
                             lenke.url.includes('prospekt') ||
                             lenke.text.includes('vis dokument') ||
                             lenke.text.includes('åpne');
          
          if (isViewerUrl) {
            console.log('🔄 Identifisert som viewer-side, forsøker force opening...');
            const forcedPDFs = await forceOpenPDFFromViewer(lenke.url, page.browser());
            
            if (forcedPDFs.length > 0) {
              forcedPDFs.forEach(pdf => {
                                  // **STEG 4**: Legg til forced PDF-er med duplikatsjekk
                  if (pdf.url && !seenUrls.has(pdf.url)) {
                    seenUrls.add(pdf.url);
                    dokumenter.push({
                      ...pdf,
                      originalViewerUrl: lenke.url,
                      type: 'forced_pdf_from_viewer'
                    });
                  } else if (pdf.url) {
                    console.log('🚫 Hopper over duplikat forced PDF-URL:', pdf.url.substring(0, 80));
                  }
              });
              console.log('✅ Fant PDF-er via force opening:', forcedPDFs.length);
            }
          } else {
            // Standard behandling for direkte lenker
            const linkPage = await page.browser().newPage();
            await linkPage.goto(lenke.url, { waitUntil: 'networkidle0', timeout: 15000 });
            
            // Se etter PDF-innhold, dokument-viewer, eller iframe/object
            const pageAnalysis = await linkPage.evaluate(() => {
              const hasIframe = document.querySelectorAll('iframe[src*="pdf"]').length > 0;
              const hasObject = document.querySelectorAll('object[data*="pdf"]').length > 0;
              const hasEmbed = document.querySelectorAll('embed[src*="pdf"]').length > 0;
              const hasViewer = document.body.textContent.toLowerCase().includes('viewer') || 
                               document.body.textContent.toLowerCase().includes('pdf');
              
              return {
                hasIframe,
                hasObject, 
                hasEmbed,
                hasViewer,
                contentPreview: document.body.textContent.substring(0, 500)
              };
            });
            
            if (pageAnalysis.hasIframe || pageAnalysis.hasObject || pageAnalysis.hasEmbed || pageAnalysis.hasViewer) {
              console.log('📄 Side har PDF-innhold, søker etter PDF-er...');
              
              // Søk etter PDF-er på denne siden også
              const sidePDFs = await findIframeAndObjectPDFs(linkPage);
              if (sidePDFs.length > 0) {
                // **STEG 4**: Legg til side PDF-er med duplikatsjekk
                sidePDFs.forEach(pdf => {
                  if (pdf.url && !seenUrls.has(pdf.url)) {
                    seenUrls.add(pdf.url);
                    dokumenter.push({
                      ...pdf,
                      originalLinkUrl: lenke.url,
                      type: 'pdf_from_link_page'
                    });
                  } else if (pdf.url) {
                    console.log('🚫 Hopper over duplikat side PDF-URL:', pdf.url.substring(0, 80));
                  }
                });
                console.log('✅ Fant PDF-er på lenke-siden:', sidePDFs.length);
              }
              
              // **STEG 4**: Legg til verified document page med duplikatsjekk
              if (lenke.url && !seenUrls.has(lenke.url)) {
                seenUrls.add(lenke.url);
                dokumenter.push({
                  ...lenke,
                  type: 'verified_document_page',
                  pageAnalysis: pageAnalysis
                });
              } else if (lenke.url) {
                console.log('🚫 Hopper over duplikat verified document page-URL:', lenke.url.substring(0, 80));
              }
            }
            
            await linkPage.close();
          }
        } catch (error) {
          console.log('⚠️ Feil ved testing av lenke:', lenke.url.substring(0, 50), error.message);
        }
      }
    }
    
    // 6. **STEG 4**: Kombiner alle funn med duplikatsjekk for nettverksresponser
    console.log('🔄 === KOMBINERER DOKUMENTER OG NETTVERKSRESPONSER ===');
    
    // Legg til nettverksresponser med duplikatsjekk
    for (const nettverksRespons of nettverksResponser) {
      if (nettverksRespons.url && !seenUrls.has(nettverksRespons.url)) {
        seenUrls.add(nettverksRespons.url);
        dokumenter.push(nettverksRespons);
      } else if (nettverksRespons.url) {
        console.log('🚫 Hopper over duplikat nettverksrespons-URL:', nettverksRespons.url.substring(0, 80));
      }
    }
    
    // **STEG 5**: FORBEDRET LOGGING med detaljert statistikk
    const alleDokumenter = dokumenter; // Alle er nå i dokumenter-array
    
    // Kategoriser dokumenter for bedre oversikt
    const kategorier = {
      'iframe_pdf': alleDokumenter.filter(d => d.type === 'iframe_pdf').length,
      'object_pdf': alleDokumenter.filter(d => d.type === 'object_pdf').length,
      'embed_pdf': alleDokumenter.filter(d => d.type === 'embed_pdf').length,
      'forced_pdf_from_viewer': alleDokumenter.filter(d => d.type === 'forced_pdf_from_viewer').length,
      'pdf_from_link_page': alleDokumenter.filter(d => d.type === 'pdf_from_link_page').length,
      'dom_link': alleDokumenter.filter(d => d.type === 'dom_link').length,
      'verified_document_page': alleDokumenter.filter(d => d.type === 'verified_document_page').length,
      'pdf': alleDokumenter.filter(d => d.type === 'pdf').length,
      'json': alleDokumenter.filter(d => d.type === 'json').length,
      'base64': alleDokumenter.filter(d => d.type === 'base64').length
    };
    
    // **STEG 5**: FORBEDRET LOGGING - detaljert oversikt over alle funn
    console.log('📊 === DOKUMENTSØK KOMPLETT ===');
    console.log('📊 Totalt funnet dokumenter (etter duplikateliminering):', alleDokumenter.length);
    console.log('📊 Duplikater eliminert:', nettverksResponser.length + domLenker.length + (iframePDFs?.length || 0) - alleDokumenter.length);
    
    console.log('📊 Dokumentkategorier:');
    Object.entries(kategorier).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`   - ${type}: ${count}`);
      }
    });
    
    // **STEG 5**: Logg ALLE dokumentkandidater for debugging
    if (alleDokumenter.length > 0) {
      console.log('📄 === ALLE DOKUMENTKANDIDATER FUNNET ===');
      alleDokumenter.forEach((dok, index) => {
        const urlPreview = (dok.url || 'Ingen URL').substring(0, 60);
        const textPreview = dok.text ? `(${dok.text.substring(0, 30)}...)` : '';
        console.log(`   ${index + 1}. Type: ${dok.type}`);
        console.log(`      URL: ${urlPreview}...`);
        console.log(`      Tekst: ${textPreview || 'Ingen tekst'}`);
        console.log(`      Element: ${dok.element || 'N/A'}`);
        console.log('      ---');
      });
      
      // **STEG 5**: Sammendrag av funn
      const pdfDokumenter = alleDokumenter.filter(d => 
        d.type === 'pdf' || 
        d.type === 'iframe_pdf' || 
        d.type === 'object_pdf' || 
        d.type === 'embed_pdf' || 
        d.type === 'forced_pdf_from_viewer' ||
        d.type === 'pdf_from_link_page'
      );
      const htmlDokumenter = alleDokumenter.filter(d => 
        d.type === 'verified_document_page' || 
        d.type === 'html_fallback'
      );
      const jsonDokumenter = alleDokumenter.filter(d => d.type === 'json' || d.type === 'base64');
      
      console.log('📊 === SAMMENDRAG AV DOKUMENTTYPER ===');
      console.log(`   🎯 PDF-dokumenter: ${pdfDokumenter.length} (beste kvalitet)`);
      console.log(`   📄 HTML-dokumenter: ${htmlDokumenter.length} (fallback kvalitet)`);
      console.log(`   📋 JSON/Data-dokumenter: ${jsonDokumenter.length}`);
      
      if (pdfDokumenter.length === 0) {
        console.log('⚠️ ADVARSEL: Ingen PDF-dokumenter funnet - kun HTML/JSON tilgjengelig');
        console.log('   Dette kan betydelig påvirke kvaliteten på analysen');
      }
      
    } else {
      console.log('❌ === INGEN DOKUMENTER FUNNET ===');
      console.log('❌ Dette vil føre til svært begrenset analyse');
      console.log('❌ Mulige årsaker:');
      console.log('   - Salgsoppgave er ikke tilgjengelig offentlig');
      console.log('   - PDF er passordbeskyttet');
      console.log('   - Nettverksfeil eller blokkering');
      console.log('   - Ukjent megler-struktur');
    }
    
    return alleDokumenter;
    
  } catch (error) {
    console.error('❌ Feil ved søk etter dokumenter:', error);
    return [];
  }
}

// Forbedret funksjon for å laste ned og parse PDF med bedre feilhåndtering og cleanup
// **OCR FALLBACK FUNKSJON** - Konverterer PDF til bilder og kjører OCR
async function performOCROnPDF(pdfBuffer, numPages) {
  console.log('🔍 === STARTER OCR FALLBACK ===');
  
  let pdf2pic, tesseract, fs, path;
  try {
    pdf2pic = require('pdf2pic');
    tesseract = require('tesseract.js');
    fs = require('fs');
    path = require('path');
  } catch (importError) {
    throw new Error('OCR avhengigheter ikke installert. Kjør: npm i pdf2pic tesseract.js');
  }
  
  const tempDir = path.join(__dirname, 'temp_ocr');
  
  try {
    // Opprett temp-mappe
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Konverter PDF til bilder (kun første 3 sider for å spare tid)
    const maxPages = Math.min(3, numPages || 1);
    console.log(`📄 Konverterer ${maxPages} sider til bilder for OCR...`);
    
    const convert = pdf2pic.fromBuffer(pdfBuffer, {
      density: 300,           // Høy oppløsning for bedre OCR
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2480,           // A4 i 300 DPI
      height: 3508
    });
    
    let ocrText = '';
    const processedPages = [];
    
    // Behandle hver side
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`🔍 OCR behandler side ${pageNum}/${maxPages}...`);
        
        // Konverter side til bilde
        const imageResult = await convert(pageNum, { responseType: 'image' });
        const imagePath = imageResult.path;
        
        if (!fs.existsSync(imagePath)) {
          console.log(`❌ Bilde ikke opprettet for side ${pageNum}`);
          continue;
        }
        
        // Kjør OCR med norsk og engelsk språkstøtte
        const { data: { text, confidence } } = await tesseract.recognize(imagePath, 'nor+eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`   📱 OCR side ${pageNum}: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_pageseg_mode: 6,  // Uniform text block
          preserve_interword_spaces: 1,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzæøåÆØÅ0123456789 .,;:!?-()[]{}/*&%$#@+=<>|\\n\\t'
        });
        
        if (text && text.length > 30) {
          const cleanedText = text
            .replace(/\n{3,}/g, '\n\n')  // Reduser multiple line breaks
            .replace(/\s{3,}/g, ' ')     // Reduser multiple spaces
            .trim();
            
          ocrText += `\n--- SIDE ${pageNum} ---\n${cleanedText}`;
          processedPages.push({
            page: pageNum,
            textLength: cleanedText.length,
            confidence: Math.round(confidence)
          });
          
          console.log(`✅ OCR side ${pageNum}: ${cleanedText.length} tegn (${Math.round(confidence)}% konfidens)`);
        } else {
          console.log(`⚠️ OCR side ${pageNum}: Utilstrekkelig tekst ekstrahert`);
        }
        
        // Rydd opp bildefil
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanupError) {
          console.log(`⚠️ Kunne ikke slette temp-fil: ${imagePath}`);
        }
        
      } catch (pageError) {
        console.log(`❌ OCR feilet for side ${pageNum}:`, pageError.message);
      }
    }
    
    // Logg sammendrag
    if (processedPages.length > 0) {
      const avgConfidence = processedPages.reduce((sum, p) => sum + p.confidence, 0) / processedPages.length;
      console.log(`🎯 OCR sammendrag: ${processedPages.length}/${maxPages} sider, ${ocrText.length} tegn totalt, ${Math.round(avgConfidence)}% gjennomsnittlig konfidens`);
    }
    
    return ocrText.length > 0 ? ocrText : null;
    
  } finally {
    // Rydd opp temp-mappe
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('🧹 OCR temp-filer ryddet opp');
      }
    } catch (cleanupError) {
      console.log('⚠️ Kunne ikke rydde OCR temp-mappe:', cleanupError.message);
    }
  }
}

async function downloadAndParsePDF(pdfUrl, browser) {
  console.log('📥 === LASTER NED PDF ===');
  console.log('📥 URL:', pdfUrl);
  
  let page = null;
  
  try {
    page = await browser.newPage();
    
    // Sett user agent for å unngå blokkering
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Økt timeout og feilhåndtering
    const response = await page.goto(pdfUrl, { 
      waitUntil: 'networkidle0',
      timeout: 45000 // Økt til 45 sekunder for store PDF-er
    });
    
    if (!response) {
      throw new Error('Ingen respons fra server');
    }
    
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }
    
    // Sjekk content-type
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('application/pdf') && !pdfUrl.includes('.pdf')) {
      console.log('⚠️ Content-type er ikke PDF:', contentType);
      console.log('⚠️ Prøver likevel å parse som PDF...');
    }
    
    const buffer = await response.buffer();
    
    if (buffer.length === 0) {
      throw new Error('Tom PDF-fil mottatt');
    }
    
    console.log('✅ PDF lastet ned');
    console.log('📊 Filstørrelse:', buffer.length, 'bytes');
    console.log('📊 Content-Type:', contentType);
    
    // **FORBEDRET PDF PARSING MED BEDRE FEILHÅNDTERING**
    let pdfData;
    try {
      pdfData = await pdfParse(buffer);
      console.log('📖 PDF parsing fullført');
      console.log('📊 Antall sider:', pdfData.numpages);
      console.log('📊 Tekstlengde:', pdfData.text.length, 'tegn');
      
      // **FORBEDRET PDF-TEKSTHÅNDTERING MED OCR FALLBACK**
      if (pdfData.text.length < 100) {
        console.log('⚠️ PDF har utilstrekkelig tekst, starter OCR-fallback...');
        console.log('📊 Opprinnelig tekstlengde:', pdfData.text.length);
        
        // Prøv OCR som fallback
        try {
          const ocrText = await performOCROnPDF(buffer, pdfData.numpages);
          if (ocrText && ocrText.length > pdfData.text.length) {
            console.log(`🎯 OCR forbedret tekst: ${pdfData.text.length} → ${ocrText.length} tegn`);
            pdfData.text = ocrText;
            pdfData._ocrEnhanced = true;
            pdfData._ocrImprovement = ocrText.length - (pdfData.text?.length || 0);
          } else {
            console.log('⚠️ OCR ga ikke bedre resultat');
          }
        } catch (ocrError) {
          console.log('❌ OCR fallback feilet:', ocrError.message);
          
          // Hvis fortsatt for lite tekst, gi detaljert feilmelding
          if (pdfData.text.length < 50) {
            const metadata = pdfData.info || {};
            console.log('📊 PDF metadata:', JSON.stringify(metadata, null, 2));
            
            if (pdfData.text.length === 0) {
              throw new Error('PDF inneholder ingen lesbar tekst (kan være scannet dokument eller passordbeskyttet)');
            }
          }
        }
      }
      
    } catch (pdfError) {
      console.error('❌ PDF parsing feilet:', pdfError.message);
      
      // Prøv å gi mer spesifikk feilmelding
      if (pdfError.message.includes('Invalid PDF')) {
        throw new Error('Ugyldig PDF-format - filen kan være korrupt eller ikke være en ekte PDF');
      } else if (pdfError.message.includes('Password')) {
        throw new Error('PDF er passordbeskyttet og kan ikke leses');
      } else {
        throw new Error(`PDF parsing feilet: ${pdfError.message}`);
      }
    }
    
    return {
      success: true,
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata,
      source: 'pdf_download',
      sourceUrl: pdfUrl,
      fileSize: buffer.length
    };
    
  } catch (error) {
    console.error('❌ === PDF NEDLASTING FEILET ===');
    console.error('❌ URL:', pdfUrl);
    console.error('❌ Feil:', error.message);
    console.error('❌ Type:', error.constructor.name);
    
    throw new Error(`PDF nedlasting/parsing feilet: ${error.message}`);
  } finally {
    // **STEG 4**: Alltid lukk siden for å unngå minnelekkasje
    if (page) {
      try {
        await page.close();
        console.log('🧹 PDF-side lukket');
      } catch (closeError) {
        console.error('⚠️ Kunne ikke lukke PDF-side:', closeError.message);
      }
    }
  }
}

// **FORBEDRET BRA-EKSTRAKSJONSLOGIKK** - Intelligent 4-fase prioritering
function extractBRAWithPriority(salgsoppgaveText) {
  console.log('🎯 === FORBEDRET BRA-EKSTRAKSJON STARTER ===');
  
  if (!salgsoppgaveText || salgsoppgaveText.length < 50) {
    console.log('⚠️ Ikke nok tekst for BRA-ekstraksjon');
    return null;
  }

  const arealCandidates = [];
  
  // FASE 1: Definer søkemønstre med prioritetspoeng
  const patterns = [
    // Høyest prioritet - eksakte BRA-betegnelser
    { regex: /(?:^|\n)\s*(?:bruksareal|^bra)[\s\n]*:?\s*(\d{1,4})\s*(?:m²|m2|kvm)?/gi, priority: 100, label: 'bruksareal' },
    { regex: /(?:^|\n)\s*(?:primærareal|p-rom)[\s\n]*:?\s*(\d{1,4})\s*(?:m²|m2|kvm)?/gi, priority: 90, label: 'primærareal' },
    
    // Medium prioritet - mer spesifikke mønstre
    { regex: /boligen\s+(?:har|er)(?:\s+på)?\s*(\d{1,4})\s*(?:m²|m2|kvm)/gi, priority: 70, label: 'boligstørrelse' },
    { regex: /(\d{1,4})\s*(?:m²|m2|kvm)\s+(?:bruksareal|bra|bolig)/gi, priority: 80, label: 'bruksareal_omvendt' },
    
    // Lavest prioritet - generelle areal-mønstre  
    { regex: /(?:^|\n)\s*(?:areal|størrelse)[\s\n]*:?\s*(\d{1,4})\s*(?:m²|m2|kvm)/gi, priority: 50, label: 'generelt_areal' },
  ];
  
  // FASE 2: Filtrer ut uønskede mønstre FØRST
  const excludePatterns = [
    /(?:internt|eksternt|bra-[ie]|utvendig|takterrasse|balkong|terrasse|garasje|kjeller(?!.*bra)|loft(?!.*bra)|tomt)/i
  ];
  
  // FASE 3: Samle alle kandidater
  patterns.forEach(({ regex, priority, label }) => {
    let match;
    while ((match = regex.exec(salgsoppgaveText)) !== null) {
      const fullMatch = match[0];
      const value = parseInt(match[1], 10);
      
      // Hopp over hvis matcher ekskluderte mønstre
      if (excludePatterns.some(exclude => exclude.test(fullMatch))) {
        console.log(`❌ Ekskludert: "${fullMatch.trim()}" (uønsket type)`);
        continue;
      }
      
      // Kun realistiske størrelser
      if (value >= 15 && value <= 1500) {
        arealCandidates.push({
          value,
          priority,
          label,
          context: fullMatch.trim(),
          position: match.index
        });
        console.log(`✅ Kandidat: ${value}m² (${label}, prioritet: ${priority})`);
      } else {
        console.log(`❌ Unrealistisk størrelse: ${value}m²`);
      }
    }
  });
  
  if (arealCandidates.length === 0) {
    console.log('❌ Ingen gyldige BRA-kandidater funnet');
    return null;
  }
  
  // FASE 4: Intelligent prioritering og duplikat-fjerning
  const grouped = arealCandidates.reduce((acc, candidate) => {
    const key = candidate.value;
    if (!acc[key] || acc[key].priority < candidate.priority) {
      acc[key] = candidate;
    }
    return acc;
  }, {});
  
  // Velg beste kandidat basert på prioritet og realisme
  const best = Object.values(grouped)
    .sort((a, b) => {
      // Først etter prioritet, så etter hvor typisk størrelsen er (40-200m² er mest vanlig)
      const aPriorityBonus = a.priority;
      const bPriorityBonus = b.priority;
      const aTypicalBonus = (a.value >= 40 && a.value <= 200) ? 10 : 0;
      const bTypicalBonus = (b.value >= 40 && b.value <= 200) ? 10 : 0;
      
      return (bPriorityBonus + bTypicalBonus) - (aPriorityBonus + aTypicalBonus);
    })[0];
  
  console.log(`🎯 BRA-ekstraksjonsresultat:`, {
    funnetKandidater: arealCandidates.length,
    unikkeCandidater: Object.keys(grouped).length,
    valgtVerdi: best.value,
    prioritet: best.priority,
    kontekst: best.context
  });
  
  return {
    bruksareal: `${best.value} m²`,
    _metadata: {
      confidence: best.priority,
      source: best.label,
      context: best.context,
      alternativeCandidates: Object.values(grouped).length
    }
  };
}

// **STEG 4**: Hjelpefunksjon for cleanup av midlertidige filer
function cleanupTempFile(filePath) {
  if (!filePath) return;
  
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      console.log('🗑️ Midlertidig fil ryddet opp:', fileName);
      return true;
    }
    return false;
  } catch (cleanupError) {
    console.error('⚠️ Kunne ikke slette midlertidig fil:', cleanupError.message);
    return false;
  }
}

// **STEG 4**: Funksjon for å rydde opp alle midlertidige filer fra denne økten
function cleanupAllTempFiles() {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const files = fs.readdirSync(tempDir);
    
    // Finn alle bolig-scraper temp-filer
    const boligScraperFiles = files.filter(file => 
      file.startsWith('bolig_scraper_') || 
      file.startsWith('temp_pdf_') ||
      file.includes('boligplattform')
    );
    
    if (boligScraperFiles.length > 0) {
      console.log('🧹 === RYDDER OPP MIDLERTIDIGE FILER ===');
      let cleaned = 0;
      
      boligScraperFiles.forEach(file => {
        try {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          
          // Slett filer som er eldre enn 1 time
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          if (stats.mtime.getTime() < oneHourAgo) {
            fs.unlinkSync(filePath);
            cleaned++;
            console.log('🗑️ Slettet gammel temp-fil:', file);
          }
        } catch (error) {
          console.error('⚠️ Kunne ikke slette:', file, error.message);
        }
      });
      
      console.log(`🧹 Ryddet opp ${cleaned} midlertidige filer`);
    }
  } catch (error) {
    console.error('⚠️ Generell feil ved opprydding:', error.message);
  }
}

// **HOVEDFUNKSJON for å ekstraktere strukturerte fakta fra salgsoppgave**
// VIKTIG: Salgsoppgaven er ALLTID hovedkilden - denne data skal prioriteres over scraping
function extractSalgsoppgaveFakta(salgsoppgaveText) {
  console.log('📋 Ekstraherer strukturerte fakta fra salgsoppgave (HOVEDKILDE)');
  
  if (!salgsoppgaveText || salgsoppgaveText.length < 50) {
    console.log('⚠️ Ingen salgsoppgave-tekst å analysere');
    return {};
  }
  
  const fakta = {};
  const text = salgsoppgaveText.toLowerCase();
  
  // **ANTALL SOVEROM** - omfattende regex-mønstre
  const soverommønstre = [
    // Standard mønstre
    /(?:antall\s+)?soverom[\s\n]*:?\s*(\d+)/i,
    /(\d+)\s*soverom/i,
    /(\d+)\s*stk\s*soverom/i,
    /(\d+)\s*soverom\s*(?:i\s*alt|totalt)/i,
    // Sov-rom varianter
    /sov-rom[\s\n]*:?\s*(\d+)/i,
    /sov\.?rom[\s\n]*:?\s*(\d+)/i,
    /(\d+)\s*sov\.?rom/i,
    /(\d+)\s*sovrom/i,
    // Fra beskrivelser
    /(?:har|med|inkludert)\s*(\d+)\s*soverom/i,
    /(\d+)\s*(?:store?|små?|doble?)\s*soverom/i,
    /boligen\s+har\s*(\d+)\s*soverom/i,
    // Med parenteser
    /soverom\s*\((\d+)\)/i,
    /(\d+)[-/]soverom/i
  ];
  
  for (const pattern of soverommønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1] && parseInt(match[1]) > 0 && parseInt(match[1]) < 20) {
      fakta.antallSoverom = match[1];
      console.log(`🎯 Fant antall soverom fra salgsoppgave: ${match[1]} (mønster: ${pattern.toString().substring(0,50)}...)`);
      break;
    }
  }
  
  // **ANTALL ROM** - omfattende regex-mønstre
  const rommønstre = [
    // Standard mønstre
    /(?:antall\s+)?rom[\s\n]*:?\s*(\d+)/i,
    /(\d+)\s*rom(?!\s*leilighet)/i,
    /(\d+)\s*stk\s*rom/i,
    /(\d+)\s*rom\s*(?:i\s*alt|totalt)/i,
    // P-rom (primærrom)
    /p-rom[\s\n]*:?\s*(\d+)/i,
    /primærrom[\s\n]*:?\s*(\d+)/i,
    // Fra beskrivelser
    /(\d+)-roms?\s*(?:leilighet|bolig)/i,
    /boligen\s+har\s*(\d+)\s*rom/i,
    /(?:har|med|inkludert)\s*(\d+)\s*rom/i,
    // Romfordeling
    /romfordeling[\s\S]*?(\d+)\s*rom/i,
    // Med parenteser
    /rom\s*\((\d+)\)/i,
    /(\d+)[-/]roms?/i
  ];
  
  for (const pattern of rommønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1] && parseInt(match[1]) > 0 && parseInt(match[1]) < 50) {
      fakta.antallRom = match[1];
      console.log(`🎯 Fant antall rom fra salgsoppgave: ${match[1]} (mønster: ${pattern.toString().substring(0,50)}...)`);
      break;
    }
  }
  
  // **FORBEDRET BRUKSAREAL-EKSTRAKSJON** - Bruker ny intelligent 4-fase prioritering
  const braResult = extractBRAWithPriority(salgsoppgaveText);
  if (braResult && braResult.bruksareal) {
    fakta.bruksareal = braResult.bruksareal;
    fakta._braMetadata = braResult._metadata;
    console.log(`🎯 Korrekt BRA funnet via forbedret logikk: ${braResult.bruksareal} (konfidens: ${braResult._metadata.confidence})`);
  }
  
  // **BOLIGTYPE** - omfattende regex-mønstre
  const boligtypemønstre = [
    /boligtype[\s\n]*:?\s*(leilighet|enebolig|tomannsbolig|rekkehus|gårdsbruk|villa|hytte)/i,
    /(?:^|\n|\.)\s*(leilighet|enebolig|tomannsbolig|rekkehus|gårdsbruk|villa|hytte)(?:\s|$|\.)/i,
    /(\d+-roms?\s*(?:leilighet|enebolig|villa))/i,
    /type[\s\n]*:?\s*(leilighet|enebolig|tomannsbolig|rekkehus|gårdsbruk|villa|hytte)/i
  ];
  
  for (const pattern of boligtypemønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      fakta.boligtype = match[1].trim();
      console.log(`🎯 Fant boligtype fra salgsoppgave: ${match[1]} (mønster: ${pattern.toString().substring(0,50)}...)`);
      break;
    }
  }
  
  // **BYGGEÅR** - omfattende regex-mønstre
  const byggeårmønstre = [
    /byggeår[\s\n]*:?\s*(\d{4})/i,
    /bygget[\s\n]*:?\s*(\d{4})/i,
    /oppført[\s\n]*:?\s*(\d{4})/i,
    /fra\s+(\d{4})/i,
    /(?:^|\n|\.)\s*(\d{4})(?:\s|$|\.)/,
    /byggeår[\s\n]*:?\s*ca\.?\s*(\d{4})/i,
    /bygget\s+(?:i|ca\.?)\s*(\d{4})/i
  ];
  
  for (const pattern of byggeårmønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1]) {
      const year = parseInt(match[1]);
      if (year >= 1800 && year <= new Date().getFullYear() + 5) {
        fakta.byggeaar = match[1];
        console.log(`🎯 Fant byggeår fra salgsoppgave: ${match[1]} (mønster: ${pattern.toString().substring(0,50)}...)`);
        break;
      }
    }
  }
  
  // **ADRESSE** - omfattende regex-mønstre
  const adressemønstre = [
    // Standard norsk adresse
    /([A-ZÆØÅ][a-zæøå\s]+\s+\d+[A-Za-z]?,\s+\d{4}\s+[A-ZÆØÅ][a-zæøå]+)/,
    /adresse[\s\n]*:?\s*([A-ZÆØÅ][a-zæøå\s]+\s+\d+[A-Za-z]?,\s+\d{4}\s+[A-ZÆØÅ][a-zæøå]+)/i,
    /beliggenhet[\s\n]*:?\s*([A-ZÆØÅ][a-zæøå\s]+\s+\d+[A-Za-z]?,\s+\d{4}\s+[A-ZÆØÅ][a-zæøå]+)/i
  ];
  
  for (const pattern of adressemønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1] && match[1].trim().length > 10 && match[1].includes(',')) {
      fakta.adresse = match[1].trim();
      console.log(`🎯 Fant adresse fra salgsoppgave: ${match[1]} (mønster: ${pattern.toString().substring(0,50)}...)`);
      break;
    }
  }
  
  // **PRIS/PRISANTYDNING** - omfattende regex-mønstre
  const prismønstre = [
    /prisantydning[\s\n]*:?\s*(\d{1,3}(?:\s\d{3})*)\s*kr/i,
    /pris[\s\n]*:?\s*(\d{1,3}(?:\s\d{3})*)\s*kr/i,
    /kr\.?\s*(\d{1,3}(?:\s\d{3})*)/i,
    /(\d{1,3}(?:\s\d{3})*)\s*kr(?!\s*\/)/i,
    /(?:^|\n|\.)\s*(\d{1,3}(?:\s\d{3})*)\s*(?:000\s*)?kr/i
  ];
  
  for (const pattern of prismønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1]) {
      const priceNum = parseInt(match[1].replace(/\s/g, ''));
      if (priceNum >= 100000 && priceNum <= 100000000) { // Mellom 100k og 100M
        fakta.pris = match[1] + ' kr';
        console.log(`🎯 Fant pris fra salgsoppgave: ${match[1]} kr (mønster: ${pattern.toString().substring(0,50)}...)`);
        break;
      }
    }
  }
  
  console.log('✅ Ekstraherte salgsoppgave-fakta:', Object.keys(fakta));
  return fakta;
}

// **FUNKSJON FOR Å SLÅ SAMMEN DATA MED PRIORITERING AV SALGSOPPGAVE**
// VIKTIG: Salgsoppgave-data skal ALLTID prioriteres over scraping-data
function combineDataWithSalgsoppgavePriority(scrapingData, salgsoppgaveFakta) {
  console.log('🔄 === SLÅR SAMMEN DATA - PRIORITERER SALGSOPPGAVE ===');
  console.log('📊 Scraping-data felter:', Object.keys(scrapingData || {}));
  console.log('📋 Salgsoppgave-fakta felter:', Object.keys(salgsoppgaveFakta || {}));
  
  // Start med scraping-data som base
  const combinedData = { ...scrapingData };
  
  // Oversett/map salgsoppgave-felter til riktige felt-navn
  const fieldMapping = {
    antallSoverom: 'antallSoverom',
    antallRom: 'antallRom', 
    bruksareal: 'bruksareal',
    boligtype: 'boligtype',
    byggeaar: 'byggeaar',
    adresse: 'adresse',
    pris: 'pris'
  };
  
  let overriddenFields = [];
  
  // **FORBEDRET VALIDERING**: Filtrer bort interne/eksterne arealer før bruk
  if (salgsoppgaveFakta && salgsoppgaveFakta.bruksareal) {
    if (/(?:internt|eksternt|bra-[ie])/i.test(salgsoppgaveFakta.bruksareal)) {
      console.log('⚠️ Fjerner intern/ekstern BRA som ikke er hovedareal:', salgsoppgaveFakta.bruksareal);
      delete salgsoppgaveFakta.bruksareal;
      delete salgsoppgaveFakta._braMetadata;
    }
  }

  // Overstyr med salgsoppgave-data der det finnes (HOVEDKILDE)
  for (const [salgsoppgaveField, targetField] of Object.entries(fieldMapping)) {
    if (salgsoppgaveFakta && salgsoppgaveFakta[salgsoppgaveField]) {
      const oldValue = combinedData[targetField];
      combinedData[targetField] = salgsoppgaveFakta[salgsoppgaveField];
      
      if (oldValue && oldValue !== salgsoppgaveFakta[salgsoppgaveField]) {
        overriddenFields.push(`${targetField}: "${oldValue}" → "${salgsoppgaveFakta[salgsoppgaveField]}"`);
        console.log(`🎯 OVERSTYR ${targetField}: "${oldValue}" → "${salgsoppgaveFakta[salgsoppgaveField]}" (fra salgsoppgave)`);
      } else {
        console.log(`✅ LEGG TIL ${targetField}: "${salgsoppgaveFakta[salgsoppgaveField]}" (fra salgsoppgave)`);
      }
    }
  }
  
  // Legg til metadata om datakilde
  combinedData._dataKilde = {
    hovedkilde: 'salgsoppgave',
    fallback: 'scraping',
    overstyrteFelter: overriddenFields,
    salgsoppgaveFelter: Object.keys(salgsoppgaveFakta || {}),
    scrapingFelter: Object.keys(scrapingData || {}),
    timestamp: new Date().toISOString()
  };
  
  console.log('✅ Data sammenslått. Overstyrte felter:', overriddenFields.length);
  return combinedData;
}

// **FORBEDRET FUNKSJON** for å ekstrahere detaljert info fra salgsoppgave-tekst for chat-bot
function extractDetailedInfo(salgsoppgaveText) {
  console.log('📋 Ekstraherer detaljert info for chat-bot (FORBEDRET MED ROMSTØRRELSER)');
  
  const info = {};
  const text = salgsoppgaveText.toLowerCase();
  
  // **NYT: EKSTRAHERING AV SPESIFIKKE ROM MED STØRRELSER**
  info.romInformasjon = extractRoomDetails(salgsoppgaveText);
  
  // **UTVIDET: Beskrivelse av innvendige rom**
  const innvendigSeksjon = extractSectionContent(salgsoppgaveText, ['beskrivelse - innvendig', 'innvendig', 'beskrivelse innvendig', 'romfordeling']);
  if (innvendigSeksjon) {
    info.innvendigBeskrivelse = innvendigSeksjon;
  }
  
  // **UTVIDET: Tekniske installasjoner**
  const tekniskeSeksjon = extractSectionContent(salgsoppgaveText, ['tekniske installasjoner', 'installasjoner', 'teknisk', 'vann og avløp']);
  if (tekniskeSeksjon) {
    info.tekniskeInstallasjoner = tekniskeSeksjon;
  }
  
  // Parkering - utvidet søk
  const parkeringContext = extractContextualInfo(salgsoppgaveText, ['parkering', 'garasje', 'bil', 'parkere'], 300);
  if (parkeringContext) {
    info.parkering = parkeringContext;
  }
  
  // Oppvarming - utvidet søk
  const oppvarmingContext = extractContextualInfo(salgsoppgaveText, ['oppvarming', 'varme', 'fyring', 'elektrisk oppvarming', 'varmepumpe', 'fjernvarme'], 300);
  if (oppvarmingContext) {
    info.oppvarming = oppvarmingContext;
  }
  
  // Ventilasjon
  const ventilasjonContext = extractContextualInfo(salgsoppgaveText, ['ventilasjon', 'lufting', 'mekanisk ventilasjon', 'ventilasjonsanlegg'], 200);
  if (ventilasjonContext) {
    info.ventilasjon = ventilasjonContext;
  }
  
  // Teknisk tilstand - utvidet
  const tekniskTilstandContext = extractContextualInfo(salgsoppgaveText, ['teknisk tilstand', 'tilstandsgrad', 'standard', 'vedlikeholdsbehov'], 400);
  if (tekniskTilstandContext) {
    info.tekniskTilstand = tekniskTilstandContext;
  }
  
  // Baderom - utvidet med størrelse
  const baderomContext = extractContextualInfo(salgsoppgaveText, ['baderom', 'bad ', 'dusj', 'toalett', 'wc'], 300);
  if (baderomContext) {
    info.baderom = baderomContext;
  }
  
  // Kjøkken - utvidet med størrelse
  const kjokkenContext = extractContextualInfo(salgsoppgaveText, ['kjøkken', 'køkken', 'kjøkkenet'], 300);
  if (kjokkenContext) {
    info.kjokken = kjokkenContext;
  }
  
  // Balkong/terrasse - utvidet
  const uteplassContext = extractContextualInfo(salgsoppgaveText, ['balkong', 'terrasse', 'uteplass', 'loggia'], 200);
  if (uteplassContext) {
    info.balkongTerrasse = uteplassContext;
  }
  
  // Energi - utvidet
  const energiContext = extractContextualInfo(salgsoppgaveText, ['energi', 'strøm', 'el-', 'energimerking', 'energiklasse'], 200);
  if (energiContext) {
    info.energi = energiContext;
  }
  
  // Vedlikehold - utvidet
  const vedlikeholdContext = extractContextualInfo(salgsoppgaveText, ['vedlikehold', 'oppussing', 'rehabilitering', 'renovering', 'oppgradert'], 300);
  if (vedlikeholdContext) {
    info.vedlikehold = vedlikeholdContext;
  }
  
  // **NYT: Felleskostnader og økonomi**
  const okonomiContext = extractContextualInfo(salgsoppgaveText, ['felleskostnad', 'kommunale avgifter', 'eiendomsskatt', 'fellesgjeld'], 400);
  if (okonomiContext) {
    info.okonomi = okonomiContext;
  }
  
  console.log('✅ Ekstraherte detaljert info:', Object.keys(info));
  console.log('📊 Antall rom funnet:', Object.keys(info.romInformasjon || {}).length);
  return info;
}

// **NY HJELPEFUNKSJON**: Ekstraherer rom-detaljer med størrelser
function extractRoomDetails(text) {
  const romInfo = {};
  
  // Avanserte mønstre for rom med størrelser
  const romMønstre = [
    // Format: "Soverom (11,2 m²)" eller "Soverom 11,2 m²"
    /(?:^|\n)\s*([A-Za-zæøåÆØÅ\/]+(?:\s+\d+)?)\s*(?:\(|:)?\s*(\d+[,.]?\d*)\s*m[²2]\s*(?:\)|$)/gim,
    // Format: "Entré 3,0 m²"
    /(?:^|\n)\s*([A-Za-zæøåÆØÅ\/]+)\s+(\d+[,.]?\d*)\s*m[²2]/gim,
    // Format: "Soverom: 11,2 m²"
    /([A-Za-zæøåÆØÅ\/]+)\s*:\s*(\d+[,.]?\d*)\s*m[²2]/gim,
    // Format i beskrivelse som "Stue/kjøkken (29,5 m²)"
    /([A-Za-zæøåÆØÅ\/]+(?:\s*\/\s*[A-Za-zæøåÆØÅ\/]+)?)\s*\(\s*(\d+[,.]?\d*)\s*m[²2]\s*\)/gim
  ];
  
  for (const pattern of romMønstre) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const romNavn = match[1].trim().toLowerCase();
      const størrelse = parseFloat(match[2].replace(',', '.'));
      
      // Filtrer bort ugyldige størrelser
      if (størrelse > 0.5 && størrelse < 200) {
        // Normaliser romnavn
        const normalizedName = normalizeRoomName(romNavn);
        if (normalizedName) {
          romInfo[normalizedName] = {
            originalNavn: match[1].trim(),
            størrelse: størrelse,
            enhet: 'm²',
            funnetMønster: pattern.toString().substring(0, 50) + '...'
          };
        }
      }
    }
  }
  
  return romInfo;
}

// **NY HJELPEFUNKSJON**: Normaliser romnavn
function normalizeRoomName(romNavn) {
  const navn = romNavn.toLowerCase().trim();
  
  // Mapping av vanlige rom-varianter
  const romMapping = {
    'entré': 'entré',
    'entre': 'entré',
    'soverom': 'soverom',
    'sovrom': 'soverom',
    'sov-rom': 'soverom',
    'bad': 'bad',
    'baderom': 'bad',
    'stue': 'stue',
    'stue/kjøkken': 'stue_kjøkken',
    'stue kjøkken': 'stue_kjøkken',
    'kjøkken': 'kjøkken',
    'køkken': 'kjøkken',
    'gang': 'gang',
    'bod': 'bod',
    'wc': 'wc',
    'toalett': 'wc',
    'vaskerom': 'vaskerom',
    'kontor': 'kontor',
    'arbeidsrom': 'kontor',
    'garderobe': 'garderobe',
    'walk-in closet': 'garderobe',
    'balkong': 'balkong',
    'terrasse': 'terrasse',
    'veranda': 'veranda'
  };
  
  // Sjekk direkte mapping først
  if (romMapping[navn]) {
    return romMapping[navn];
  }
  
  // Sjekk delvis matching
  for (const [key, value] of Object.entries(romMapping)) {
    if (navn.includes(key) || key.includes(navn)) {
      return value;
    }
  }
  
  // Returner originalnavnet hvis ikke funnet i mapping
  if (navn.length > 2 && navn.length < 30) {
    return navn;
  }
  
  return null;
}

// **NY HJELPEFUNKSJON**: Ekstraherer kontekstuell informasjon
function extractContextualInfo(text, searchTerms, contextLength = 200) {
  const lowerText = text.toLowerCase();
  
  for (const term of searchTerms) {
    const index = lowerText.indexOf(term.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + contextLength);
      return text.substring(start, end).trim();
    }
  }
  
  return null;
}

// **NY HJELPEFUNKSJON**: Ekstraherer innhold fra spesifikke seksjoner
function extractSectionContent(text, sectionTitles) {
  const lowerText = text.toLowerCase();
  
  for (const title of sectionTitles) {
    const titleIndex = lowerText.indexOf(title.toLowerCase());
    if (titleIndex !== -1) {
      // Finn slutten av seksjonen (neste store tittel eller maks 800 tegn)
      const sectionStart = titleIndex;
      let sectionEnd = text.length;
      
      // Se etter neste seksjon
      const nextSectionPattern = /\n\s*[A-ZÆØÅ][A-Za-zæøå\s]{10,50}\s*\n/g;
      nextSectionPattern.lastIndex = titleIndex + title.length;
      const nextMatch = nextSectionPattern.exec(text);
      if (nextMatch) {
        sectionEnd = nextMatch.index;
      }
      
      // Begrens til maksimalt 1000 tegn
      sectionEnd = Math.min(sectionEnd, sectionStart + 1000);
      
      return text.substring(sectionStart, sectionEnd).trim();
    }
  }
  
  return null;
}

// Funksjon for å hente salgsoppgavetekst fra dokumentside
async function extractSalgsoppgaveFromDocumentPage(docUrl, browser) {
  console.log('📄 Henter salgsoppgave fra dokumentside:', docUrl);
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.goto(docUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Prøv å finne tekst på dokumentsiden
    const documentText = await page.evaluate(() => {
      // Fjern script, style og andre ikke-tekstuelle elementer
      const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer');
      elementsToRemove.forEach(el => el.remove());
      
      // Hent all synlig tekst
      const bodyText = document.body ? document.body.innerText : '';
      
      // Filtrer bort kort tekst og navigasjon
      const lines = bodyText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10)
        .filter(line => !line.match(/^(hjem|finn|menu|søk|logg)/i));
      
      return lines.join('\n');
    });
    
    console.log('📖 Dokumenttekst ekstrahert, lengde:', documentText.length, 'tegn');
    
    await page.close();
    
    return {
      text: documentText,
      source: 'document_page'
    };
    
  } catch (error) {
    console.error('❌ Feil ved henting av dokumenttekst:', error);
    throw error;
  }
}

// Hovedfunksjon for å hente og analysere salgsoppgave
// **INTELLIGENT TOKEN-HÅNDTERING FOR OPENAI**
function estimateTokens(text) {
  // Grov estimering: 1 token ≈ 4 tegn for norsk tekst
  return Math.ceil(text.length / 4);
}

function compressRelevantContent(text) {
  console.log('🗜️ Komprimerer tekst for bedre AI-analyse...');
  
  // FASE 1: Identifiser og behold viktige seksjoner
  const importantSections = [
    'teknisk tilstand', 'tekniske installasjoner', 'bygningsmessig', 'vedlikehold',
    'pris', 'totalpris', 'prisantydning', 'omkostninger',
    'bruksareal', 'primærareal', 'areal', 'størrelse', 'rom',
    'byggeår', 'oppført', 'rehabilitert', 'renovert',
    'energi', 'oppvarming', 'isolering',
    'beliggenhet', 'utsikt', 'støy', 'nærmiljø',
    'felles', 'fellesgjeld', 'husleie', 'felleskostnader',
    'juridisk', 'rettigheter', 'servitutter', 'byggeforskrifter'
  ];
  
  const lines = text.split('\n');
  const relevantLines = [];
  let currentSection = '';
  
  for (const line of lines) {
    const cleanLine = line.toLowerCase().trim();
    
    // Sjekk om linjen starter en ny viktig seksjon
    const matchedSection = importantSections.find(section => 
      cleanLine.includes(section) && (cleanLine.includes(':') || cleanLine.length < 100)
    );
    
    if (matchedSection) {
      currentSection = matchedSection;
      relevantLines.push(line);
    } else if (currentSection && line.trim().length > 0) {
      // Fortsett å samle linjer under aktiv seksjon
      relevantLines.push(line);
      
      // Stopp seksjon hvis vi møter en ny overskrift eller tomt avsnitt
      if (cleanLine.match(/^[a-zæøå\s]+:$/i) || line.trim().length === 0) {
        currentSection = '';
      }
    } else if (cleanLine.length > 0 && (
      cleanLine.includes('m²') || 
      cleanLine.includes('kr') || 
      cleanLine.match(/\d{4}/) || // År
      cleanLine.includes('bygget') ||
      cleanLine.includes('renovert')
    )) {
      // Behold linjer med viktig numerisk informasjon
      relevantLines.push(line);
    }
  }
  
  const compressed = relevantLines.join('\n');
  console.log(`📊 Tekst komprimert: ${text.length} → ${compressed.length} tegn (${Math.round((1 - compressed.length/text.length) * 100)}% reduksjon)`);
  
  return compressed.length > 0 ? compressed : text.substring(0, 12000);
}

function buildDynamicSystemPrompt(salgsoppgaveFakta) {
  let prompt = `Du er en norsk boligekspert og eiendomsmegler med lang erfaring. Du får en salgsoppgave fra Finn.no/DNB/andre kilder.

**STRUKTURERTE FAKTA (PRIORITER DISSE):**`;

  if (Object.keys(salgsoppgaveFakta).length > 0) {
    for (const [key, value] of Object.entries(salgsoppgaveFakta)) {
      if (key !== '_braMetadata') {
        prompt += `\n- ${key}: ${value}`;
      }
    }
  } else {
    prompt += '\nIngen strukturerte fakta ekstrahert - analyser full tekst.';
  }

  prompt += `\n\nAnalyser informasjonen grundig og gi en profesjonell vurdering på:
1. TEKNISK TILSTAND: Bygningens standard, vedlikeholdsbehov, installasjoner
2. RISIKOFAKTORER: Potensielle problemer, fremtidige kostnader, juridiske forhold  
3. PRISVURDERING: Markedssammenligning, pris per m², posisjon
4. OPPUSSINGSBEHOV: Nødvendige og ønskede oppgraderinger med kostnader
5. ANBEFALTE SPØRSMÅL: Viktige spørsmål til visning/megler

Gi svaret som strukturert JSON med disse feltene:
{
  "tekniskTilstand": {"score": 1-10, "sammendrag": "tekst", "detaljer": "tekst", "hovedFunn": ["liste"]},
  "risiko": {"score": 1-10, "sammendrag": "tekst", "risikoer": ["liste"], "anbefalinger": ["liste"]},
  "prisvurdering": {"score": 1-10, "sammendrag": "tekst", "prisPerM2Vurdering": "tekst", "markedsvurdering": "tekst"},
  "oppussingBehov": {"nodvendig": ["liste"], "onsket": ["liste"], "estimertKostnad": "tekst"},
  "anbefalteSporsmal": ["spørsmål"],
  "konklusjon": "samlet vurdering"
}

Vær kritisk og realistisk. Base deg på norske forhold.`;

  return prompt;
}

function truncateIntelligently(text, maxTokens) {
  const maxChars = maxTokens * 4; // 4 tegn per token
  
  if (text.length <= maxChars) {
    return text;
  }
  
  console.log(`✂️ Trunkerer tekst intelligent: ${text.length} → ${maxChars} tegn`);
  
  // Prøv å kutte ved naturlige avsnitt
  const paragraphs = text.split('\n\n');
  let result = '';
  
  for (const paragraph of paragraphs) {
    if ((result + paragraph).length <= maxChars) {
      result += paragraph + '\n\n';
    } else {
      break;
    }
  }
  
  if (result.length < maxChars * 0.8) {
    // Hvis for mye ble kuttet, ta første del direkte
    return text.substring(0, maxChars);
  }
  
  return result.trim();
}

async function intelligentOpenAIAnalysis(salgsoppgaveText, salgsoppgaveFakta) {
  console.log('🤖 === INTELLIGENT OPENAI ANALYSE ===');
  
  // FASE 1: Intelligent tekst-komprimering
  const compressedText = compressRelevantContent(salgsoppgaveText);
  
  // FASE 2: Dynamisk prompt-tilpasning
  const systemPrompt = buildDynamicSystemPrompt(salgsoppgaveFakta);
  
  // FASE 3: Smart token-budsjett
  const maxTokens = 15000; // gpt-4o-mini kan håndtere mye mer
  const promptTokens = estimateTokens(systemPrompt);
  const availableForContent = maxTokens - promptTokens - 2500; // Buffer for respons
  
  const finalContent = truncateIntelligently(compressedText, availableForContent);
  
  console.log(`🤖 Token-budsjett: ${promptTokens} system + ${estimateTokens(finalContent)} innhold = ${promptTokens + estimateTokens(finalContent)} totalt`);
  
  // FASE 4: Forbedret strukturert prompt
  const structuredFacts = Object.keys(salgsoppgaveFakta).length > 0 
    ? `**EKSTRAHERTE FAKTA:**\n${Object.entries(salgsoppgaveFakta).map(([k,v]) => `${k}: ${v}`).join('\n')}\n\n`
    : '';
  
  const userContent = `${structuredFacts}**SALGSOPPGAVE-TEKST:**\n${finalContent}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];
  
  // FASE 5: Optimalisert API-kall
  return await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Bedre og billigere enn 3.5-turbo
    messages,
    temperature: 0.2,     // Litt mer deterministisk
    max_tokens: 2500,     // Mer plass for detaljert analyse
    response_format: { type: "json_object" } // Sikrer JSON-respons
  });
}

// **INTELLIGENT REDIS CACHING WRAPPER**
async function getCachedOrAnalyzeSalgsoppgave(finnUrl) {
  const cacheKey = `analysis:v2:${crypto.createHash('md5').update(finnUrl).digest('hex')}`;
  
  // FASE 1: Prøv cache først
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // INTELLIGENT CACHE-ALDERSSJEKK
        const age = Date.now() - (parsed.timestamp || 0);
        const quality = parsed.qualityScore || 5;
        
        // Høykvalitets analyser caches lengre
        const maxAge = quality > 8 ? 7 * 24 * 60 * 60 * 1000 :  // 7 dager
                      quality > 5 ? 24 * 60 * 60 * 1000 :        // 1 dag  
                                    2 * 60 * 60 * 1000;           // 2 timer
        
        if (age < maxAge) {
          console.log(`✅ Cache hit: ${Math.round(age/3600000)}t gammel analyse (kvalitet: ${quality}/10)`);
          return { ...parsed, _cached: true, _cacheAge: age };
        } else {
          console.log(`⏰ Cache utløpt: ${Math.round(age/3600000)}t (maks: ${Math.round(maxAge/3600000)}t)`);
          await redis.del(cacheKey); // Rydd opp utløpt cache
        }
      }
    } catch (cacheError) {
      console.log('⚠️ Cache read feilet:', cacheError.message);
    }
  }
  
  // FASE 2: Utfør analyse
  console.log('🔄 Utfører ny analyse (ikke cachet)...');
  const result = await getSalgsoppgaveAnalysisInternal(finnUrl);
  
  // FASE 3: Cache resultatet
  if (redis && result.success) {
    try {
      const qualityScore = calculateQualityScore(result);
      const dataToCache = {
        ...result,
        timestamp: Date.now(),
        qualityScore,
        _cacheVersion: 'v2'
      };
      
      // TTL basert på kvalitet
      const ttl = qualityScore > 8 ? 7 * 24 * 3600 :  // 7 dager
                  qualityScore > 5 ? 24 * 3600 :        // 1 dag
                                    2 * 3600;            // 2 timer
      
      await redis.setex(cacheKey, ttl, JSON.stringify(dataToCache));
      console.log(`💾 Cached analysis med ${Math.round(ttl/3600)}t TTL (kvalitet: ${qualityScore}/10)`);
    } catch (cacheError) {
      console.log('⚠️ Cache write feilet:', cacheError.message);
    }
  }
  
  return result;
}

// Beregn kvalitetscore for intelligent caching
function calculateQualityScore(result) {
  let score = 5; // Base score
  
  // Boost for salgsoppgave-tekst
  if (result.salgsoppgaveText?.length > 3000) score += 2;
  else if (result.salgsoppgaveText?.length > 1000) score += 1;
  
  // Boost for strukturerte fakta
  if (result.salgsoppgaveFakta && Object.keys(result.salgsoppgaveFakta).length > 3) score += 1;
  
  // Boost for AI-analyse
  if (result.aiAnalysis) score += 1;
  
  // Boost for høy konfidens på BRA
  if (result.salgsoppgaveFakta?._braMetadata?.confidence > 80) score += 1;
  
  return Math.min(10, Math.max(1, score));
}

async function getSalgsoppgaveAnalysisInternal(finnUrl) {
  console.log('🏠 Starter salgsoppgave-analyse for:', finnUrl);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    console.log('🌐 Navigerer til Finn-siden...');
    await page.goto(finnUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 1. Finn PDF/dokumentlenker
    const documentLinks = await findSalgsoppgavePDF(page, finnUrl);
    
    let salgsoppgaveText = '';
    let source = '';
    
    // 2. **VALIDÉR DOKUMENTER FØR BEHANDLING**
    // Først, filtrer bort dokumenter som ikke tilhører riktig eiendom
    const validatedDocuments = [];
    for (const doc of documentLinks) {
      if (doc.url && doc.url.startsWith('http') && doc.type === 'dom_link') {
        try {
          const isValid = await validateDocumentForProperty(doc.url, finnUrl, page);
          if (isValid) {
            validatedDocuments.push(doc);
            console.log('✅ Godkjent dokument:', doc.url.substring(0, 80));
          } else {
            console.log('❌ Forkastet dokument (feil eiendom):', doc.url.substring(0, 80));
          }
        } catch (error) {
          console.log('⚠️ Kunne ikke validere dokument:', doc.url.substring(0, 80), error.message);
          // Hvis validering feiler, ikke ta med dokumentet
        }
      } else {
        // Behold ikke-URL dokumenter (JSON, base64 etc) og andre typer
        validatedDocuments.push(doc);
      }
    }
    
    console.log(`📊 Validerte ${validatedDocuments.length} av ${documentLinks.length} dokumenter`);
    
    // Prøv å behandle alle validerte dokumenter med prioritert rekkefølge
    const prioriterteDokumenter = [
      ...validatedDocuments.filter(d => d.type === 'pdf' || d.url?.includes('.pdf')),
      ...validatedDocuments.filter(d => d.type === 'base64'),
      ...validatedDocuments.filter(d => d.type === 'json'),
      ...validatedDocuments.filter(d => d.type === 'verified_document_page'),
      ...validatedDocuments.filter(d => d.type === 'dom_link' && !d.url?.includes('.pdf'))
    ];
    
    console.log('📊 Behandler', prioriterteDokumenter.length, 'validerte dokumenter i prioritert rekkefølge');
    
    // **STEG 5**: FORBEDRET DOKUMENTBEHANDLING MED DETALJERT LOGGING
    let dokumentForsøk = 0;
    const dokumentResultater = [];
    let pdfForsøk = 0;
    let htmlForsøk = 0;
    let jsonForsøk = 0;
    
    for (const dokument of prioriterteDokumenter) {
      dokumentForsøk++;
      
      // **STEG 5**: Kategoriser behandlingstype for logging
      const isPDF = ['pdf', 'iframe_pdf', 'object_pdf', 'embed_pdf', 'forced_pdf_from_viewer', 'pdf_from_link_page'].includes(dokument.type);
      const isHTML = ['verified_document_page', 'html_fallback', 'dom_link'].includes(dokument.type);
      const isJSON = ['json', 'base64'].includes(dokument.type);
      
      if (isPDF) pdfForsøk++;
      if (isHTML) htmlForsøk++;
      if (isJSON) jsonForsøk++;
      
      try {
        console.log(`🔄 === DOKUMENT ${dokumentForsøk}/${prioriterteDokumenter.length} ===`);
        console.log('🔄 Type:', dokument.type);
        console.log('🔄 Kategori:', isPDF ? '📄 PDF' : isHTML ? '🌐 HTML' : isJSON ? '📋 JSON/Data' : '❓ Annet');
        console.log('🔄 Beskrivelse:', dokument.text?.substring(0, 50) || 'N/A');
        console.log('🔄 URL:', dokument.url?.substring(0, 80) || 'N/A');
        console.log('🔄 Forsøksteller - PDF:', pdfForsøk, 'HTML:', htmlForsøk, 'JSON:', jsonForsøk);
        
        const startTime = Date.now();
        const result = await processDocument(dokument, browser);
        const processingTime = Date.now() - startTime;
        
        // **STEG 5**: Detaljert logging av resultatet
        console.log(`⏱️ Behandlingstid: ${processingTime}ms`);
        
        // Logg resultatet for debugging med mer detaljer
        const documentResult = {
          index: dokumentForsøk,
          type: dokument.type,
          category: isPDF ? 'PDF' : isHTML ? 'HTML' : isJSON ? 'JSON' : 'Other',
          url: dokument.url,
          success: result.success,
          textLength: result.text?.length || 0,
          error: result.error,
          processingTime: processingTime,
          source: result.source,
          isHtmlFallback: result.isHtmlFallback || false
        };
        dokumentResultater.push(documentResult);
        
        if (result.success && result.text) {
          const textLength = result.text.length;
          console.log('📊 Tekst ekstrahert:', textLength, 'tegn');
          console.log('📊 Kilde:', result.source || 'Ukjent');
          
          // **STEG 5**: Logg om dette er HTML-fallback
          if (result.isHtmlFallback) {
            console.log('⚠️ MERK: Dette er HTML-fallback, ikke direkte PDF-innhold');
          }
          
          // **BEDRE KVALITETSVURDERING AV TEKST**
          if (textLength > 1000) {
            salgsoppgaveText = result.text;
            source = `${result.source || dokument.type}: ${result.sourceUrl || dokument.url}`;
            console.log('✅ HØYKVALITETS SALGSOPPGAVE FUNNET!');
            console.log('📄 Kilde:', source);
            console.log('📄 Tekstlengde:', textLength, 'tegn');
            console.log('📄 Type behandling:', isPDF ? 'PDF (beste)' : isHTML ? 'HTML (fallback)' : 'JSON/Data');
            break;
          } else if (textLength > 300) {
            // Medium kvalitet - behold som fallback
            if (!salgsoppgaveText || salgsoppgaveText.length < textLength) {
              salgsoppgaveText = result.text;
              source = `${result.source || dokument.type} (medium): ${result.sourceUrl || dokument.url}`;
              console.log('⚠️ MEDIUM KVALITET TEKST - beholder som fallback');
              console.log('📄 Tekstlengde:', textLength, 'tegn');
              console.log('📄 Type behandling:', isPDF ? 'PDF (medium)' : isHTML ? 'HTML (fallback)' : 'JSON/Data');
            }
          } else if (textLength > 50) {
            // Lav kvalitet - kun hvis vi ikke har noe bedre
            if (!salgsoppgaveText) {
              salgsoppgaveText = result.text;
              source = `${result.source || dokument.type} (lav kvalitet): ${result.sourceUrl || dokument.url}`;
              console.log('⚠️ LAV KVALITET TEKST - beholder som siste utvei');
              console.log('📄 Tekstlengde:', textLength, 'tegn');
              console.log('📄 Type behandling:', isPDF ? 'PDF (lav)' : isHTML ? 'HTML (fallback)' : 'JSON/Data');
            }
          } else {
            console.log('❌ For lite tekst ekstrahert:', textLength, 'tegn');
            console.log('📄 Tekst preview:', result.text.substring(0, 100));
            console.log('📄 Mulige problemer:', isPDF ? 'PDF kan være scannet eller korrupt' : isHTML ? 'HTML-side mangler innhold' : 'JSON mangler tekst-felt');
          }
        } else {
          // **STEG 5**: Detaljert feillogging
          console.log('❌ === DOKUMENT-BEHANDLING FEILET ===');
          console.log('   - Success:', result.success);
          console.log('   - Type:', dokument.type);
          console.log('   - Kategori:', isPDF ? 'PDF' : isHTML ? 'HTML' : 'JSON/Data');
          console.log('   - Feil:', result.error);
          console.log('   - Detaljer:', result.details || 'Ingen detaljer');
          console.log('   - URL:', dokument.url?.substring(0, 100));
          
          // **STEG 5**: Diagnostikk basert på type
          if (isPDF) {
            console.log('   📄 PDF-spesifikke problemer:');
            console.log('      - Kan være passordbeskyttet');
            console.log('      - Kan være scannet (ikke tekstbasert)');
            console.log('      - Nettverkstilgang kan være blokkert');
          } else if (isHTML) {
            console.log('   🌐 HTML-spesifikke problemer:');
            console.log('      - Siden kan kreve JavaScript');
            console.log('      - Innhold kan være dynamisk lastet');
            console.log('      - Anti-scraping beskyttelse');
          } else if (isJSON) {
            console.log('   📋 JSON-spesifikke problemer:');
            console.log('      - Mangler tekst-felt i JSON-struktur');
            console.log('      - Base64-data kan være korrupt');
          }
        }
      } catch (error) {
        // **STEG 5**: Detaljert feilhåndtering
        console.log('❌ === KRITISK FEIL VED BEHANDLING AV DOKUMENT ===');
        console.log('   - Dokument index:', dokumentForsøk);
        console.log('   - Type:', dokument.type);
        console.log('   - Kategori:', isPDF ? 'PDF' : isHTML ? 'HTML' : 'JSON/Data');
        console.log('   - URL:', dokument.url?.substring(0, 80));
        console.log('   - Feil:', error.message);
        console.log('   - Stack:', error.stack?.substring(0, 300));
        console.log('   - Tidspunkt:', new Date().toISOString());
        
        dokumentResultater.push({
          index: dokumentForsøk,
          type: dokument.type,
          category: isPDF ? 'PDF' : isHTML ? 'HTML' : 'JSON',
          url: dokument.url,
          success: false,
          textLength: 0,
          error: error.message,
          processingTime: 0,
          kritiskFeil: true
        });
        
        continue;
      }
    }
    
    // **STEG 5**: SAMMENDRAG-LOGGING AV HELE DOKUMENTBEHANDLINGEN
    console.log('📊 === SAMMENDRAG AV DOKUMENTBEHANDLING ===');
    console.log('📊 Totalt dokumenter behandlet:', dokumentResultater.length);
    console.log('📊 Vellykkede ekstraksjoner:', dokumentResultater.filter(d => d.success).length);
    console.log('📊 Feilede ekstraksjoner:', dokumentResultater.filter(d => !d.success).length);
    console.log('📊 Kritiske feil:', dokumentResultater.filter(d => d.kritiskFeil).length);
    
    // Kategorisering av behandlede dokumenter
    const behandledePDF = dokumentResultater.filter(d => d.category === 'PDF');
    const behandledeHTML = dokumentResultater.filter(d => d.category === 'HTML');
    const behandledeJSON = dokumentResultater.filter(d => d.category === 'JSON');
    
    console.log('📊 Behandlede PDF-dokumenter:', behandledePDF.length);
    console.log('📊 Behandlede HTML-dokumenter:', behandledeHTML.length);
    console.log('📊 Behandlede JSON-dokumenter:', behandledeJSON.length);
    
    // **STEG 5**: Detaljert oversikt over hva som fungerte
    const vellykkedePDF = behandledePDF.filter(d => d.success && d.textLength > 0);
    const vellykkdeHTML = behandledeHTML.filter(d => d.success && d.textLength > 0);
    const vellykkdeJSON = behandledeJSON.filter(d => d.success && d.textLength > 0);
    
    console.log('📊 === VELLYKKEDE EKSTRAKSJONER ===');
    console.log('✅ PDF-ekstraksjoner:', vellykkedePDF.length);
    console.log('✅ HTML-ekstraksjoner (fallback):', vellykkdeHTML.length);
    console.log('✅ JSON-ekstraksjoner:', vellykkdeJSON.length);
    
    // Logg beste resultat per kategori
    if (vellykkedePDF.length > 0) {
      const bestePDF = vellykkedePDF.reduce((best, current) => 
        current.textLength > best.textLength ? current : best
      );
      console.log('🏆 Beste PDF-resultat:', bestePDF.textLength, 'tegn fra', bestePDF.type);
    }
    
    if (vellykkdeHTML.length > 0) {
      const besteHTML = vellykkdeHTML.reduce((best, current) => 
        current.textLength > best.textLength ? current : best
      );
      console.log('🏆 Beste HTML-resultat:', besteHTML.textLength, 'tegn fra', besteHTML.type);
    }
    
    // **STEG 5**: Detaljerte resultater
    console.log('📊 === DETALJERTE RESULTATER ===');
    dokumentResultater.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const kategori = result.category || 'N/A';
      const feilInfo = result.error ? ` (${result.error})` : '';
      const kritisk = result.kritiskFeil ? ' [KRITISK]' : '';
      console.log(`   ${index + 1}. ${status} ${kategori}/${result.type}: ${result.textLength} tegn${feilInfo}${kritisk}`);
    });
    
    // **STEG 5**: Logg hovedresultat
    console.log('📊 === HOVEDRESULTAT ===');
    console.log('📊 Salgsoppgave-tekst funnet:', !!salgsoppgaveText);
    if (salgsoppgaveText) {
      console.log('📄 Tekstlengde:', salgsoppgaveText.length, 'tegn');
      console.log('📄 Kilde:', source);
      console.log('📄 Kvalitetsnivå:', 
        salgsoppgaveText.length > 3000 ? 'UTMERKET (>3000)' :
        salgsoppgaveText.length > 1000 ? 'HØYKVALITET (>1000)' :
        salgsoppgaveText.length > 300 ? 'MEDIUM (>300)' :
        salgsoppgaveText.length > 50 ? 'LAV (>50)' : 'SVÆRT LAV (<50)'
      );
    } else {
      console.log('❌ INGEN SALGSOPPGAVE-TEKST FUNNET');
      console.log('❌ Dette vil føre til begrenset analyse');
    }
    
    // **STEG 5**: Logg problemer som oppstod
    const problemer = dokumentResultater.filter(d => !d.success);
    if (problemer.length > 0) {
      console.log('⚠️ === PROBLEMER SOM OPPSTOD ===');
      problemer.forEach((problem, index) => {
        console.log(`   ${index + 1}. ${problem.type} (${problem.category}): ${problem.error}`);
      });
      
      // **STEG 5**: Forslag til forbedringer
      console.log('💡 === FORSLAG TIL FORBEDRINGER ===');
      const pdfProblemer = problemer.filter(p => p.category === 'PDF').length;
      const htmlProblemer = problemer.filter(p => p.category === 'HTML').length;
      
      if (pdfProblemer > 0) {
        console.log('   📄 PDF-problemer kan løses ved:');
        console.log('      - Sjekke om PDF-er krever autentisering');
        console.log('      - Forbedre PDF-parsing for scannede dokumenter');
        console.log('      - Implementere bedre nettverkshåndtering');
      }
      
      if (htmlProblemer > 0) {
        console.log('   🌐 HTML-problemer kan løses ved:');
        console.log('      - Vente lengre på JavaScript-loading');
        console.log('      - Forbedre CSS-selector for innhold');
        console.log('      - Håndtere mer dynamisk innhold');
      }
    }
    
    // 3. **FORBEDRET FALLBACK**: Hent mer strukturert info fra hovedsiden
    if (!salgsoppgaveText || salgsoppgaveText.length < 200) {
      console.log('📄 Fallback: henter utvidet informasjon fra hovedsiden');
      
      const pageData = await page.evaluate(() => {
        // Fjern ikke-relevante elementer
        const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, .cookie-banner, .ad');
        elementsToRemove.forEach(el => el.remove());
        
        // Hent relevant innhold
        const content = [];
        
        // **UTVIDET SØKING ETTER SALGSOPPGAVE-LENKER**
        const salgsoppgaveLinks = [];
        const allLinks = document.querySelectorAll('a[href*="salgsoppgave"], a[href*="prospekt"], a[href*="em1sr"], a[href*="eiendomsmegler"]');
        allLinks.forEach(link => {
          if (link.href && link.href.startsWith('http')) {
            salgsoppgaveLinks.push({
              url: link.href,
              text: link.textContent.trim(),
              title: link.title || link.getAttribute('aria-label') || ''
            });
          }
        });
        
        // **STRUKTURERT DATAHENTING**
        const strukturertData = {};
        
        // Hent alle key-value par fra siden
        const allText = document.body.textContent;
        const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Søk etter spesifikke data-mønstre
        const dataPatterns = {
          'Prisantydning': /Prisantydning[\s\n]*(\d{1,3}(?:\s\d{3})*)\s*kr/i,
          'Totalpris': /Totalpris[\s\n]*(\d{1,3}(?:\s\d{3})*)\s*kr/i,
          'Bruksareal': /(?:Internt\s+)?bruksareal[\s\n]*(\d+)\s*m²/i,
          'Primærareal': /Primærareal[\s\n]*(\d+)\s*m²/i,
          'Rom': /(\d+)\s*rom(?!\s*leilighet)/i,
          'Soverom': /(\d+)\s*soverom/i,
          'Byggeår': /Byggeår[\s\n]*(\d{4})/i,
          'Eierform': /Eierform[\s\n]*(Eier|Andel|Aksje)/i,
          'Energimerking': /Energimerking[\s\n]*([A-G])/i
        };
        
        for (const [key, pattern] of Object.entries(dataPatterns)) {
          const match = allText.match(pattern);
          if (match && match[1]) {
            strukturertData[key] = match[1];
          }
        }
        
        // Hovedinnhold med utvidede selektorer
        const mainSelectors = [
          'main', 
          '[role="main"]', 
          '.content', 
          '.ad-content', 
          '.object-content',
          '.property-content',
          '.listing-content',
          '.real-estate-content',
          'article'
        ];
        
        for (const selector of mainSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            content.push(element.innerText);
            break;
          }
        }
        
        // Hvis ikke hovedinnhold, ta body
        if (content.length === 0) {
          content.push(document.body.innerText);
        }
        
        return {
          text: content.join('\n'),
          salgsoppgaveLinks: salgsoppgaveLinks,
          strukturertData: strukturertData
        };
      });
      
      if (pageData.text && pageData.text.length > (salgsoppgaveText?.length || 0)) {
        salgsoppgaveText = pageData.text;
        source = 'Hovedside (forbedret fallback)';
        console.log('📄 Forbedret fallback-tekst hentet, lengde:', pageData.text.length, 'tegn');
        
        // Logg funnet strukturert data
        if (Object.keys(pageData.strukturertData).length > 0) {
          console.log('📊 Strukturert data fra hovedside:', pageData.strukturertData);
        }
        
                 // Logg eventuelle salgsoppgave-lenker som ikke ble testet
         if (pageData.salgsoppgaveLinks.length > 0) {
           console.log('🔗 Ekstra salgsoppgave-lenker funnet:', pageData.salgsoppgaveLinks.length);
           pageData.salgsoppgaveLinks.forEach((link, index) => {
             console.log(`   ${index + 1}. ${link.text} (${link.url.substring(0, 80)}...)`);
           });
           
           // **SISTE FORSØK**: Prøv å laste første salgsoppgave-lenke direkte
           if (pageData.salgsoppgaveLinks.length > 0 && (!salgsoppgaveText || salgsoppgaveText.length < 1000)) {
             console.log('🔄 Siste forsøk: laster første salgsoppgave-lenke direkt...');
             
             try {
               const extraPage = await browser.newPage();
               await extraPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
               
               const firstLink = pageData.salgsoppgaveLinks[0];
               console.log(`📥 Forsøker å laste: ${firstLink.url}`);
               
               await extraPage.goto(firstLink.url, { 
                 waitUntil: 'domcontentloaded',
                 timeout: 20000 
               });
               
               // Vent litt for at siden skal bli ferdig lastet
               await new Promise(resolve => setTimeout(resolve, 3000));
               
               const extraText = await extraPage.evaluate(() => {
                 const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer');
                 elementsToRemove.forEach(el => el.remove());
                 
                 return document.body ? document.body.innerText : '';
               });
               
               await extraPage.close();
               
               if (extraText && extraText.length > salgsoppgaveText.length) {
                 console.log('✅ Fant bedre tekst fra direkte salgsoppgave-lenke!');
                 console.log(`📄 Ny tekstlengde: ${extraText.length} tegn (fra ${salgsoppgaveText.length})`);
                 salgsoppgaveText = extraText;
                 source = `Direkte salgsoppgave-lenke: ${firstLink.text}`;
               } else {
                 console.log('⚠️ Direkte lenke ga ikke bedre resultat');
               }
               
             } catch (error) {
               console.log('❌ Kunne ikke laste direkte salgsoppgave-lenke:', error.message);
             }
           }
         }
       }
     }
    
    await page.close();
    
    // 4. **EKSTRAHER STRUKTURERTE FAKTA FRA SALGSOPPGAVE (HOVEDKILDE)**
    // VIKTIG: Dette er hovedkilden - skal prioriteres over all scraping-data
    let salgsoppgaveFakta = {};
    if (salgsoppgaveText && salgsoppgaveText.length > 100) {
      console.log('📊 === EKSTRAHERER STRUKTURERTE FAKTA FRA SALGSOPPGAVE (HOVEDKILDE) ===');
      salgsoppgaveFakta = extractSalgsoppgaveFakta(salgsoppgaveText);
      console.log('✅ Salgsoppgave-fakta ekstrahert:', salgsoppgaveFakta);
    }
    
    // 5. **FORBEDRET OPENAI ANALYSE** med intelligent token-håndtering
    let analysis = null;
    
    if (salgsoppgaveText && salgsoppgaveText.length > 100) {
      console.log('🤖 Starter forbedret OpenAI-analyse...');
      console.log('📊 Opprinnelig tekst lengde:', salgsoppgaveText.length, 'tegn');
      console.log('📊 Strukturerte fakta:', Object.keys(salgsoppgaveFakta).length, 'felter');
      
      if (process.env.OPENAI_API_KEY) {
        try {
          const completion = await intelligentOpenAIAnalysis(salgsoppgaveText, salgsoppgaveFakta);
          const responseContent = completion.choices[0].message.content;
          
          try {
            // Prøv å parse direkte først
            analysis = JSON.parse(responseContent);
            console.log('✅ OpenAI analyse fullført (direkte parsing)');
          } catch (parseError) {
            console.log('⚠️ Direkte parsing feilet, prøver å finne JSON i respons');
            
            // Prøv å finne JSON innenfor markdown code blocks eller lignende
            let jsonString = responseContent;
            
            // Fjern markdown code blocks
            jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Prøv å finne JSON-objekt
            const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                analysis = JSON.parse(jsonMatch[0]);
                console.log('✅ OpenAI analyse fullført (ekstrahert JSON)');
              } catch (secondParseError) {
                console.log('⚠️ Kunne ikke parse JSON fra OpenAI, bruker rå respons');
                analysis = {
                  raaAnalyse: responseContent,
                  feil: 'Kunne ikke parse JSON'
                };
              }
            } else {
              console.log('⚠️ Ingen JSON funnet i OpenAI respons, bruker rå respons');
              analysis = {
                raaAnalyse: responseContent,
                feil: 'Ingen JSON funnet'
              };
            }
          }
          
        } catch (openaiError) {
          console.error('❌ OpenAI API feil:', openaiError);
          analysis = {
            feil: `OpenAI API feil: ${openaiError.message}`,
            tekst: salgsoppgaveText.substring(0, 1000) + '...'
          };
        }
      } else {
        console.log('⚠️ Ingen OpenAI API-nøkkel, returnerer kun tekst');
        analysis = {
          feil: 'Ingen OpenAI API-nøkkel konfigurert',
          tekst: salgsoppgaveText.substring(0, 1000) + '...'
        };
      }
    } else {
      analysis = {
        feil: 'Ingen salgsoppgave-tekst funnet',
        funnetDokumenter: documentLinks
      };
    }
    
    // **STEG 3**: FORBEDRET RETUR-LOGIKK MED KVALITETSVURDERING OG PDF-UPLOAD ANBEFALING
    const textQuality = salgsoppgaveText ? 
      (salgsoppgaveText.length > 3000 ? 'høy' : 
       salgsoppgaveText.length > 1000 ? 'medium' : 
       salgsoppgaveText.length > 300 ? 'lav' : 'svært lav') : 'ingen';
    
    // **STEG 3**: Sjekk om vi trenger PDF-upload (mindre enn 3000 tegn)
    const needsPDFUpload = !salgsoppgaveText || salgsoppgaveText.length < 3000;
    
    const textAnalysis = {
      hasText: !!salgsoppgaveText,
      textLength: salgsoppgaveText?.length || 0,
      quality: textQuality,
      sufficientForAnalysis: salgsoppgaveText && salgsoppgaveText.length > 300,
      recommendAIAnalysis: salgsoppgaveText && salgsoppgaveText.length > 1000,
      warningMessage: null,
      // **STEG 3**: Ny flagg for PDF-upload anbefaling
      needsPDFUpload: needsPDFUpload,
      userFriendlyMessage: null
    };
    
    // **STEG 3**: Generer advarsler og brukervennlige beskjeder basert på tekst-kvalitet
    if (!salgsoppgaveText) {
      textAnalysis.warningMessage = "Ingen salgsoppgave-tekst funnet. AI-analyse vil være svært begrenset.";
      textAnalysis.userFriendlyMessage = "Vi fant ikke nok informasjon i salgsoppgaven automatisk. For en komplett analyse, last opp PDF direkte.";
    } else if (textAnalysis.textLength < 3000) {
      if (textAnalysis.quality === 'svært lav') {
        textAnalysis.warningMessage = `Svært lite tekst funnet (${textAnalysis.textLength} tegn). AI-analyse kan være meget unøyaktig.`;
        textAnalysis.userFriendlyMessage = "Vi fant svært lite informasjon i salgsoppgaven automatisk. For en komplett analyse, last opp PDF direkte.";
      } else if (textAnalysis.quality === 'lav') {
        textAnalysis.warningMessage = `Begrenset tekst funnet (${textAnalysis.textLength} tegn). AI-analyse kan mangle viktige detaljer.`;
        textAnalysis.userFriendlyMessage = "Vi fant begrenset informasjon i salgsoppgaven automatisk. For en mer detaljert analyse, last opp PDF direkte.";
      } else if (textAnalysis.quality === 'medium') {
        textAnalysis.warningMessage = `Moderat mengde tekst funnet (${textAnalysis.textLength} tegn). AI-analyse bør være brukbar, men kan mangle noen detaljer.`;
        textAnalysis.userFriendlyMessage = "Vi fant moderat informasjon i salgsoppgaven. For en mer komplett analyse, vurder å laste opp PDF direkte.";
      }
    } else {
      // Tilstrekkelig tekst funnet
      textAnalysis.warningMessage = null;
      textAnalysis.userFriendlyMessage = null;
    }
    
    console.log('📊 === TEKSTKVALITET VURDERING ===');
    console.log('📊 Tekst tilgjengelig:', textAnalysis.hasText);
    console.log('📊 Tekstlengde:', textAnalysis.textLength);
    console.log('📊 Kvalitet:', textAnalysis.quality);
    console.log('📊 Tilstrekkelig for analyse:', textAnalysis.sufficientForAnalysis);
    console.log('📊 Anbefaler AI-analyse:', textAnalysis.recommendAIAnalysis);
    if (textAnalysis.warningMessage) {
      console.log('⚠️ Advarsel:', textAnalysis.warningMessage);
    }
    
    const returnData = {
      success: true,
      source: source || 'Ingen gyldig kilde funnet',
      documentLinks: documentLinks || [],
      
      // **NY**: Detaljert tekstanalyse for frontend
      textAnalysis: textAnalysis,
      
      // Legacy fields (behold for bakoverkompatibilitet)
      textLength: salgsoppgaveText?.length || 0,
      
      analysis: analysis,
      rawText: process.env.NODE_ENV === 'development' ? salgsoppgaveText?.substring(0, 2000) : undefined,
      
      // **HOVEDDATA FRA SALGSOPPGAVE (PRIORITERES OVER SCRAPING)**
      salgsoppgaveFakta: salgsoppgaveFakta || {},
      
      // Legg til et sammendrag av viktig informasjon for chat-bot
      detailedInfo: salgsoppgaveText ? extractDetailedInfo(salgsoppgaveText) : null,
      
      // **NY**: Debugging info (kun i development)
      debugInfo: process.env.NODE_ENV === 'development' ? {
        dokumentResultater: dokumentResultater || [],
        prioriterteDokumenter: prioriterteDokumenter?.length || 0,
        validatedDocuments: validatedDocuments?.length || 0
      } : undefined
    };
    
    // Logg final resultat
    console.log('📊 === SALGSOPPGAVE ANALYSE KOMPLETT ===');
    console.log('✅ Success:', returnData.success);
    console.log('📊 Kilde:', returnData.source);
    console.log('📊 Dokumenter funnet:', returnData.documentLinks.length);
    console.log('📊 Tekstkvalitet:', returnData.textAnalysis.quality);
    console.log('📊 AI-analyse:', returnData.analysis ? 'Tilgjengelig' : 'Ikke tilgjengelig');
    console.log('📊 Salgsoppgave fakta:', Object.keys(returnData.salgsoppgaveFakta).length, 'felter');
    
    // **STEG 4**: Rydd opp midlertidige filer før retur
    console.log('🧹 Rydder opp midlertidige filer...');
    cleanupAllTempFiles();
    
    return returnData;
    
  } catch (error) {
    console.error('❌ Feil i salgsoppgave-analyse:', error);
    
    // **STEG 4**: Rydd opp midlertidige filer også ved feil
    console.log('🧹 Rydder opp midlertidige filer (etter feil)...');
    cleanupAllTempFiles();
    
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  } finally {
    await browser.close();
  }
}

// Forbedret funksjon for å håndtere ulike dokumenttyper inkludert nye iframe/object/forced typer
async function processDocument(dokument, browser) {
  console.log('🔄 === BEHANDLER DOKUMENT ===');
  console.log('🔄 Type:', dokument.type);
  console.log('🔄 URL:', dokument.url?.substring(0, 100) || 'N/A');
  console.log('🔄 Tekst:', dokument.text?.substring(0, 50) || 'N/A');
  
  try {
    // Håndter forskjellige dokumenttyper
    switch (dokument.type) {
      case 'pdf':
        console.log('📄 Behandler direkte PDF-respons...');
        return await downloadAndParsePDF(dokument.url, browser);
      
      case 'iframe_pdf':
      case 'object_pdf':
      case 'embed_pdf':
        console.log('📄 Behandler PDF fra iframe/object/embed...');
        return await downloadAndParsePDF(dokument.url, browser);
      
      case 'forced_pdf_from_viewer':
        console.log('📄 Behandler PDF som ble forced fra viewer...');
        if (dokument.url) {
          return await downloadAndParsePDF(dokument.url, browser);
        } else {
          return { success: false, error: 'Ingen URL for forced PDF' };
        }
      
      case 'pdf_from_link_page':
        console.log('📄 Behandler PDF funnet på lenke-side...');
        return await downloadAndParsePDF(dokument.url, browser);
      
      case 'base64':
        console.log('📦 Behandler base64-encoded PDF...');
        return await parseBase64PDF(dokument.data);
      
      case 'json':
        console.log('📋 Behandler JSON-respons...');
        return await extractTextFromJSON(dokument.data, dokument.url);
      
      case 'verified_document_page':
        console.log('🌐 Behandler verifisert dokumentside...');
        if (dokument.pageAnalysis) {
          // Ny logikk: hvis siden har PDF-elementer, prøv å hente dem først
          if (dokument.pageAnalysis.hasIframe || dokument.pageAnalysis.hasObject || dokument.pageAnalysis.hasEmbed) {
            console.log('🔄 Dokumentside har PDF-elementer, prøver direct extraction...');
            // Forsøk å behandle som viewer-side først
            const forcedResult = await forceOpenPDFFromViewer(dokument.url, browser);
            if (forcedResult.length > 0 && forcedResult[0].url) {
              return await downloadAndParsePDF(forcedResult[0].url, browser);
            }
          }
          
          // **STEG 2**: Fallback til forbedret tekstekstraksjon fra siden med browser-support
          return await extractTextFromDocumentPage(dokument.pageAnalysis.contentPreview, dokument.url, browser);
        } else if (dokument.pageContent) {
          // **STEG 2**: Legacy support med browser-parameter
          return await extractTextFromDocumentPage(dokument.pageContent, dokument.url, browser);
        } else {
          return await downloadAndParseDocumentPage(dokument.url, browser);
        }
      
      case 'dom_link':
        console.log('🔗 Behandler DOM-lenke...');
        // Prøv først som PDF, så som dokumentside
        if (dokument.url.includes('.pdf')) {
          return await downloadAndParsePDF(dokument.url, browser);
        } else {
          return await downloadAndParseDocumentPage(dokument.url, browser);
        }
      
      case 'download_button':
        console.log('📥 Behandler nedlastingsknapp...');
        if (dokument.url && dokument.url.includes('.pdf')) {
          return await downloadAndParsePDF(dokument.url, browser);
        } else {
          return { success: false, error: 'Nedlastingsknapp peker ikke på PDF' };
        }
      
      default:
        console.log('⚠️ Ukjent dokumenttype:', dokument.type);
        return { success: false, error: `Ukjent dokumenttype: ${dokument.type}` };
    }
  } catch (error) {
    console.error('❌ Feil ved behandling av dokument:', error.message);
    console.error('❌ Stack trace:', error.stack?.substring(0, 500));
    return { success: false, error: error.message, details: error.stack?.substring(0, 200) };
  }
}

// Funksjon for å parse base64-encodede PDF-er
async function parseBase64PDF(base64Data) {
  console.log('📦 Parser base64 PDF-data');
  
  try {
    let base64String = '';
    
    if (typeof base64Data === 'string') {
      // Se etter base64-mønster i strengen
      const base64Match = base64Data.match(/([A-Za-z0-9+\/=]{100,})/);
      if (base64Match) {
        base64String = base64Match[1];
      }
      // Sjekk om hele strengen er base64
      else if (/^[A-Za-z0-9+\/=]+$/.test(base64Data) && base64Data.length > 100) {
        base64String = base64Data;
      }
    } else if (typeof base64Data === 'object') {
      // Se etter base64 i objektstrukturen
      const findBase64 = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key].length > 100 && /^[A-Za-z0-9+\/=]+$/.test(obj[key])) {
            return obj[key];
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = findBase64(obj[key]);
            if (result) return result;
          }
        }
        return null;
      };
      
      base64String = findBase64(base64Data);
    }
    
    if (!base64String) {
      throw new Error('Ingen base64 PDF-data funnet');
    }
    
    // Konverter base64 til buffer
    const pdfBuffer = Buffer.from(base64String, 'base64');
    console.log('📄 Base64 PDF konvertert, størrelse:', pdfBuffer.length, 'bytes');
    
    // Parse PDF med pdf-parse
    const pdfData = await pdfParse(pdfBuffer);
    console.log('📖 Base64 PDF parsert, antall sider:', pdfData.numpages);
    
    return {
      success: true,
      text: pdfData.text,
      pages: pdfData.numpages,
      metadata: pdfData.info,
      source: 'base64'
    };
    
  } catch (error) {
    console.error('❌ Feil ved parsing av base64 PDF:', error.message);
    return { success: false, error: error.message };
  }
}

// Funksjon for å ekstrahere tekst fra JSON-responser
async function extractTextFromJSON(jsonData, url) {
  console.log('📋 Ekstraherer tekst fra JSON-data');
  
  try {
    let tekst = '';
    
    // Prøv forskjellige måter å finne tekst i JSON-strukturen
    const extractTextRecursive = (obj, depth = 0) => {
      if (depth > 10) return; // Unngå evig rekursjon
      
      for (const key in obj) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          // Se etter tekst som ser ut som dokumentinnhold
          if (value.length > 50 && (
            key.toLowerCase().includes('text') ||
            key.toLowerCase().includes('content') ||
            key.toLowerCase().includes('description') ||
            key.toLowerCase().includes('body') ||
            key.toLowerCase().includes('document') ||
            value.includes('kvm') ||
            value.includes('kr ') ||
            value.includes('byggeår') ||
            value.includes('rom') ||
            value.includes('salgsoppgave') ||
            value.includes('prospekt')
          )) {
            tekst += value + '\n\n';
          }
        } else if (typeof value === 'object' && value !== null) {
          extractTextRecursive(value, depth + 1);
        }
      }
    };
    
    extractTextRecursive(jsonData);
    
    if (tekst.trim().length > 0) {
      console.log('✅ Fant tekst i JSON, lengde:', tekst.length);
      return {
        success: true,
        text: tekst.trim(),
        source: 'json',
        sourceUrl: url
      };
    } else {
      throw new Error('Ingen relevant tekst funnet i JSON');
    }
    
  } catch (error) {
    console.error('❌ Feil ved tekstekstraksjon fra JSON:', error.message);
    return { success: false, error: error.message };
  }
}

// **STEG 2**: Funksjon for å laste ned og parse dokumentsider med PDF-støtte
async function downloadAndParseDocumentPage(url, browser) {
  console.log('🌐 Laster ned dokumentside:', url);
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    const pageContent = await page.content();
    // **STEG 2**: Send browser-instans til extractTextFromDocumentPage for PDF-støtte
    const result = await extractTextFromDocumentPage(pageContent, url, browser);
    
    await page.close();
    return result;
    
  } catch (error) {
    console.error('❌ Feil ved nedlasting av dokumentside:', error.message);
    return { success: false, error: error.message };
  }
}

// **STEG 2**: Forbedret funksjon for å ekstrahere tekst fra dokumentsider med PDF-støtte
async function extractTextFromDocumentPage(pageContent, url, browser = null) {
  console.log('📄 === EKSTRAHERER TEKST FRA DOKUMENTSIDE ===');
  console.log('📄 URL:', url);
  
  try {
    // **NYT**: Bruk cheerio for å parse HTML og se etter PDF-er
    const cheerio = require('cheerio');
    const $ = cheerio.load(pageContent);
    
    // **STEG 2**: Sjekk først om det finnes iframe eller object med PDF
    console.log('🔍 Søker etter PDF i iframe/object tags...');
    const pdfElements = [];
    
    // Søk etter iframe med PDF
    $('iframe').each((index, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      const title = $(element).attr('title') || $(element).attr('aria-label') || '';
      
      if (src && (src.includes('.pdf') || src.includes('pdf') || title.toLowerCase().includes('pdf'))) {
        pdfElements.push({
          type: 'iframe_pdf',
          url: src.startsWith('http') ? src : new URL(src, url).href,
          title: title,
          element: 'iframe'
        });
        console.log('📄 Fant PDF i iframe:', src);
      }
    });
    
    // Søk etter object med PDF
    $('object').each((index, element) => {
      const data = $(element).attr('data') || $(element).attr('data-src');
      const type = $(element).attr('type') || '';
      
      if (data && (data.includes('.pdf') || data.includes('pdf') || type.includes('pdf'))) {
        pdfElements.push({
          type: 'object_pdf',
          url: data.startsWith('http') ? data : new URL(data, url).href,
          title: type,
          element: 'object'
        });
        console.log('📄 Fant PDF i object:', data);
      }
    });
    
    // Søk etter embed med PDF
    $('embed').each((index, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      const type = $(element).attr('type') || '';
      
      if (src && (src.includes('.pdf') || src.includes('pdf') || type.includes('pdf'))) {
        pdfElements.push({
          type: 'embed_pdf',
          url: src.startsWith('http') ? src : new URL(src, url).href,
          title: type,
          element: 'embed'
        });
        console.log('📄 Fant PDF i embed:', src);
      }
    });
    
    // **STEG 2**: Hvis vi fant PDF-elementer, prøv å laste ned PDF-en direkte
    if (pdfElements.length > 0 && browser) {
      console.log('🎯 Fant', pdfElements.length, 'PDF-elementer, prøver direkte PDF-nedlasting...');
      
      for (const pdfElement of pdfElements) {
        try {
          console.log(`📥 Forsøker å laste ned PDF fra ${pdfElement.element}: ${pdfElement.url}`);
          
          // Bruk eksisterende downloadAndParsePDF funksjon
          const pdfResult = await downloadAndParsePDF(pdfElement.url, browser);
          
          if (pdfResult.success && pdfResult.text && pdfResult.text.length > 100) {
            console.log('✅ SUKSESS: PDF lastet ned og parsert fra dokumentside!');
            console.log('📊 Tekstlengde fra PDF:', pdfResult.text.length, 'tegn');
            
            return {
              success: true,
              text: pdfResult.text,
              source: `pdf_from_${pdfElement.element}`,
              sourceUrl: pdfElement.url,
              originalDocumentUrl: url,
              numPages: pdfResult.numPages,
              fileSize: pdfResult.fileSize
            };
          } else {
            console.log('⚠️ PDF-nedlasting feilet:', pdfResult.error);
          }
          
        } catch (pdfError) {
          console.log('❌ Feil ved PDF-nedlasting fra', pdfElement.element, ':', pdfError.message);
          continue; // Prøv neste PDF-element
        }
      }
      
      console.log('⚠️ Alle PDF-nedlastinger feilet, faller tilbake til HTML-parsing');
    } else if (pdfElements.length > 0) {
      console.log('⚠️ Fant PDF-elementer men mangler browser-instans for nedlasting');
    } else {
      console.log('ℹ️ Ingen PDF-elementer funnet, bruker HTML-parsing');
    }
    
    // **STEG 2**: Fallback til HTML-tekstekstraksjon (eksisterende logikk)
    console.log('📄 === FALLBACK: BRUKER HTML-TEKSTEKSTRAKSJON ===');
    console.log('⚠️ Dette er fallback-metode - kan mangle viktig informasjon fra PDF');
    
    // Fjern ikke-relevante elementer
    $('script, style, nav, header, footer, .cookie-banner, .ad, .navigation, .menu').remove();
    
    // Hent tekst fra hovedinnhold
    let text = '';
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      '.document-content',
      '.pdf-content',
      '.document-viewer',
      '.article-content',
      'article',
      '.main-content',
      '.document-container',
      '.pdf-container'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        text = element.text();
        console.log(`📄 Hentet tekst fra selector: ${selector} (${text.length} tegn)`);
        break;
      }
    }
    
    // Fallback til body hvis ingen hovedinnhold funnet
    if (!text || text.length < 100) {
      text = $('body').text();
      console.log('📄 Fallback til body-tekst:', text.length, 'tegn');
    }
    
    // Rens teksten
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    if (cleanedText.length > 50) {
      console.log('✅ HTML-tekstekstraksjon fullført');
      console.log('📊 Renset tekstlengde:', cleanedText.length, 'tegn');
      console.log('⚠️ MERK: Dette er HTML-fallback, ikke PDF-innhold');
      
      return {
        success: true,
        text: cleanedText,
        source: 'html_fallback',
        sourceUrl: url,
        isHtmlFallback: true, // **NYT**: Flagg for å indikere at dette er fallback
        warning: 'Tekst hentet fra HTML-fallback, ikke direkte fra PDF'
      };
    } else {
      throw new Error('For lite innhold funnet på dokumentsiden (HTML-fallback)');
    }
    
  } catch (error) {
    console.error('❌ Feil ved tekstekstraksjon fra dokumentside:', error.message);
    console.error('📄 URL som feilet:', url);
    return { 
      success: false, 
      error: error.message,
      sourceUrl: url
    };
  }
}

app.post("/api/parse-finn", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("finn.no")) {
    return res.status(400).json({ error: "Ugyldig FINN-lenke." });
  }

  let browser;
  try {
    console.log(`🔍 Starter scraping av: ${url}`);
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    console.log('🌐 Navigerer til siden...');
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Sjekk om vi fikk en 404-side
    const pageTitle = await page.title();
    if (pageTitle.includes('404') || pageTitle.includes('Ikke funnet')) {
      throw new Error('Annonsen ble ikke funnet (404). Sjekk at lenken er korrekt og at annonsen fortsatt er aktiv.');
    }
    
    console.log('📊 Henter data...');
    const data = await page.evaluate(() => {
      const result = {};
      
      // Hent tittel
      const h1 = document.querySelector('h1');
      result.tittel = h1 ? h1.textContent.trim() : '';
      
      // Hent adresse - prøv flere metoder
      let adresse = '';
      
      // Metode 1: Fra kart-ikon element
      const mapElement = document.querySelector('[data-testid="object-address"]');
      if (mapElement) {
        adresse = mapElement.textContent.trim();
      }
      
      // Metode 2: Fra URL-struktur eller meta-tags
      if (!adresse) {
        const bodyText = document.body.textContent;
        // Søk etter adresse-mønstre i teksten
        const addressPatterns = [
          /([A-ZÆØÅ][a-zæøå\s]+\s+\d+[A-Za-z]?,\s+\d{4}\s+[A-ZÆØÅ][a-zæøå]+)/g,
          /(\w+\s+\d+[A-Za-z]?,\s+\d{4}\s+\w+)/g
        ];
        
        for (const pattern of addressPatterns) {
          const matches = [...bodyText.matchAll(pattern)];
          if (matches.length > 0) {
            // Ta den første som ser ut som en ekte adresse
            for (const match of matches) {
              if (match[1] && match[1].length < 100 && match[1].includes(',')) {
                adresse = match[1];
                break;
              }
            }
            if (adresse) break;
          }
        }
      }
      
      result.adresse = adresse || 'Ukjent adresse';
      
      // Hent pris - forbedret regex
      const bodyText = document.body.textContent;
      const pricePatterns = [
        /Prisantydning[\s\n]*(\d{1,3}(?:\s\d{3})*)\s*kr/i,
        /(\d{1,3}(?:\s\d{3})*)\s*kr(?!\s*\/)/i // Unngå kr/m²
      ];
      
      let pris = '';
      for (const pattern of pricePatterns) {
        const match = bodyText.match(pattern);
        if (match && match[1]) {
          pris = match[1] + ' kr';
          break;
        }
      }
      result.pris = pris;
      
      // Hent hovedbilde
      const ogImage = document.querySelector('meta[property="og:image"]');
      result.hovedbilde = ogImage ? ogImage.content : '';
      result.bilde = result.hovedbilde;
      
      // Hent bilder
      const images = [];
      if (result.hovedbilde) images.push(result.hovedbilde);
      
      const imgElements = document.querySelectorAll('img');
      imgElements.forEach(img => {
        if (img.src && img.src.includes('finncdn') && !images.includes(img.src)) {
          images.push(img.src);
        }
      });
      result.bilder = images.slice(0, 10);
      
      // Prøv å hente data fra JSON-strukturer
      const scripts = document.querySelectorAll('script');
      let jsonData = null;
      
      for (const script of scripts) {
        const content = script.textContent;
        if (content && content.includes('realestate-hydration')) {
          try {
            // Prøv å finne JSON-objektet med kontaktinfo
            const jsonStart = content.indexOf('{"type":"realestate-hydration"');
            if (jsonStart !== -1) {
              const jsonEnd = content.indexOf('}}', jsonStart) + 2;
              const jsonString = content.substring(jsonStart, jsonEnd);
              jsonData = JSON.parse(jsonString);
              break;
            }
          } catch (e) {
            // Prøv alternativ metode
            try {
              const contactMatch = content.match(/"contacts":\[([^\]]+)\]/);
              if (contactMatch) {
                const nameMatch = content.match(/"name":"([^"]+)"/);
                const phoneMatch = content.match(/"phoneFormatted":"([^"]+)"/);
                const emailMatch = content.match(/"email":"([^"]+)"/);
                
                if (nameMatch) result.megler = nameMatch[1];
                if (phoneMatch) result.meglerTelefon = phoneMatch[1];
                if (emailMatch) result.meglerEpost = emailMatch[1];
              }
            } catch (e2) {
              // Ignorer feil
            }
          }
        }
      }
      
      // Hent megler info fra JSON hvis tilgjengelig
      if (jsonData && jsonData.contacts && jsonData.contacts[0]) {
        const contact = jsonData.contacts[0];
        result.megler = contact.name || '';
        if (contact.phone && contact.phone[0]) {
          result.meglerTelefon = contact.phone[0].phoneFormatted || '';
        }
        result.meglerEpost = contact.email || '';
      }
      
      // Forbedrede regex-mønstre for nøkkeldata
      const patterns = {
        // Bruksareal - utvidede mønstre for å matche flere varianter
        bruksareal: [
          // Standard bruksareal mønstre
          /(?:Internt\s+)?bruksareal[\s\n]*:?\s*(\d+)\s*m²/i,
          /Bruksareal[\s\n]*:?\s*(\d+)\s*m²/i,
          /BRA[\s\n]*:?\s*(\d+)\s*m²/i,
          /BRA-i[\s\n]*:?\s*(\d+)\s*m²/i,
          /P-rom[\s\n]*:?\s*(\d+)\s*m²/i,
          /Primærareal[\s\n]*:?\s*(\d+)\s*m²/i,
          // Omvendte mønstre (m² først)
          /(\d+)\s*m².*(?:BRA-i|bruksareal|primærareal)/i,
          /(\d+)\s*m².*(?:internt\s+)?bruksareal/i,
          // Areal varianter
          /Areal\s*\(bruk\)[\s\n]*:?\s*(\d+)\s*m²/i,
          /Areal[\s\n]*:?\s*(\d+)\s*m²(?!\s*tomt)/i,
          /(\d+)\s*(?:kvm|m2).*bruksareal/i,
          /(\d+)\s*(?:kvm|m2).*BRA/i,
          // Uten m² (legges til senere)
          /(?:Internt\s+)?bruksareal[\s\n]*:?\s*(\d+)(?!\s*m²)/i,
          /BRA-i[\s\n]*:?\s*(\d+)(?!\s*m²)/i,
          /P-rom[\s\n]*:?\s*(\d+)(?!\s*m²)/i,
          // Fra tekst med beskrivelse
          /boligen\s+har\s+(\d+)\s*m²\s*bruksareal/i,
          /(\d+)\s*m²\s*(?:stort|store)\s*bruksareal/i,
          // Med parenteser
          /Areal\s*\((\d+)\s*m²\)/i,
          /Bruksareal\s*\((\d+)\s*m²\)/i
        ],
        
        // Primærareal - nye mønstre
        primaerareal: [
          /Primærareal[\s\n]*:?\s*(\d+)\s*m²/i,
          /Primær\s*areal[\s\n]*:?\s*(\d+)\s*m²/i,
          /P-areal[\s\n]*:?\s*(\d+)\s*m²/i,
          /(\d+)\s*m².*primærareal/i,
          /BOP[\s\n]*:?\s*(\d+)\s*m²/i,
          /Primærareal\s*\((\d+)\s*m²\)/i
        ],
        
        // Totalareal - nye mønstre  
        totalareal: [
          /Totalareal[\s\n]*:?\s*(\d+)\s*m²/i,
          /Total\s*areal[\s\n]*:?\s*(\d+)\s*m²/i,
          /BTA[\s\n]*:?\s*(\d+)\s*m²/i,
          /(\d+)\s*m².*totalareal/i,
          /Samlet\s*areal[\s\n]*:?\s*(\d+)\s*m²/i,
          /Totalareal\s*\((\d+)\s*m²\)/i
        ],
        
        // Rom og soverom - utvidede mønstre
        antallRom: [
          // Standard mønstre
          /Rom[\s\n]*:?\s*(\d+)/i,
          /(\d+)\s*rom(?!\s*leilighet)/i,
          // Antall rom varianter
          /Antall\s+rom[\s\n]*:?\s*(\d+)/i,
          /(\d+)\s*stk\s*rom/i,
          /(\d+)\s*rom\s*(?:i\s*alt|totalt)/i,
          // P-rom (primærrom)
          /P-rom[\s\n]*:?\s*(\d+)/i,
          /Primærrom[\s\n]*:?\s*(\d+)/i,
          // Andre varianter
          /Rom\s*\((\d+)\)/i,
          /Romfordeling[\s\S]*?(\d+)\s*rom/i,
          /(\d+)-roms?\s*(?:leilighet|bolig)/i,
          // Med bindestrek eller skråstrek
          /Rom[-/]\s*(\d+)/i,
          /(\d+)[-/]roms?/i
        ],
        antallSoverom: [
          // Standard mønstre
          /Soverom[\s\n]*:?\s*(\d+)/i,
          /(\d+)\s*soverom/i,
          // Antall soverom varianter
          /Antall\s+soverom[\s\n]*:?\s*(\d+)/i,
          /(\d+)\s*stk\s*soverom/i,
          /(\d+)\s*soverom\s*(?:i\s*alt|totalt)/i,
          // Sov-rom varianter
          /Sov-rom[\s\n]*:?\s*(\d+)/i,
          /Sov\.?rom[\s\n]*:?\s*(\d+)/i,
          // Andre varianter
          /Soverom\s*\((\d+)\)/i,
          /(\d+)\s*sov\.?rom/i,
          /(\d+)\s*sovrom/i,
          // Med bindestrek eller skråstrek
          /Soverom[-/]\s*(\d+)/i,
          /(\d+)[-/]soverom/i,
          // Spesifikke beskrivelser
          /(\d+)\s*(?:doble?|store?|små?)\s*soverom/i,
          /Soverom.*?(\d+)\s*(?:stk|rom)/i,
          // Fra romfordeling tekst
          /(?:har|med|inkludert)\s*(\d+)\s*soverom/i
        ],
        
        // Boligtype - mer spesifikke mønstre
        boligtype: [
          /Boligtype[\s\n]*(Leilighet|Enebolig|Tomannsbolig|Rekkehus|Gårdsbruk)/i,
          /(?:^|\n)(Leilighet|Enebolig|Tomannsbolig|Rekkehus|Gårdsbruk)(?:\n|$)/i
        ],
        
        // Byggeår
        byggeaar: [
          /Byggeår[\s\n]*(\d{4})/i,
          /bygget[\s\n]*(\d{4})/i,
          /fra\s+(\d{4})/i
        ],
        
        // Eierform - mer spesifikke mønstre
        eierform: [
          /Eieform[\s\n]*(Eier \(Selveier\)|Andel|Aksje)/i,
          /(?:^|\n)(Eier \(Selveier\)|Andel|Aksje)(?:\n|$)/i
        ],
        
        // Energimerking
        energimerking: [
          /Energimerking[\s\n]*([A-G])(?:\s*-\s*\w+)?/i,
          /Energiklasse[\s\n]*([A-G])/i
        ],
        
        // Kostnader - utvidede mønstre
        felleskostnader: [
          /Felleskost\/mnd\.?[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i,
          /Felleskostnader[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i,
          /Fellesutg\.?[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i
        ],
        kommunaleAvg: [
          /Kommunale\s+avg\.?[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i,
          /Kommunale\s+avgifter[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i,
          /(\d+(?:\s\d{3})*)\s*kr\s*per\s*år.*kommunal/i,
          /(\d+(?:\s\d{3})*)\s*kr\/år.*kommunal/i
        ],
        eiendomsskatt: [
          /Eiendomsskatt[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i,
          /(\d+(?:\s\d{3})*)\s*kr\s*per\s*år.*eiendomsskatt/i,
          /(\d+(?:\s\d{3})*)\s*kr\/år.*eiendomsskatt/i
        ],
        fellesgjeld: [
          /Fellesgjeld[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i,
          /Andel\s+av\s+fellesgjeld[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i
        ],
        
        // Pris per kvm - flere varianter
        prisPerKvm: [
          /(\d+(?:\s\d{3})*)\s*kr\/m²/i,
          /(\d+(?:\s\d{3})*)\s*kr\s*per\s*m²/i,
          /Kvadratmeterpris[\s\n]*(\d+(?:\s\d{3})*)\s*kr/i
        ],
        
        // Etasje
        etasje: [
          /Etasje[\s\n]*(\d+)/i,
          /(\d+)\.\s*etasje/i
        ],
        
        // Postnummer og sted
        postnummer: [
          /(\d{4})\s+[A-ZÆØÅ]/,
          /,\s*(\d{4})\s/
        ],
        
        // Kommune og bydel
        kommune: [
          /(\d{4})\s+([A-ZÆØÅ][a-zæøå]+)/,
          /,\s*\d{4}\s+([A-ZÆØÅ][a-zæøå]+)/
        ],
        bydel: [
          /([A-ZÆØÅ][a-zæøå]+)\s+\d{4}/,
          /,\s*([A-ZÆØÅ][a-zæøå]+)\s+\d{4}/
        ],
        
        // Visning
        visningsdato: [
          /Visning[\s\n]*-?\s*(\d{1,2}\.\s*\w+\s*kl\.\s*\d{2}:\d{2})/i,
          /(\d{1,2}\.\s*\w+\s*kl\.\s*\d{2}:\d{2})/i
        ],
        
        // Fasiliteter - forbedrede mønstre
        parkering: [
          /(Dobbel\s+carport)/i,
          /(carport)/i,
          /(Garasje)/i,
          /(P-plass)/i,
          /parkering\s+([^.]{1,50})/i
        ],
        balkong: [
          /Balkong\/Terrasse[\s\n]*(\d+\s*m²)/i,
          /(\d+\s*m²).*balkong/i
        ],
        terrasse: [
          /Balkong\/Terrasse[\s\n]*(\d+\s*m²)/i,
          /(\d+\s*m²).*terrasse/i
        ],
        hage: [
          /Tomteareal[\s\n]*(\d+\s*m²)/i,
          /Tomt[\s\n]*(\d+\s*m²)/i
        ]
      };
      
      // Søk gjennom alle mønstre
      for (const [key, patternArray] of Object.entries(patterns)) {
        for (const pattern of patternArray) {
          const match = bodyText.match(pattern);
          if (match && match[1] && match[1].trim()) {
            let value = match[1].trim();
            
            // Spesialbehandling for areal-felter - unngå dobbel m²
            if (['bruksareal', 'primaerareal', 'totalareal'].includes(key)) {
              if (!value.includes('m²') && !value.includes('kvm') && !value.includes('m2')) {
                value = value + ' m²';
              }
              // Fjern dobbel m² hvis det finnes
              value = value.replace(/m²\s*m²/, 'm²');
              // Standardiser kvm og m2 til m²
              value = value.replace(/\b(kvm|m2)\b/g, 'm²');
            }
            
            // Spesialbehandling for kommune - ta andre gruppe hvis det finnes
            if (key === 'kommune' && match[2]) {
              value = match[2].trim();
            }
            
            // Rens opp verdier som er for lange eller inneholder rare tegn
            if (value.length > 100 || value.includes('\n')) {
              continue; // Prøv neste mønster
            }
            
            result[key] = value;
            
            // Logg hvilke mønstre som treffer for debugging
            console.log(`🎯 Fant ${key}: "${value}" med mønster:`, pattern.toString());
            
            break; // Ta første match
          }
        }
      }
      
      // Spesialbehandling for boligtype - rens opp rare verdier
      if (!result.boligtype || result.boligtype.includes('"') || result.boligtype.includes('desktop') || result.boligtype.length < 3) {
        // Prøv å finne boligtype fra nøkkelinfo-seksjonen
        const boligtypeMatch = bodyText.match(/(?:Leilighet|Enebolig|Tomannsbolig|Rekkehus|Gårdsbruk)/i);
        result.boligtype = boligtypeMatch ? boligtypeMatch[0] : '';
      }
      
      // Spesialbehandling for eierform - rens opp rare verdier  
      if (result.eierform && (result.eierform.length > 30 || result.eierform.includes('Soverom'))) {
        const eierformMatch = bodyText.match(/(?:Eier \(Selveier\)|Andel|Aksje)/i);
        result.eierform = eierformMatch ? eierformMatch[0] : '';
      }
      
      // Prøv å beregne pris per m² hvis det mangler
      if (!result.prisPerKvm && result.pris && result.bruksareal) {
        const prisNum = parseInt(result.pris.replace(/\s/g, '').replace('kr', ''));
        const arealNum = parseInt(result.bruksareal.replace('m²', ''));
        if (prisNum && arealNum) {
          result.prisPerKvm = Math.round(prisNum / arealNum).toLocaleString('no-NO') + ' kr/m²';
        }
      }
      
      return result;
    });

    // **PRØV Å HENTE SALGSOPPGAVE-FAKTA FOR Å FORBEDRE DATA**
    // VIKTIG: Salgsoppgave er hovedkilden og skal prioriteres
    console.log('📋 === PRØVER Å HENTE SALGSOPPGAVE-FAKTA ===');
    let salgsoppgaveFakta = {};
    
    try {
      // Hent salgsoppgave-tekst fra siden (forenklet versjon)
      const pageText = await page.evaluate(() => {
        const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer');
        elementsToRemove.forEach(el => el.remove());
        return document.body.innerText;
      });
      
      if (pageText && pageText.length > 500) {
        console.log('📄 Fant tekst på siden, prøver å ekstraktere fakta...');
        salgsoppgaveFakta = extractSalgsoppgaveFakta(pageText);
        console.log('✅ Ekstraherte salgsoppgave-fakta:', Object.keys(salgsoppgaveFakta));
        
        // Kombiner scraping-data med salgsoppgave-fakta (prioriter salgsoppgave)
        data = combineDataWithSalgsoppgavePriority(data, salgsoppgaveFakta);
        console.log('🔄 Kombinerte data med salgsoppgave-fakta');
      }
    } catch (error) {
      console.log('⚠️ Kunne ikke hente salgsoppgave-fakta:', error.message);
    }
    
    console.log('✅ Scraping fullført!');
    console.log('📍 Adresse:', data.adresse);
    console.log('💰 Pris:', data.pris);

    const resultData = {
      url,
      adresse: data.adresse || "Ukjent adresse",
      tittel: data.tittel || "Ukjent tittel",
      pris: data.pris || "",
      hovedbilde: data.hovedbilde || "",
      bilder: data.bilder || [],
      bilde: data.hovedbilde || "",
      boligtype: data.boligtype || "",
      bruksareal: data.bruksareal || "",
      primaerareal: data.primaerareal || "",
      totalareal: data.totalareal || "",
      antallRom: data.antallRom || "",
      antallSoverom: data.antallSoverom || "",
      etasje: data.etasje || "",
      antallEtasjer: data.antallEtasjer || "",
      byggeaar: data.byggeaar || "",
      eierform: data.eierform || "",
      energimerking: data.energimerking || "",
      felleskostnader: data.felleskostnader || "",
      kommunaleAvg: data.kommunaleAvg || "",
      eiendomsskatt: data.eiendomsskatt || "",
      fellesgjeld: data.fellesgjeld || "",
      formuesverdi: data.formuesverdi || "",
      prisPerKvm: data.prisPerKvm || "",
      parkering: data.parkering || "",
      hage: data.hage || "",
      balkong: data.balkong || "",
      terrasse: data.terrasse || "",
      kjeller: data.kjeller || "",
      oppvarming: data.oppvarming || "",
      internett: data.internett || "",
      kabel_tv: data.kabel_tv || "",
      kommune: data.kommune || "",
      bydel: data.bydel || "",
      postnummer: data.postnummer || "",
      koordinater: data.koordinater || null,
      visningsdato: data.visningsdato || "",
      budfrister: data.budfrister || "",
      megler: data.megler || "",
      meglerTelefon: data.meglerTelefon || "",
      meglerEpost: data.meglerEpost || "",
      scraped_at: new Date().toISOString(),
      beskrivelse: data.beskrivelse || "",
      
      // **METADATA OM DATAKILDE**
      _salgsoppgaveFakta: salgsoppgaveFakta || {},
      _dataKilde: data._dataKilde || {
        hovedkilde: 'scraping',
        fallback: 'ingen',
        timestamp: new Date().toISOString()
      }
    };
    
    // Logg hele resultatobjektet for debugging
    console.log('📊 RESULTAT SOM SENDES TIL FRONTEND:');
    console.log('=====================================');
    console.log(JSON.stringify(resultData, null, 2));
    console.log('=====================================');
    
    return res.json(resultData);
  } catch (error) {
    console.error('❌ Scraping feilet:', error);
    return res.status(500).json({ error: "Noe gikk galt under scraping.", details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
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
      const dummyResult = {
        sammendrag: "Dette er et eksempel på sammendrag fra AI-analyse.",
        avvik: [
          { beskrivelse: "Fukt i kjeller", tg: "TG2" },
          { beskrivelse: "Råte i vindu", tg: "TG3" }
        ],
        risiko: "Moderat risiko. TG3-avvik bør utbedres snarlig.",
        forslagTittel: "Takstrapport for Eksempelveien 1"
      };
      
      // Logg dummy-resultatet for debugging
      console.log('📊 TAKST-ANALYSE DUMMY-RESULTAT:');
      console.log('=================================');
      console.log(JSON.stringify(dummyResult, null, 2));
      console.log('=================================');
      
      return res.json(dummyResult);
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
      
      // Logg AI-analysert takstrapport for debugging
      console.log('📊 AI-ANALYSERT TAKSTRAPPORT:');
      console.log('==============================');
      console.log(JSON.stringify(json, null, 2));
      console.log('==============================');
      
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

// Nytt endpoint for utvidet salgsoppgave-analyse
app.post("/api/analyse-salgsoppgave", async (req, res) => {
  console.log('📥 Mottatt forespørsel om salgsoppgave-analyse');
  
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL er påkrevd"
      });
    }
    
    console.log('🔍 Analyserer salgsoppgave for:', url);
    
    // Få utvidet analyse med salgsoppgave (med intelligent caching)
    const result = await getCachedOrAnalyzeSalgsoppgave(url);
    
    // Logg salgsoppgave-analyseresultat for debugging
    console.log('📊 SALGSOPPGAVE-ANALYSE RESULTAT:');
    console.log('==================================');
    console.log(JSON.stringify(result, null, 2));
    console.log('==================================');
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Feil i salgsoppgave endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Kombinert endpoint som gir både grunnleggende scraping OG salgsoppgave-analyse
app.post("/api/full-analysis", async (req, res) => {
  console.log('📥 Mottatt forespørsel om full boliganalyse');
  
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL er påkrevd"
      });
    }
    
    console.log('🏠 Starter full analyse for:', url);
    
    // Kjør parallellt for å spare tid
    const promises = [];
    
    // Grunnleggende scraping
    const basicScrapingPromise = new Promise(async (resolve, reject) => {
      try {
        const browser = await puppeteer.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          
          const data = await page.evaluate(() => {
            // Samme evaluate-kode som i hovedendepunktet
            const result = {};
            
            // Hent tittel
            const h1 = document.querySelector('h1');
            result.tittel = h1 ? h1.textContent.trim() : '';
            
            // Hent adresse
            let adresse = '';
            const mapElement = document.querySelector('[data-testid="object-address"]');
            if (mapElement) {
              adresse = mapElement.textContent.trim();
            }
            
            if (!adresse) {
              const bodyText = document.body.textContent;
              const addressPatterns = [
                /([A-ZÆØÅ][a-zæøå\s]+\s+\d+[A-Za-z]?,\s+\d{4}\s+[A-ZÆØÅ][a-zæøå]+)/g,
                /(\w+\s+\d+[A-Za-z]?,\s+\d{4}\s+\w+)/g
              ];
              
              for (const pattern of addressPatterns) {
                const matches = [...bodyText.matchAll(pattern)];
                if (matches.length > 0) {
                  for (const match of matches) {
                    if (match[1] && match[1].length < 100 && match[1].includes(',')) {
                      adresse = match[1];
                      break;
                    }
                  }
                  if (adresse) break;
                }
              }
            }
            
            result.adresse = adresse || 'Ukjent adresse';
            
            // Hent pris
            const bodyText = document.body.textContent;
            const pricePatterns = [
              /Prisantydning[\s\n]*(\d{1,3}(?:\s\d{3})*)\s*kr/i,
              /(\d{1,3}(?:\s\d{3})*)\s*kr(?!\s*\/)/i
            ];
            
            let pris = '';
            for (const pattern of pricePatterns) {
              const match = bodyText.match(pattern);
              if (match && match[1]) {
                pris = match[1] + ' kr';
                break;
              }
            }
            result.pris = pris;
            
            // Resten av data...
            const ogImage = document.querySelector('meta[property="og:image"]');
            result.hovedbilde = ogImage ? ogImage.content : '';
            
            return result;
          });
          
          resolve(data);
        } finally {
          await browser.close();
        }
      } catch (error) {
        reject(error);
      }
    });
    
    promises.push(basicScrapingPromise);
    promises.push(getCachedOrAnalyzeSalgsoppgave(url));
    
    const [basicData, salgsoppgaveAnalysis] = await Promise.allSettled(promises);
    
    // **SLÅ SAMMEN DATA MED PRIORITERING AV SALGSOPPGAVE**
    console.log('🔄 === SLÅR SAMMEN GRUNNLEGGENDE DATA OG SALGSOPPGAVE-ANALYSE ===');
    
    const scrapingData = basicData.status === 'fulfilled' ? basicData.value : {};
    const analysisResult = salgsoppgaveAnalysis.status === 'fulfilled' ? salgsoppgaveAnalysis.value : {};
    const salgsoppgaveFakta = analysisResult.salgsoppgaveFakta || {};
    
    // Kombiner data med prioritering av salgsoppgave-fakta
    const combinedBoligData = combineDataWithSalgsoppgavePriority(scrapingData, salgsoppgaveFakta);
    
    const result = {
      url: url,
      timestamp: new Date().toISOString(),
      
      // **KOMBINERTE BOLIGDATA (HOVEDRESULTAT)**
      // Salgsoppgave-data prioriteres over scraping-data
      boligData: combinedBoligData,
      
      // **KILDEDATA FOR REFERANSE**
      sources: {
        basicScraping: basicData.status === 'fulfilled' ? basicData.value : { error: basicData.reason?.message },
        salgsoppgaveAnalysis: analysisResult,
        salgsoppgaveFakta: salgsoppgaveFakta
      }
    };
    
    console.log('✅ Full analyse fullført');
    
    // Logg full analyse-resultat for debugging
    console.log('📊 FULL ANALYSE RESULTAT:');
    console.log('==========================');
    console.log(JSON.stringify(result, null, 2));
    console.log('==========================');
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Feil i full analyse endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces for mobile access
app.listen(PORT, HOST, () => {
console.log(`🚀 Express-server kjører på http://localhost:${PORT}`);
console.log(`📱 Mobile access: http://[YOUR_IP]:${PORT}`);
});

// Nytt endpoint for manuell PDF-upload av salgsoppgave
app.post("/api/analyse-salgsoppgave-pdf", (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  console.log("📄 Mottok request til /api/analyse-salgsoppgave-pdf");
  
  try {
    let tekst = "";
    let finnUrl = "";
    
    if (req.file) {
      // PDF-opplasting
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        tekst = pdfData.text;
        
        // **STEG 4**: Rydd opp midlertidig fil
        fs.unlinkSync(req.file.path);
        console.log("📄 PDF-tekstlengde:", tekst.length);
        console.log("🗑️ Midlertidig PDF-fil slettet");
      } catch (pdfErr) {
        console.error("❌ Feil ved pdf-parse:", pdfErr);
        
        // **STEG 4**: Rydd opp midlertidig fil selv ved feil
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
            console.log("🗑️ Midlertidig PDF-fil slettet (etter feil)");
          } catch (cleanupErr) {
            console.error("⚠️ Kunne ikke slette midlertidig fil:", cleanupErr.message);
          }
        }
        
        return res.status(400).json({ 
          success: false,
          error: "Feil ved lesing av PDF. Kontroller at filen er en gyldig PDF.", 
          details: pdfErr.message 
        });
      }
    } else if (req.body.text) {
      // Manuell tekst (fallback)
      tekst = req.body.text;
      console.log("📝 Manuell tekstlengde:", tekst.length);
    } else {
      return res.status(400).json({ 
        success: false,
        error: "Ingen PDF eller tekst mottatt. Last opp en PDF-fil." 
      });
    }

    // Hent Finn-URL fra request body hvis tilgjengelig
    if (req.body.finnUrl) {
      finnUrl = req.body.finnUrl;
      console.log("🔗 Finn-URL mottatt:", finnUrl);
    }

    // Valider tekst
    if (!tekst || tekst.length < 50) {
      console.warn("⚠️ For kort eller tom tekst fra PDF.", { tekstlengde: tekst.length });
      return res.status(400).json({ 
        success: false,
        error: "Kunne ikke lese tekst fra PDF eller tekst er for kort. Kontroller at PDF-en inneholder lesbar tekst.", 
        tekstlengde: tekst.length 
      });
    }

    console.log("✅ Gyldig salgsoppgave-tekst mottatt, starter analyse...");

    // **EKSTRAHER STRUKTURERTE FAKTA FRA SALGSOPPGAVE (HOVEDKILDE)**
    console.log('📊 === EKSTRAHERER STRUKTURERTE FAKTA FRA OPPLASTET SALGSOPPGAVE ===');
    const salgsoppgaveFakta = extractSalgsoppgaveFakta(tekst);
    console.log('✅ Salgsoppgave-fakta ekstrahert:', Object.keys(salgsoppgaveFakta));

    // Ekstraher detaljert info for chat-bot
    const detailedInfo = extractDetailedInfo(tekst);
    console.log('✅ Detaljert info ekstrahert:', Object.keys(detailedInfo));

    // **STEG 3**: Vurder tekstkvalitet og behov for ytterligere informasjon
    const textQuality = tekst.length > 3000 ? 'høy' : 
                       tekst.length > 1000 ? 'medium' : 
                       tekst.length > 300 ? 'lav' : 'svært lav';
    
    const needsMoreInfo = tekst.length < 3000;
    
    const textAnalysis = {
      hasText: true,
      textLength: tekst.length,
      quality: textQuality,
      sufficientForAnalysis: tekst.length > 300,
      recommendAIAnalysis: tekst.length > 1000,
      needsPDFUpload: false, // Ikke relevant siden vi allerede har PDF
      userFriendlyMessage: needsMoreInfo ? 
        "PDF-en er lastet opp, men inneholder begrenset informasjon. Analysen kan mangle noen detaljer." : 
        null,
      source: 'manual_pdf_upload'
    };

    // OpenAI-analyse hvis API-nøkkel er tilgjengelig
    let analysis = null;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (openaiApiKey && tekst.length > 100) {
      console.log('🤖 Sender til OpenAI for salgsoppgave-analyse...');
      console.log('📊 Tekst lengde:', tekst.length, 'tegn');
      
      try {
        // Bygg utvidet prompt med strukturerte fakta
        let strukturerteFakta = '';
        if (Object.keys(salgsoppgaveFakta).length > 0) {
          strukturerteFakta = `\n\n**STRUKTURERTE FAKTA EKSTRAHERT FRA SALGSOPPGAVE (prioriter denne informasjonen):**\n`;
          for (const [key, value] of Object.entries(salgsoppgaveFakta)) {
            strukturerteFakta += `- ${key}: ${value}\n`;
          }
          strukturerteFakta += `\n**VIKTIG:** Bruk disse strukturerte fakta som hovedkilde i din analyse.\n`;
        }
        
        const fullPrompt = `Analyser denne salgsoppgaven som ble lastet opp manuelt:${strukturerteFakta}\n\n**FULL SALGSOPPGAVE-TEKST:**\n${tekst.substring(0, 10000)}`;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user", 
              content: fullPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        });
        
        const responseContent = completion.choices[0].message.content;
        
        try {
          // Prøv å parse direkte først
          analysis = JSON.parse(responseContent);
          console.log('✅ OpenAI salgsoppgave-analyse fullført (direkte parsing)');
        } catch (parseError) {
          console.log('⚠️ Direkte parsing feilet, prøver å finne JSON i respons');
          
          // Prøv å finne JSON innenfor markdown code blocks
          let jsonString = responseContent;
          jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              analysis = JSON.parse(jsonMatch[0]);
              console.log('✅ OpenAI salgsoppgave-analyse fullført (ekstrahert JSON)');
            } catch (secondParseError) {
              console.log('⚠️ Kunne ikke parse JSON fra OpenAI, bruker rå respons');
              analysis = {
                raaAnalyse: responseContent,
                feil: 'Kunne ikke parse JSON fra OpenAI-respons'
              };
            }
          } else {
            console.log('⚠️ Ingen JSON funnet i OpenAI respons, bruker rå respons');
            analysis = {
              raaAnalyse: responseContent,
              feil: 'Ingen JSON funnet i OpenAI-respons'
            };
          }
        }
        
      } catch (openaiError) {
        console.error('❌ OpenAI API feil:', openaiError);
        analysis = {
          feil: `OpenAI API feil: ${openaiError.message}`,
          tekst: tekst.substring(0, 1000) + '...'
        };
      }
    } else if (!openaiApiKey) {
      console.log('⚠️ Ingen OpenAI API-nøkkel, returnerer kun ekstraherte data');
      analysis = {
        feil: 'Ingen OpenAI API-nøkkel konfigurert',
        tekst: tekst.substring(0, 1000) + '...'
      };
    } else {
      analysis = {
        feil: 'Tekst for kort for AI-analyse',
        tekst: tekst
      };
    }

    const result = {
      success: true,
      source: 'manual_pdf_upload',
      uploadedAt: new Date().toISOString(),
      finnUrl: finnUrl || null,
      
      // **TEKSTANALYSE**
      textAnalysis: textAnalysis,
      textLength: tekst.length,
      
      // **AI-ANALYSE**
      analysis: analysis,
      
      // **HOVEDDATA FRA SALGSOPPGAVE**
      salgsoppgaveFakta: salgsoppgaveFakta,
      
      // **DETALJERT INFO FOR CHAT-BOT**
      detailedInfo: detailedInfo,
      
      // **RAW TEXT (kun i development)**
      rawText: process.env.NODE_ENV === 'development' ? tekst.substring(0, 2000) : undefined,
      
      // **METADATA**
      metadata: {
        processingMethod: 'manual_pdf_upload',
        textQuality: textQuality,
        hasAIAnalysis: !!analysis && !analysis.feil,
        extractedFactsCount: Object.keys(salgsoppgaveFakta).length,
        detailedInfoCount: Object.keys(detailedInfo).length
      }
    };

    console.log('📊 === MANUELL SALGSOPPGAVE-ANALYSE KOMPLETT ===');
    console.log('✅ Success:', result.success);
    console.log('📊 Kilde:', result.source);
    console.log('📊 Tekstkvalitet:', result.textAnalysis.quality);
    console.log('📊 AI-analyse:', result.analysis ? 'Tilgjengelig' : 'Ikke tilgjengelig');
    console.log('📊 Salgsoppgave fakta:', Object.keys(result.salgsoppgaveFakta).length, 'felter');
    console.log('📊 Detaljert info:', Object.keys(result.detailedInfo).length, 'felter');
    
    // **STEG 4**: Rydd opp midlertidige filer (allerede gjort ovenfor)
    console.log('🧹 Midlertidige filer ryddet opp');
    
    // Logg resultat for debugging
    console.log('📊 MANUELL SALGSOPPGAVE-ANALYSE RESULTAT:');
    console.log('==========================================');
    console.log(JSON.stringify(result, null, 2));
    console.log('==========================================');
    
    return res.json(result);
    
  } catch (error) {
    console.error('❌ Feil i manuell salgsoppgave-analyse:', error);
    
    // **STEG 4**: Rydd opp midlertidig fil ved feil
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Midlertidig PDF-fil slettet (etter feil)');
      } catch (cleanupErr) {
        console.error('⚠️ Kunne ikke slette midlertidig fil:', cleanupErr.message);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: "Kunne ikke analysere salgsoppgave-PDF.",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Eksporter funksjoner for testing
module.exports = {
  extractBRAWithPriority,
  calculateQualityScore,
  estimateTokens,
  compressRelevantContent
};