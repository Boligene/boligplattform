import { SliderInput } from '@boligplattform/ui';
import * as React from "react";
import { useBolig } from '../context/BoligContext';
// @ts-ignore
import { airbnbKorttidsleieData } from '@boligplattform/core';

const formatKr = (n: number) =>
  isNaN(n) ? "" : n.toLocaleString("no-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });

// Hjelpefunksjon for å hente tall fra tekst (f.eks. "5000 kr" -> 5000)
function extractNumber(text: string | undefined): number {
  if (!text) return 0;
  const numbers = text.replace(/[^\d]/g, '');
  return numbers ? parseInt(numbers, 10) : 0;
}

function InfoTooltip({ text }: { text: string }) {
  return <span className="ml-1 cursor-pointer text-brown-400" title={text}>ⓘ</span>;
}

function YieldIndicator({ value }: { value: number }) {
  let color = 'bg-red-400';
  if (value > 5) color = 'bg-green-500';
  else if (value > 2.5) color = 'bg-yellow-400';
  return <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${color}`}></span>;
}

export default function Utleiekalkulator() {
  const { boliger } = useBolig();
  const [valgtBoligId, setValgtBoligId] = React.useState<string>("");

  // Kalkulator-felter
  const [kjøpesum, setKjøpesum] = React.useState(0);
  const [egenkapital, setEgenkapital] = React.useState(0);
  const [rente, setRente] = React.useState(1);
  const [lånetid, setLånetid] = React.useState(5);

  const [leieinntekt, setLeieinntekt] = React.useState(0);
  const [felleskostnader, setFelleskostnader] = React.useState(0);
  const [kommunaleAvgifter, setKommunaleAvgifter] = React.useState(0);
  const [forsikring, setForsikring] = React.useState(0);
  const [vedlikehold, setVedlikehold] = React.useState(0);
  const [strøm, setStrøm] = React.useState(0);
  const [internett, setInternett] = React.useState(0);
  const [skatt, setSkatt] = React.useState(false);

  const [leiemodus, setLeiemodus] = React.useState<'langtid' | 'airbnb'>('langtid');
  // Korttidsleie-felter
  const [prisPerNatt, setPrisPerNatt] = React.useState(1200);
  const [netterPerÅr, setNetterPerÅr] = React.useState(255);
  const [airbnbGebyr, setAirbnbGebyr] = React.useState(5);
  const [rengjoringPerBooking, setRengjoringPerBooking] = React.useState(400);
  const [snittBookingLengde, setSnittBookingLengde] = React.useState(3);
  const [antallBookinger, setAntallBookinger] = React.useState(Math.ceil(255/3));
  const [andreUtgifterÅr, setAndreUtgifterÅr] = React.useState(0);
  const [airbnbBy, setAirbnbBy] = React.useState('Oslo');
  const [airbnbSkatt, setAirbnbSkatt] = React.useState(false);

  // Korttidsleie boligkostnader (samme som langtidsleie)
  const [airbnbFelleskostnader, setAirbnbFelleskostnader] = React.useState(0);
  const [airbnbKommunaleAvgifter, setAirbnbKommunaleAvgifter] = React.useState(0);
  const [airbnbForsikring, setAirbnbForsikring] = React.useState(0);
  const [airbnbVedlikehold, setAirbnbVedlikehold] = React.useState(0);
  const [airbnbStrøm, setAirbnbStrøm] = React.useState(0);
  const [airbnbInternett, setAirbnbInternett] = React.useState(0);

  // Autofyll felter når bolig velges
  React.useEffect(() => {
    if (!valgtBoligId) return;
    const bolig = boliger.find(b => b.id === valgtBoligId);
    if (!bolig) return;
    
    // Bruk extractNumber for å håndtere tekst med enheter
    setKjøpesum(extractNumber(bolig.pris?.toString()) || 0);
    setFelleskostnader(extractNumber(bolig.felleskostnader) || 0);
    setAirbnbFelleskostnader(extractNumber(bolig.felleskostnader) || 0);
    
    // Kommunale avgifter - konverter fra årlig til månedlig hvis nødvendig
    const kommunaleAvgÅr = extractNumber(bolig.kommunaleAvg) || 0;
    const kommunaleAvgMnd = kommunaleAvgÅr > 500 ? Math.round(kommunaleAvgÅr / 12) : kommunaleAvgÅr;
    setKommunaleAvgifter(kommunaleAvgMnd);
    setAirbnbKommunaleAvgifter(kommunaleAvgMnd);
    
    console.log('Autofyll data:', {
      pris: bolig.pris,
      extractedPris: extractNumber(bolig.pris?.toString()),
      felleskostnader: bolig.felleskostnader,
      extractedFelleskostnader: extractNumber(bolig.felleskostnader),
      kommunaleAvg: bolig.kommunaleAvg,
      extractedKommunaleAvg: kommunaleAvgÅr
    });
    
    // Her kan du fylle inn mer hvis du lagrer flere tall i context
    // f.eks. setLeieinntekt(bolig.leieinntekt || 0);
    // Andre felt må fylles manuelt av bruker
  }, [valgtBoligId, boliger]);

  React.useEffect(() => {
    if (egenkapital > kjøpesum) setEgenkapital(kjøpesum);
  }, [kjøpesum, egenkapital]);

  const lån = Math.max(0, kjøpesum - egenkapital);
  const månedsrente = rente / 100 / 12;
  const terminer = lånetid * 12;
  const terminbeløp = lån > 0 && rente > 0
    ? (lån * månedsrente) / (1 - Math.pow(1 + månedsrente, -terminer))
    : 0;

  const totaleKostnader =
    terminbeløp +
    felleskostnader +
    kommunaleAvgifter +
    strøm +
    internett +
    forsikring +
    vedlikehold;

  let nettoInntekt = leieinntekt - totaleKostnader;
  if (skatt) nettoInntekt = nettoInntekt * 0.78; // 22% skatt

  const direkteavkastning = kjøpesum > 0 ? ((nettoInntekt * 12) / kjøpesum) * 100 : 0;
  const avkastningEK = egenkapital > 0 ? ((nettoInntekt * 12) / egenkapital) * 100 : 0;

  // Langtidsleie - totalberegninger etter alle kostnader
  const langtidÅrligNettoEtterKostnader = nettoInntekt * 12;
  const langtidTotalYield = kjøpesum > 0 ? (langtidÅrligNettoEtterKostnader / kjøpesum) * 100 : 0;
  const langtidAvkastningEK = egenkapital > 0 ? (langtidÅrligNettoEtterKostnader / egenkapital) * 100 : 0;

  // Oppdater antall bookinger automatisk når netter eller snittlengde endres
  React.useEffect(() => {
    if (leiemodus === 'airbnb') {
      setAntallBookinger(Math.ceil(netterPerÅr / snittBookingLengde));
    }
  }, [netterPerÅr, snittBookingLengde, leiemodus]);

  // Autofyll pris og netter når by endres (kun for korttidsleie)
  React.useEffect(() => {
    if (leiemodus === 'airbnb') {
      const bydata = airbnbKorttidsleieData.find((b: any) => b.by === airbnbBy);
      if (bydata) {
        setPrisPerNatt(bydata.prisPerNatt);
        setNetterPerÅr(bydata.utleiedager);
      }
    }
  }, [airbnbBy, leiemodus]);

  // Korttidsleie-beregning
  const bruttoLeie = prisPerNatt * netterPerÅr;
  const airbnbGebyrKr = Math.round(bruttoLeie * (airbnbGebyr / 100));
  const rengjoringKr = antallBookinger * rengjoringPerBooking;
  let nettoAirbnb = bruttoLeie - airbnbGebyrKr - rengjoringKr - andreUtgifterÅr;
  if (airbnbSkatt) nettoAirbnb = nettoAirbnb * 0.78; // 22% skatt
  const airbnbMnd = nettoAirbnb / 12;
  const airbnbYield = kjøpesum > 0 ? (nettoAirbnb / kjøpesum) * 100 : 0;

  // Totale boligkostnader for korttidsleie (månedlige)
  const airbnbTotaleBoligkostnader = terminbeløp + airbnbFelleskostnader + airbnbKommunaleAvgifter + airbnbForsikring + airbnbVedlikehold + airbnbStrøm + airbnbInternett;
  
  // Netto resultat etter alle kostnader for korttidsleie
  const airbnbNettoEtterAlleKostnader = airbnbMnd - airbnbTotaleBoligkostnader;
  const airbnbÅrligNettoEtterKostnader = airbnbNettoEtterAlleKostnader * 12;
  
  // Totalavkastning etter alle kostnader
  const airbnbTotalYield = kjøpesum > 0 ? (airbnbÅrligNettoEtterKostnader / kjøpesum) * 100 : 0;
  const airbnbAvkastningEK = egenkapital > 0 ? (airbnbÅrligNettoEtterKostnader / egenkapital) * 100 : 0;

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed py-8 px-2">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6 text-center">Utleiekalkulator</h1>
      
      {/* NYTT: Velg importert bolig for autofyll */}
      {boliger.length > 0 && (
  <div className="w-full max-w-xl mx-auto mb-6">
    <label className="block font-semibold text-brown-900 mb-2">
      Velg bolig for autofyll
    </label>
    <div className="relative">
      <select
        className="border border-brown-200 bg-white rounded-full px-6 py-3 text-lg shadow focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 appearance-none"
        value={valgtBoligId}
        onChange={e => setValgtBoligId(e.target.value)}
      >
        <option value="">Velg importert bolig…</option>
        {boliger.map(bolig => (
          <option key={bolig.id} value={bolig.id}>
            {bolig.adresse} ({bolig.pris?.toLocaleString("no-NO")} kr)
          </option>
        ))}
      </select>
      {/* Custom pil-ikon (svg) */}
      <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-brown-400">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
)}


      <div className="flex justify-center mb-6 gap-6">
        <label className="flex items-center gap-2 text-brown-900 font-semibold">
          <input type="radio" checked={leiemodus === 'langtid'} onChange={() => setLeiemodus('langtid')} /> Langtidsleie
        </label>
        <label className="flex items-center gap-2 text-brown-900 font-semibold">
          <input type="radio" checked={leiemodus === 'airbnb'} onChange={() => setLeiemodus('airbnb')} /> Korttidsleie (Airbnb)
        </label>
      </div>
      {/* Felter for valgt modus */}
      {leiemodus === 'langtid' ? (
        <div className="grid md:grid-cols-2 gap-8 mb-8 max-w-4xl mx-auto">
          <div className="bg-white/80 rounded-2xl shadow-xl p-6">
            <SliderInput label="Prisantydning (kr)" min={0} max={100_000_000} step={100_000} value={kjøpesum} setValue={setKjøpesum} />
            <SliderInput label="Egenkapital (kr)" min={0} max={kjøpesum} step={10_000} value={egenkapital} setValue={setEgenkapital} />
            <SliderInput label="Rente (%)" min={1} max={12} step={0.05} value={rente} setValue={setRente} />
            <SliderInput label="Nedbetalingstid (år)" min={5} max={30} step={1} value={lånetid} setValue={setLånetid} />
          </div>
          <div className="bg-white/80 rounded-2xl shadow-xl p-6">
            <SliderInput label="Utleieinntekt (kr/mnd)" min={0} max={500_000} step={500} value={leieinntekt} setValue={setLeieinntekt} />
            <SliderInput label="Felleskostnader (kr/mnd)" min={0} max={100_000} step={100} value={felleskostnader} setValue={setFelleskostnader} />
            <SliderInput label="Kommunale avgifter (kr/mnd)" min={0} max={30_000} step={50} value={kommunaleAvgifter} setValue={setKommunaleAvgifter} />
            <SliderInput label="Forsikring (kr/mnd)" min={0} max={20_000} step={50} value={forsikring} setValue={setForsikring} />
            <SliderInput label="Vedlikehold (kr/mnd)" min={0} max={20_000} step={50} value={vedlikehold} setValue={setVedlikehold} />
            <SliderInput label="Strøm (kr/mnd)" min={0} max={20_000} step={100} value={strøm} setValue={setStrøm} />
            <SliderInput label="Internett (kr/mnd)" min={0} max={10_000} step={50} value={internett} setValue={setInternett} />
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 mb-8 max-w-4xl mx-auto">
          <div className="bg-white/80 rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-brown-900 mb-4">Kjøp og finansiering</h3>
            <SliderInput label="Prisantydning (kr)" min={0} max={100_000_000} step={100_000} value={kjøpesum} setValue={setKjøpesum} />
            <SliderInput label="Egenkapital (kr)" min={0} max={kjøpesum} step={10_000} value={egenkapital} setValue={setEgenkapital} />
            <SliderInput label="Rente (%)" min={1} max={12} step={0.05} value={rente} setValue={setRente} />
            <SliderInput label="Nedbetalingstid (år)" min={5} max={30} step={1} value={lånetid} setValue={setLånetid} />
            
            <h3 className="font-bold text-brown-900 mb-4 mt-6">Løpende boligkostnader (kr/mnd)</h3>
            <SliderInput label="Felleskostnader" min={0} max={100_000} step={100} value={airbnbFelleskostnader} setValue={setAirbnbFelleskostnader} />
            <SliderInput label="Kommunale avgifter" min={0} max={30_000} step={50} value={airbnbKommunaleAvgifter} setValue={setAirbnbKommunaleAvgifter} />
            <SliderInput label="Forsikring" min={0} max={20_000} step={50} value={airbnbForsikring} setValue={setAirbnbForsikring} />
            <SliderInput label="Vedlikehold" min={0} max={20_000} step={50} value={airbnbVedlikehold} setValue={setAirbnbVedlikehold} />
            <SliderInput label="Strøm" min={0} max={20_000} step={100} value={airbnbStrøm} setValue={setAirbnbStrøm} />
            <SliderInput label="Internett" min={0} max={10_000} step={50} value={airbnbInternett} setValue={setAirbnbInternett} />
          </div>
          <div className="bg-white/80 rounded-2xl shadow-xl p-6 flex flex-col gap-2">
            <h3 className="font-bold text-brown-900 mb-4">Korttidsutleie (Airbnb)</h3>
            <label className="block font-semibold text-brown-900 mb-2">Velg by <InfoTooltip text="Autofyller pris og utleiedager basert på by." /></label>
            <select className="border border-brown-200 bg-white rounded-full px-6 py-3 text-lg shadow focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 appearance-none mb-2" value={airbnbBy} onChange={e => setAirbnbBy(e.target.value)}>
              {airbnbKorttidsleieData.map((b: { by: string }) => <option key={b.by} value={b.by}>{b.by}</option>)}
            </select>
            <SliderInput label={<span>Snittpris per natt (kr) <InfoTooltip text="Gjennomsnittspris for valgt by. Kan overstyres." /></span>} min={0} max={10000} step={50} value={prisPerNatt} setValue={setPrisPerNatt} />
            <SliderInput label={<span>Antall utleide netter per år <InfoTooltip text="Gjennomsnitt for valgt by. Kan overstyres." /></span>} min={0} max={365} step={1} value={netterPerÅr} setValue={setNetterPerÅr} />
            <SliderInput label={<span>Airbnb-gebyr (%) <InfoTooltip text="Typisk 5%." /></span>} min={0} max={20} step={0.1} value={airbnbGebyr} setValue={setAirbnbGebyr} />
            <SliderInput label={<span>Rengjøringskostnad per booking (kr) <InfoTooltip text="Typisk 400 kr." /></span>} min={0} max={2000} step={50} value={rengjoringPerBooking} setValue={setRengjoringPerBooking} />
            <SliderInput label={<span>Snittlengde booking (netter) <InfoTooltip text="Antall netter per booking." /></span>} min={1} max={30} step={1} value={snittBookingLengde} setValue={setSnittBookingLengde} />
            <SliderInput label={<span>Antall bookinger <InfoTooltip text="Utregnes automatisk, kan overstyres." /></span>} min={0} max={365} step={1} value={antallBookinger} setValue={setAntallBookinger} />
            <SliderInput label={<span>Andre utgifter per år (kr) <InfoTooltip text="Andre faste utgifter utover standard boligkostnader." /></span>} min={0} max={200_000} step={500} value={andreUtgifterÅr} setValue={setAndreUtgifterÅr} />
          </div>
        </div>
      )}
      {/* Resultatboks for valgt modus */}
      {leiemodus === 'langtid' ? (
        <>
          <div className="flex justify-center mb-4">
            <label className="flex items-center space-x-2 text-brown-800">
              <input type="checkbox" checked={skatt} onChange={e => setSkatt(e.target.checked)} />
              <span>Beregn skatt på utleie (22% - typisk for sekundærbolig)</span>
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Brutto leieinntekt (mnd)</div>
              <div className="text-2xl font-bold">{formatKr(leieinntekt)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Totale utgifter (mnd)</div>
              <div className="text-2xl font-bold">{formatKr(totaleKostnader)}</div>
            </div>
            <div className={`rounded-xl shadow p-4 text-center font-bold ${nettoInntekt >= 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
              Netto leieinntekt (mnd)
              <div className="text-2xl">{formatKr(nettoInntekt)}</div>
            </div>
          </div>

          {/* Komplett lønnsomhetsanalyse for langtidsleie */}
          <div className="bg-white/90 rounded-2xl shadow-xl p-6 max-w-4xl mx-auto mb-6">
            <h3 className="font-bold text-brown-900 mb-4 text-center text-xl">Komplett lønnsomhetsanalyse</h3>
            
            {/* Månedlige kostnader */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-brown-800 mb-3">Månedlige boligkostnader</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Lånekostnad:</span>
                    <span className="font-semibold">{formatKr(terminbeløp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Felleskostnader:</span>
                    <span className="font-semibold">{formatKr(felleskostnader)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kommunale avgifter:</span>
                    <span className="font-semibold">{formatKr(kommunaleAvgifter)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Forsikring:</span>
                    <span className="font-semibold">{formatKr(forsikring)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vedlikehold:</span>
                    <span className="font-semibold">{formatKr(vedlikehold)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strøm:</span>
                    <span className="font-semibold">{formatKr(strøm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Internett:</span>
                    <span className="font-semibold">{formatKr(internett)}</span>
                  </div>
                  <hr className="border-brown-200" />
                  <div className="flex justify-between font-bold">
                    <span>Sum månedlige kostnader:</span>
                    <span>{formatKr(totaleKostnader)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-brown-800 mb-3">Utleieinntekter</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Brutto utleie (mnd):</span>
                    <span className="font-semibold">{formatKr(leieinntekt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Brutto utleie (år):</span>
                    <span className="font-semibold">{formatKr(leieinntekt * 12)}</span>
                  </div>
                  {skatt && (
                    <div className="flex justify-between">
                      <span>- Skatt (22%):</span>
                      <span className="font-semibold">-{formatKr((leieinntekt * 12) * 0.22)}</span>
                    </div>
                  )}
                  <hr className="border-brown-200" />
                  <div className="flex justify-between font-bold">
                    <span>Netto utleie (mnd):</span>
                    <span>{formatKr(nettoInntekt)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Netto utleie (år):</span>
                    <span>{formatKr(langtidÅrligNettoEtterKostnader)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Totalresultat */}
            <div className="bg-gradient-to-r from-brown-50 to-brown-100 rounded-xl p-4 border border-brown-200">
              <h4 className="font-bold text-brown-900 mb-3 text-center">Netto resultat etter alle kostnader</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className={`rounded-lg p-3 ${nettoInntekt >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="text-xs mb-1">Månedlig netto</div>
                  <div className="text-xl font-bold">{formatKr(nettoInntekt)}</div>
                </div>
                <div className={`rounded-lg p-3 ${langtidÅrligNettoEtterKostnader >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="text-xs mb-1">Årlig netto</div>
                  <div className="text-xl font-bold">{formatKr(langtidÅrligNettoEtterKostnader)}</div>
                </div>
                <div className="bg-blue-100 text-blue-800 rounded-lg p-3">
                  <div className="text-xs mb-1">Total yield</div>
                  <div className="text-xl font-bold">{isNaN(langtidTotalYield) ? "0" : langtidTotalYield.toFixed(2)}%</div>
                </div>
              </div>
              
              <div className="mt-4 text-center text-brown-800 flex flex-col md:flex-row gap-2 items-center justify-center">
                <YieldIndicator value={langtidTotalYield} />
                <span>
                  <b>Total direkteavkastning:</b>{" "}
                  <span className={langtidTotalYield >= 0 ? "text-green-700" : "text-red-700"}>
                    {isNaN(langtidTotalYield) ? "0" : langtidTotalYield.toFixed(2)}% per år
                  </span>
                </span>
                <span className="hidden md:inline px-2">|</span>
                <span>
                  <b>Avkastning på egenkapital:</b>{" "}
                  <span className={langtidAvkastningEK >= 0 ? "text-green-700" : "text-red-700"}>
                    {isNaN(langtidAvkastningEK) ? "0" : langtidAvkastningEK.toFixed(2)}% per år
                  </span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-brown-600 text-center mt-4">
            Kalkulatoren gir et forenklet estimat. Utleieinntekt kan være skattepliktig. Se <a href="https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/" target="_blank" className="underline">skatteetaten.no</a>
          </p>
        </>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <label className="flex items-center space-x-2 text-brown-800">
              <input type="checkbox" checked={airbnbSkatt} onChange={e => setAirbnbSkatt(e.target.checked)} />
              <span>Beregn skatt på utleie (22% - korttidsutleie er skattepliktig fra første krone)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Brutto leieinntekt (år)</div>
              <div className="text-2xl font-bold">{formatKr(bruttoLeie)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Netto utleieinntekt (år)</div>
              <div className="text-2xl font-bold">{formatKr(nettoAirbnb)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Månedsbeløp</div>
              <div className="text-2xl font-bold">{formatKr(airbnbMnd)}</div>
            </div>
          </div>

          {/* Totalkostnadsoversikt */}
          <div className="bg-white/90 rounded-2xl shadow-xl p-6 max-w-4xl mx-auto mb-6">
            <h3 className="font-bold text-brown-900 mb-4 text-center text-xl">Komplett lønnsomhetsanalyse</h3>
            
            {/* Månedlige kostnader */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-brown-800 mb-3">Månedlige boligkostnader</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Lånekostnad:</span>
                    <span className="font-semibold">{formatKr(terminbeløp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Felleskostnader:</span>
                    <span className="font-semibold">{formatKr(airbnbFelleskostnader)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kommunale avgifter:</span>
                    <span className="font-semibold">{formatKr(airbnbKommunaleAvgifter)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Forsikring:</span>
                    <span className="font-semibold">{formatKr(airbnbForsikring)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vedlikehold:</span>
                    <span className="font-semibold">{formatKr(airbnbVedlikehold)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strøm:</span>
                    <span className="font-semibold">{formatKr(airbnbStrøm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Internett:</span>
                    <span className="font-semibold">{formatKr(airbnbInternett)}</span>
                  </div>
                  <hr className="border-brown-200" />
                  <div className="flex justify-between font-bold">
                    <span>Sum månedlige kostnader:</span>
                    <span>{formatKr(airbnbTotaleBoligkostnader)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-brown-800 mb-3">Utleieinntekter</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Brutto utleie (år):</span>
                    <span className="font-semibold">{formatKr(bruttoLeie)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Airbnb gebyr:</span>
                    <span className="font-semibold">-{formatKr(airbnbGebyrKr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Rengjøring:</span>
                    <span className="font-semibold">-{formatKr(rengjoringKr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Andre utgifter:</span>
                    <span className="font-semibold">-{formatKr(andreUtgifterÅr)}</span>
                  </div>
                  {airbnbSkatt && (
                    <div className="flex justify-between">
                      <span>- Skatt (22%):</span>
                      <span className="font-semibold">-{formatKr((bruttoLeie - airbnbGebyrKr - rengjoringKr - andreUtgifterÅr) * 0.22)}</span>
                    </div>
                  )}
                  <hr className="border-brown-200" />
                  <div className="flex justify-between font-bold">
                    <span>Netto utleie (år):</span>
                    <span>{formatKr(nettoAirbnb)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Per måned:</span>
                    <span>{formatKr(airbnbMnd)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Totalresultat */}
            <div className="bg-gradient-to-r from-brown-50 to-brown-100 rounded-xl p-4 border border-brown-200">
              <h4 className="font-bold text-brown-900 mb-3 text-center">Netto månedlig resultat etter alle kostnader</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className={`rounded-lg p-3 ${airbnbNettoEtterAlleKostnader >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="text-xs mb-1">Månedlig netto</div>
                  <div className="text-xl font-bold">{formatKr(airbnbNettoEtterAlleKostnader)}</div>
                </div>
                <div className={`rounded-lg p-3 ${airbnbÅrligNettoEtterKostnader >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="text-xs mb-1">Årlig netto</div>
                  <div className="text-xl font-bold">{formatKr(airbnbÅrligNettoEtterKostnader)}</div>
                </div>
                <div className="bg-blue-100 text-blue-800 rounded-lg p-3">
                  <div className="text-xs mb-1">Total yield</div>
                  <div className="text-xl font-bold">{isNaN(airbnbTotalYield) ? "0" : airbnbTotalYield.toFixed(2)}%</div>
                </div>
              </div>
              
              <div className="mt-4 text-center text-brown-800 flex flex-col md:flex-row gap-2 items-center justify-center">
                <YieldIndicator value={airbnbTotalYield} />
                <span>
                  <b>Total direkteavkastning:</b>{" "}
                  <span className={airbnbTotalYield >= 0 ? "text-green-700" : "text-red-700"}>
                    {isNaN(airbnbTotalYield) ? "0" : airbnbTotalYield.toFixed(2)}% per år
                  </span>
                </span>
                <span className="hidden md:inline px-2">|</span>
                <span>
                  <b>Avkastning på egenkapital:</b>{" "}
                  <span className={airbnbAvkastningEK >= 0 ? "text-green-700" : "text-red-700"}>
                    {isNaN(airbnbAvkastningEK) ? "0" : airbnbAvkastningEK.toFixed(2)}% per år
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-brown-800 text-sm max-w-2xl mx-auto mb-4">
            <b>Skatt på korttidsutleie:</b> Inntekt fra korttidsutleie (Airbnb) er skattepliktig fra første krone hvis du leier ut hele boligen. Les mer hos <a href="https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/" target="_blank" className="underline">skatteetaten.no</a>
          </div>
        </>
      )}
    </div>
  );
}
