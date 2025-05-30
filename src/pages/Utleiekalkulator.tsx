import * as React from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { useBolig } from "../context/BoligContext";
import SliderInput from "../components/SliderInput";
// @ts-ignore
import { airbnbKorttidsleieData } from '../data/airbnbKorttidsleieData.js';

const COLORS = [
  "#A1723A", "#EBC49F", "#F8A488", "#A3C9A8",
  "#B65D6C", "#C6C5B9", "#6A8D92"
];

const formatKr = (n: number) =>
  isNaN(n) ? "" : n.toLocaleString("no-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });

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
  const [eiendomsskatt, setEiendomsskatt] = React.useState(0);
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

  // Autofyll felter når bolig velges
  React.useEffect(() => {
    if (!valgtBoligId) return;
    const bolig = boliger.find(b => b.id === valgtBoligId);
    if (!bolig) return;
    setKjøpesum(Number(bolig.pris) || 0);
    setFelleskostnader(Number(bolig.felleskostnader) || 0);
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
  const nettoAirbnb = bruttoLeie - airbnbGebyrKr - rengjoringKr - andreUtgifterÅr;
  const airbnbMnd = nettoAirbnb / 12;
  const airbnbYield = kjøpesum > 0 ? (nettoAirbnb / kjøpesum) * 100 : 0;

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
            <SliderInput label="Eiendomsskatt (kr/mnd)" min={0} max={30_000} step={50} value={eiendomsskatt} setValue={setEiendomsskatt} />
            <SliderInput label="Forsikring (kr/mnd)" min={0} max={20_000} step={50} value={forsikring} setValue={setForsikring} />
            <SliderInput label="Vedlikehold (kr/mnd)" min={0} max={20_000} step={50} value={vedlikehold} setValue={setVedlikehold} />
            <SliderInput label="Strøm (kr/mnd)" min={0} max={20_000} step={100} value={strøm} setValue={setStrøm} />
            <SliderInput label="Internett (kr/mnd)" min={0} max={10_000} step={50} value={internett} setValue={setInternett} />
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 mb-8 max-w-4xl mx-auto">
          <div className="bg-white/80 rounded-2xl shadow-xl p-6">
            <SliderInput label="Prisantydning (kr)" min={0} max={100_000_000} step={100_000} value={kjøpesum} setValue={setKjøpesum} />
            <SliderInput label="Egenkapital (kr)" min={0} max={kjøpesum} step={10_000} value={egenkapital} setValue={setEgenkapital} />
            <SliderInput label="Rente (%)" min={1} max={12} step={0.05} value={rente} setValue={setRente} />
            <SliderInput label="Nedbetalingstid (år)" min={5} max={30} step={1} value={lånetid} setValue={setLånetid} />
          </div>
          <div className="bg-white/80 rounded-2xl shadow-xl p-6 flex flex-col gap-2">
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
            <SliderInput label={<span>Andre utgifter per år (kr) <InfoTooltip text="Andre faste utgifter, f.eks. strøm, internett." /></span>} min={0} max={200_000} step={500} value={andreUtgifterÅr} setValue={setAndreUtgifterÅr} />
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
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Brutto leieinntekt</div>
              <div className="text-2xl font-bold">{formatKr(bruttoLeie)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Netto utleieinntekt</div>
              <div className="text-2xl font-bold">{formatKr(nettoAirbnb)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-brown-700 text-xs mb-1">Est. månedlig inntekt</div>
              <div className="text-2xl font-bold">{formatKr(airbnbMnd)}</div>
            </div>
          </div>
          <div className="mb-2 text-center text-brown-800 flex flex-col md:flex-row gap-2 items-center justify-center">
            <YieldIndicator value={airbnbYield} />
            <span>
              <b>Yield (direkteavkastning):</b>{" "}
              <span className={airbnbYield >= 0 ? "text-green-700" : "text-red-700"}>
                {isNaN(airbnbYield) ? "0" : airbnbYield.toFixed(2)}% per år
              </span>
            </span>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-brown-800 text-sm max-w-2xl mx-auto mb-4">
            <b>Skatt på korttidsutleie:</b> Inntekt fra korttidsutleie (Airbnb) er skattepliktig fra første krone hvis du leier ut hele boligen. Les mer hos <a href="https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/bolig-eiendom-tomt/utleie/" target="_blank" className="underline">skatteetaten.no</a>
          </div>
          {/* Panel under kalkulatoren for oppsummering og by-sammenligning */}
          <div className="bg-white/90 rounded-2xl shadow-md p-6 w-full max-w-2xl mx-auto mt-6 mb-4">
            <div className="font-bold text-brown-900 mb-2">Oppsummering for {airbnbBy}</div>
            <div className="flex flex-col gap-1 text-brown-800 text-sm">
              <div>Årlig nettoinntekt: <b>{formatKr(nettoAirbnb)}</b></div>
              <div>Yield: <b>{airbnbYield.toFixed(2)}%</b></div>
              <div>Snitt yield for {airbnbBy}: <b>{(() => {
                const by = airbnbKorttidsleieData.find((b: any) => b.by === airbnbBy);
                return by && kjøpesum > 0 ? ((by.prisPerNatt * by.utleiedager) / kjøpesum * 100).toFixed(2) : '-';
              })()}%</b></div>
              <div className="text-xs text-brown-500">Tallene er basert på offentlige Airbnb-data for 2024.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
