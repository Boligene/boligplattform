# AI Boligassistent & Analyser

Din personlige digitale boligrådgiver som følger deg gjennom hele boligkjøpet med AI-drevet analyse og veiledning.

## 🚀 Hovedfunksjoner

### 1. **Automatisk Boliganalyse**
- Analyser boliger direkte fra Finn.no lenker
- AI-genererte vurderinger med "The Good", "The Bad" og "The Ugly"
- Detaljert score (1-100) basert på pris, beliggenhet, tilstand og potensial
- Sammenligning mot markedspris med prisavvik i prosent

### 2. **Personlig AI-Chat**
- Chat direkte med AI-assistenten om boligen
- Få svar på spørsmål om finansiering, kjøpsprosess og risiko
- Kontekst-bevisst samtale basert på boliganalysen
- Hurtigspørsmål for vanlige temaer

### 3. **Kjøpsprosess-veiledning**
- Steg-for-steg guide gjennom hele kjøpsprosessen
- Personlige anbefalinger basert på boliganalysen  
- Sjekklister for hver fase (visning, bud, finansiering, takst, overlevering)
- Tidslinjer med estimerte dager for hvert steg

## 🛠️ Oppsett

### Forutsetninger
1. **Finn-scraper server** må kjøre på port 3001
2. **OpenAI API-nøkkel** for AI-funksjonalitet

### Installasjon
```bash
# Installer avhengigheter
npm install

# Start utviklingsserver
npm run dev

# Start Finn-scraper (i separat terminal)
cd finn-scraper
node server.js
```

### Miljøvariabler
Opprett en `.env` fil i rotmappen:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

## 📋 Hvordan bruke

### 1. Analyser en bolig
1. Gå til `/ai-boligassistent` siden
2. Lim inn en Finn.no lenke til boligen
3. Klikk "Analyser" og vent på AI-analyse
4. Se detaljert vurdering med score og anbefalinger

### 2. Chat med AI-assistenten
1. Etter analyse, gå til "Chat" fanen
2. Still spørsmål om boligen, f.eks:
   - "Hva er de største risikoene?"
   - "Hvilket bud bør jeg starte med?"
   - "Hva bør jeg sjekke på visning?"
3. Bruk hurtigspørsmål for vanlige temaer

### 3. Følg kjøpsguiden
1. Gå til "Kjøpsguide" fanen
2. Start med "Visning" fasen
3. Følg anbefalinger og sjekklister
4. Naviger til neste fase når du er klar

## 🏗️ Teknisk arkitektur

### Frontend-komponenter
```
src/
├── components/
│   ├── AIBoligassistent.tsx      # Hovedkomponent
│   ├── AIAnalyseDisplay.tsx      # Viser analyseresultater
│   ├── AIChatInterface.tsx       # Chat-grensesnitt
│   └── KjopsprosessGuide.tsx     # Kjøpsprosess-veiledning
├── services/
│   └── aiBoligService.ts         # AI-tjenester og API-kall
├── types/
│   └── ai.types.ts              # TypeScript interfaces
└── pages/
    └── AIBoligassistent.tsx     # Hovedside
```

### Backend-integrasjon
- **Finn-scraper**: Henter boligdata fra Finn.no (port 3001)
- **OpenAI API**: Genererer AI-analyser og chat-respons
- **Supabase**: Lagrer brukerpreferanser og chathistorikk (fremtidig)

### API-endepunkter
```javascript
// Scrape boligdata
POST http://localhost:3001/api/parse-finn
{
  "url": "https://finn.no/realestate/..."
}

// OpenAI Chat Completions
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-4o",
  "messages": [...],
  "temperature": 0.3
}
```

## 🎯 Bruksområder

### For Førstegangskjøpere
- Forstå boligmarkedet bedre
- Få veiledning gjennom kompleks kjøpsprosess
- Unngå vanlige fallgruver og feil

### For Erfarne Kjøpere
- Rask analysering av flere boliger
- Objektiv vurdering utenom følelser
- Sammenligning av investeringsmuligheter

### For Eiendomsmeglere
- Tilby kunder AI-drevet analyse
- Demonstrere objektiv verdivurdering
- Effektivisere kundeveiledning

## 🔧 Utvikling og tilpasning

### Prompt-engineering
AI-promptene kan tilpasses i `aiBoligService.ts`:
```typescript
const prompt = `
Du er Norges beste AI-drevne boligrådgiver...
// Tilpass prompt etter behov
`;
```

### Brukerpreferanser
Legg til personalisering via `UserPreferences` interface:
```typescript
interface UserPreferences {
  budsjett_max: number;
  onskede_omrader: string[];
  boligtype_preferanse: string[];
  // Legg til flere preferanser
}
```

### Nye analysefunksjoner
Utvid `BoligAnalyse` interface for nye funktioner:
```typescript
interface BoligAnalyse {
  // Eksisterende felter...
  investerings_potensial?: number;
  naboskaps_score?: number;
  // Legg til nye analysefelter
}
```

## 🚀 Fremtidige forbedringer

### Planlagte funksjoner
- [ ] Lagring av analyser i Supabase
- [ ] Sammenligning av flere boliger
- [ ] Markedstrender og prognoser
- [ ] E-post-rapporter og påminnelser
- [ ] Integrasjon med banker for låneberegning
- [ ] Automatisk prisovervåking

### Tekniske forbedringer
- [ ] Real-time chat med WebSocket
- [ ] Offline-støtte med service worker
- [ ] Push-notifications
- [ ] PDF-eksport av analyser
- [ ] Mobile app (React Native)

## 🤝 Bidrag

For å bidra til utviklingen:
1. Fork repositoryet
2. Lag en feature branch
3. Implementer endringer
4. Test grundig
5. Send pull request

## 📞 Support

For spørsmål eller problemer:
- Opprett issue på GitHub
- Kontakt utviklingsteamet
- Se dokumentasjonen for troubleshooting

---

**AI Boligassistent & Analyser** - Din digitale boligrådgiver som gjør boligkjøp enklere, tryggere og mer informert! 🏠✨ 