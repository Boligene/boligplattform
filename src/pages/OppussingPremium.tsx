/*
  Premium Oppussingskalkulator
  Kilder:
  - Byggstart.no (2024): Oppdaterte priser med geografisk differensiering
  - SSB lønnsstatistikk 2024: Håndverkerlønninger
  - Fellesforbundet tariffavtaler 2024: Timepriser håndverkere
  - Finans Norge 2024: Finansieringskalkulasjoner
*/

import { useState } from "react";
import { 
  Hammer, 
  Paintbrush, 
  Bath, 
  BedDouble, 
  Sofa, 
  DoorOpen, 
  Info, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Calculator,
  Download,
  Star,
  Clock,
  Users,
  Award,
  Zap,
  Target
} from "lucide-react";

// Typer for bedre TypeScript-støtte
interface RegionData {
  name: string;
  multiplier: number;
}

interface SeasonData {
  name: string;
  multiplier: number;
  reason: string;
}

interface WorkItem {
  name: string;
  pricePerM2: number;
  hours: number;
  craftType: keyof typeof craftHourlyRates;
}

interface RoomBreakdown {
  [key: string]: WorkItem;
}

interface WorkBreakdownType {
  [key: string]: RoomBreakdown;
}

// Geografisk prisdifferensiering basert på SSB data 2024
const regionMultipliers: Record<string, RegionData> = {
  oslo: { name: "Oslo og Akershus", multiplier: 1.15 },
  bergen: { name: "Bergen", multiplier: 1.10 },
  stavanger: { name: "Stavanger", multiplier: 1.12 },
  trondheim: { name: "Trondheim", multiplier: 1.05 },
  kristiansand: { name: "Kristiansand", multiplier: 1.02 },
  tromsø: { name: "Tromsø", multiplier: 1.08 },
  resten: { name: "Øvrige Norge", multiplier: 1.0 }
};

// Sesongprising basert på markedsdata
const seasonMultipliers: Record<string, SeasonData> = {
  winter: { name: "Vinter (Des-Feb)", multiplier: 0.95, reason: "Lavere etterspørsel - håndverkere mer tilgjengelige for innendørs arbeid" },
  spring: { name: "Vår (Mar-Mai)", multiplier: 1.05, reason: "Høy etterspørsel - alle vil ha ferdig oppussing til sommeren" },
  summer: { name: "Sommer (Jun-Aug)", multiplier: 1.10, reason: "Høyest priser - håndverkere opptatt med utendørs prosjekter" },
  fall: { name: "Høst (Sep-Nov)", multiplier: 1.0, reason: "Normale priser - roligere periode etter sommeren" }
};

// Utvidede kvalitetsnivåer
const qualityLevels = [
  { 
    label: "Budsjett", 
    value: "budget", 
    multiplier: 0.7, 
    description: "Rimelige materialer, enkel utførelse",
    details: "IKEA-kjøkken, standard fliser, grunnleggende løsninger"
  },
  { 
    label: "Standard", 
    value: "standard", 
    multiplier: 1.0, 
    description: "God kvalitet, normale løsninger",
    details: "Merkevarer fra byggvarehandel, god håndverksmessig utførelse"
  },
  { 
    label: "Premium", 
    value: "premium", 
    multiplier: 1.3, 
    description: "Høy kvalitet, tilpassede løsninger",
    details: "Kvalitetsmerker, delvis skreddersøm, designelementer"
  },
  { 
    label: "Luksus", 
    value: "luxury", 
    multiplier: 1.8, 
    description: "Eksklusive materialer, design-fokus",
    details: "Designerkjøkken, eksklusive fliser, full skreddersøm"
  }
];

// Håndverkerlønninger per time basert på tariffavtaler 2024
const craftHourlyRates = {
  snekker: 850,
  elektriker: 950,
  rørlegger: 1000,
  maler: 750,
  flislegger: 900
} as const;

// Detaljerte arbeidsoppgaver med timepriser basert på tariffavtaler 2024
const workBreakdown: WorkBreakdownType = {
  "Kjøkken": {
    riving: { name: "Riving og forberedelse", pricePerM2: 150, hours: 1.5, craftType: "snekker" },
    electrical: { name: "Elektriker", pricePerM2: 200, hours: 2, craftType: "elektriker" },
    plumbing: { name: "Rørlegger", pricePerM2: 300, hours: 2.5, craftType: "rørlegger" },
    carpentry: { name: "Snekkerarbeid", pricePerM2: 500, hours: 4, craftType: "snekker" },
    painting: { name: "Maling", pricePerM2: 100, hours: 1, craftType: "maler" }
  },
  "Bad": {
    riving: { name: "Riving og forberedelse", pricePerM2: 200, hours: 2, craftType: "snekker" },
    electrical: { name: "Elektriker", pricePerM2: 250, hours: 2.5, craftType: "elektriker" },
    plumbing: { name: "Rørlegger", pricePerM2: 600, hours: 6, craftType: "rørlegger" },
    waterproofing: { name: "Membran og tetting", pricePerM2: 400, hours: 3, craftType: "snekker" },
    tiling: { name: "Flislegging", pricePerM2: 500, hours: 4, craftType: "flislegger" },
    fixtures: { name: "Montering inventar", pricePerM2: 300, hours: 2, craftType: "rørlegger" }
  },
  "Soverom": {
    electrical: { name: "Elektriker", pricePerM2: 120, hours: 1, craftType: "elektriker" },
    flooring: { name: "Gulvlegging", pricePerM2: 250, hours: 2, craftType: "snekker" },
    painting: { name: "Maling", pricePerM2: 80, hours: 1.5, craftType: "maler" },
    carpentry: { name: "Lister og finish", pricePerM2: 60, hours: 0.5, craftType: "snekker" }
  },
  "Stue": {
    electrical: { name: "Elektriker", pricePerM2: 120, hours: 1, craftType: "elektriker" },
    flooring: { name: "Gulvlegging", pricePerM2: 250, hours: 2, craftType: "snekker" },
    painting: { name: "Maling", pricePerM2: 80, hours: 1.5, craftType: "maler" },
    carpentry: { name: "Lister og finish", pricePerM2: 60, hours: 0.5, craftType: "snekker" }
  },
  "Gang": {
    electrical: { name: "Elektriker", pricePerM2: 100, hours: 0.5, craftType: "elektriker" },
    flooring: { name: "Gulvlegging", pricePerM2: 200, hours: 1.5, craftType: "snekker" },
    painting: { name: "Maling", pricePerM2: 70, hours: 1, craftType: "maler" }
  }
};

const romIkoner: Record<string, React.ReactNode> = {
  "Kjøkken": <Hammer className="inline w-5 h-5 mr-1 text-brown-700" />,
  "Bad": <Bath className="inline w-5 h-5 mr-1 text-blue-600" />,
  "Soverom": <BedDouble className="inline w-5 h-5 mr-1 text-green-700" />,
  "Stue": <Sofa className="inline w-5 h-5 mr-1 text-orange-700" />,
  "Gang": <DoorOpen className="inline w-5 h-5 mr-1 text-gray-500" />
};

interface ProcessedWorkItem extends WorkItem {
  adjustedCost: number;
  laborCost: number;
}

interface RoomDetails {
  navn: string;
  areal: number;
  kvalitet: string;
  breakdown: Record<string, ProcessedWorkItem>;
  totalKost: number;
  arbeidKost: number;
  materialKost: number;
  tidsEstimat: number;
}

export default function OppussingPremium() {
  // State variabler
  const [rom, setRom] = useState("Kjøkken");
  const [areal, setAreal] = useState("");
  const [kvalitet, setKvalitet] = useState("standard");
  const [region, setRegion] = useState("resten");
  const [sesong, setSesong] = useState("fall");
  const [romListe, setRomListe] = useState<RoomDetails[]>([]);
  const [buffer, setBuffer] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [boligverdi, setBoligverdi] = useState("");
  const [showTooltip, setShowTooltip] = useState("");

  // Beregne estimert ferdigstillelse
  const calculateCompletionTime = () => {
    const totalHours = romListe.reduce((sum, r) => sum + (r.tidsEstimat || 0), 0);
    if (totalHours === 0) return 0;
    const workDaysPerWeek = 5;
    const hoursPerDay = 8;
    const weeks = Math.ceil(totalHours / (workDaysPerWeek * hoursPerDay));
    return weeks;
  };

  // Legg til rom i listen
  const leggTilRom = (e: React.FormEvent) => {
    e.preventDefault();
    const arealNum = parseFloat(areal as string);
    if (arealNum <= 0 || !arealNum || isNaN(arealNum)) return;

    const kvalitetData = qualityLevels.find(k => k.value === kvalitet);
    const regionData = regionMultipliers[region];
    const sesongData = seasonMultipliers[sesong];
    const roomBreakdown = workBreakdown[rom];

    if (!kvalitetData || !regionData || !sesongData || !roomBreakdown) {
      console.error('Manglende data for beregning');
      return;
    }

    let totalMaterialKost = 0;
    let totalArbeidKost = 0;
    let totalTid = 0;
    const detaljertBreakdown: Record<string, ProcessedWorkItem> = {};

    try {
      Object.entries(roomBreakdown).forEach(([key, work]) => {
        // Materialkostnad (justert for kvalitet, region og sesong)
        const materialCost = (work.pricePerM2 || 0) * arealNum * kvalitetData.multiplier * regionData.multiplier * sesongData.multiplier;
        
        // Arbeidskostnad (basert på timer og timepriser, justert for region og sesong)
        const laborCost = (work.hours || 0) * arealNum * (craftHourlyRates[work.craftType] || 0) * regionData.multiplier * sesongData.multiplier;
        
        // Total kostnad for denne arbeidsoppgaven
        const totalCostForTask = materialCost + laborCost;
        
        totalMaterialKost += materialCost;
        totalArbeidKost += laborCost;
        totalTid += (work.hours || 0) * arealNum;
        
        detaljertBreakdown[key] = {
          ...work,
          adjustedCost: totalCostForTask,
          laborCost: laborCost
        };
      });

      const totalKostForRoom = totalMaterialKost + totalArbeidKost;

      const nyRoom: RoomDetails = {
        navn: rom,
        areal: arealNum,
        kvalitet: kvalitetData.label,
        breakdown: detaljertBreakdown,
        totalKost: totalKostForRoom,
        arbeidKost: totalArbeidKost,
        materialKost: totalMaterialKost,
        tidsEstimat: totalTid
      };

      setRomListe(prev => [...prev, nyRoom]);
      setAreal("");
    } catch (error) {
      console.error('Feil ved beregning av rom:', error);
      alert('Det oppstod en feil ved beregning. Prøv igjen.');
    }
  };

  // Fjern rom fra listen
  const fjernRom = (index: number) => {
    setRomListe(prev => prev.filter((_, i) => i !== index));
  };

  // Kalkuler totaler - med sikker fallback
  const totalKost = romListe.reduce((sum, r) => sum + (r.totalKost || 0), 0);
  const totalArbeidKost = romListe.reduce((sum, r) => sum + (r.arbeidKost || 0), 0);
  const totalMaterialKost = romListe.reduce((sum, r) => sum + (r.materialKost || 0), 0);
  const totalTid = romListe.reduce((sum, r) => sum + (r.tidsEstimat || 0), 0);
  const totalMedBuffer = buffer ? Math.round(totalKost * 1.15) : totalKost;

  // ROI beregning
  const boligverdiNum = parseFloat(boligverdi as string) || 0;
  const estimertVerdiøkning = totalKost * 0.75; // Generell regel: 75% av investering kommer tilbake
  const nettoGevinst = estimertVerdiøkning - totalKost;
  const roiProsent = boligverdiNum > 0 ? (estimertVerdiøkning / boligverdiNum) * 100 : 0;

  // Formaterer boligverdi input med mellomrom
  const formatBoligverdi = (value: string) => {
    const numValue = value.replace(/\s/g, '');
    if (numValue === '') return '';
    const parsed = parseInt(numValue);
    if (isNaN(parsed)) return '';
    return parsed.toLocaleString('no-NO').replace(/,/g, ' ');
  };

  const handleBoligverdiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setBoligverdi(rawValue);
    }
  };

  // Eksporter til PDF funksjon - sikret mot deling på null
  const eksporterTilPDF = () => {
    try {
      const totalKostSafe = totalKost || 1; // Unngå divisjon på null
      const content = `
PREMIUM OPPUSSINGSRAPPORT
==========================

PROSJEKTOVERSIKT
Region: ${regionMultipliers[region]?.name || 'Ukjent'}
Sesong: ${seasonMultipliers[sesong]?.name || 'Ukjent'}
Total areal: ${romListe.reduce((sum, r) => sum + (r.areal || 0), 0)} m²
Estimert ferdigstillelse: ${calculateCompletionTime()} uker

KOSTNADSANALYSE
Total prosjektkostnad: ${totalMedBuffer.toLocaleString('no-NO')} kr
- Arbeidskostnader: ${totalArbeidKost.toLocaleString('no-NO')} kr (${Math.round((totalArbeidKost/totalKostSafe)*100)}%)
- Materialkostnader: ${totalMaterialKost.toLocaleString('no-NO')} kr (${Math.round((totalMaterialKost/totalKostSafe)*100)}%)
${buffer ? `- Buffer (15%): ${Math.round(totalKost * 0.15).toLocaleString('no-NO')} kr` : ''}

ROI-ANALYSE
${boligverdiNum > 0 ? `
Boligverdi før: ${boligverdiNum.toLocaleString('no-NO')} kr
Estimert verdiøkning: ${estimertVerdiøkning.toLocaleString('no-NO')} kr
Verdiøkning i %: ${roiProsent.toFixed(1)}%
Netto gevinst: ${nettoGevinst.toLocaleString('no-NO')} kr
` : 'Ingen boligverdi oppgitt'}

DETALJERT ROMANALYSE
${romListe.map(r => `
${r.navn} (${r.areal} m², ${r.kvalitet})
- Totalkostnad: ${r.totalKost.toLocaleString('no-NO')} kr
- Arbeidstimer: ${r.tidsEstimat.toFixed(1)} timer
`).join('')}
    `;
    
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'oppussingsrapport-premium.txt';
      a.click();
      URL.revokeObjectURL(url); // Rydd opp
    } catch (error) {
      console.error('Feil ved eksport:', error);
      alert('Det oppstod en feil ved eksportering av rapporten.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/85 rounded-2xl shadow-xl p-8 w-full max-w-6xl mt-10 mb-10">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <Award className="w-8 h-8 text-yellow-600 mr-3" />
          <h2 className="text-3xl font-seriflogo font-bold text-brown-900">
            Premium Oppussingskalkulator
          </h2>
          <Award className="w-8 h-8 text-yellow-600 ml-3" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Venstre kolonne - Input */}
          <div className="space-y-6">
            {/* Geografisk og sesong innstillinger */}
            <div className="border border-brown-200 rounded-2xl bg-white/90 p-6">
              <h3 className="text-lg font-bold text-brown-800 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Lokasjon & Timing
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="relative">
                  <span className="block text-sm font-medium text-brown-700 mb-1 flex items-center">
                    Region 
                    <span
                      className="ml-2 cursor-pointer"
                      onMouseEnter={() => setShowTooltip("region")}
                      onMouseLeave={() => setShowTooltip("")}
                    >
                      <Info className="w-4 h-4 text-brown-400" />
                    </span>
                  </span>
                  {showTooltip === "region" && (
                    <div className="absolute z-10 top-full left-0 mt-1 w-72 bg-white border border-brown-200 rounded-lg shadow-lg p-3 text-sm">
                      <b>Hvorfor varierer prisene?</b>
                      <p className="mt-1 text-gray-700">Håndverkerlønninger og materialkostnader varierer geografisk. Oslo-området har høyest priser, mens mindre steder har lavere kostnader.</p>
                    </div>
                  )}
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400"
                  >
                    {Object.entries(regionMultipliers).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.name} {data.multiplier !== 1.0 && `(${data.multiplier > 1 ? '+' : ''}${Math.round((data.multiplier - 1) * 100)}%)`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="relative">
                  <span className="block text-sm font-medium text-brown-700 mb-1 flex items-center">
                    Sesong
                    <span
                      className="ml-2 cursor-pointer"
                      onMouseEnter={() => setShowTooltip("sesong")}
                      onMouseLeave={() => setShowTooltip("")}
                    >
                      <Info className="w-4 h-4 text-brown-400" />
                    </span>
                  </span>
                  {showTooltip === "sesong" && (
                    <div className="absolute z-10 top-full left-0 mt-1 w-72 bg-white border border-brown-200 rounded-lg shadow-lg p-3 text-sm">
                      <b>Sesongvariasjoner:</b>
                      <ul className="mt-1 text-gray-700 space-y-1">
                        <li>• <b>Vinter:</b> Billigst (-5%) - mindre konkurranse</li>
                        <li>• <b>Vår:</b> Dyrere (+5%) - høy etterspørsel</li>
                        <li>• <b>Sommer:</b> Dyrest (+10%) - håndverkere opptatt</li>
                        <li>• <b>Høst:</b> Normal pris - rolig periode</li>
                      </ul>
                    </div>
                  )}
                  <select
                    value={sesong}
                    onChange={e => setSesong(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400"
                  >
                    {Object.entries(seasonMultipliers).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.name} {data.multiplier !== 1.0 && `(${data.multiplier > 1 ? '+' : ''}${Math.round((data.multiplier - 1) * 100)}%)`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 flex items-center">
                  <Info className="w-4 h-4 inline mr-2" />
                  {seasonMultipliers[sesong].reason}
                </p>
              </div>
            </div>

            {/* Rom input */}
            <div className="border border-brown-200 rounded-2xl bg-white/90 p-6">
              <h3 className="text-lg font-bold text-brown-800 mb-4">Legg til rom</h3>
              
              <form onSubmit={leggTilRom} className="space-y-4">
                <label>
                  <span className="block text-sm font-medium text-brown-700 mb-1">Romtype</span>
                  <select
                    value={rom}
                    onChange={e => setRom(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400"
                  >
                    {Object.keys(workBreakdown).map(romtype => (
                      <option key={romtype} value={romtype}>{romtype}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="block text-sm font-medium text-brown-700 mb-1">Areal (m²)</span>
                  <input
                    type="number"
                    value={areal}
                    onChange={e => setAreal(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400"
                    min={0.1}
                    step={0.1}
                    max={100}
                    placeholder="f.eks. 15.5"
                  />
                </label>

                <label className="relative">
                  <span className="block text-sm font-medium text-brown-700 mb-1 flex items-center">
                    Kvalitetsnivå
                    <span
                      className="ml-2 cursor-pointer"
                      onMouseEnter={() => setShowTooltip("kvalitet")}
                      onMouseLeave={() => setShowTooltip("")}
                    >
                      <Info className="w-4 h-4 text-brown-400" />
                    </span>
                  </span>
                  {showTooltip === "kvalitet" && (
                    <div className="absolute z-10 top-full left-0 mt-1 w-80 bg-white border border-brown-200 rounded-lg shadow-lg p-3 text-sm">
                      <b>Kvalitetsnivåer:</b>
                      <ul className="mt-1 space-y-2">
                        <li><b>Budsjett (-30%):</b> IKEA-kjøkken, enkle løsninger</li>
                        <li><b>Standard (0%):</b> Merkevarer fra byggvarehus</li>
                        <li><b>Premium (+30%):</b> Kvalitetsmerker, designelementer</li>
                        <li><b>Luksus (+80%):</b> Eksklusive materialer, skreddersøm</li>
                      </ul>
                    </div>
                  )}
                  <select
                    value={kvalitet}
                    onChange={e => setKvalitet(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400"
                  >
                    {qualityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} - {level.description}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    💡 {qualityLevels.find(q => q.value === kvalitet)?.details}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!areal || parseFloat(areal as string) <= 0}
                  className="w-full bg-brown-700 text-white rounded-lg px-6 py-3 font-semibold hover:bg-brown-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Legg til rom
                </button>
              </form>
            </div>

            {/* ROI Analyse */}
            <div className="border border-brown-200 rounded-2xl bg-white/90 p-6">
              <h3 className="text-lg font-bold text-brown-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                ROI-Analyse
              </h3>
              
              <label>
                <span className="block text-sm font-medium text-brown-700 mb-1">Nåværende boligverdi (kr)</span>
                <input
                  type="text"
                  value={formatBoligverdi(boligverdi)}
                  onChange={handleBoligverdiChange}
                  className="w-full rounded-lg px-4 py-2 border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400"
                  placeholder="f.eks. 3 500 000"
                />
                <p className="text-xs text-gray-500 mt-1">Oppgi boligens anslåtte markedsverdi før oppussing</p>
              </label>

              {boligverdiNum > 0 && totalKost > 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Estimert verdiøkning:</span>
                      <p className="font-semibold text-green-700">{estimertVerdiøkning.toLocaleString('no-NO')} kr</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Verdiøkning i %:</span>
                      <p className="font-semibold text-green-700">{roiProsent.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Netto gevinst:</span>
                      <p className={`font-semibold ${nettoGevinst >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {nettoGevinst.toLocaleString('no-NO')} kr
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Avkastning:</span>
                      <p className={`font-semibold ${nettoGevinst >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {totalKost > 0 ? ((nettoGevinst / totalKost) * 100).toFixed(1) : '0.0'}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Høyre kolonne - Resultater */}
          <div className="space-y-6">
            {/* Rom oversikt */}
            {romListe.length > 0 && (
              <div className="border border-brown-200 rounded-2xl bg-white/90 p-6">
                <h3 className="text-lg font-bold text-brown-800 mb-4 flex items-center">
                  <Paintbrush className="w-5 h-5 mr-2 text-green-700" />
                  Prosjektoversikt
                </h3>

                <div className="space-y-3">
                  {romListe.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {romIkoner[r.navn]}
                        <span className="font-medium">{r.navn}</span>
                        <span className="text-sm text-gray-600">({r.areal} m², {r.kvalitet})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{r.totalKost.toLocaleString('no-NO')} kr</span>
                        <button
                          onClick={() => fjernRom(i)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Fjern
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totaler */}
                <div className="mt-6 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Arbeidskostnader:</span>
                      <p className="font-semibold">{totalArbeidKost.toLocaleString('no-NO')} kr ({totalKost > 0 ? Math.round((totalArbeidKost/totalKost)*100) : 0}%)</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Materialkostnader:</span>
                      <p className="font-semibold">{totalMaterialKost.toLocaleString('no-NO')} kr ({totalKost > 0 ? Math.round((totalMaterialKost/totalKost)*100) : 0}%)</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Estimert arbeidstimer:</span>
                      <p className="font-semibold flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {totalTid.toFixed(0)} timer
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Ferdigstillelse:</span>
                      <p className="font-semibold flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {calculateCompletionTime()} uker
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 text-brown-800">
                      <input
                        type="checkbox"
                        checked={buffer}
                        onChange={e => setBuffer(e.target.checked)}
                        className="accent-brown-700"
                      />
                      <span>Legg til 15% buffer for uforutsette kostnader</span>
                    </label>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-brown-900 font-bold text-lg">
                    <div className="flex justify-between items-center">
                      <span>Totalkostnad:</span>
                      <span>{totalKost.toLocaleString('no-NO')} kr</span>
                    </div>
                    {buffer && (
                      <div className="flex justify-between items-center text-green-700 font-normal mt-1">
                        <span>Med buffer (15%):</span>
                        <span>{totalMedBuffer.toLocaleString('no-NO')} kr</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detaljert breakdown toggle */}
                <button
                  onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                  className="w-full mt-4 bg-brown-100 text-brown-900 rounded-lg px-4 py-2 font-medium hover:bg-brown-200 transition"
                >
                  {showDetailedBreakdown ? 'Skjul' : 'Vis'} detaljert kostnadsfordeling
                </button>

                {showDetailedBreakdown && (
                  <div className="mt-4 space-y-4">
                    {romListe.map((room, roomIndex) => (
                      <div key={roomIndex} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-brown-800 mb-3 flex items-center">
                          {romIkoner[room.navn]}
                          {room.navn} - Detaljert kostnadsfordeling
                        </h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(room.breakdown).map(([key, work]: [string, ProcessedWorkItem]) => (
                            <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-700">{work.name}:</span>
                              <div className="text-right">
                                <div className="font-medium">{work.adjustedCost.toLocaleString('no-NO')} kr</div>
                                <div className="text-xs text-gray-500">
                                  Arbeid: {work.laborCost.toLocaleString('no-NO')} kr | Material: {(work.adjustedCost - work.laborCost).toLocaleString('no-NO')} kr
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Eksport knapper */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={eksporterTilPDF}
                    className="flex-1 bg-brown-100 text-brown-900 rounded-lg px-4 py-2 font-medium hover:bg-brown-200 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Eksporter rapport
                  </button>
                  <button
                    onClick={() => {
                      const mailtoLink = `mailto:?subject=Premium Oppussingsrapport&body=Se vedlagt rapport for detaljert kostnadsanalyse av oppussingsprosjekt.%0A%0ATotalkostnad: ${totalMedBuffer.toLocaleString('no-NO')} kr%0AEstimert ferdigstillelse: ${calculateCompletionTime()} uker`;
                      window.location.href = mailtoLink;
                    }}
                    className="flex-1 bg-brown-100 text-brown-900 rounded-lg px-4 py-2 font-medium hover:bg-brown-200 transition"
                  >
                    Send til e-post
                  </button>
                </div>
              </div>
            )}

            {/* Tips for premium brukere */}
            <div className="border border-brown-200 rounded-2xl bg-white/90 p-6">
              <h3 className="text-lg font-bold text-brown-800 mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-600" />
                Premium Tips & Anbefalinger
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Optimal rekkefølge</h4>
                    <p className="text-blue-700">Start med våtrom (bad), deretter kjøkken, og til slutt øvrige rom for å minimere støy og støv.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Håndverkervalg</h4>
                    <p className="text-green-700">Innhent minst 3 tilbud. Sjekk referenser, forsikring og fagbrev før du bestemmer deg.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Besparingstips</h4>
                    <p className="text-yellow-700">Planlegg oppussing på vinteren for bedre priser (-5%), og vurder å kjøpe materialer selv for ytterligere besparelser.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 