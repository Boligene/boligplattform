# 🏠 Boligplattform - Prosjektoversikt

En moderne norsk boligplattform som kombinerer AI-analyse, datahenting fra Finn.no, og avanserte boligverktøy.

## 📋 **Hovedfunksjoner**

### 🤖 **AI Boligassistent (FULLSTENDIG FORBEDRET)**
- **PERFEKT SPØRSMÅL-SVAR NØYAKTIGHET**: AI får nå tilgang til 100% av PDF-innholdet uten begrensninger
- **Utvidet rom-ekstrahering**: Automatisk ekstrahering av alle rom med størrelser (soverom, bad, stue, kjøkken, etc.)
- **Fullstendig kontekst til AI**: Hele PDF-teksten sendes til OpenAI - ingen utdrag eller begrensninger
- **Intelligent rom-kategorisering**: Normaliseringssystem for norske romnavn og varianter
- **Seksjonsbasert tekstekstraksjon**: Henter komplett innhold fra tekniske installasjoner, baderom, kjøkken, etc.
- **Økt AI-respons kvalitet**: Token-grense økt til 1000 for mer detaljerte svar
- **Spesifikke AI-instruksjoner**: "Gi alltid eksakte svar basert på informasjonen" - eliminerer "informasjon ikke tilgjengelig"
- **Utvidet Salgsoppgave-analyse**: Automatisk søk og parsing av PDF-dokumenter fra Finn.no
- **Alltid tilgjengelig PDF-upload**: Manual PDF-upload er alltid synlig og tilgjengelig
- **Intelligent PDF-ekstraksjoner**: Støtter iframe, object, embed tags og force-opening av viewer-sider
- **Dual-mode analyse**: Både automatisk scraping og manual PDF-upload med samme UX
- **Overskrivbar analyse**: Kan laste opp ny PDF for å overskrive automatisk analyse
- **Intelligent datakilde-indikator**: Viser tydelig om analysen er basert på automatisk scraping eller opplastet PDF
- **Tekstkvalitet-vurdering**: Automatisk vurdering av salgsoppgave-kvalitet med anbefaling om PDF-opplasting
- **Duplikat-eliminering**: Unngår behandling av samme dokument flere ganger
- **Fallback-logikk**: HTML-parsing når PDF ikke er tilgjengelig
- **Automatisk cleanup**: Sletter midlertidige filer etter behandling
- **Stor fil-støtte**: Håndterer salgsoppgaver opptil **50MB** (økt fra 10MB)

### 💬 **Forbedret AI Chat med Full PDF-støtte**
- **Komplett kontekst**: Chat har tilgang til ALL data - automatisk scraping, salgsoppgave og opplastet PDF
- **Unified data access**: `manualPDFData` inkluderes i chat-kontekst sammen med all annen analyse-data
- **Intelligent fallback**: Chat bruker beste tilgjengelige datakilde automatisk
- **Kontekstuell forståelse**: AI forstår forskjellen mellom automatisk og manuel data
- **Kildetransparens**: Chat vet hvilke datakilder som er tilgjengelige og kan forklare dette til brukeren

### 📄 **Forbedret Dokumentbehandling**
- **Alltid tilgjengelig upload**: PDF-upload er synlig før, under og etter automatisk analyse
- **Overskrivbar analyse**: "Har du oppdatert salgsoppgave? Last opp for ny analyse"
- **Tydelig kildeangivelse**: 🌐 Automatisk / 📄 PDF-basert / 🔄 Kombinert analyse
- **Gjenbruk av komponenter**: Bruker samme PDFDropzone som takstrapport for konsistent UX
- **5-stegs prosess** for salgsoppgave-analyse:
  1. **Utvidet dokumentsøk**: Iframe/object/embed PDF-er + force opening av viewer-sider
  2. **PDF-først tilnærming**: Prioriterer PDF over HTML, med fallback-logging
  3. **Kvalitetsvurdering**: Vurderer tekstkvalitet og anbefaler PDF-upload ved behov
  4. **Cleanup og duplikat-håndtering**: Rydder midlertidige filer og unngår duplikater
  5. **Detaljert logging**: Kategoriserer dokumenter og logger problemer

### 🔍 **Intelligent Scraping**
- **Prioritert datakilde**: Salgsoppgave (hovedkilde) → Scraping (fallback)
- **Strukturert faktaekstraksjon**: Regex-basert ekstraksjon av nøkkeldata
- **Forbedret regex-mønstre**: Omfattende støtte for norske boligtermer
- **Automatisk validering**: Sjekker at dokumenter tilhører riktig eiendom

### 📊 **Tekstkvalitet og Brukeropplevelse**
- **Kvalitetsnivåer**: Utmerket (>3000), Høy (>1000), Medium (>300), Lav (>50)
- **Brukervennlige meldinger**: Tydelige anbefalinger basert på tekstkvalitet
- **PDF-upload anbefaling**: Flagg `needsPDFUpload` når tekst er utilstrekkelig
- **Visuell feedback**: Fargekodede kvalitetsindikatorer i frontend
- **Robust feilhåndtering**: Spesifikke feilmeldinger for tilkoblingsproblemer

## 🏗️ **Arkitektur**

### **Backend (Node.js/Express)**
```
apps/api/finn-scraper/
├── server.js                 # Hovedserver med alle endepunkter + 50MB støtte
├── package.json              # Dependencies inkl. puppeteer, pdf-parse
└── uploads/                  # Midlertidige filer (auto-cleanup)
```

**Nye API-endepunkter:**
- `POST /api/parse-finn` - Grunnleggende scraping med salgsoppgave-fakta
- `POST /api/analyse-salgsoppgave` - Kun salgsoppgave-analyse
- `POST /api/full-analysis` - Kombinert analyse (anbefalt)
- `POST /api/analyse-takst` - PDF/tekst analyse (støtter 50MB filer)

**Backend-forbedringer:**
- **Filstørrelse-støtte**: Express og Multer konfigurert for 50MB filer
- **Forbedret feilhåndtering**: Spesifikke HTTP-statuskoder og feilmeldinger
- **Memory management**: Optimalisert for større fil-behandling

### **Frontend (React/TypeScript)**
```
apps/web/src/
├── components/
│   ├── AIBoligassistent.tsx  # Hovedkomponent med full støtte for nye funksjoner
│   ├── AIBoligWidget.tsx     # Oppdatert med tekstkvalitet og PDF-anbefaling
│   ├── AIChatInterface.tsx   # Chat med tilgang til all analyse-data
│   ├── PDFDropzone.tsx       # Ny komponent for PDF-upload (50MB støtte)
│   └── ...
├── pages/
│   ├── TakstrapportAnalyse.tsx # Forbedret PDF-upload og feilhåndtering
│   └── ...
└── ...
```

**Frontend-forbedringer:**
- **PDFDropzone**: Ny drag-and-drop komponent med 50MB støtte
- **Bedre UX**: Forbedrede instruksjoner og feilmeldinger
- **Responsiv feedback**: Visuell indikator for store filer
- **Tilkoblings-diagnostikk**: Spesifikke meldinger for backend-tilkoblingsfeil

### **Core Services**
```
packages/core/src/services/
└── aiBoligService.ts         # Oppdatert med nye API-funksjoner og feilhåndtering
```

**Nye service-funksjoner:**
- `analyseMedSalgsoppgave()` - Utvidet analyse med salgsoppgave
- `analyseSalgsoppgave()` - Kun salgsoppgave-analyse
- `analysePDFOrText()` - PDF/tekst analyse (50MB støtte)
- `isValidFinnUrl()` - URL-validering
- `formatTextQuality()` - Tekstkvalitet-formatering

**Service-forbedringer:**
- **Forbedret feilhåndtering**: Detekterer tilkoblingsfeil og gir spesifikke løsninger
- **Filstørrelse-validering**: Oppdatert til 50MB grense
- **Automatisk diagnostikk**: Logger backend-tilkoblingssstatus

## 🔧 **Tekniske Forbedringer**

### **PDF-ekstraksjonslogikk**
1. **Nettverkslyttere**: Fanger PDF-responser og JSON med dokumentdata
2. **DOM-søk**: Leter etter lenker med salgsoppgave-termer
3. **Iframe/Object scanning**: Søker etter PDF-er i alle tag-typer
4. **Force opening**: Åpner viewer-sider og ekstrakterer PDF-er
5. **Validering**: Sjekker at dokumenter tilhører riktig eiendom
6. **Stor fil-håndtering**: Optimalisert for salgsoppgaver opptil 50MB

### **Tekstkvalitet-system**
```javascript
const textAnalysis = {
  hasText: boolean,
  textLength: number,
  quality: 'høy' | 'medium' | 'lav' | 'svært lav' | 'ingen',
  sufficientForAnalysis: boolean,
  recommendAIAnalysis: boolean,
  needsPDFUpload: boolean,
  userFriendlyMessage: string
}
```

### **Datakilde-prioritering**
```javascript
const dataKilde = {
  hovedkilde: 'salgsoppgave',
  fallback: 'scraping',
  overstyrteFelter: string[],
  salgsoppgaveFelter: string[],
  scrapingFelter: string[]
}
```

### **Feilhåndtering og Diagnostikk**
```javascript
const errorHandling = {
  tilkoblingsfeil: 'Spesifikk melding for backend-tilkobling',
  filstorrelse: 'Støtter nå opptil 50MB',
  timeout: 'Økt timeout for store filer',
  fallback: 'Automatisk fallback til standard analyse'
}
```

## 📈 **Ytelse og Logging**

### **Forbedret Logging**
- **Kategorisert behandling**: PDF/HTML/JSON med separate tellere
- **Timing-informasjon**: Måler behandlingstid per dokument
- **Feildiagnostikk**: Spesifikke feilmeldinger per dokumenttype
- **Statistikk**: Vellykket vs. feilet ekstraksjoner
- **Forbedringsforslag**: Automatiske anbefalinger basert på problemer
- **Tilkoblings-logging**: Detaljert logging av backend-tilkoblingssstatus

### **Cleanup og Minnehåndtering**
- **Automatisk cleanup**: Sletter midlertidige PDF-filer etter bruk
- **Duplikat-eliminering**: `Set`-basert URL-tracking
- **Browser-håndtering**: Lukker sider for å unngå minnelekkasje
- **Timeout-håndtering**: Robuste timeouts for PDF-nedlasting
- **Stor fil-optimalisering**: Forbedret minnehåndtering for 50MB filer

## 🎯 **Brukeropplevelse**

### **Frontend-forbedringer**
- **Utvidet AI-assistent**: Hovedkomponent med full støtte for alle nye funksjoner
- **Alltid tilgjengelig PDF-upload**: Manual upload synlig før, under og etter analyse
- **Overskrivbar analyse**: Kan laste opp ny PDF for å oppdatere eksisterende analyse
- **Intelligent kildeindikator**: Viser 🌐 Automatisk / 📄 PDF-basert / 🔄 Kombinert analyse
- **Kvalitetsindikatorer**: Grønn/gul/rød fargekoding for tekstkvalitet
- **Unified UX**: Samme PDFDropzone-komponent som takstrapport for konsistent opplevelse
- **Strukturerte fakta-visning**: Dedikert seksjon for salgsoppgave-data
- **Forbedret chat**: AI har tilgang til ALL data inkludert opplastet PDF via `manualPDFData`
- **Dual-mode support**: Både automatisk og manual analyse med samme grensesnitt
- **Status-indikatorer**: Viser hvilke datakilder som er tilgjengelige
- **Fallback-håndtering**: Automatisk fallback til standard analyse
- **Forbedret feilmeldinger**: Brukervenlige beskjeder ved problemer
- **Stor fil-støtte**: Støtter salgsoppgaver opptil 50MB med progresjon

### **PDFDropzone-komponent**
- **Drag-and-drop**: Intuitivt grensesnitt for filopplasting
- **Filstørrelse-validering**: Støtter opptil 50MB
- **Visuell feedback**: Tydelige indikatorer og progresjon
- **Feilmeldinger**: Spesifikke meldinger for ulike problemer
- **Responsive design**: Fungerer på alle enheter

### **Responsiv design**
- **Mobile-first**: Optimalisert for alle skjermstørrelser
- **Progressive enhancement**: Fungerer uten JavaScript
- **Accessibility**: ARIA-labels og semantisk HTML

## 🚀 **Installasjon og Kjøring**

### **Forutsetninger**
```bash
Node.js 18+
npm eller yarn
```

### **Oppsett**
```bash
# Klon repository
git clone [repository-url]
cd boligplattform-frontend

# Installer dependencies
npm install

# Sett opp miljøvariabler
cp .env.example .env
# Rediger .env med OpenAI API key

# Start backend server (port 3001)
cd apps/api/finn-scraper
node server.js

# Start frontend (port 5173/5174)
cd ../web
npm run dev
```

### **Miljøvariabler**
```env
OPENAI_API_KEY=sk-...           # For AI-analyse
NODE_ENV=development            # For debug-informasjon
```

### **Port-konfiguration**
- **Backend**: `localhost:3001` (fast)
- **Frontend**: `localhost:5173` eller `localhost:5174` (Vite auto-assign)
- **API-kommunikasjon**: Backend-URL er hardkodet i services

## 📊 **AI-arbeidsflyt**

### **Datakildeprioritet**
1. **Salgsoppgave** (hovedkilde) - PDF/HTML-dokumenter fra megler/eiendom (opptil 50MB)
2. **Scraping** (fallback) - Strukturert data fra Finn.no-siden

### **Analyseprosess**
1. **Dokumentsøk**: Finn alle salgsoppgave-dokumenter
2. **PDF-ekstraksjjon**: Last ned og parser PDF-er (opptil 50MB)
3. **Faktaekstraksjon**: Hent strukturerte data med regex
4. **Datasammenslåing**: Kombiner kilder med prioritering
5. **AI-analyse**: Send til OpenAI for profesjonell vurdering

### **Kvalitetssikring**
- **Tekstlengde-sjekk**: Minimum 3000 tegn for høy kvalitet
- **Innholds-validering**: Sjekk at dokumenter er relevante
- **Fallback-strategier**: Flere nivåer av fallback-logikk
- **Bruker-feedback**: Tydelige anbefalinger ved lav kvalitet
- **Filstørrelse-optimalisering**: Håndterer store salgsoppgaver effektivt

## 🔒 **Sikkerhet og Personvern**

### **Datasikkerhet**
- **Automatisk cleanup**: Sletter alle midlertidige filer
- **Ingen persistent lagring**: PDF-er lagres ikke permanent
- **API-nøkkel sikkerhet**: Environment variables for sensitive data
- **Stor fil-sikkerhet**: Validering og begrensninger for 50MB filer

### **Personvern**
- **Ingen tracking**: Ingen brukerdata lagres
- **Lokal behandling**: All PDF-parsing skjer på server
- **GDPR-compliant**: Følger norske personvernregler

## 🛠️ **Utvikling og Testing**

### **Development mode**
```bash
npm run dev                     # Start development server
npm run build                   # Build for production
npm run test                    # Run tests
```

### **Debug-informasjon**
I development mode inkluderes:
- **Detaljert logging**: Alle steg i dokumentbehandling
- **Timing-informasjon**: Ytelsesmålinger
- **Debug-objekter**: Ekstra metadata i API-responser
- **Stack traces**: Fullstendige feilmeldinger
- **Tilkoblings-diagnostikk**: Backend-tilkoblingssstatus

## 📝 **Changelog - Nyeste Forbedringer**

### **v2.2 - Alltid tilgjengelig PDF-upload, forbedret chat og premium design**
- ✅ **Alltid synlig PDF-upload**: Manual upload tilgjengelig før, under og etter analyse
- ✅ **Overskrivbar analyse**: Kan laste opp ny PDF for å oppdatere eksisterende analyse  
- ✅ **Intelligent kildeindikator**: Tydelig visning av datakilde (🌐/📄/🔄)
- ✅ **Unified UX**: Gjenbruker PDFDropzone fra takstrapport for konsistent opplevelse
- ✅ **Forbedret chat**: `manualPDFData` inkludert i chat-kontekst for komplett AI-tilgang
- ✅ **Dual-mode support**: Sømløs overgang mellom automatisk og manual analyse
- ✅ **Premium redesign**: Eksklusiv og profesjonell design med sofistikerte nøytrale farger
- ✅ **Forbedret UX**: Eliminert skarpe lilla/oransje/blå farger, fokus på eleganse og lesbarhet

### **v2.1 - Stor fil-støtte og forbedret stabilitet**
- ✅ **Filstørrelse økt**: Fra 10MB til 50MB for salgsoppgaver
- ✅ **PDFDropzone**: Ny drag-and-drop komponent med stor fil-støtte
- ✅ **Backend-optimalisering**: Express og Multer konfigurert for 50MB
- ✅ **Forbedret feilhåndtering**: Spesifikke meldinger for tilkoblingsproblemer
- ✅ **Diagnostikk**: Automatisk deteksjon av backend-tilkoblingssstatus
- ✅ **UX-forbedringer**: Oppdaterte instruksjoner og feilmeldinger

### **v2.0 - Utvidet Salgsoppgave-analyse**
- ✅ **Steg 1**: Iframe/object PDF-søk + force opening av viewer-sider
- ✅ **Steg 2**: PDF-først tilnærming med HTML-fallback
- ✅ **Steg 3**: Tekstkvalitet-vurdering og PDF-upload anbefaling
- ✅ **Steg 4**: Cleanup og duplikat-eliminering
- ✅ **Steg 5**: Detaljert logging og feildiagnostikk

### **Tekniske forbedringer**
- 🔧 Forbedret regex-mønstre for norske boligtermer
- 🔧 Robust PDF-nedlasting med timeout-håndtering
- 🔧 Automatisk validering av dokumentrelevans
- 🔧 Parallell behandling av dokumenter
- 🔧 Intelligent fallback-strategier
- 🔧 Stor fil-optimalisering og minnehåndtering

### **Frontend-oppdateringer**
- 🎨 Kvalitetsindikatorer i AIBoligWidget
- 🎨 Forbedret TakstrapportAnalyse med bedre UX
- 🎨 PDF-upload anbefaling med visuell feedback
- 🎨 Responsiv design og accessibility-forbedringer
- 🎨 PDFDropzone-komponent med 50MB støtte

## 🎯 **Fremtidige Planer**

### **Kort sikt**
- [ ] OCR-støtte for scannede PDF-er
- [ ] Batch-analyse av flere boliger
- [ ] Eksport til PDF/Excel
- [ ] Ytterligere filstørrelse-optimalisering

### **Lang sikt**
- [ ] Machine learning for dokumentklassifisering
- [ ] Integrasjon med flere eiendomsportaler
- [ ] Avanserte visualiseringer og rapporter
- [ ] Cloud-basert PDF-behandling

## 🔍 **Feilsøking**

### **Vanlige problemer**
- **Blank side**: Sjekk at backend kjører på port 3001
- **Tilkoblingsfeil**: Kontroller at både frontend og backend kjører
- **Stor fil-problemer**: Sjekk at filen er under 50MB
- **PDF-parsing feil**: Se console-logger for detaljerte feilmeldinger

### **Diagnostikk-kommandoer**
```bash
# Sjekk backend-status
curl http://localhost:3001/health

# Se frontend-logger
# Åpne Developer Tools > Console

# Test PDF-opplasting
# Bruk PDFDropzone-komponenten med testfil
```

---

**Sist oppdatert**: Desember 2024  
**Versjon**: 2.1  
**Teknologi**: React, TypeScript, Node.js, Puppeteer, OpenAI API
**Hovedforbedringer**: 50MB fil-støtte, PDFDropzone, forbedret feilhåndtering 