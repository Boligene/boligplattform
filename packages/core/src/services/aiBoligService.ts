import { BoligAnalyse, BoligScrapingData, ChatMessage, KjopsprosessVeiledning, UserPreferences } from '../types/ai.types';

export class AIBoligService {
  private static readonly API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  // private static readonly FINN_SCRAPER_URL = 'http://localhost:3001'; // Use the actual finn-scraper server

  // Hjelpefunksjon for å generere ID-er
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static hasApiKey(): boolean {
    const hasKey = !!this.API_KEY;
    console.log('API Key check:', {
      hasKey,
      keyLength: this.API_KEY ? this.API_KEY.length : 0,
      keyStart: this.API_KEY ? this.API_KEY.substring(0, 10) + '...' : 'undefined'
    });
    return hasKey;
  }

  static testFunction(): string {
    return 'AI Boligassistent service er tilgjengelig!';
  }

  // Skrap Finn.no URL og få boligdata - oppdatert for ekte scraper
  static async scrapeFinnUrl(url: string): Promise<BoligScrapingData> {
    console.log('🔍 Scraper data fra:', url);
    
    const response = await fetch('/api/parse-finn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error('🔌 Backend respons feil:', response.status, response.statusText);
      if (response.status === 0 || response.status >= 500) {
        throw new Error('Kan ikke koble til backend-server. Sjekk at serveren kjører og at proxy fungerer.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('📊 Mottatt scraper data:', rawData);

    // Map the comprehensive data to our interface
    const mappedData: BoligScrapingData = {
      // Grunnleggende info
      url: rawData.url || url,
      adresse: rawData.adresse || 'Ukjent adresse',
      tittel: rawData.tittel || 'Ukjent tittel',
      pris: rawData.pris || 'Pris ikke oppgitt',
      hovedbilde: rawData.hovedbilde || rawData.bilde || '',
      bilder: rawData.bilder || [],
      beskrivelse: rawData.beskrivelse || 'Ingen beskrivelse tilgjengelig',
      
      // Boligdetaljer - map both new and legacy fields
      type: rawData.boligtype || rawData.type || 'Ukjent type',
      boligtype: rawData.boligtype,
      areal: rawData.bruksareal || rawData.areal || 'Ukjent areal',
      bruksareal: rawData.bruksareal,
      primaerareal: rawData.primaerareal,
      totalareal: rawData.totalareal,
      antallRom: rawData.antallRom || 'Ukjent',
      antallSoverom: rawData.antallSoverom,
      etasje: rawData.etasje,
      antallEtasjer: rawData.antallEtasjer,
      byggeaar: rawData.byggeaar || 'Ukjent byggeår',
      eierform: rawData.eierform || 'Ukjent eierform',
      energimerking: rawData.energimerking || 'Ikke oppgitt',
      
      // Økonomiske detaljer
      felleskostnader: rawData.felleskostnader,
      kommunaleavgifter: rawData.kommunaleAvg || rawData.kommunaleavgifter,
      kommunaleAvg: rawData.kommunaleAvg,
      eiendomsskatt: rawData.eiendomsskatt,
      fellesgjeld: rawData.fellesgjeld,
      formuesverdi: rawData.formuesverdi,
      prisPerKvm: rawData.prisPerKvm,
      
      // Fasiliteter og egenskaper
      parkering: rawData.parkering,
      hage: rawData.hage,
      balkong: rawData.balkong,
      terrasse: rawData.terrasse,
      kjeller: rawData.kjeller,
      oppvarming: rawData.oppvarming,
      internett: rawData.internett,
      kabel_tv: rawData.kabel_tv,
      
      // Beliggenhet
      beliggenhet: rawData.adresse || rawData.kommune || rawData.bydel || 'Ukjent beliggenhet',
      kommune: rawData.kommune,
      bydel: rawData.bydel,
      postnummer: rawData.postnummer,
      koordinater: rawData.koordinater,
      
      // Salgsinfo
      visningsdato: rawData.visningsdato,
      budfrister: rawData.budfrister,
      megler: rawData.megler,
      meglerTelefon: rawData.meglerTelefon,
      meglerEpost: rawData.meglerEpost,
      
      // Metadata
      scraped_at: rawData.scraped_at || new Date().toISOString(),
      keyValueData: rawData.keyValueData,
      
      // Legacy fields
      bilde: rawData.hovedbilde || rawData.bilde
    };

    console.log('✅ Mappet boligdata:', mappedData);
    return mappedData;
  }

  // AI-analyse av bolig med ekte OpenAI API
  static async analyseBolig(url: string): Promise<BoligAnalyse> {
    console.log('Analyserer bolig:', url);
    console.log('API Key available:', this.hasApiKey());

    try {
      // Først skrap data fra Finn.no
      const scrapingData = await this.scrapeFinnUrl(url);
      console.log('Scraping data received:', scrapingData);
      
      // Hvis vi har OpenAI API key, bruk ekte AI
      if (this.hasApiKey()) {
        console.log('Using real OpenAI API for analysis');
        return await this.realOpenAIAnalyse(scrapingData);
      } else {
        console.log('No OpenAI API key, using mock analysis');
        return this.mockAnalyse(url);
      }
    } catch (error) {
      console.error('Analyse error:', error);
      return this.mockAnalyse(url);
    }
  }

  // Ny funksjon for utvidet salgsoppgave-analyse
  static async analyseMedSalgsoppgave(url: string): Promise<any> {
    console.log('🏠 Starter utvidet analyse med salgsoppgave for:', url);

    try {
      // Bruk det nye /api/full-analysis endepunktet som kjører begge analyser parallellt
      const response = await fetch('/api/full-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const fullAnalysisData = await response.json();
      console.log('📊 Mottatt full analyse data:', fullAnalysisData);

      // **FIX: Hent data fra riktig sted - sources.basicScraping i stedet for basicData**
      const basicScrapingData = fullAnalysisData.sources?.basicScraping || fullAnalysisData.boligData;
      console.log('🔄 Bruker basic scraping data:', basicScrapingData);

      // Kjør standard AI-analyse parallellt hvis vi har API key
      const standardAnalyse = this.hasApiKey() ? 
        await this.realOpenAIAnalyse(this.mapBasicDataToInterface(basicScrapingData, url)) :
        await this.mockAnalyse(url);

      // **PRIORITER SALGSOPPGAVE-DATA FRA BACKEND**
      // Backend har allerede kombinert data med prioritering av salgsoppgave
      const prioritizedData = fullAnalysisData.boligData || basicScrapingData;

      // Kombiner grunnleggende scraping med salgsoppgave-analyse
      const result = {
        url: url,
        timestamp: fullAnalysisData.timestamp,
        
        // **BRUK PRIORITERTE BOLIGDATA FRA BACKEND**
        scraping_data: this.mapBasicDataToInterface(prioritizedData, url),
        
        // Utvidet salgsoppgave-analyse
        salgsoppgaveAnalyse: fullAnalysisData.sources?.salgsoppgaveAnalysis,
        
        // Standard AI-analyse basert på prioriterte data
        standard_analyse: standardAnalyse,
        
        // Legg til OpenAI status informasjon som frontend forventer
        raw_openai_response: this.hasApiKey() && standardAnalyse.raw_openai_response ? 
          standardAnalyse.raw_openai_response : 
          (this.hasApiKey() ? "OpenAI analyse fullført" : "Mock analyse - ingen ekte OpenAI respons"),
        
        // Legg til hovedfelter fra standard analyse for bakoverkompatibilitet
        score: standardAnalyse.score,
        the_good: standardAnalyse.the_good,
        the_bad: standardAnalyse.the_bad,
        the_ugly: standardAnalyse.the_ugly,
        sammendrag: standardAnalyse.sammendrag,
        
        // Marker at vi har utført utvidet analyse
        hasExtendedAnalysis: true,
        
        // **NYE FELTER FRA BACKEND-FORBEDRINGENE**
        textAnalysis: fullAnalysisData.sources?.salgsoppgaveAnalysis?.textAnalysis,
        needsPDFUpload: fullAnalysisData.sources?.salgsoppgaveAnalysis?.textAnalysis?.needsPDFUpload,
        userFriendlyMessage: fullAnalysisData.sources?.salgsoppgaveAnalysis?.textAnalysis?.userFriendlyMessage,
        documentLinks: fullAnalysisData.sources?.salgsoppgaveAnalysis?.documentLinks || [],
        salgsoppgaveFakta: fullAnalysisData.sources?.salgsoppgaveAnalysis?.salgsoppgaveFakta || {},
        
        // Debug info (kun i development)
        debugInfo: fullAnalysisData.sources?.salgsoppgaveAnalysis?.debugInfo
      };

      console.log('✅ Utvidet analyse fullført:', result);
      return result;

    } catch (error) {
      console.error('❌ Feil i utvidet analyse:', error);
      
      // Sjekk om det er tilkoblingsproblem
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🔌 TILKOBLINGSFEIL: Kan ikke nå backend');
        console.error('   - Sjekk at backend-serveren kjører på port 3001');
        console.error('   - Kjør: cd apps/api/finn-scraper && node server.js');
        console.error('   - Eller bruk: npm run dev:mobile');
        throw new Error('Kan ikke koble til backend-server. Sjekk at serveren kjører og at proxy fungerer.');
      }
      
      // Fallback til standard analyse
      console.log('🔄 Faller tilbake til standard analyse...');
      return await this.analyseBolig(url);
    }
  }

  // Ny funksjon for kun salgsoppgave-analyse (uten standard scraping)
  static async analyseSalgsoppgave(url: string): Promise<any> {
    console.log('📋 Starter kun salgsoppgave-analyse for:', url);

    try {
      const response = await fetch('/api/analyse-salgsoppgave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const salgsoppgaveData = await response.json();
      console.log('📊 Mottatt salgsoppgave data:', salgsoppgaveData);

      return salgsoppgaveData;

    } catch (error) {
      console.error('❌ Feil i salgsoppgave-analyse:', error);
      throw error;
    }
  }

  // Ny funksjon for å analysere opplastet PDF/tekst
  static async analysePDFOrText(file?: File, text?: string): Promise<any> {
    console.log('📄 Starter PDF/tekst analyse');

    try {
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
        console.log('📁 Analyserer opplastet PDF-fil:', file.name);
      } else if (text) {
        // For tekst, send som JSON i stedet for FormData
        const response = await fetch('/api/analyse-takst', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Tekst-analyse fullført:', result);
        return result;
      } else {
        throw new Error('Ingen fil eller tekst oppgitt');
      }

      // For PDF-fil
      const response = await fetch('/api/analyse-takst', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ PDF-analyse fullført:', result);
      return result;

    } catch (error) {
      console.error('❌ Feil i PDF/tekst analyse:', error);
      throw error;
    }
  }

  // Hjelpefunksjon for å sjekke om en URL er gyldig Finn.no lenke
  static isValidFinnUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('finn.no') && 
             (urlObj.pathname.includes('/realestate/') || urlObj.pathname.includes('/bolig/'));
    } catch {
      return false;
    }
  }

  // Hjelpefunksjon for å formatere tekstkvalitet for brukeren
  static formatTextQuality(textAnalysis: any): string {
    if (!textAnalysis) return 'Ukjent kvalitet';
    
    const qualityMap: { [key: string]: string } = {
      'høy': '✅ Høy kvalitet - komplett analyse mulig',
      'medium': '⚠️ Medium kvalitet - delvis analyse',
      'lav': '⚠️ Lav kvalitet - begrenset analyse',
      'svært lav': '❌ Svært lav kvalitet - anbefaler PDF-opplasting',
      'ingen': '❌ Ingen tekst funnet - krever PDF-opplasting'
    };

    return qualityMap[textAnalysis.quality] || textAnalysis.quality;
  }

  // Hjelpefunksjon for å mappe grunnleggende data til interface
  private static mapBasicDataToInterface(basicData: any, url: string): BoligScrapingData {
    if (!basicData || basicData.error) {
      return this.mockScrapingData(url);
    }

    return {
      url: url,
      adresse: basicData.adresse || 'Ukjent adresse',
      tittel: basicData.tittel || 'Ukjent tittel',
      pris: basicData.pris || 'Pris ikke oppgitt',
      hovedbilde: basicData.hovedbilde || '',
      bilder: basicData.bilder || [],
      beskrivelse: basicData.beskrivelse || '',
      type: basicData.boligtype || 'Ukjent type',
      boligtype: basicData.boligtype,
      areal: basicData.bruksareal || 'Ukjent areal',
      bruksareal: basicData.bruksareal,
      primaerareal: basicData.primaerareal,
      totalareal: basicData.totalareal,
      antallRom: basicData.antallRom || 'Ukjent',
      antallSoverom: basicData.antallSoverom,
      etasje: basicData.etasje,
      antallEtasjer: basicData.antallEtasjer,
      byggeaar: basicData.byggeaar || 'Ukjent byggeår',
      eierform: basicData.eierform || 'Ukjent eierform',
      energimerking: basicData.energimerking || 'Ikke oppgitt',
      felleskostnader: basicData.felleskostnader,
      kommunaleavgifter: basicData.kommunaleAvg,
      kommunaleAvg: basicData.kommunaleAvg,
      eiendomsskatt: basicData.eiendomsskatt,
      fellesgjeld: basicData.fellesgjeld,
      formuesverdi: basicData.formuesverdi,
      prisPerKvm: basicData.prisPerKvm,
      parkering: basicData.parkering,
      hage: basicData.hage,
      balkong: basicData.balkong,
      terrasse: basicData.terrasse,
      kjeller: basicData.kjeller,
      oppvarming: basicData.oppvarming,
      internett: basicData.internett,
      kabel_tv: basicData.kabel_tv,
      beliggenhet: basicData.adresse || 'Ukjent beliggenhet',
      kommune: basicData.kommune,
      bydel: basicData.bydel,
      postnummer: basicData.postnummer,
      koordinater: basicData.koordinater,
      visningsdato: basicData.visningsdato,
      budfrister: basicData.budfrister,
      megler: basicData.megler,
      meglerTelefon: basicData.meglerTelefon,
      meglerEpost: basicData.meglerEpost,
      scraped_at: new Date().toISOString(),
      keyValueData: basicData.keyValueData,
      bilde: basicData.hovedbilde
    };
  }

  // Ekte OpenAI API analyse
  private static async realOpenAIAnalyse(data: BoligScrapingData): Promise<BoligAnalyse> {
    console.log('Starting real OpenAI analysis with data:', data);
    
    const prompt = `
Du er en ekspert norsk eiendomsmegler og boliganalytiker. Analyser denne boligen fra Finn.no og gi en detaljert, realistisk vurdering basert på all tilgjengelig informasjon.

GRUNNLEGGENDE INFO:
URL: ${data.url}
Adresse: ${data.adresse}
Tittel: ${data.tittel || 'Ikke oppgitt'}
Pris: ${data.pris}
Beskrivelse: ${data.beskrivelse}

BOLIGDETALJER:
Type: ${data.type}
Bruksareal: ${data.areal}
Primærareal: ${data.primaerareal || 'Ikke oppgitt'}
Totalareal: ${data.totalareal || 'Ikke oppgitt'}
Antall rom: ${data.antallRom}
Antall soverom: ${data.antallSoverom || 'Ikke oppgitt'}
Etasje: ${data.etasje || 'Ikke oppgitt'}
Byggeår: ${data.byggeaar}
Energimerking: ${data.energimerking}
Eierform: ${data.eierform}

ØKONOMISKE FORHOLD:
Felleskostnader: ${data.felleskostnader || 'Ikke oppgitt'}
Kommunale avgifter: ${data.kommunaleavgifter || 'Ikke oppgitt'}
Eiendomsskatt: ${data.eiendomsskatt || 'Ikke oppgitt'}
Fellesgjeld: ${data.fellesgjeld || 'Ikke oppgitt'}
Formuesverdi: ${data.formuesverdi || 'Ikke oppgitt'}
Pris per kvm: ${data.prisPerKvm || 'Ikke oppgitt'}

FASILITETER OG EGENSKAPER:
Parkering: ${data.parkering || 'Ikke oppgitt'}
Hage: ${data.hage || 'Ikke oppgitt'}
Balkong: ${data.balkong || 'Ikke oppgitt'}
Terrasse: ${data.terrasse || 'Ikke oppgitt'}
Kjeller: ${data.kjeller || 'Ikke oppgitt'}
Oppvarming: ${data.oppvarming || 'Ikke oppgitt'}
Internett: ${data.internett || 'Ikke oppgitt'}

BELIGGENHET:
Kommune: ${data.kommune || 'Ikke oppgitt'}
Bydel: ${data.bydel || 'Ikke oppgitt'}
Postnummer: ${data.postnummer || 'Ikke oppgitt'}
Koordinater: ${data.koordinater ? `${data.koordinater.lat}, ${data.koordinater.lng}` : 'Ikke oppgitt'}

SALGSINFO:
Megler: ${data.megler || 'Ikke oppgitt'}
Visningsdato: ${data.visningsdato || 'Ikke oppgitt'}
Budfrister: ${data.budfrister || 'Ikke oppgitt'}

TILLEGGSDATA:
${data.keyValueData ? Object.entries(data.keyValueData).map(([key, value]) => `${key}: ${value}`).join('\n') : 'Ingen tilleggsdata'}

VIKTIG: Gi en REALISTISK og GRUNDIG analyse basert på faktiske norske boligmarkedsforhold. Vurder prisen mot markedet, ikke bare si "god standard". Vær kritisk og objektiv. Bruk all tilgjengelig informasjon.

Gi din analyse i følgende JSON-format:
{
  "score": [poengsum 1-100 basert på helhetsvurdering],
  "the_good": [array med 4-6 konkrete positive punkter],
  "the_bad": [array med 3-5 konkrete negative punkter eller bekymringer],
  "the_ugly": [array med 0-3 alvorlige problemer, eller tom array hvis ingen],
  "sammendrag": "[detaljert sammendrag på norsk, 3-4 setninger med konkrete vurderinger og anbefaling]"
}

Vurder spesielt:
- Pris-kvalitet forhold for området og boligtypen
- Energimerking og hva det betyr for fremtidige kostnader
- Felleskostnader, avgifter og økonomiske forhold
- Praktiske fasiliteter og deres verdi
- Beliggenhet og infrastruktur
- Fremtidig verdipotensial og risikofaktorer
- Eventuelle røde flagg eller bekymringer

Vær spesifikk, realistisk og bruk konkrete tall der det er relevant. Svar kun med gyldig JSON.`;

    try {
      console.log('Making OpenAI API request...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Du er en profesjonell norsk eiendomsmegler med 20 års erfaring. Du kjenner det norske boligmarkedet godt og gir alltid ærlige, objektive vurderinger. Du er ikke redd for å påpeke negative sider ved en bolig hvis de finnes.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1200,
          temperature: 0.8,
        }),
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        return this.mockAnalyse(data.url);
      }

      const result = await response.json();
      console.log('OpenAI API result:', result);
      
      const analysisText = result.choices[0].message.content;
      console.log('Analysis text from OpenAI:', analysisText);
      
      // Parse JSON response
      const analysis = JSON.parse(analysisText);
      console.log('Parsed analysis:', analysis);
      
      return {
        id: this.generateId(),
        finn_url: data.url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        score: analysis.score,
        the_good: analysis.the_good,
        the_bad: analysis.the_bad,
        the_ugly: analysis.the_ugly,
        sammendrag: analysis.sammendrag,
        raw_openai_response: analysisText,
        scraping_data: data
      };

    } catch (error) {
      console.error('OpenAI parsing error:', error);
      return this.mockAnalyse(data.url);
    }
  }

  // Mock scraping data - mer realistisk
  private static mockScrapingData(url: string): BoligScrapingData {
    // Generer mer varierte mock data basert på URL
    const urlHash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const addresses = [
      "Testveien 123, 0123 Oslo",
      "Storgata 45, 0456 Oslo", 
      "Bjørnveien 78, 0789 Oslo",
      "Rosenkrantz gate 12, 0159 Oslo"
    ];
    
    const prices = ["4 500 000", "6 200 000", "3 800 000", "5 900 000"];
    const areas = ["75 kvm", "95 kvm", "62 kvm", "88 kvm"];
    const buildYears = ["1995", "2010", "1987", "2005"];
    const energyRatings = ["D", "C", "E", "B"];
    const costs = ["3 500", "4 200", "2 800", "5 100"];
    
    const index = Math.abs(urlHash) % addresses.length;
    
    return {
      url: url,
      adresse: addresses[index],
      tittel: `Leilighet til salgs - ${addresses[index]}`,
      pris: prices[index],
      type: "Leilighet",
      areal: areas[index],
      antallRom: "3",
      byggeaar: buildYears[index],
      energimerking: energyRatings[index],
      eierform: "Eierseksjon",
      beliggenhet: "Sentral beliggenhet i Oslo",
      beskrivelse: `Koselig ${areas[index]} leilighet med balkong og god standard. Bygget i ${buildYears[index]}.`,
      bilder: ["mock-image-1.jpg", "mock-image-2.jpg"],
      felleskostnader: costs[index],
      kommunaleavgifter: "2 200",
      scraped_at: new Date().toISOString()
    };
  }

  // Mock analyse for testing
  static async mockAnalyse(url: string): Promise<BoligAnalyse> {
    // Simuler litt delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockScores = [72, 85, 91, 68, 77, 82, 89, 74];
    const randomScore = mockScores[Math.floor(Math.random() * mockScores.length)];

         return {
       id: this.generateId(),
       finn_url: url,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
       score: randomScore,
      the_good: [
        "Sentral beliggenhet med kort vei til kollektivtransport",
        "Nylig oppussede fellesarealer og god vedlikehold av bygget",
        "Balkong med kveldssol og utsikt mot rolig bakgård",
        "Rimelige felleskostnader sammenlignet med området"
      ],
      the_bad: [
        "Begrenset parkeringsmuligheter i området",
        "Noe trafikkstøy fra hovedveien på dagtid",
        "Kjøkken kan trenge oppgradering i nærmeste fremtid"
      ],
      the_ugly: randomScore < 70 ? [
        "Tegn på fuktskader i badet som bør undersøkes nærmere"
      ] : [],
      sammendrag: randomScore >= 85 
        ? "Dette er en svært attraktiv bolig med utmerket beliggenhet og god standard. Prisen virker rimelig for området, og det er få vesentlige negative faktorer. Anbefales sterkt for videre besiktigelse."
        : randomScore >= 75
        ? "En solid bolig med god beliggenhet og akseptabel standard. Noen mindre utfordringer, men totalt sett et godt kjøp for riktig kjøper. Verdt en nærmere titt."
        : "Boligen har potensial, men krever nøye vurdering av kostnader for nødvendige oppgraderinger. Prisen bør reflektere behovet for renovering.",
      raw_openai_response: "Mock analyse - ingen ekte OpenAI respons",
      scraping_data: this.mockScrapingData(url)
    };
  }

  // Chat med AI om bolig - ekte OpenAI implementasjon
  static async chatMedAI(
    userMessage: string,
    boligAnalyse?: BoligAnalyse | any,
    chatHistory: ChatMessage[] = []
  ): Promise<ChatMessage> {
    const chatId = this.generateId();
    
    if (!this.hasApiKey()) {
      return {
        id: chatId,
        role: 'assistant',
        content: 'Chat-funksjonalitet krever OpenAI API-nøkkel. Kontakt administrator for oppsett.',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Bygg kontekst for OpenAI
      let systemPrompt = `Du er en ekspert norsk eiendomsmegler og boligrådgiver. Du hjelper brukere med å forstå boliganalyser og gir praktiske råd om boligkjøp.

Vær alltid:
- Hjelpsom og vennlig
- Konkret og praktisk i rådene
- Ærlig om både positive og negative sider
- Fokusert på norske boligmarkedsforhold

Svar på norsk og hold svarene relativt korte (1-3 setninger).`;

      if (boligAnalyse) {
        // Håndter både standard analyse og utvidet analyse med salgsoppgave
        const data = boligAnalyse.scraping_data || boligAnalyse.basicData;
        const standardAnalyse = boligAnalyse.standard_analyse || boligAnalyse;
        
        systemPrompt += `

BOLIGANALYSE KONTEKST:
GRUNNLEGGENDE:
- Adresse: ${data?.adresse}
- Pris: ${data?.pris}
- Type: ${data?.type}
- Areal: ${data?.areal}
- Byggeår: ${data?.byggeaar}
- Energimerking: ${data?.energimerking}

ØKONOMI:
- Felleskostnader: ${data?.felleskostnader || 'Ikke oppgitt'}
- Kommunale avgifter: ${data?.kommunaleavgifter || 'Ikke oppgitt'}
- Eiendomsskatt: ${data?.eiendomsskatt || 'Ikke oppgitt'}
- Fellesgjeld: ${data?.fellesgjeld || 'Ikke oppgitt'}
- Pris per kvm: ${data?.prisPerKvm || 'Ikke oppgitt'}

FASILITETER:
- Parkering: ${data?.parkering || 'Ikke oppgitt'}
- Balkong/Terrasse: ${data?.balkong || data?.terrasse || 'Ikke oppgitt'}
- Hage: ${data?.hage || 'Ikke oppgitt'}
- Kjeller: ${data?.kjeller || 'Ikke oppgitt'}
- Oppvarming: ${data?.oppvarming || 'Ikke oppgitt'}

BELIGGENHET:
- Kommune: ${data?.kommune || 'Ikke oppgitt'}
- Bydel: ${data?.bydel || 'Ikke oppgitt'}

SALGSINFO:
- Megler: ${data?.megler || 'Ikke oppgitt'}
- Visningsdato: ${data?.visningsdato || 'Ikke oppgitt'}

AI ANALYSE:
- Score: ${standardAnalyse?.score || boligAnalyse.score}/100
- Positive punkter: ${(standardAnalyse?.the_good || boligAnalyse.the_good || []).join(', ')}
- Negative punkter: ${(standardAnalyse?.the_bad || boligAnalyse.the_bad || []).join(', ')}
- Alvorlige problemer: ${(standardAnalyse?.the_ugly || boligAnalyse.the_ugly || []).join(', ') || 'Ingen'}
- Sammendrag: ${standardAnalyse?.sammendrag || boligAnalyse.sammendrag}`;

        // **FIX: Sjekk både salgsoppgaveAnalyse og manualPDFData**
        const salgsoppgaveData = boligAnalyse.salgsoppgaveAnalyse || 
                                (boligAnalyse.allData && boligAnalyse.allData.manualPDFData);
                                
        if (salgsoppgaveData && (salgsoppgaveData.success || salgsoppgaveData.analysis)) {
          const salgsAnalyse = salgsoppgaveData;
          
          systemPrompt += `

DETALJERT SALGSOPPGAVE-ANALYSE:
- Kilde: ${salgsAnalyse.source}
- Tekstlengde: ${salgsAnalyse.textLength} tegn`;

          // Inkluder strukturert analyse hvis tilgjengelig
          if (salgsAnalyse.analysis && typeof salgsAnalyse.analysis === 'object') {
            if (salgsAnalyse.analysis.tekniskTilstand) {
              systemPrompt += `
- Teknisk tilstand: ${salgsAnalyse.analysis.tekniskTilstand.score}/10 - ${salgsAnalyse.analysis.tekniskTilstand.sammendrag}`;
            }
            if (salgsAnalyse.analysis.risiko) {
              systemPrompt += `
- Risiko: ${salgsAnalyse.analysis.risiko.score}/10 - ${salgsAnalyse.analysis.risiko.sammendrag}`;
            }
            if (salgsAnalyse.analysis.prisvurdering) {
              systemPrompt += `
- Prisvurdering: ${salgsAnalyse.analysis.prisvurdering.score}/10 - ${salgsAnalyse.analysis.prisvurdering.sammendrag}`;
            }
            if (salgsAnalyse.analysis.oppussingBehov) {
              systemPrompt += `
- Oppussingsbehov: ${salgsAnalyse.analysis.oppussingBehov.estimertKostnad || 'Se detaljer'}`;
            }
          }
          
          // **FORBEDRET: Inkluder HELE detaljerte informasjonen fra salgsoppgave**
          if (salgsAnalyse.detailedInfo) {
            systemPrompt += `

DETALJERT INFORMASJON FRA SALGSOPPGAVE:`;
            
            // **NYT: Spesiell håndtering av rom-informasjon**
            if (salgsAnalyse.detailedInfo.romInformasjon) {
              systemPrompt += `

ROM-OVERSIKT MED STØRRELSER:`;
              Object.entries(salgsAnalyse.detailedInfo.romInformasjon).forEach(([, romData]) => {
                if (romData && typeof romData === 'object' && 'originalNavn' in romData && 'størrelse' in romData && 'enhet' in romData) {
                  systemPrompt += `
- ${(romData as any).originalNavn}: ${(romData as any).størrelse} ${(romData as any).enhet}`;
                }
              });
            }
            
            // Inkluder all annen detaljert informasjon UTEN begrensning
            Object.entries(salgsAnalyse.detailedInfo).forEach(([key, value]) => {
              if (key !== 'romInformasjon' && value && typeof value === 'string' && value.trim()) {
                systemPrompt += `

${key.toUpperCase()}: ${value}`;
              }
            });
          }
          
          // **FORBEDRET: Håndter HELE PDF-innholdet fra manuell upload uten begrensning**
          if (salgsAnalyse.fullText || salgsAnalyse.extractedText) {
            const fullContent = salgsAnalyse.fullText || salgsAnalyse.extractedText;
            systemPrompt += `

KOMPLETT INNHOLD FRA OPPLASTET SALGSOPPGAVE:
${fullContent}`;
          }
          
          // Inkluder HELE rå analyse tekst hvis tilgjengelig
          if (salgsAnalyse.analysis && salgsAnalyse.analysis.raaAnalyse) {
            systemPrompt += `

KOMPLETT INNHOLD FRA SALGSOPPGAVE:
${salgsAnalyse.analysis.raaAnalyse}`;
          }
        }
        
        // **DEBUG: Legg til informasjon om tilgjengelige data**
        const availableData = [];
        if (boligAnalyse.scraping_data) availableData.push('grunnleggende boligdata');
        if (boligAnalyse.salgsoppgaveAnalyse?.success) availableData.push('automatisk salgsoppgave');
        if (boligAnalyse.allData?.manualPDFData) availableData.push('manuell PDF-upload');
        
        systemPrompt += `

TILGJENGELIGE DATAKILDER: ${availableData.join(', ')}

VIKTIG: Du har tilgang til KOMPLETT informasjon fra salgsoppgaven ovenfor - INGEN begrensninger eller utdrag. Når brukeren spør om:
- Romstørrelser (soverom, bad, stue, etc.) - bruk ROM-OVERSIKT MED STØRRELSER
- Tekniske detaljer - bruk KOMPLETT INNHOLD FRA SALGSOPPGAVE
- Spesifikke rom-beskrivelser - søk i hele PDF-innholdet
- Felleskostnader, oppvarming, parkering - alt er tilgjengelig i full kontekst

GI ALLTID EKSAKTE SVAR basert på informasjonen. Hvis brukeren spør "hvor stort er soverommet?" og det står "Soverom (11,2 m²)" i dokumentet, svar "Soverommet er 11,2 m²" - ikke "informasjonen er ikke tilgjengelig".`;
      }
      
      // **DEBUG LOG for å spore hva som sendes til AI**
      console.log('🤖 Chat kontekst oppsummering:', {
        hasBoligAnalyse: !!boligAnalyse,
        hasSalgsoppgave: !!(boligAnalyse?.salgsoppgaveAnalyse?.success),
        hasManualPDF: !!(boligAnalyse?.allData?.manualPDFData),
        systemPromptLength: systemPrompt.length,
        userMessage: userMessage
      });

      // Bygg meldingshistorikk for OpenAI
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6).map(msg => ({ // Kun siste 6 meldinger for å spare tokens
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      console.log('Sending chat request to OpenAI...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 1000, // Økt fra 300 til 1000 for å håndtere mer detaljerte svar
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Chat API error:', response.status, errorText);
        throw new Error('OpenAI API feil');
      }

      const result = await response.json();
      const aiResponse = result.choices[0].message.content;

      return {
        id: chatId,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Chat error:', error);
      return {
        id: chatId,
        role: 'assistant',
        content: 'Beklager, jeg kunne ikke svare på det akkurat nå. Prøv igjen senere.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Kjøpsprosess veiledning
  static async getKjopsprosessVeiledning(
    _boligAnalyse: BoligAnalyse,
    _userPreferences?: UserPreferences
  ): Promise<KjopsprosessVeiledning> {
    // Mock veiledning for nå
    return {
      fase: 'visning',
      anbefalinger: [
        "Be om å se alle rom og fellesarealer",
        "Still spørsmål om vedlikehold og oppussing",
        "Sjekk ut nabolaget på forskjellige tidspunkter"
      ],
      viktige_sjekklister: [
        "Ta bilder av alle rom",
        "Noter ned spørsmål til megler",
        "Vurder transportmuligheter"
      ],
      tidslinje: [
        {
          beskrivelse: "Finansieringsavklaring",
          dager_estimat: 3
        },
        {
          beskrivelse: "Budprosess og aksept",
          dager_estimat: 7
        },
        {
          beskrivelse: "Takstrapport og overtakelse",
          dager_estimat: 30
        }
      ]
    };
  }

  // Ny funksjon for manuell PDF-upload av salgsoppgave
  static async analyseSalgsoppgavePDF(file: File, finnUrl?: string): Promise<any> {
    console.log('📄 Laster opp salgsoppgave-PDF for analyse:', file.name);
    
    try {
      // Valider at filen er en PDF
      if (file.type !== 'application/pdf') {
        throw new Error('Kun PDF-filer er støttet for salgsoppgave-analyse');
      }
      
      // Valider filstørrelse (maks 50MB - salgsoppgaver kan være store)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('PDF-filen er for stor. Maksimal størrelse er 50MB.');
      }
      
      console.log('✅ PDF-fil validert:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      });
      
      // Opprett FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Legg til Finn-URL hvis tilgjengelig
      if (finnUrl) {
        formData.append('finnUrl', finnUrl);
        console.log('🔗 Inkluderer Finn-URL:', finnUrl);
      }
      
      console.log('📤 Sender PDF til backend for analyse...');
      
      const response = await fetch('/api/analyse-salgsoppgave-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('✅ Salgsoppgave-PDF analyse fullført:', {
        success: result.success,
        textLength: result.textLength,
        quality: result.textAnalysis?.quality,
        hasAnalysis: !!result.analysis
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Feil ved analyse av salgsoppgave-PDF:', error);
      throw error;
    }
  }
} 