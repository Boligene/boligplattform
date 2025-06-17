export interface BoligAnalyse {
  id: string;
  finn_url: string;
  score: number;
  the_good: string[];
  the_bad: string[];
  the_ugly: string[];
  sammendrag: string;
  created_at: string;
  updated_at: string;
  raw_openai_response?: string;
  scraping_data?: BoligScrapingData;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  bolig_context?: string;
  metadata?: {
    bolig_analyse_id?: string;
    confidence_score?: number;
  };
}

export interface AIChat {
  id: string;
  bolig_id?: string;
  user_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface BoligScrapingData {
  // Grunnleggende info
  url: string;
  adresse: string;
  tittel: string;
  pris: string;
  hovedbilde?: string;
  bilder?: string[];
  beskrivelse: string;
  
  // Boligdetaljer
  type: string; // alias for boligtype
  boligtype?: string;
  areal: string; // alias for bruksareal
  bruksareal?: string;
  primaerareal?: string;
  totalareal?: string;
  antallRom: string;
  antallSoverom?: string;
  etasje?: string;
  antallEtasjer?: string;
  byggeaar: string;
  eierform: string;
  energimerking: string;
  
  // Økonomiske detaljer
  felleskostnader?: string;
  kommunaleavgifter?: string;
  kommunaleAvg?: string; // alias
  eiendomsskatt?: string;
  fellesgjeld?: string;
  formuesverdi?: string;
  prisPerKvm?: string;
  
  // Fasiliteter og egenskaper
  parkering?: string;
  hage?: string;
  balkong?: string;
  terrasse?: string;
  kjeller?: string;
  oppvarming?: string;
  internett?: string;
  kabel_tv?: string;
  
  // Beliggenhet
  beliggenhet: string;
  kommune?: string;
  bydel?: string;
  postnummer?: string;
  koordinater?: {
    lat: string;
    lng: string;
  };
  
  // Salgsinfo
  visningsdato?: string;
  budfrister?: string;
  megler?: string;
  meglerTelefon?: string;
  meglerEpost?: string;
  
  // Metadata
  scraped_at: string;
  keyValueData?: Record<string, string>;
  
  // Legacy fields for backward compatibility
  bilde?: string; // alias for hovedbilde
}

export interface AIAnalysisRequest {
  finn_url: string;
  bolig_data: BoligScrapingData;
  user_preferences?: UserPreferences;
}

export interface UserPreferences {
  budsjett_max: number;
  onskede_omrader: string[];
  boligtype_preferanse: string[];
  viktighets_faktorer: {
    pris: number;
    beliggenhet: number;
    tilstand: number;
    potensial: number;
  };
  risiko_toleranse: 'lav' | 'middels' | 'hoy';
}

export interface KjopsprosessVeiledning {
  fase: 'visning' | 'bud' | 'finansiering' | 'takst' | 'overlevering';
  anbefalinger: string[];
  viktige_sjekklister: string[];
  tidslinje: {
    beskrivelse: string;
    dager_estimat: number;
  }[];
} 