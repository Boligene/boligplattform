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
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

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

// Forbedret funksjon for å finne salgsoppgaver via nettverkstrafikk og dokumentlenker
async function findSalgsoppgavePDF(page, url) {
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
    
    dokumenter.push(...domLenker);
    
    // 3. Vent litt for å fange opp nettverkstrafikk
    console.log('⏳ Venter på nettverkstrafikk...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Klikk på potensielle dokumentlenker for å trigge nettverkskall (med validering)
    for (const lenke of domLenker.slice(0, 3)) { // Test maks 3 lenker
      if (lenke.type === 'dom_link' && lenke.url.startsWith('http')) {
        try {
          console.log('🖱️ Tester dokumentlenke:', lenke.text);
          
          // Først validér at dokumentet tilhører riktig eiendom
          const isValidDocument = await validateDocumentForProperty(lenke.url, url, page);
          
          if (!isValidDocument) {
            console.log('❌ Dokumentet tilhører ikke riktig eiendom - hopper over');
            continue;
          }
          
          // Prøv å navigere til lenken i en ny fane (simulert)
          const linkPage = await page.browser().newPage();
          await linkPage.goto(lenke.url, { waitUntil: 'networkidle0', timeout: 10000 });
          
          // Se etter PDF-innhold eller dokument-viewer
          const pageContent = await linkPage.content();
          if (pageContent.includes('pdf') || pageContent.includes('document') || pageContent.includes('viewer')) {
            dokumenter.push({
              ...lenke,
              type: 'verified_document_page',
              pageContent: pageContent.substring(0, 1000) // Første 1000 tegn
            });
          }
          
          await linkPage.close();
        } catch (error) {
          console.log('⚠️ Kunne ikke teste lenke:', lenke.url, error.message);
        }
      }
    }
    
    // 5. Kombiner alle funn
    const alleDokumenter = [...dokumenter, ...nettverksResponser];
    
    console.log('📊 Fant totalt', alleDokumenter.length, 'potensielle dokumenter');
    console.log('📡 Nettverksresponser:', nettverksResponser.length);
    console.log('🔗 DOM-lenker:', domLenker.length);
    
    return alleDokumenter;
    
  } catch (error) {
    console.error('❌ Feil ved søk etter dokumenter:', error);
    return [];
  }
}

// Funksjon for å laste ned og parse PDF
async function downloadAndParsePDF(pdfUrl, browser) {
  console.log('📥 Laster ned PDF:', pdfUrl);
  
  try {
    const page = await browser.newPage();
    
    // Sett user agent for å unngå blokkering
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    const response = await page.goto(pdfUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }
    
    const buffer = await response.buffer();
    
    if (buffer.length === 0) {
      throw new Error('Tom PDF fil');
    }
    
    console.log('✅ PDF lastet ned, størrelse:', buffer.length, 'bytes');
    
    // Parse PDF til tekst
    const pdfData = await pdfParse(buffer);
    console.log('📖 PDF tekst ekstrahert, lengde:', pdfData.text.length, 'tegn');
    
    await page.close();
    
    return {
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata
    };
    
  } catch (error) {
    console.error('❌ Feil ved nedlasting/parsing av PDF:', error);
    throw error;
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
  
  // **BRUKSAREAL/PRIMÆRAREAL/TOTALAREAL** - omfattende regex-mønstre
  const arealmønstre = [
    // Bruksareal
    /(?:internt\s+)?bruksareal[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /bra-i[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /bra[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /p-rom[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /(\d+)\s*(?:m²|kvm|m2).*(?:bruksareal|bra-i|bra)/i,
    // Primærareal
    /primærareal[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /primær\s*areal[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /bop[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /(\d+)\s*(?:m²|kvm|m2).*primærareal/i,
    // Totalareal
    /totalareal[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /total\s*areal[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /bta[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)/i,
    /(\d+)\s*(?:m²|kvm|m2).*totalareal/i,
    // Generelt areal
    /areal[\s\n]*:?\s*(\d+)\s*(?:m²|kvm|m2)(?!\s*tomt)/i,
    /boligen\s+(?:har|er)\s*(\d+)\s*(?:m²|kvm|m2)/i,
    // Uten enhet (legges til senere)
    /(?:internt\s+)?bruksareal[\s\n]*:?\s*(\d+)(?!\s*(?:m²|kvm|m2))/i,
    /bra-i[\s\n]*:?\s*(\d+)(?!\s*(?:m²|kvm|m2))/i
  ];
  
  for (const pattern of arealmønstre) {
    const match = salgsoppgaveText.match(pattern);
    if (match && match[1] && parseInt(match[1]) > 10 && parseInt(match[1]) < 2000) {
      let value = match[1];
      // Legg til m² hvis det ikke finnes
      if (!match[0].includes('m²') && !match[0].includes('kvm') && !match[0].includes('m2')) {
        value = value + ' m²';
      } else {
        // Standardiser til m²
        value = match[0].replace(/(\d+)\s*(?:kvm|m2)/i, '$1 m²').match(/(\d+\s*m²)/i)?.[1] || value + ' m²';
      }
      fakta.bruksareal = value;
      console.log(`🎯 Fant bruksareal fra salgsoppgave: ${value} (mønster: ${pattern.toString().substring(0,50)}...)`);
      break;
    }
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

// Funksjon for å ekstrahere detaljert info fra salgsoppgave-tekst for chat-bot
function extractDetailedInfo(salgsoppgaveText) {
  console.log('📋 Ekstraherer detaljert info for chat-bot');
  
  const info = {};
  const text = salgsoppgaveText.toLowerCase();
  
  // Parkering
  const parkeringMatch = salgsoppgaveText.match(/parkering[^.]*?([^.]*)/i);
  if (parkeringMatch) {
    info.parkering = parkeringMatch[0].substring(0, 200);
  } else if (text.includes('parkering')) {
    // Se etter mer kontekst rundt parkering
    const parkeringIndex = text.indexOf('parkering');
    const context = salgsoppgaveText.substring(Math.max(0, parkeringIndex - 100), parkeringIndex + 300);
    info.parkering = context;
  }
  
  // Oppvarming
  const oppvarmingMatch = salgsoppgaveText.match(/oppvarming[^.]*?([^.]*)/i);
  if (oppvarmingMatch) {
    info.oppvarming = oppvarmingMatch[0].substring(0, 200);
  } else if (text.includes('oppvarming') || text.includes('varme')) {
    const oppvarmingIndex = text.indexOf('oppvarming') !== -1 ? text.indexOf('oppvarming') : text.indexOf('varme');
    const context = salgsoppgaveText.substring(Math.max(0, oppvarmingIndex - 100), oppvarmingIndex + 300);
    info.oppvarming = context;
  }
  
  // Ventilasjon
  if (text.includes('ventilasjon') || text.includes('lufting')) {
    const ventIndex = text.indexOf('ventilasjon') !== -1 ? text.indexOf('ventilasjon') : text.indexOf('lufting');
    const context = salgsoppgaveText.substring(Math.max(0, ventIndex - 100), ventIndex + 300);
    info.ventilasjon = context;
  }
  
  // Teknisk tilstand
  if (text.includes('teknisk tilstand') || text.includes('tilstandsgrad')) {
    const tekIndex = text.indexOf('teknisk tilstand') !== -1 ? text.indexOf('teknisk tilstand') : text.indexOf('tilstandsgrad');
    const context = salgsoppgaveText.substring(Math.max(0, tekIndex - 100), tekIndex + 400);
    info.tekniskTilstand = context;
  }
  
  // Baderom
  if (text.includes('baderom') || text.includes('bad ')) {
    const badIndex = text.indexOf('baderom') !== -1 ? text.indexOf('baderom') : text.indexOf('bad ');
    const context = salgsoppgaveText.substring(Math.max(0, badIndex - 50), badIndex + 200);
    info.baderom = context;
  }
  
  // Kjøkken
  if (text.includes('kjøkken')) {
    const kjokkenIndex = text.indexOf('kjøkken');
    const context = salgsoppgaveText.substring(Math.max(0, kjokkenIndex - 50), kjokkenIndex + 200);
    info.kjokken = context;
  }
  
  // Balkong/terrasse
  if (text.includes('balkong') || text.includes('terrasse')) {
    const balkongIndex = text.indexOf('balkong') !== -1 ? text.indexOf('balkong') : text.indexOf('terrasse');
    const context = salgsoppgaveText.substring(Math.max(0, balkongIndex - 50), balkongIndex + 200);
    info.balkongTerrasse = context;
  }
  
  // Energi
  if (text.includes('energi') || text.includes('strøm')) {
    const energiIndex = text.indexOf('energi') !== -1 ? text.indexOf('energi') : text.indexOf('strøm');
    const context = salgsoppgaveText.substring(Math.max(0, energiIndex - 50), energiIndex + 200);
    info.energi = context;
  }
  
  // Vedlikehold
  if (text.includes('vedlikehold') || text.includes('oppussing')) {
    const vedlikeholdIndex = text.indexOf('vedlikehold') !== -1 ? text.indexOf('vedlikehold') : text.indexOf('oppussing');
    const context = salgsoppgaveText.substring(Math.max(0, vedlikeholdIndex - 50), vedlikeholdIndex + 300);
    info.vedlikehold = context;
  }
  
  console.log('✅ Ekstraherte detaljert info:', Object.keys(info));
  return info;
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
async function getSalgsoppgaveAnalysis(finnUrl) {
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
    
    for (const dokument of prioriterteDokumenter) {
      try {
        console.log('🔄 Prøver dokument:', dokument.type, dokument.text?.substring(0, 50) || dokument.url?.substring(0, 80));
        
        const result = await processDocument(dokument, browser);
        
        if (result.success && result.text && result.text.length > 500) {
          salgsoppgaveText = result.text;
          source = `${result.source}: ${result.sourceUrl || dokument.url}`;
          console.log('✅ Salgsoppgave hentet fra', result.source);
          console.log('📄 Tekstlengde:', result.text.length, 'tegn');
          break;
        } else if (result.success && result.text && result.text.length > 100) {
          // Kortere tekst, men kan være nyttig som fallback
          if (!salgsoppgaveText) {
            salgsoppgaveText = result.text;
            source = `${result.source} (kort): ${result.sourceUrl || dokument.url}`;
            console.log('⚠️ Kort tekst funnet fra', result.source, '- beholder som fallback');
          }
        } else {
          console.log('⚠️ Dokument ga ikke nok tekst:', result.error || 'ukjent feil');
        }
      } catch (error) {
        console.log('❌ Feil ved behandling av dokument:', error.message);
        continue;
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
    
    // 5. Analyser med OpenAI hvis vi har tekst og API-nøkkel
    let analysis = null;
    
    if (salgsoppgaveText && salgsoppgaveText.length > 100) {
      console.log('🤖 Sender til OpenAI for analyse...');
      console.log('📊 Tekst lengde:', salgsoppgaveText.length, 'tegn');
      
      if (process.env.OPENAI_API_KEY) {
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
          
          const fullPrompt = `Analyser denne salgsoppgaven:${strukturerteFakta}\n\n**FULL SALGSOPPGAVE-TEKST:**\n${salgsoppgaveText.substring(0, 10000)}`;
          
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
    
    return {
      success: true,
      source: source,
      documentLinks: documentLinks,
      textLength: salgsoppgaveText.length,
      analysis: analysis,
      rawText: process.env.NODE_ENV === 'development' ? salgsoppgaveText.substring(0, 2000) : undefined,
      // **HOVEDDATA FRA SALGSOPPGAVE (PRIORITERES OVER SCRAPING)**
      salgsoppgaveFakta: salgsoppgaveFakta,
      // Legg til et sammendrag av viktig informasjon for chat-bot
      detailedInfo: salgsoppgaveText ? extractDetailedInfo(salgsoppgaveText) : null
    };
    
  } catch (error) {
    console.error('❌ Feil i salgsoppgave-analyse:', error);
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  } finally {
    await browser.close();
  }
}

// Forbedret funksjon for å håndtere ulike dokumenttyper
async function processDocument(dokument, browser) {
  console.log('🔄 Behandler dokument:', dokument.type, dokument.url?.substring(0, 100));
  
  try {
    // Håndter forskjellige dokumenttyper
    switch (dokument.type) {
      case 'pdf':
        return await downloadAndParsePDF(dokument.url, browser);
      
      case 'base64':
        return await parseBase64PDF(dokument.data);
      
      case 'json':
        return await extractTextFromJSON(dokument.data, dokument.url);
      
      case 'verified_document_page':
        return await extractTextFromDocumentPage(dokument.pageContent, dokument.url);
      
      case 'dom_link':
        // Prøv først som PDF, så som dokumentside
        if (dokument.url.includes('.pdf')) {
          return await downloadAndParsePDF(dokument.url, browser);
        } else {
          return await downloadAndParseDocumentPage(dokument.url, browser);
        }
      
      default:
        console.log('⚠️ Ukjent dokumenttype:', dokument.type);
        return { success: false, error: 'Ukjent dokumenttype' };
    }
  } catch (error) {
    console.error('❌ Feil ved behandling av dokument:', error.message);
    return { success: false, error: error.message };
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

// Funksjon for å laste ned og parse dokumentsider
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
    const result = await extractTextFromDocumentPage(pageContent, url);
    
    await page.close();
    return result;
    
  } catch (error) {
    console.error('❌ Feil ved nedlasting av dokumentside:', error.message);
    return { success: false, error: error.message };
  }
}

// Forbedret funksjon for å ekstrahere tekst fra dokumentsider
async function extractTextFromDocumentPage(pageContent, url) {
  console.log('📄 Ekstraherer tekst fra dokumentside');
  
  try {
    // Bruk cheerio eller lignende for å parse HTML
    const cheerio = require('cheerio');
    const $ = cheerio.load(pageContent);
    
    // Fjern ikke-relevante elementer
    $('script, style, nav, header, footer, .cookie-banner, .ad, .navigation').remove();
    
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
      '.main-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        text = element.text();
        break;
      }
    }
    
    // Fallback til body hvis ingen hovedinnhold funnet
    if (!text || text.length < 100) {
      text = $('body').text();
    }
    
    // Rens teksten
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    if (cleanedText.length > 100) {
      console.log('✅ Ekstraherte tekst fra dokumentside, lengde:', cleanedText.length);
      return {
        success: true,
        text: cleanedText,
        source: 'document_page',
        sourceUrl: url
      };
    } else {
      throw new Error('For lite innhold funnet på dokumentsiden');
    }
    
  } catch (error) {
    console.error('❌ Feil ved tekstekstraksjon fra dokumentside:', error.message);
    return { success: false, error: error.message };
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
    
    // Få utvidet analyse med salgsoppgave
    const result = await getSalgsoppgaveAnalysis(url);
    
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
    promises.push(getSalgsoppgaveAnalysis(url));
    
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
app.listen(PORT, () => {
  console.log(`🚀 Express-server kjører på http://localhost:${PORT}`);
});