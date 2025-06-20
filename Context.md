# 🤖 AI Context - Boligplattform

## 📋 Prosjektinformasjon

**Prosjektnavn:** Boligplattform for boligkjøpere i Norge  
**Hovedmål:** Hjelpe brukere å ta smarte boligvalg gjennom AI-drevet analyse og avanserte verktøy  
**Målgruppe:** Norske boligkjøpere (førstegangskjøpere og erfarne)  
**Utviklingsperiode:** Aktiv utvikling siden [START_DATO]

## 👤 Brukerinfo (Utvikler)

- **Teknisk bakgrunn:** Ingen kodeerfaring
- **Utviklingsverktøy:** Cursor med AI-assistenter
- **Arbeidsmetode:** AI-drevet utvikling med Claude og ChatGPT
- **Fokus:** Forretningslogikk og brukeropplevelse fremfor tekniske detaljer

## 🎯 Prosjektmål

### Primære mål:
1. **Informerte beslutninger:** Gi brukere data-drevet grunnlag for boligkjøp
2. **Risikoreduksjon:** Identifisere potensielle problemer før kjøp
3. **Kostnadsoptimalisering:** Hjelpe med realistiske budsjetter og totalkostnader
4. **Prosessveiledning:** Guide brukere gjennom hele kjøpsprosessen

### Sekundære mål:
- Gjøre boligmarkedet mer transparent
- Demokratisere tilgang til profesjonell boliganalyse
- Spare tid og redusere stress ved boligkjøp

## ✅ Nåværende fremdrift

### 🏠 **Kjernefunksjoner (FERDIG)**
- [x] FINN.no web scraping (Puppeteer)
- [x] Strukturert dataekstraksjon fra boligannonser
- [x] Salgsoppgave PDF-analyse og parsing
- [x] AI-drevet boliganalyse med OpenAI GPT-4
- [x] AI Chat-assistent for boligspørsmål
- [x] Risikovurdering og anbefalinger

### 🧮 **Kalkulatorer (FERDIG)**
- [x] Kjøpskalkulator (totalkostnader, lån, egenkapital)
- [x] Grunnleggende oppussingskalkulator
- [x] Premium oppussingskalkulator (regional prising, materialvalg)
- [x] Utleiekalkulator (yield, cash flow, ROI)
- [x] Verdivurdering med markedssammenligning

### 📊 **Analyse og sammenligning (FERDIG)**
- [x] Side-by-side boligsammenligning
- [x] Visualisering av nøkkeltall
- [x] Totalkostnad-beregninger
- [x] Export-funksjoner (PDF)

### 📋 **Hjelpeverktøy (FERDIG)**
- [x] Detaljert kjøpsprosess-guide
- [x] Visnings-sjekkliste (tilpasset boligtype)
- [x] Bud-simulator med markedsanalyse
- [x] Interactive sjekklister og veiledninger

### 💾 **Backend og data (FERDIG)**
- [x] Express.js API server
- [x] Supabase database integration
- [x] Brukerautentisering (email + sosiale logins)
- [x] Lagring av favorittboliger
- [x] "Mine boliger" funksjonalitet

### 🛠️ **Infrastruktur (FERDIG)**
- [x] Monorepo struktur med packages
- [x] TypeScript konfigurering
- [x] GitHub Actions CI/CD
- [x] MCP (Model Context Protocol) oppsett
- [x] Linting og formatering (ESLint, Prettier)

## 🔧 Teknologistack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **State:** Context API

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Web scraping:** Puppeteer
- **PDF parsing:** pdf-parse
- **AI integration:** OpenAI API (GPT-4)

### Database & Auth
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Real-time:** Supabase subscriptions
- **Security:** Row Level Security (RLS)

### Deployment & DevOps
- **Frontend hosting:** Vercel
- **Backend hosting:** [TBD - Railway/Render]
- **CI/CD:** GitHub Actions
- **Version control:** Git + GitHub
- **Monitoring:** [TBD - Sentry]

## 🤖 AI-rollefordeling

### 🔧 **Claude (Koding og implementering)**
**Primært ansvar:** Teknisk utvikling og kodeskriving

**Oppgaver:**
- Skrive og refaktorere React-komponenter
- Implementere nye funksjoner og features
- Fikse bugs og tekniske problemer
- Optimalisere ytelse og kodekvalitet
- TypeScript type-definisioner
- API-endepunkt implementering

**Styrker:**
- Detaljert kodeforståelse
- Best practices og patterns
- Error handling og edge cases
- Code reviews og optimalisering

### 💡 **ChatGPT (Strategi og forretningslogikk)**
**Primært ansvar:** Konseptuell planlegging og forretningsorientering

**Oppgaver:**
- Definere krav og spesifikasjoner
- Planlegge brukeropplevelse (UX)
- Forretningslogikk og algoritmer
- Prosjektstruktur og arkitektur
- Markedsforståelse og brukerinnsikt
- Strategiske beslutninger

**Styrker:**
- Domeneforståelse (eiendom/finans)
- Brukersentrert design
- Høynivå planlegging
- Markedsinnsikt

### 🤝 **Samarbeidsområder**
- **Arkitektur:** ChatGPT foreslår, Claude implementerer
- **Features:** ChatGPT definerer krav, Claude koder
- **Debugging:** Claude finner tekniske feil, ChatGPT vurderer brukerimpakt
- **Optimalisering:** Claude forbedrer kode, ChatGPT forbedrer logikk

## 📈 Utviklingsmetodikk

### Arbeidsflyt:
1. **Planlegging** (ChatGPT): Definere hva som skal bygges
2. **Implementering** (Claude): Skrive koden
3. **Testing** (Begge): Verifisere funksjonalitet
4. **Iterasjon** (Begge): Forbedringer basert på testing

### Prinsipper:
- **Brukersentrert utvikling:** Alltid fokus på sluttbruker
- **Inkrementell utvikling:** Små, testbare endringer
- **Data-drevet:** Bruke ekte data fra FINN.no
- **AI-first:** Utnytte AI der det gir verdi

## 🎯 Neste prioriteringer

### Kort sikt (1-2 uker):
- [ ] Deployment til produksjon (Vercel + backend hosting)
- [ ] Error monitoring og logging
- [ ] Performance optimalisering
- [ ] Mobile responsiveness

### Mellomlang sikt (1-2 måneder):
- [ ] Markedstrender og prishistorikk
- [ ] Utvidet SSB-data integration
- [ ] Push-notifikasjoner og varsler
- [ ] A/B testing av UI/UX

### Lang sikt (3-6 måneder):
- [ ] Mobile app (React Native)
- [ ] Machine learning for prismodellering
- [ ] Integrasjon med banker og meglere
- [ ] Personalisering og anbefalinger

---

## 💬 Kommunikasjonsstil for AI

### For Claude:
- Vær spesifikk på tekniske krav
- Inkluder kodeeksempler når relevant
- Fokuser på implementeringsdetaljer
- Spør om edge cases og error handling

### For ChatGPT:
- Fokuser på forretningsmål og brukerverdi
- Diskuter strategiske valg og retning
- Be om markedsinnsikt og trender
- Vurder konkurransefortrinn

### Generelt:
- Alltid ha sluttbruker i fokus
- Prioriter enkel og intuitiv UX
- Tenk skalerbarhet og vedlikehold
- Vurder sikkerhet og personvern

---

**Sist oppdatert:** [19.06.2025]  
**Versjon:** 1.0  
**Status:** 🚀 Aktiv utvikling 