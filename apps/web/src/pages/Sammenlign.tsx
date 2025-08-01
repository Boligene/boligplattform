import { ArrowLeft, BarChart3, Calculator, Calendar, ChevronLeft, ChevronRight, Coins, Eye, Home, MapPin, Settings, Shield, Smartphone, TrendingUp, User, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { useBolig } from '../context/BoligContext';

// CSS for custom slider styling
const sliderStyle = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #92400e;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #92400e;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = sliderStyle;
  document.head.appendChild(styleSheet);
}

// REALISTISKE STANDARDER (kan tilpasses)
const DEFAULT_KVM = 70;                  // Gjett default hvis ukjent
const DEFAULT_KOMMUNALE = 1200;          // Kommunale avg per mnd hvis mangler
const DEFAULT_FELLES = 0;                // Felleskostn. hvis ikke oppgitt
const DEFAULT_STROMPRIS = 1.25;          // kr/kWh
const DEFAULT_FORBRUK_KVM = 150;         // kWh/kvm/år
const DEFAULT_LANERENTE = 0.056;         // 5.6% nominell, mai 2025
const DEFAULT_LANETID = 25;              // 25 år

// 🔧 Utility-funksjon for å parse tall fra strenger med enheter og formatering
function parseNumericValue(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  
  // Fjern alle ikke-numeriske tegn unntatt punktum og komma
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\s+/g, '');
  
  // Håndter norsk tallformat (space som tusen-separator)
  const normalized = cleaned.replace(/\s/g, '').replace(',', '.');
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

// 🎯 Hjelpefunksjon for å få riktig verdi eller fallback
function getValueOrDefault(value: any, defaultValue: number): number {
  const parsed = parseNumericValue(value);
  return parsed > 0 ? parsed : defaultValue;
}

// 🏠 Sjekk om eierform krever kommunale avgifter
function skalHaKommunaleAvgifter(eierform: string | undefined): boolean {
  if (!eierform) return true; // Default til true hvis ukjent
  const normalized = eierform.toLowerCase();
  // Kun selveier betaler kommunale avgifter
  return normalized.includes('selveier') || normalized.includes('eier');
}

function kalkulerLaanekostnad(pris: number, rente = DEFAULT_LANERENTE, lanetid = DEFAULT_LANETID) {
  const mndRente = rente / 12;
  const antMnd = lanetid * 12;
  return Math.round((pris * mndRente) / (1 - Math.pow(1 + mndRente, -antMnd)));
}

function kalkulerStrom(kvm: number, prisPerKwh = DEFAULT_STROMPRIS) {
  // 150 kWh/m2/år
  const forbruk = kvm * DEFAULT_FORBRUK_KVM;
  return Math.round((forbruk * prisPerKwh) / 12);
}

// 🚀 FORBEDRET kalkulering som bruker riktige scraped verdier
function kalkulerTotalKostnad(b: any) {
  console.log('🧮 Kalkulerer kostnader for bolig:', {
    adresse: b.adresse,
    eierform: b.eierform,
    rawData: {
      pris: b.pris,
      bruksareal: b.bruksareal,
      kommunaleAvg: b.kommunaleAvg,
      felleskostnader: b.felleskostnader
    }
  });

  // 🎯 Parse verdier korrekt med ny utility-funksjon
  const pris = parseNumericValue(b.pris) || 0;
  const kvm = getValueOrDefault(b.bruksareal, DEFAULT_KVM);
  const felles = getValueOrDefault(b.felleskostnader, DEFAULT_FELLES);
  
  // 🏠 Kommunale avgifter kun for selveier
  const harKommunaleAvgifter = skalHaKommunaleAvgifter(b.eierform);
  const kommunaleRaw = harKommunaleAvgifter ? getValueOrDefault(b.kommunaleAvg, DEFAULT_KOMMUNALE) : 0;
  const kommunale = Math.round(kommunaleRaw / 12); // Konverter årlig til månedlig
  
  const strøm = kalkulerStrom(kvm);
  const laan = kalkulerLaanekostnad(pris);

  console.log('✅ Parsede verdier:', {
    pris,
    kvm: `${kvm} m²`,
    eierform: b.eierform,
    harKommunaleAvgifter,
    kommunale: harKommunaleAvgifter ? `${kommunale} kr/mnd` : 'Ikke relevant (andel/aksje)',
    felles: `${felles} kr/mnd`,
    beregnet: {
      laan: `${laan} kr/mnd`,
      strøm: `${strøm} kr/mnd`,
      total: `${laan + kommunale + strøm + felles} kr/mnd`
    }
  });

  return {
    laan,
    kommunale,
    strøm,
    felles,
    total: laan + kommunale + strøm + felles,
    harKommunaleAvgifter // For å vise i UI
  }
}

// Hjelpefunksjon for å sammenligne og fargekode verdier
function getComparisonColor(value: number, values: number[], isLowerBetter: boolean = true) {
  const sortedValues = [...values].sort((a, b) => a - b);
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  
  if (isLowerBetter) {
    if (value === min) return "text-emerald-700 bg-emerald-50";
    if (value === max) return "text-red-700 bg-red-50";
    return "text-amber-700 bg-amber-50";
  } else {
    if (value === max) return "text-emerald-700 bg-emerald-50";
    if (value === min) return "text-red-700 bg-red-50";
    return "text-amber-700 bg-amber-50";
  }
}

// Moderne mobile komponenter
const ViewModeSelector = ({ viewMode, onViewModeChange, isMobile }: { 
  viewMode: 'cards' | 'detailed' | 'calculator', 
  onViewModeChange: (mode: 'cards' | 'detailed' | 'calculator') => void,
  isMobile: boolean 
}) => {
  if (!isMobile) return null;
  
  return (
    <div className="flex justify-center mb-6">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-1 shadow-lg">
        <div className="flex gap-1">
          <button
            onClick={() => onViewModeChange('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              viewMode === 'cards' 
                ? 'bg-brown-600 text-white shadow-md' 
                : 'text-brown-600 hover:bg-brown-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Oversikt</span>
          </button>
          <button
            onClick={() => onViewModeChange('detailed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              viewMode === 'detailed' 
                ? 'bg-brown-600 text-white shadow-md' 
                : 'text-brown-600 hover:bg-brown-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Detaljer</span>
          </button>
          <button
            onClick={() => onViewModeChange('calculator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              viewMode === 'calculator' 
                ? 'bg-brown-600 text-white shadow-md' 
                : 'text-brown-600 hover:bg-brown-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">Kalkulator</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SwipeableBoligCards = ({ boliger, alleKostnader }: { boliger: any[], alleKostnader: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const nextBolig = () => {
    setCurrentIndex((prev) => (prev + 1) % boliger.length);
  };
  
  const prevBolig = () => {
    setCurrentIndex((prev) => (prev - 1 + boliger.length) % boliger.length);
  };
  
  return (
    <div className="relative">
      {/* Progress indicator */}
      <div className="flex justify-center mb-4 gap-2">
        {boliger.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex ? 'bg-brown-600 w-6' : 'bg-brown-300'
            }`}
          />
        ))}
      </div>
      
      {/* Swipeable cards */}
      <div className="relative overflow-hidden rounded-3xl">
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {boliger.map((bolig: any, index: number) => {
            const kostnader = kalkulerTotalKostnad(bolig);
            const pris = parseNumericValue(bolig.pris) || 0;
            const kvm = getValueOrDefault(bolig.bruksareal, 0); // Use 0 instead of DEFAULT_KVM for display
            const prisPerKvm = kvm > 0 ? Math.round(pris / kvm) : 0;
            
            console.log('🏠 SwipeableBoligCards - parsed values:', {
              adresse: bolig.adresse,
              rawBruksareal: bolig.bruksareal,
              parsedKvm: kvm,
              rawPris: bolig.pris,
              parsedPris: pris
            });
            
            return (
              <div key={bolig.id} className="w-full flex-shrink-0">
                <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden mx-4">
                  <div className="relative">
                    <img 
                      src={bolig.bilde} 
                      alt="Boligbilde" 
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-brown-900">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-4 text-white shadow-2xl border border-white/10">
                        <h3 className="text-lg font-bold mb-1 line-clamp-1 text-white drop-shadow-lg">
                          {bolig.adresse || "Adresse ikke oppgitt"}
                        </h3>
                        <p className="text-sm text-white/95 drop-shadow-md font-medium">
                          {bolig.kommune} • {bolig.type}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {/* Key metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-brown-50 rounded-xl">
                        <div className="text-2xl font-bold text-brown-900">
                          {pris > 0 ? `${(pris / 1000000).toFixed(1)}M` : "N/A"}
                        </div>
                        <div className="text-sm text-brown-600">Pris</div>
                      </div>
                      <div className="text-center p-3 bg-brown-50 rounded-xl">
                        <div className="text-2xl font-bold text-brown-900">
                          {kvm > 0 ? `${kvm}m²` : "N/A"}
                        </div>
                        <div className="text-sm text-brown-600">Areal</div>
                      </div>
                    </div>
                    
                    {/* Monthly cost highlight */}
                    <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-2xl p-4 text-white text-center">
                      <div className="text-2xl font-bold mb-1">
                        {kostnader.total.toLocaleString("no-NO")} kr/mnd
                      </div>
                      <div className="text-sm opacity-90">Estimert månedskostnad</div>
                    </div>
                    
                    {/* Action button */}
                    <a
                      href={bolig.lenke}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brown-100 text-brown-800 rounded-2xl hover:bg-brown-200 transition-colors duration-200 font-medium"
                    >
                      <Home className="w-4 h-4" />
                      Se på FINN
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevBolig}
          className="flex items-center justify-center w-12 h-12 bg-white/95 backdrop-blur-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          disabled={boliger.length <= 1}
        >
          <ChevronLeft className="w-6 h-6 text-brown-600" />
        </button>
        
        <div className="text-center">
          <div className="text-sm text-brown-600 mb-1">Sammenligner</div>
          <div className="text-lg font-semibold text-brown-900">
            {currentIndex + 1} av {boliger.length} boliger
          </div>
        </div>
        
        <button
          onClick={nextBolig}
          className="flex items-center justify-center w-12 h-12 bg-white/95 backdrop-blur-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          disabled={boliger.length <= 1}
        >
          <ChevronRight className="w-6 h-6 text-brown-600" />
        </button>
      </div>
    </div>
  );
};

const InteractiveCalculator = ({ boliger }: { boliger: any[] }) => {
  const [settings, setSettings] = useState({
    rente: 5.6,
    lanetid: 25,
    strompris: 1.25,
    egenkapitalProsent: 15
  });
  
  const kalkulerMedBrukerinnstillinger = (bolig: any) => {
    // 🎯 Parse verdier korrekt
    const pris = parseNumericValue(bolig.pris) || 0;
    const kvm = getValueOrDefault(bolig.bruksareal, DEFAULT_KVM);
    const felles = getValueOrDefault(bolig.felleskostnader, DEFAULT_FELLES);
    
    // 🏠 Kommunale avgifter kun for selveier
    const harKommunaleAvgifter = skalHaKommunaleAvgifter(bolig.eierform);
    const kommunaleRaw = harKommunaleAvgifter ? getValueOrDefault(bolig.kommunaleAvg, DEFAULT_KOMMUNALE) : 0;
    const kommunale = Math.round(kommunaleRaw / 12);
    
    const egenkapital = pris * (settings.egenkapitalProsent / 100);
    const lan = pris - egenkapital;
    const lanekostnad = kalkulerLaanekostnad(lan, settings.rente / 100, settings.lanetid);
    const strom = Math.round((kvm * DEFAULT_FORBRUK_KVM * settings.strompris) / 12);
    
    return {
      lan: lanekostnad,
      kommunale,
      strom,
      felles,
      total: lanekostnad + kommunale + strom + felles,
      harKommunaleAvgifter
    };
  };
  
  return (
    <div className="space-y-6">
      {/* User controls */}
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-brown-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tilpass beregningen
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-brown-700">Rente</span>
              <span className="text-sm font-bold text-brown-900">{settings.rente}%</span>
            </label>
            <input
              type="range"
              min="3"
              max="8"
              step="0.1"
              value={settings.rente}
              onChange={(e) => setSettings({...settings, rente: parseFloat(e.target.value)})}
              className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <div>
            <label className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-brown-700">Lånetid</span>
              <span className="text-sm font-bold text-brown-900">{settings.lanetid} år</span>
            </label>
            <input
              type="range"
              min="10"
              max="30"
              step="1"
              value={settings.lanetid}
              onChange={(e) => setSettings({...settings, lanetid: parseInt(e.target.value)})}
              className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <div>
            <label className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-brown-700">Egenkapital</span>
              <span className="text-sm font-bold text-brown-900">{settings.egenkapitalProsent}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={settings.egenkapitalProsent}
              onChange={(e) => setSettings({...settings, egenkapitalProsent: parseInt(e.target.value)})}
              className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="space-y-4">
        {boliger.map((bolig, index) => {
          const kostnader = kalkulerMedBrukerinnstillinger(bolig);
          return (
            <div key={bolig.id} className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 mr-4">
                  <h4 className="font-bold text-brown-900 text-sm leading-tight">
                    {bolig.adresse || `Bolig #${index + 1}`}
                  </h4>
                  {bolig.kommune && (
                    <p className="text-xs text-brown-600 mt-1">{bolig.kommune}</p>
                  )}
                </div>
                <div className="text-2xl font-bold text-brown-900 text-right">
                  {kostnader.total.toLocaleString("no-NO")} kr/mnd
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brown-600">Lån:</span>
                  <span className="font-medium">{kostnader.lan.toLocaleString("no-NO")} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-600">Strøm:</span>
                  <span className="font-medium">{kostnader.strom.toLocaleString("no-NO")} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-600">Kommunalt:</span>
                  <span className={`font-medium ${!kostnader.harKommunaleAvgifter ? 'text-gray-400 italic' : ''}`}>
                    {kostnader.harKommunaleAvgifter 
                      ? `${kostnader.kommunale.toLocaleString("no-NO")} kr`
                      : 'Ikke relevant'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-600">Felles:</span>
                  <span className="font-medium">{kostnader.felles.toLocaleString("no-NO")} kr</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Sammenlign() {
  const { boliger, valgtForSammenligning } = useBolig();
  const sammenlignBoliger = boliger.filter((b: any) => valgtForSammenligning.includes(b.id));
  
  // Mobile state management
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'detailed' | 'calculator'>('cards');
  
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  if (sammenlignBoliger.length === 0) {
    return (
      <div className="relative min-h-screen bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed">
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/20"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <Home className="w-16 h-16 text-brown-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-brown-900 mb-4">Ingen boliger valgt</h1>
            <p className="text-brown-700 mb-6">Du må først velge boliger for sammenligning fra boligoversikten.</p>
            <Link
              to="/boliger"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 bg-brown-600 text-white font-semibold hover:bg-brown-700 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Gå til boliger
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Kalkuler kostnader for alle boliger for sammenligning
  const alleKostnader = sammenlignBoliger.map(b => kalkulerTotalKostnad(b));
  const allePriser = sammenlignBoliger.map(b => parseNumericValue(b.pris) || 0).filter(p => p > 0);
  const alleKvm = sammenlignBoliger.map(b => getValueOrDefault(b.bruksareal, 0)).filter(k => k > 0);
  const allePrisPerKvm = sammenlignBoliger.map(b => {
    const pris = parseNumericValue(b.pris) || 0;
    const kvm = getValueOrDefault(b.bruksareal, 0);
    return kvm > 0 ? Math.round(pris / kvm) : 0;
  }).filter(p => p > 0);

  return (
    <div className="relative min-h-screen bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed">
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/20"></div>
      
      {/* Hero Section */}
      <div className="relative z-10 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-brown-900 mb-4">
              Sammenlign boliger
            </h1>
            <p className="text-xl text-brown-700 max-w-2xl mx-auto">
              Få en detaljert sammenligning av {sammenlignBoliger.length} valgte boliger med kalkulerte kostnader og nøkkeltall
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <div className="flex items-center gap-2 bg-brown-100 px-4 py-2 rounded-full">
                <Calculator className="w-4 h-4 text-brown-600" />
                <span className="text-brown-800 font-medium">Totalkostnad-analyse</span>
              </div>
              <div className="flex items-center gap-2 bg-brown-100 px-4 py-2 rounded-full">
                <TrendingUp className="w-4 h-4 text-brown-600" />
                <span className="text-brown-800 font-medium">Sammenlignbar data</span>
              </div>
              {isMobile && (
                <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-800 font-medium">Mobiloptimalisert</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sammenligningstabeller */}
      <div className="relative z-10 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Mobile-first adaptive content */}
          <ViewModeSelector 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            isMobile={isMobile} 
          />
          
          {isMobile ? (
            <div className="mb-12">
              {viewMode === 'cards' && (
                <SwipeableBoligCards 
                  boliger={sammenlignBoliger} 
                  alleKostnader={alleKostnader} 
                />
              )}
              {viewMode === 'calculator' && (
                <InteractiveCalculator boliger={sammenlignBoliger} />
              )}
              {viewMode === 'detailed' && (
                <div className="space-y-4">
                  {sammenlignBoliger.map((bolig: any, index: number) => {
                    const kostnader = kalkulerTotalKostnad(bolig);
                    const pris = parseNumericValue(bolig.pris) || 0;
                    const kvm = getValueOrDefault(bolig.bruksareal, 0);
                    const prisPerKvm = kvm > 0 ? Math.round(pris / kvm) : 0;
                    
                    console.log('📱 Mobile detailed view - parsed values:', {
                      adresse: bolig.adresse,
                      rawBruksareal: bolig.bruksareal,
                      parsedKvm: kvm
                    });
                    
                    return (
                      <div key={bolig.id} className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
                        <div className="relative">
                          <img 
                            src={bolig.bilde} 
                            alt="Boligbilde" 
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute top-4 right-4">
                            <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-brown-900">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <h3 className="text-lg font-bold text-brown-900 mb-4">
                            {bolig.adresse || "Adresse ikke oppgitt"}
                          </h3>
                          
                          {/* Expandable details */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-brown-50 rounded-xl">
                                <div className="text-xl font-bold text-brown-900">
                                  {pris > 0 ? `${(pris / 1000000).toFixed(1)}M` : "N/A"}
                                </div>
                                <div className="text-sm text-brown-600">Pris</div>
                              </div>
                              <div className="text-center p-3 bg-brown-50 rounded-xl">
                                <div className="text-xl font-bold text-brown-900">
                                  {kvm > 0 ? `${kvm}m²` : "N/A"}
                                </div>
                                <div className="text-sm text-brown-600">Areal</div>
                              </div>
                            </div>
                            
                            <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-2xl p-4 text-white text-center">
                              <div className="text-2xl font-bold mb-1">
                                {kostnader.total.toLocaleString("no-NO")} kr/mnd
                              </div>
                              <div className="text-sm opacity-90">Estimert månedskostnad</div>
                              <div className="text-xs opacity-75 mt-1">
                                Lån: {kostnader.laan.toLocaleString("no-NO")} • 
                                Strøm: {kostnader.strøm.toLocaleString("no-NO")} • 
                                Kommunalt: {kostnader.harKommunaleAvgifter 
                                  ? kostnader.kommunale.toLocaleString("no-NO") 
                                  : '0 (andel/aksje)'
                                } • 
                                Felles: {kostnader.felles.toLocaleString("no-NO")}
                              </div>
                            </div>
                            
                            {/* Additional details */}
                            <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                              {bolig.byggeaar && (
                                <div className="flex justify-between">
                                  <span className="text-brown-600">Byggeår:</span>
                                  <span className="font-medium">{bolig.byggeaar}</span>
                                </div>
                              )}
                              {bolig.energimerking && (
                                <div className="flex justify-between">
                                  <span className="text-brown-600">Energi:</span>
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    bolig.energimerking === 'A' ? 'bg-green-100 text-green-800' :
                                    bolig.energimerking === 'B' ? 'bg-green-100 text-green-700' :
                                    bolig.energimerking === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                    bolig.energimerking === 'D' ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {bolig.energimerking}
                                  </span>
                                </div>
                              )}
                              {bolig.antallRom && (
                                <div className="flex justify-between">
                                  <span className="text-brown-600">Rom:</span>
                                  <span className="font-medium">{bolig.antallRom}</span>
                                </div>
                              )}
                              {bolig.eierform && (
                                <div className="flex justify-between">
                                  <span className="text-brown-600">Eierform:</span>
                                  <span className="font-medium">{bolig.eierform}</span>
                                </div>
                              )}
                            </div>
                            
                            <a
                              href={bolig.lenke}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brown-600 text-white rounded-2xl hover:bg-brown-700 transition-colors duration-200 font-medium mt-4"
                            >
                              <Home className="w-4 h-4" />
                              Se på FINN
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Desktop: Original grid layout */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {sammenlignBoliger.map((bolig: any, index: number) => {
                const kostnader = kalkulerTotalKostnad(bolig);
                const pris = parseNumericValue(bolig.pris) || 0;
                const kvm = getValueOrDefault(bolig.bruksareal, 0);
                const prisPerKvm = kvm > 0 ? Math.round(pris / kvm) : 0;
                
                console.log('🖥️ Desktop grid - parsed values:', {
                  adresse: bolig.adresse,
                  rawBruksareal: bolig.bruksareal,
                  parsedKvm: kvm
                });
                
                return (
                  <div key={bolig.id} className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]">
                    <div className="relative">
                      <img 
                        src={bolig.bilde} 
                        alt="Boligbilde" 
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-brown-900">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-brown-900 mb-2 line-clamp-2">
                        {bolig.adresse || "Adresse ikke oppgitt"}
                      </h3>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-brown-600">Pris:</span>
                          <span className={`font-bold px-2 py-1 rounded-lg ${pris > 0 ? getComparisonColor(pris, allePriser, true) : 'text-brown-400'}`}>
                            {pris > 0 ? `${pris.toLocaleString("no-NO")} kr` : "Ikke oppgitt"}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-brown-600">Areal:</span>
                          <span className={`font-bold px-2 py-1 rounded-lg ${kvm > 0 ? getComparisonColor(kvm, alleKvm, false) : 'text-brown-400'}`}>
                            {kvm > 0 ? `${kvm} m²` : "Ikke oppgitt"}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-brown-600">Pris/m²:</span>
                          <span className={`font-bold px-2 py-1 rounded-lg ${prisPerKvm > 0 ? getComparisonColor(prisPerKvm, allePrisPerKvm, true) : 'text-brown-400'}`}>
                            {prisPerKvm > 0 ? `${prisPerKvm.toLocaleString("no-NO")} kr/m²` : "Ikke oppgitt"}
                          </span>
                        </div>
                        
                        <div className="pt-2 border-t border-brown-200">
                          <div className="flex justify-between items-center">
                            <span className="text-brown-600 font-medium">Månedskostand:</span>
                            <span className={`font-bold text-lg px-2 py-1 rounded-lg ${getComparisonColor(kostnader.total, alleKostnader.map(k => k.total), true)}`}>
                              {kostnader.total.toLocaleString("no-NO")} kr/mnd
                            </span>
                          </div>
                          <div className="text-xs text-brown-500 mt-1">
                            Inkl. lån, strøm, kommunale avg. og felles
                          </div>
                        </div>
                      </div>
                      
                      <a
                        href={bolig.lenke}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-brown-600 text-white rounded-full hover:bg-brown-700 transition-colors duration-200 font-medium"
                      >
                        <Home className="w-4 h-4" />
                        Se på FINN
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop detailed comparison table - hidden on mobile */}
          {!isMobile && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-brown-600 to-brown-700 text-white p-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Calculator className="w-6 h-6" />
                Detaljert sammenligning
              </h2>
              <p className="text-brown-100 mt-2">Komplett oversikt over alle tilgjengelige data</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-brown-50 border-b border-brown-200">
                    <th className="sticky left-0 z-10 bg-brown-50 p-4 text-left font-semibold text-brown-900 min-w-[200px]">Egenskap</th>
                    {sammenlignBoliger.map((bolig: any, index: number) => (
                      <th key={bolig.id} className="p-4 text-left font-normal min-w-[250px]">
                        <div className="flex flex-col items-start space-y-2">
                          <span className="text-sm font-semibold text-brown-700">Bolig #{index + 1}</span>
                          <img src={bolig.bilde} alt="Boligbilde" className="w-32 h-20 object-cover rounded-lg shadow" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody className="text-brown-900">
                  {/* Grunnleggende informasjon */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brown-600" />
                      Adresse
                    </td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        <div className="font-medium">{b.adresse || "Ikke oppgitt"}</div>
                        {b.kommune && <div className="text-sm text-brown-600">{b.kommune}</div>}
                        {b.bydel && <div className="text-sm text-brown-500">{b.bydel}</div>}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold flex items-center gap-2">
                      <Coins className="w-4 h-4 text-brown-600" />
                      Pris
                    </td>
                    {sammenlignBoliger.map((b: any) => {
                      const pris = parseNumericValue(b.pris) || 0;
                      console.log('📈 Table pris:', { adresse: b.adresse, raw: b.pris, parsed: pris });
                      return (
                        <td className="p-4" key={b.id}>
                          {pris > 0 ? (
                            <span className={`font-bold text-lg px-3 py-1 rounded-lg ${getComparisonColor(pris, allePriser, true)}`}>
                              {pris.toLocaleString("no-NO")} kr
                            </span>
                          ) : (
                            <span className="text-brown-400">Ikke oppgitt</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold flex items-center gap-2">
                      <Home className="w-4 h-4 text-brown-600" />
                      Boligtype
                    </td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        <span className="inline-block bg-brown-100 text-brown-800 px-3 py-1 rounded-full text-sm font-medium">
                          {b.type || "Ikke oppgitt"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  
                  {/* Areal og rom */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors bg-brown-25">
                    <td className="sticky left-0 z-10 bg-brown-25 p-4 font-semibold" colSpan={sammenlignBoliger.length + 1}>
                      <div className="flex items-center gap-2 text-brown-800">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-lg">Areal og rom</span>
                      </div>
                    </td>
                  </tr>

                                     <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                     <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Bruksareal</td>
                     {sammenlignBoliger.map((b: any) => {
                       const kvm = getValueOrDefault(b.bruksareal, 0);
                       console.log('📈 Table bruksareal:', { adresse: b.adresse, raw: b.bruksareal, parsed: kvm });
                       return (
                         <td className="p-4" key={b.id}>
                           {kvm > 0 ? (
                             <span className={`font-bold px-3 py-1 rounded-lg ${getComparisonColor(kvm, alleKvm, false)}`}>
                               {kvm} m²
                             </span>
                           ) : (
                             <span className="text-brown-400">Ikke oppgitt</span>
                           )}
                         </td>
                       );
                     })}
                   </tr>

                                     <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                     <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Pris per m²</td>
                     {sammenlignBoliger.map((b: any) => {
                       const pris = parseNumericValue(b.pris) || 0;
                       const kvm = getValueOrDefault(b.bruksareal, 0);
                       const prisPerKvm = kvm > 0 ? Math.round(pris / kvm) : 0;
                       console.log('📈 Table pris per kvm:', { adresse: b.adresse, pris, kvm, prisPerKvm });
                       return (
                         <td className="p-4" key={b.id}>
                           {prisPerKvm > 0 ? (
                             <span className={`font-bold px-3 py-1 rounded-lg ${getComparisonColor(prisPerKvm, allePrisPerKvm, true)}`}>
                               {prisPerKvm.toLocaleString("no-NO")} kr/m²
                             </span>
                           ) : (
                             <span className="text-brown-400">Ikke oppgitt</span>
                           )}
                         </td>
                       );
                     })}
                   </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Antall rom</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.antallRom ? (
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {b.antallRom} rom
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Soverom</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.antallSoverom ? (
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                            {b.antallSoverom} {b.antallSoverom === 1 ? 'soverom' : 'soverom'}
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Bygningsinfo */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors bg-brown-25">
                    <td className="sticky left-0 z-10 bg-brown-25 p-4 font-semibold" colSpan={sammenlignBoliger.length + 1}>
                      <div className="flex items-center gap-2 text-brown-800">
                        <Calendar className="w-5 h-5" />
                        <span className="text-lg">Bygningsinformasjon</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Byggeår</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.byggeaar ? (
                          <span className="font-medium">{b.byggeaar}</span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-brown-600" />
                      Energimerking
                    </td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.energimerking ? (
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            b.energimerking === 'A' ? 'bg-green-100 text-green-800' :
                            b.energimerking === 'B' ? 'bg-green-100 text-green-700' :
                            b.energimerking === 'C' ? 'bg-yellow-100 text-yellow-700' :
                            b.energimerking === 'D' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            Energimerke {b.energimerking}
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-brown-600" />
                      Eierform
                    </td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.eierform ? (
                          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                            {b.eierform}
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Økonomiske forhold */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors bg-brown-25">
                    <td className="sticky left-0 z-10 bg-brown-25 p-4 font-semibold" colSpan={sammenlignBoliger.length + 1}>
                      <div className="flex items-center gap-2 text-brown-800">
                        <Calculator className="w-5 h-5" />
                        <span className="text-lg">Økonomiske forhold</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Felleskostnader</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.felleskostnader ? (
                          <span className="font-medium">
                            {Number(b.felleskostnader).toLocaleString("no-NO")} kr/mnd
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Kommunale avgifter</td>
                    {sammenlignBoliger.map((b: any) => {
                      const harKommunaleAvgifter = skalHaKommunaleAvgifter(b.eierform);
                      const kommunaleVerdi = parseNumericValue(b.kommunaleAvg);
                      return (
                        <td className="p-4" key={b.id}>
                          {harKommunaleAvgifter ? (
                            kommunaleVerdi > 0 ? (
                              <span className="font-medium">
                                {kommunaleVerdi.toLocaleString("no-NO")} kr/år
                              </span>
                            ) : (
                              <span className="text-brown-400">Ikke oppgitt</span>
                            )
                          ) : (
                            <span className="text-gray-500 italic">Ikke relevant ({b.eierform || 'andel/aksje'})</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Eiendomsskatt</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.eiendomsskatt ? (
                          <span className="font-medium">
                            {Number(b.eiendomsskatt).toLocaleString("no-NO")} kr/år
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Fellesgjeld</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.fellesgjeld ? (
                          <span className="font-medium text-red-700">
                            {Number(b.fellesgjeld).toLocaleString("no-NO")} kr
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Fasiliteter */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors bg-brown-25">
                    <td className="sticky left-0 z-10 bg-brown-25 p-4 font-semibold" colSpan={sammenlignBoliger.length + 1}>
                      <div className="flex items-center gap-2 text-brown-800">
                        <Home className="w-5 h-5" />
                        <span className="text-lg">Fasiliteter</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Parkering</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.parkering ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {b.parkering}
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Balkong/Terrasse</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.balkong || b.terrasse ? (
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {b.balkong || b.terrasse}
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Hage</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.hage ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {b.hage}
                          </span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Salgsinfo */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors bg-brown-25">
                    <td className="sticky left-0 z-10 bg-brown-25 p-4 font-semibold" colSpan={sammenlignBoliger.length + 1}>
                      <div className="flex items-center gap-2 text-brown-800">
                        <User className="w-5 h-5" />
                        <span className="text-lg">Salgsinfo</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Megler</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.megler ? (
                          <span className="font-medium">{b.megler}</span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-4 font-semibold pl-8">Visningsdato</td>
                    {sammenlignBoliger.map((b: any) => (
                      <td className="p-4" key={b.id}>
                        {b.visningsdato ? (
                          <span className="font-medium">{b.visningsdato}</span>
                        ) : (
                          <span className="text-brown-400">Ikke oppgitt</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Kalkulert kostnad - Highlighted */}
                  <tr className="border-b border-brown-100 hover:bg-brown-25 transition-colors bg-gradient-to-r from-brown-100 to-brown-50">
                    <td className="sticky left-0 z-10 bg-gradient-to-r from-brown-100 to-brown-50 p-4 font-bold text-lg flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-brown-700" />
                      Total månedskostnad
                    </td>
                    {sammenlignBoliger.map((b: any) => {
                      const kost = kalkulerTotalKostnad(b);
                      const alleTotalKostnader = alleKostnader.map(k => k.total);
                      return (
                        <td className="p-4" key={b.id}>
                          <div className={`p-4 rounded-xl border-2 ${getComparisonColor(kost.total, alleTotalKostnader, true)} border-current`}>
                            <div className="font-bold text-xl mb-2">
                              {kost.total.toLocaleString("no-NO")} kr/mnd
                            </div>
                            <div className="text-sm space-y-1">
                              <div>• Lån: {kost.laan.toLocaleString("no-NO")} kr</div>
                              <div>• Strøm: {kost.strøm.toLocaleString("no-NO")} kr</div>
                              <div>• Kommunalt: {kost.harKommunaleAvgifter 
                                ? `${kost.kommunale.toLocaleString("no-NO")} kr`
                                : '0 kr (andel/aksje)'
                              }</div>
                              <div>• Felles: {kost.felles.toLocaleString("no-NO")} kr</div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          )} {/* End desktop table */}
          
          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
            <Link
              to="/boliger"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-white/95 backdrop-blur-lg text-brown-900 font-semibold shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
              Tilbake til boliger
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-brown-600 text-white font-semibold shadow-lg hover:bg-brown-700 transition-all duration-200 hover:scale-105"
            >
              <Home className="w-5 h-5" />
              Til forsiden
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
