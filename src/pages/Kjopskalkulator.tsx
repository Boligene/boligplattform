import React, { useState, useEffect } from "react";
import SliderInput from "../components/SliderInput";
import { useBolig } from "../context/BoligContext";
import { Info } from "lucide-react";

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-block align-middle ml-1">
      <Info className="w-4 h-4 text-brown-400 inline align-middle cursor-pointer" />
      <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-brown-200 rounded-lg shadow-lg p-3 text-xs text-brown-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none group-hover:pointer-events-auto transition">
        {text}
      </span>
    </span>
  );
}

export default function Kjopskalkulator() {
  const { boliger } = useBolig();
  const [valgtBoligId, setValgtBoligId] = useState<string>("");
  // Start med blanke felter
  const [prisantydning, setPrisantydning] = useState<number | undefined>(undefined);
  const [fellesgjeld, setFellesgjeld] = useState<number | undefined>(undefined);
  const [egenkapital, setEgenkapital] = useState<number | undefined>(undefined);
  const [forsikring, setForsikring] = useState<number>(500); // default 500 kr/mnd
  const [eiendomsskatt, setEiendomsskatt] = useState<number>(0); // default 0 kr/mnd
  const [termingebyr, setTermingebyr] = useState<number>(60); // default 60 kr/mnd
  const [felleskostnader, setFelleskostnader] = useState<number>(0);

  // Autofyll felter når bolig velges
  useEffect(() => {
    if (!valgtBoligId) return;
    const bolig = boliger.find(b => b.id === valgtBoligId);
    if (!bolig) return;
    setPrisantydning(Number(bolig.pris) || undefined);
    setFellesgjeld(Number(bolig.fellesgjeld) || Number(bolig.fellesgjeld) === 0 ? Number(bolig.fellesgjeld) : undefined);
    setFelleskostnader(Number(bolig.felleskostnader) || 0);
    setEiendomsskatt(Number(bolig.eiendomsskatt) || 0);
  }, [valgtBoligId, boliger]);

  // Statlige satser (per 2024)
  const dokumentavgift = prisantydning ? prisantydning * 0.025 : 0;
  const tinglysningSkjote = prisantydning ? 585 : 0;
  const tinglysningPant = prisantydning ? 480 : 0;
  const total =
    (prisantydning || 0) +
    (fellesgjeld || 0) +
    dokumentavgift +
    tinglysningSkjote +
    tinglysningPant;

  // Egenkapital (min 10% av prisantydning)
  const minEgenkapital = prisantydning ? Math.round(prisantydning * 0.1) : 0;
  const valgtEgenkapital = egenkapital !== undefined ? egenkapital : minEgenkapital;
  const samletEgenkapitalbehov = dokumentavgift + tinglysningSkjote + tinglysningPant + (prisantydning ? prisantydning * 0.1 : 0);

  // Låneberegning
  const rente = 0.055; // 5,5% nominell
  const nedbetaling = 25; // år
  const laan = prisantydning && valgtEgenkapital !== undefined ? prisantydning - valgtEgenkapital : 0;
  const mndRente = rente / 12;
  const terminer = nedbetaling * 12;
  const terminbelop = laan > 0 && mndRente > 0
    ? (laan * mndRente) / (1 - Math.pow(1 + mndRente, -terminer))
    : 0;
  const felles = felleskostnader || 0;
  const mndForsikring = forsikring || 0;
  const mndEiendomsskatt = eiendomsskatt || 0;
  const mndTermingebyr = termingebyr || 0;
  const estimertMndTotalkost = terminbelop + felles + mndForsikring + mndTermingebyr + mndEiendomsskatt;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">
          Kjøpskostnadskalkulator
        </h2>
        {/* Dropdown for å velge bolig */}
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
        <form className="w-full flex flex-col gap-4 mb-8">
          <SliderInput
            label={<span>Prisantydning (kr) <Tooltip text="Boligens annonserte pris. Danner grunnlag for dokumentavgift og egenkapital." /></span>}
            min={0}
            max={100_000_000}
            step={100_000}
            value={prisantydning || 0}
            setValue={(v: number) => setPrisantydning(v === 0 ? undefined : v)}
          />
          <SliderInput
            label={<span>Fellesgjeld (kr) <Tooltip text="Andel av boligens gjeld som følger med kjøpet. Legges til kjøpesummen." /></span>}
            min={0}
            max={20_000_000}
            step={10_000}
            value={fellesgjeld || 0}
            setValue={(v: number) => setFellesgjeld(v === 0 ? undefined : v)}
          />
          <SliderInput
            label={<span>Egenkapital (kr) <Tooltip text="Egenkapitalen du stiller med. Minimum 10% av prisantydning kreves for boliglån." /></span>}
            min={minEgenkapital}
            max={prisantydning || 0}
            step={10_000}
            value={valgtEgenkapital}
            setValue={(v: number) => setEgenkapital(v)}
          />
          <SliderInput
            label={<span>Eiendomsskatt (kr/år) <Tooltip text="Årlig eiendomsskatt. Sjekk med kommunen om boligen har eiendomsskatt." /></span>}
            min={0}
            max={30000}
            step={100}
            value={eiendomsskatt}
            setValue={setEiendomsskatt}
          />
          <SliderInput
            label={<span>Termingebyr (kr/mnd) <Tooltip text="Gebyr banken tar per termin (måned)." /></span>}
            min={0}
            max={200}
            step={5}
            value={termingebyr}
            setValue={setTermingebyr}
          />
          <SliderInput
            label={<span>Forsikring (kr/mnd) <Tooltip text="Estimert månedlig boligforsikring. Kan variere avhengig av boligtype og dekning." /></span>}
            min={0}
            max={5000}
            step={50}
            value={forsikring}
            setValue={setForsikring}
          />
          <SliderInput
            label={<span>Felleskostnader (kr/mnd) <Tooltip text="Månedlige kostnader til drift, vedlikehold og tjenester i sameiet/borettslaget. Oppgis i boligannonsen." /></span>}
            min={0}
            max={20000}
            step={100}
            value={felleskostnader}
            setValue={setFelleskostnader}
          />
        </form>
        <div className="w-full text-brown-900 font-bold text-xl text-center mb-2">
          Totale kjøpskostnader: {prisantydning || fellesgjeld ? total.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}
        </div>
        <ul className="text-brown-800 text-sm mb-1">
          <li>Dokumentavgift (2,5% av prisantydning): {prisantydning ? dokumentavgift.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
          <li>Tinglysingsgebyr hjemmel: {prisantydning ? tinglysningSkjote + " kr" : "—"} <Tooltip text="Gebyr for å tinglyse hjemmelsovergang (eierskifte) hos Kartverket." /></li>
          <li>Tinglysingsgebyr pant: {prisantydning ? tinglysningPant + " kr" : "—"} <Tooltip text="Gebyr for å tinglyse pantedokument (lån) hos Kartverket." /></li>
        </ul>
        <div className="w-full text-brown-800 text-base text-center mb-2">
          Samlet egenkapitalbehov: {samletEgenkapitalbehov > 0 ? samletEgenkapitalbehov.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}
          <Tooltip text="Summen du må ha spart opp: 10% egenkapital + dokumentavgift + tinglysingsgebyrer." />
        </div>
        <div className="w-full text-brown-900 font-bold text-lg text-center mt-4">
          Estimert månedlig totalkostnad: {estimertMndTotalkost > 0 ? estimertMndTotalkost.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr/mnd" : "—"}
          <Tooltip text="Summen av lånekostnad, felleskostnader, forsikring, termingebyr og eiendomsskatt (delt på 12). Nedbetalingstid 25 år, rente 5,5%." />
        </div>
      </div>
    </div>
  );
}
