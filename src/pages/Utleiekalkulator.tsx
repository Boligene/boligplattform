import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { useBolig } from "../context/BoligContext";
import SliderInput from "../components/SliderInput";

const COLORS = [
  "#A1723A", "#EBC49F", "#F8A488", "#A3C9A8",
  "#B65D6C", "#C6C5B9", "#6A8D92"
];

const formatKr = (n: number) =>
  isNaN(n) ? "" : n.toLocaleString("no-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });

export default function Utleiekalkulator() {
  const { boliger } = useBolig();
  const [valgtBoligId, setValgtBoligId] = useState<string>("");

  // Kalkulator-felter
  const [kjøpesum, setKjøpesum] = useState(0);
  const [egenkapital, setEgenkapital] = useState(0);
  const [rente, setRente] = useState(1);
  const [lånetid, setLånetid] = useState(5);

  const [leieinntekt, setLeieinntekt] = useState(0);
  const [felleskostnader, setFelleskostnader] = useState(0);
  const [eiendomsskatt, setEiendomsskatt] = useState(0);
  const [forsikring, setForsikring] = useState(0);
  const [vedlikehold, setVedlikehold] = useState(0);
  const [strøm, setStrøm] = useState(0);
  const [internett, setInternett] = useState(0);
  const [skatt, setSkatt] = useState(false);

  // Autofyll felter når bolig velges
  useEffect(() => {
    if (!valgtBoligId) return;
    const bolig = boliger.find(b => b.id === valgtBoligId);
    if (!bolig) return;
    setKjøpesum(Number(bolig.pris) || 0);
    setFelleskostnader(Number(bolig.felleskostnader) || 0);
    // Her kan du fylle inn mer hvis du lagrer flere tall i context
    // f.eks. setLeieinntekt(bolig.leieinntekt || 0);
    // Andre felt må fylles manuelt av bruker
  }, [valgtBoligId, boliger]);

  useEffect(() => {
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
    eiendomsskatt +
    strøm +
    internett +
    forsikring +
    vedlikehold;

  let nettoInntekt = leieinntekt - totaleKostnader;
  if (skatt) nettoInntekt = nettoInntekt * 0.78; // 22% skatt

  const direkteavkastning = kjøpesum > 0 ? ((nettoInntekt * 12) / kjøpesum) * 100 : 0;
  const avkastningEK = egenkapital > 0 ? ((nettoInntekt * 12) / egenkapital) * 100 : 0;

  const grafData = [
    { navn: "Lånekostnad", verdi: Math.round(terminbeløp) },
    { navn: "Felleskostnader", verdi: felleskostnader },
    { navn: "Eiendomsskatt", verdi: eiendomsskatt },
    { navn: "Strøm", verdi: strøm },
    { navn: "Forsikring", verdi: forsikring },
    { navn: "Internett", verdi: internett },
    { navn: "Vedlikehold", verdi: vedlikehold },
  ];

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed py-8 px-2">
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
          <SliderInput label="Eiendomsskatt (kr/mnd)" min={0} max={30_000} step={50} value={eiendomsskatt} setValue={setEiendomsskatt} />
          <SliderInput label="Forsikring (kr/mnd)" min={0} max={20_000} step={50} value={forsikring} setValue={setForsikring} />
          <SliderInput label="Vedlikehold (kr/mnd)" min={0} max={20_000} step={50} value={vedlikehold} setValue={setVedlikehold} />
          <SliderInput label="Strøm (kr/mnd)" min={0} max={20_000} step={100} value={strøm} setValue={setStrøm} />
          <SliderInput label="Internett (kr/mnd)" min={0} max={10_000} step={50} value={internett} setValue={setInternett} />
        </div>
      </div>
      <div className="flex justify-center mb-4">
        <label className="flex items-center space-x-2 text-brown-800">
          <input type="checkbox" checked={skatt} onChange={e => setSkatt(e.target.checked)} />
          <span>Beregn skatt på utleie (22% - typisk for sekundærbolig)</span>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-brown-700 text-xs mb-1">Månedlig lånekostnad</div>
          <div className="text-2xl font-bold">{formatKr(terminbeløp)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-brown-700 text-xs mb-1">Totale utgifter</div>
          <div className="text-2xl font-bold">{formatKr(totaleKostnader)}</div>
        </div>
        <div className={`rounded-xl shadow p-4 text-center font-bold ${nettoInntekt >= 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          Netto leieinntekt
          <div className="text-2xl">{formatKr(nettoInntekt)}</div>
        </div>
      </div>
      <div className="mb-2 text-center text-brown-800 flex flex-col md:flex-row gap-2 items-center justify-center">
        <span>
          <b>Yield (direkteavkastning):</b>{" "}
          <span className={direkteavkastning >= 0 ? "text-green-700" : "text-red-700"}>
            {isNaN(direkteavkastning) ? "0" : direkteavkastning.toFixed(2)}% per år
          </span>
        </span>
        <span className="hidden md:inline px-2">|</span>
        <span>
          <b>Avkastning på egenkapital:</b>{" "}
          <span className={avkastningEK >= 0 ? "text-green-700" : "text-red-700"}>
            {isNaN(avkastningEK) ? "0" : avkastningEK.toFixed(2)}% per år
          </span>
        </span>
      </div>
      {/* Graf */}
      <div className="flex justify-center">
        <div className="bg-white/90 rounded-2xl shadow-md p-6 w-full max-w-xl">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={grafData}
                dataKey="verdi"
                nameKey="navn"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={3}
                isAnimationActive={false}
                label={false}
              >
                {grafData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatKr(value)} />
              <Legend layout="horizontal" align="center" verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-brown-600 text-center mt-4">
        Kalkulatoren gir et forenklet estimat. Utleieinntekt kan være skattepliktig. Se <a href="https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/" target="_blank" className="underline">skatteetaten.no</a>
      </p>
    </div>
  );
}
