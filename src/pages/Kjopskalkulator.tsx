import * as React from "react";
import { useState, useEffect } from "react";
import SliderInput from "../components/SliderInput";
import { useBolig } from "../context/BoligContext";
import { Info } from "lucide-react";
import jsPDF from "jspdf";

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

// Bruk én fast sats for strøm per m2 per år
const stromprisPerM2Aar = 250; // kr per m2 per år (2024 gjennomsnitt)

function enkelStromBeregning(areal: number): number {
  return Math.round((areal || 0) * stromprisPerM2Aar / 12);
}

// Oppdater samlet egenkapitalbehov for borettslag
type EgenkapitalBeregning = {
  belop: number;
  tekst: string;
};
function beregnEgenkapital(boligtype: string, pris: number, fgjeld: number): EgenkapitalBeregning {
  if (boligtype === "borettslag") {
    const total = Math.round(0.1 * ((pris || 0) + (fgjeld || 0)));
    return {
      belop: total,
      tekst: "10% av (prisantydning + fellesgjeld) kreves som egenkapital for borettslag."
    };
  }
  const total = Math.round(0.1 * (pris || 0));
  return {
    belop: total,
    tekst: "Minimum 10% av prisantydning kreves som egenkapital for boliglån i Norge."
  };
}

export default function Kjopskalkulator() {
  const { boliger, addBolig } = useBolig();
  const [valgtBoligId, setValgtBoligId] = useState<string>("");
  const [boligtype, setBoligtype] = useState<string>("selveier");
  const [prisantydning, setPrisantydning] = useState<number | undefined>(undefined);
  const [fellesgjeld, setFellesgjeld] = useState<number | undefined>(undefined);
  const [egenkapital, setEgenkapital] = useState<number | undefined>(undefined);
  const [egenkapitalManuelt, setEgenkapitalManuelt] = useState<boolean>(false);
  const [forsikring, setForsikring] = useState<number>(500); // default 500 kr/mnd
  const [eiendomsskatt, setEiendomsskatt] = useState<number>(0); // default 0 kr/mnd
  const [termingebyr, setTermingebyr] = useState<number>(60); // default 60 kr/mnd
  const [felleskostnader, setFelleskostnader] = useState<number>(0);
  const [strom, setStrom] = useState<number>(0);
  const [stromManuelt, setStromManuelt] = useState<boolean>(false);
  const [kommunaleAvg, setKommunaleAvg] = useState<number>(12000); // default 12 000 kr/år
  const [andreOmkostninger, setAndreOmkostninger] = useState<number>(0); // engangskostnad
  const [andreUtgifter, setAndreUtgifter] = useState<number>(0);
  const [bruksareal, setBruksareal] = useState<number>(50); // default 50 kvm
  const [epost, setEpost] = useState<string>("");

  const egenkapitalInfo = beregnEgenkapital(boligtype, prisantydning || 0, fellesgjeld || 0);

  useEffect(() => {
    if (!valgtBoligId) return;
    const bolig = boliger.find(b => b.id === valgtBoligId);
    if (!bolig) return;
    setPrisantydning(Number(bolig.pris) || undefined);
    setFellesgjeld(Number(bolig.fellesgjeld) || Number(bolig.fellesgjeld) === 0 ? Number(bolig.fellesgjeld) : undefined);
    setFelleskostnader(Number(bolig.felleskostnader) || 0);
    setEiendomsskatt(Number(bolig.eiendomsskatt) || 0);
    setBruksareal(Number(bolig.bruksareal) || 50);
    setKommunaleAvg(Number(bolig.kommunaleAvg) || 12000);
    setStromManuelt(false);
    setStrom(enkelStromBeregning(Number(bolig.bruksareal) || 50));
    setEgenkapitalManuelt(false);
  }, [valgtBoligId, boliger]);

  useEffect(() => {
    setStromManuelt(false);
  }, [boligtype]);

  useEffect(() => {
    if (!stromManuelt) {
      setStrom(enkelStromBeregning(bruksareal));
    }
    // eslint-disable-next-line
  }, [bruksareal, stromManuelt]);

  useEffect(() => {
    if (!egenkapitalManuelt) {
      setEgenkapital(egenkapitalInfo.belop);
    }
    // eslint-disable-next-line
  }, [prisantydning, fellesgjeld, boligtype, egenkapitalInfo.belop]);

  const dokumentavgift = boligtype === "selveier" && prisantydning ? prisantydning * 0.025 : 0;
  const tinglysningSkjote = prisantydning ? 585 : 0;
  const tinglysningPant = prisantydning ? 480 : 0;
  const totalKjopskost =
    (prisantydning || 0) +
    (boligtype !== "selveier" ? (fellesgjeld || 0) : 0) +
    dokumentavgift +
    tinglysningSkjote +
    tinglysningPant +
    andreOmkostninger;

  const [rente, setRente] = useState<number>(5.5); // 5,5% nominell
  const nedbetaling = 25; // år
  const laan = prisantydning && egenkapital !== undefined ? prisantydning - egenkapital : 0;
  const mndRente = rente / 100 / 12;
  const terminer = nedbetaling * 12;
  const terminbelop = laan > 0 && mndRente > 0
    ? (laan * mndRente) / (1 - Math.pow(1 + mndRente, -terminer))
    : 0;
  const felles = felleskostnader || 0;
  const mndForsikring = forsikring || 0;
  const mndEiendomsskatt = eiendomsskatt ? Math.round(eiendomsskatt / 12) : 0;
  const mndTermingebyr = termingebyr || 0;
  const mndStrom = strom || 0;
  const mndKommunaleAvg = kommunaleAvg ? Math.round(kommunaleAvg / 12) : 0;
  const mndAndreUtgifter = andreUtgifter || 0;
  const estimertMndTotalkost = terminbelop + felles + mndForsikring + mndTermingebyr + mndStrom + mndKommunaleAvg + mndAndreUtgifter;

  // PDF-eksport
  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Kjøpskostnadskalkulator", 10, 15);
    doc.setFontSize(12);
    doc.text(`Boligtype: ${boligtype}`, 10, 30);
    doc.text(`Prisantydning: ${prisantydning?.toLocaleString("no-NO")} kr`, 10, 40);
    if (boligtype !== "selveier") doc.text(`Fellesgjeld: ${fellesgjeld?.toLocaleString("no-NO")} kr`, 10, 50);
    doc.text(`Egenkapital: ${egenkapital?.toLocaleString("no-NO")} kr`, 10, 60);
    doc.text(`Felleskostnader: ${felleskostnader.toLocaleString("no-NO")} kr/mnd`, 10, 70);
    doc.text(`Tinglysingsgebyr hjemmel: ${tinglysningSkjote} kr`, 10, 80);
    doc.text(`Tinglysingsgebyr pant: ${tinglysningPant} kr`, 10, 90);
    if (boligtype === "selveier") doc.text(`Dokumentavgift: ${dokumentavgift.toLocaleString("no-NO")} kr`, 10, 100);
    doc.text(`Samlet kjøpskostnad: ${totalKjopskost.toLocaleString("no-NO")} kr`, 10, 110);
    doc.text(`Samlet egenkapitalbehov: ${egenkapitalInfo.belop.toLocaleString("no-NO")} kr`, 10, 120);
    doc.text(`Månedskostnad: ${estimertMndTotalkost.toLocaleString("no-NO")} kr/mnd`, 10, 130);
    doc.save("kjopskalkyle.pdf");
  }

  async function handleSendEmail() {
    if (!epost || !epost.includes("@")) return;
    // Generer PDF med jsPDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Kjøpskostnadskalkulator", 10, 15);
    doc.setFontSize(12);
    doc.text(`Boligtype: ${boligtype}`, 10, 30);
    doc.text(`Prisantydning: ${prisantydning?.toLocaleString("no-NO")} kr`, 10, 40);
    if (boligtype !== "selveier") doc.text(`Fellesgjeld: ${fellesgjeld?.toLocaleString("no-NO")} kr`, 10, 50);
    doc.text(`Egenkapital: ${egenkapital?.toLocaleString("no-NO")} kr`, 10, 60);
    doc.text(`Felleskostnader: ${felleskostnader.toLocaleString("no-NO")} kr/mnd`, 10, 70);
    doc.text(`Tinglysingsgebyr hjemmel: ${tinglysningSkjote} kr`, 10, 80);
    doc.text(`Tinglysingsgebyr pant: ${tinglysningPant} kr`, 10, 90);
    if (boligtype === "selveier") doc.text(`Dokumentavgift: ${dokumentavgift.toLocaleString("no-NO")} kr`, 10, 100);
    doc.text(`Andre omkostninger: ${andreOmkostninger.toLocaleString("no-NO")} kr`, 10, 105);
    doc.text(`Samlet kjøpskostnad: ${totalKjopskost.toLocaleString("no-NO")} kr`, 10, 110);
    doc.text(`Samlet egenkapitalbehov: ${egenkapitalInfo.belop.toLocaleString("no-NO")} kr`, 10, 120);
    doc.text(`Månedskostnad: ${estimertMndTotalkost.toLocaleString("no-NO")} kr/mnd`, 10, 130);
    // Lag Blob
    const pdfBlob = doc.output("blob");
    // Send til backend
    const formData = new FormData();
    formData.append("email", epost);
    formData.append("pdf", pdfBlob, "kjopskalkyle.pdf");
    try {
      const res = await fetch("/api/send-kjopskalkyle", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        alert("Kalkyle sendt til e-post!");
      } else {
        alert("Kunne ikke sende e-post. Prøv igjen senere.");
      }
    } catch {
      alert("Teknisk feil ved sending av e-post.");
    }
  }

  // Import fra FINN-scraper (JSON)
  function handleImportBoliger(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          data.forEach(bolig => addBolig(bolig));
        } else if (typeof data === "object") {
          addBolig(data);
        }
        alert("Bolig(er) importert!");
      } catch {
        alert("Kunne ikke importere boliger. Sjekk at filen er gyldig JSON.");
      }
    };
    reader.readAsText(file);
  }

  function handleStromChange(v: number) {
    setStrom(v);
    setStromManuelt(true);
  }

  function handleBruksarealChange(v: number) {
    setBruksareal(v);
    setStromManuelt(false);
  }

  function handleEgenkapitalChange(v: number) {
    setEgenkapital(v);
    setEgenkapitalManuelt(true);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-10 w-full max-w-2xl mt-10 flex flex-col items-center">
        <div className="w-full flex flex-col sm:flex-row justify-end items-center gap-2 mb-2">
          <button onClick={handleExportPDF} className="rounded-full px-4 py-2 bg-brown-500 text-white font-semibold hover:bg-brown-600 transition shadow">
            Eksporter utregningene til PDF
          </button>
          <input
            type="email"
            placeholder="Din e-post"
            value={epost}
            onChange={e => setEpost(e.target.value)}
            className="rounded-full px-4 py-2 border border-brown-300 focus:ring-2 focus:ring-brown-400 focus:outline-none text-brown-900 shadow"
            style={{ minWidth: 180 }}
          />
          <button
            onClick={handleSendEmail}
            className="rounded-full px-4 py-2 bg-brown-400 text-white font-semibold hover:bg-brown-500 transition shadow"
            disabled={!epost || !epost.includes("@")}
          >
            Send til e-post
          </button>
        </div>
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">
          Kjøpskostnadskalkulator
        </h2>
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
              <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-brown-400">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        )}
        <div className="w-full max-w-xl mx-auto mb-4">
          <label className="block font-semibold text-brown-900 mb-2">
            Boligtype <Tooltip text="Velg om boligen er selveier, borettslag eller sameie. Dette påvirker hvilke kostnader som gjelder." />
          </label>
          <select
            className="border border-brown-200 bg-white rounded-full px-6 py-3 text-lg shadow focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 appearance-none"
            value={boligtype}
            onChange={e => setBoligtype(e.target.value)}
          >
            <option value="selveier">Selveier</option>
            <option value="borettslag">Borettslag</option>
            <option value="sameie">Sameie</option>
          </select>
        </div>
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
            label={<span>Fellesgjeld (kr) <Tooltip text="Andel av boligens gjeld som følger med kjøpet. Gjelder kun borettslag/sameie." /></span>}
            min={0}
            max={20_000_000}
            step={10_000}
            value={fellesgjeld || 0}
            setValue={(v: number) => setFellesgjeld(v === 0 ? undefined : v)}
            disabled={boligtype === "selveier"}
          />
          <SliderInput
            label={<span>Egenkapital (kr) <Tooltip text="Egenkapitalen du stiller med. Minimum 10% av prisantydning kreves for boliglån." /></span>}
            min={egenkapitalInfo.belop}
            max={prisantydning || 0}
            step={10_000}
            value={egenkapital ?? 0}
            setValue={handleEgenkapitalChange}
          />
          <SliderInput
            label={<span>Felleskostnader (kr/mnd) <Tooltip text="Månedlige kostnader til drift, vedlikehold og tjenester i sameiet/borettslaget. Oppgis i boligannonsen." /></span>}
            min={0}
            max={20000}
            step={100}
            value={felleskostnader}
            setValue={setFelleskostnader}
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
            label={<span>Bruksareal (kvm) <Tooltip text="Boligens bruksareal. Brukes til å beregne strøm. Hentes fra FINN hvis mulig." /></span>}
            min={10}
            max={500}
            step={1}
            value={bruksareal}
            setValue={handleBruksarealChange}
          />
          <SliderInput
            label={<span>Strøm (kr/mnd) <Tooltip text={`Basert på ${stromprisPerM2Aar} kr/m²/år. Endre hvis du har bedre tall.`} /></span>}
            min={0}
            max={10000}
            step={50}
            value={mndStrom}
            setValue={handleStromChange}
          />
          <SliderInput
            label={<span>Kommunale avgifter (kr/år) <Tooltip text="Årlige avgifter til kommunen. Standard: 12 000 kr/år. Gjelder ikke borettslag." /></span>}
            min={0}
            max={40000}
            step={500}
            value={kommunaleAvg}
            setValue={setKommunaleAvg}
            disabled={boligtype === "borettslag"}
          />
          <SliderInput
            label={<span>Andre omkostninger ved kjøp (kr) <Tooltip text="Andre engangskostnader ved kjøp, f.eks. gebyrer til megler, bank, takstmann, etc. Valgfritt." /></span>}
            min={0}
            max={200000}
            step={1000}
            value={andreOmkostninger}
            setValue={setAndreOmkostninger}
          />
          <SliderInput
            label={<span>Andre utgifter (kr/mnd) <Tooltip text="Andre faste utgifter, f.eks. internett, TV, vaktmester, etc. Valgfritt." /></span>}
            min={0}
            max={10000}
            step={100}
            value={andreUtgifter}
            setValue={setAndreUtgifter}
          />
          <SliderInput
            label={<span>Rente (%) <Tooltip text="Simuler hvordan endret rente påvirker månedskostnaden. Standard: 5,5%." /></span>}
            min={1}
            max={10}
            step={0.1}
            value={rente}
            setValue={setRente}
          />
        </form>
        <div className="w-full text-brown-900 font-bold text-xl text-center mb-2">
          Totale kjøpskostnader: {prisantydning || fellesgjeld ? totalKjopskost.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}
        </div>
        <ul className="text-brown-800 text-sm mb-1">
          <li>Dokumentavgift (2,5% av prisantydning): {boligtype === "selveier" && prisantydning ? dokumentavgift.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
          <li>Tinglysingsgebyr hjemmel: {prisantydning ? tinglysningSkjote + " kr" : "—"} <Tooltip text="Gebyr for å tinglyse hjemmelsovergang (eierskifte) hos Kartverket." /></li>
          <li>Tinglysingsgebyr pant: {prisantydning ? tinglysningPant + " kr" : "—"} <Tooltip text="Gebyr for å tinglyse pantedokument (lån) hos Kartverket." /></li>
        </ul>
        <div className="w-full text-brown-800 text-base text-center mb-2">
          Samlet egenkapitalbehov: {egenkapitalInfo.belop > 0 ? egenkapitalInfo.belop.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}
          <Tooltip text={egenkapitalInfo.tekst} />
        </div>
        <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 mt-4 mb-2 text-center">
          <div className="text-brown-900 font-bold text-lg mb-1">Du må betale dette hver måned:</div>
          <div className="text-2xl font-seriflogo text-green-800 mb-2">{estimertMndTotalkost > 0 ? estimertMndTotalkost.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr/mnd" : "—"}</div>
          <ul className="text-brown-800 text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-left max-w-xl mx-auto">
            <li>Lånekostnad: {terminbelop > 0 ? terminbelop.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"} <Tooltip text="Lånekostnad er beregnet med annuitetslån, valgt rente og 25 års nedbetalingstid. Formelen: (lån * mndRente) / (1 - (1 + mndRente)^-terminer)." /></li>
            <li>Felleskostnader: {felles > 0 ? felles.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
            <li>Forsikring: {mndForsikring > 0 ? mndForsikring.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
            <li>Termingebyr: {mndTermingebyr > 0 ? mndTermingebyr.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
            <li>Strøm: {mndStrom > 0 ? mndStrom.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
            <li>Kommunale avgifter: {mndKommunaleAvg > 0 ? mndKommunaleAvg.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
            <li>Andre utgifter: {mndAndreUtgifter > 0 ? mndAndreUtgifter.toLocaleString("no-NO", {maximumFractionDigits: 0}) + " kr" : "—"}</li>
          </ul>
        </div>
        <div className="w-full text-xs text-brown-500 mt-2">
          <b>Selveier:</b> Du eier boligen selv. Dokumentavgift (2,5%) og tinglysingsgebyr gjelder. Ingen fellesgjeld.<br />
          <b>Borettslag:</b> Du kjøper andel i et lag. Ingen dokumentavgift, men fellesgjeld og felleskostnader gjelder.<br />
          <b>Sameie:</b> Ligner selveier, men kan ha fellesgjeld. Dokumentavgift gjelder.
        </div>
      </div>
    </div>
  );
}
