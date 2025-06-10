/*
  Kilder:
  - Byggstart.no: https://www.byggstart.no/pris/pusse-opp (2024)
    - Bad: 25 000–35 000 kr/m² (snitt brukt: 30 000 kr/m²)
    - Kjøkken: 15 000–25 000 kr/m² (snitt brukt: 20 000 kr/m²)
    - Soverom: 6 000–10 000 kr/m² (snitt brukt: 8 000 kr/m²)
    - Stue: 6 000–10 000 kr/m² (snitt brukt: 8 000 kr/m²)
    - Gang: 6 000–10 000 kr/m² (snitt brukt: 8 000 kr/m²)
  - BN Bank: https://www.bnbank.no/bolig/hvor-mye-koster-det-a-pusse-opp/ (2024)
    - Overflateoppussing: ca. 4 000 kr/m²
    - Totaloppussing: ca. 14 000 kr/m²
  Prisene under er avrundet og tilpasset totaloppussing av middels standard.
*/

import React, { useState } from "react";
import { Hammer, Paintbrush, Bath, BedDouble, Sofa, DoorOpen, Info, Star } from "lucide-react";

const romIkoner: Record<string, React.ReactNode> = {
  "Kjøkken": <Hammer className="inline w-5 h-5 mr-1 text-brown-700" />, // Hammer for kjøkken
  "Bad": <Bath className="inline w-5 h-5 mr-1 text-blue-600" />, // Badekar for bad
  "Soverom": <BedDouble className="inline w-5 h-5 mr-1 text-green-700" />, // Seng for soverom
  "Stue": <Sofa className="inline w-5 h-5 mr-1 text-orange-700" />, // Sofa for stue
  "Gang": <DoorOpen className="inline w-5 h-5 mr-1 text-gray-500" /> // Dør for gang
};

const finishForklaring: Record<string, string> = {
  "Standard": "Enkel finish, rimelige materialer, standard løsninger.",
  "Middels": "Litt høyere kvalitet på materialer og utførelse, mer tilpassede løsninger.",
  "Eksklusiv": "Høy standard, eksklusive materialer, spesialtilpasset og designfokus."
};

export default function Oppussing() {
  // Oppdaterte snittpriser for 2024
  const romtyper = [
    { navn: "Kjøkken", prisPerM2: 20000 },
    { navn: "Bad", prisPerM2: 30000 },
    { navn: "Soverom", prisPerM2: 8000 },
    { navn: "Stue", prisPerM2: 8000 },
    { navn: "Gang", prisPerM2: 8000 }
  ];

  const finishOptions = [
    { label: "Standard", value: "standard", tillegg: 0 },
    { label: "Middels", value: "middels", tillegg: 0.15 },
    { label: "Eksklusiv", value: "eksklusiv", tillegg: 0.30 }
  ];

  // For inputfeltene
  const [rom, setRom] = useState(romtyper[0].navn);
  const [areal, setAreal] = useState(0);
  const [finish, setFinish] = useState("standard");
  // Liste over alle rom lagt til
  const [romListe, setRomListe] = useState<{
    navn: string;
    areal: number;
    prisPerM2: number;
    finish: string;
    tillegg: number;
  }[]>([]);
  // Buffer for uforutsette kostnader
  const [buffer, setBuffer] = useState(false);
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);

  // Lagre kalkyle til localStorage
  const lagreKalkyle = () => {
    localStorage.setItem("oppussing_kalkyle", JSON.stringify(romListe));
  };

  // Last inn kalkyle fra localStorage
  const lastInnKalkyle = () => {
    const lagret = localStorage.getItem("oppussing_kalkyle");
    if (lagret) {
      try {
        const parsed = JSON.parse(lagret);
        if (Array.isArray(parsed)) {
          setRomListe(parsed);
        }
      } catch {}
    }
  };

  // Send kalkyle til e-post (mailto)
  const sendEpost = () => {
    const body =
      "Oppussingskalkyle:%0A" +
      romListe.map(r => `- ${r.navn} (${r.areal} m², ${r.finish}): ${(r.areal * r.prisPerM2 * (1 + r.tillegg)).toLocaleString("no-NO")} kr`).join("%0A") +
      `%0A%0ATotalpris: ${totalPris.toLocaleString("no-NO")} kr` +
      (buffer ? `%0AMed buffer: ${totalMedBuffer.toLocaleString("no-NO")} kr` : "");
    window.location.href = `mailto:?subject=Oppussingskalkyle&body=${body}`;
  };

  // Last ned som PDF (bruker window.print for enkelhet)
  const lastNedPDF = () => {
    window.print();
  };

  // Legg til rom i listen
  const leggTilRom = (e: React.FormEvent) => {
    e.preventDefault();
    const valgt = romtyper.find(r => r.navn === rom) || romtyper[0];
    const valgtFinish = finishOptions.find(f => f.value === finish) || finishOptions[0];
    setRomListe(prev => [
      ...prev,
      {
        navn: valgt.navn,
        areal,
        prisPerM2: valgt.prisPerM2,
        finish: valgtFinish.label,
        tillegg: valgtFinish.tillegg
      }
    ]);
  };

  // Fjern rom fra listen
  const fjernRom = (index: number) => {
    setRomListe(prev => prev.filter((_, i) => i !== index));
  };

  // Kalkuler totalpris (med finish per rom)
  const totalPris = romListe.reduce(
    (sum, r) => sum + r.areal * r.prisPerM2 * (1 + r.tillegg),
    0
  );
  const totalMedBuffer = buffer ? Math.round(totalPris * 1.15) : totalPris;

  // For estimert pris på nåværende input
  const valgt = romtyper.find(r => r.navn === rom) || romtyper[0];
  const valgtFinish = finishOptions.find(f => f.value === finish) || finishOptions[0];
  const pris = valgt.prisPerM2 * areal * (1 + valgtFinish.tillegg);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">
          Oppussingskalkulator
        </h2>
        
        {/* Premium upgrade banner */}
        <div className="w-full mb-6 bg-gradient-to-r from-yellow-50 to-brown-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 rounded-full p-2">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brown-900">Oppgrader til Premium</h3>
                <p className="text-sm text-brown-700">Få detaljerte kostnadsoversikter, ROI-analyse og mer</p>
              </div>
            </div>
            <a
              href="/oppussing-premium"
              className="bg-brown-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-brown-800 transition text-sm"
            >
              Prøv Premium
            </a>
          </div>
        </div>

        {/* Input-seksjon */}
        <div className="w-full border border-brown-200 rounded-2xl bg-white/90 p-6 mb-6">
          <form className="flex flex-col gap-4" onSubmit={leggTilRom}>
            <label>
              Romtype
              <select
                value={rom}
                onChange={e => setRom(e.target.value)}
                className="w-full rounded-full px-5 py-3 border border-brown-200 text-lg focus:outline-none focus:ring-2 focus:ring-brown-400 bg-white shadow transition mt-1 appearance-none"
              >
                {romtyper.map(r => (
                  <option key={r.navn} value={r.navn}>
                    {r.navn}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Areal (m²)
              <input
                type="number"
                value={areal}
                onChange={e => setAreal(Number(e.target.value))}
                className="w-full rounded-full px-5 py-3 border border-brown-200 text-lg focus:outline-none focus:ring-2 focus:ring-brown-400 bg-white shadow transition mt-1 appearance-none"
                min={1}
                max={100}
              />
            </label>
            <label className="relative">
              Finish
              <span
                className="inline-block ml-2 align-middle cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                tabIndex={0}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
              >
                <Info className="w-4 h-4 text-brown-400 inline align-middle" />
              </span>
              {showTooltip && (
                <div className="absolute z-10 left-0 mt-2 w-72 bg-white border border-brown-200 rounded-lg shadow-lg p-4 text-sm text-brown-900">
                  <b>Hva betyr finish?</b>
                  <ul className="mt-2 list-disc pl-5">
                    <li><b>Standard:</b> {finishForklaring.Standard}</li>
                    <li><b>Middels:</b> {finishForklaring.Middels}</li>
                    <li><b>Eksklusiv:</b> {finishForklaring.Eksklusiv}</li>
                  </ul>
                </div>
              )}
              <select
                value={finish}
                onChange={e => setFinish(e.target.value)}
                className="w-full rounded-full px-5 py-3 border border-brown-200 text-lg focus:outline-none focus:ring-2 focus:ring-brown-400 bg-white shadow transition mt-1 appearance-none"
              >
                {finishOptions.map(f => (
                  <option key={f.value} value={f.value}>{f.label} {f.tillegg > 0 ? `(+${Math.round(f.tillegg*100)}%)` : ""}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="bg-brown-700 text-white rounded px-6 py-2 font-semibold text-lg mt-2 hover:bg-brown-800 transition"
            >
              Legg til
            </button>
          </form>
          <div className="flex gap-4 w-full mt-6">
            <button
              type="button"
              onClick={lagreKalkyle}
              className="flex-1 bg-brown-200 text-brown-900 rounded-full px-3 py-1.5 font-medium text-base shadow hover:bg-brown-300 transition"
            >
              Lagre kalkyle
            </button>
            <button
              type="button"
              onClick={lastInnKalkyle}
              className="flex-1 bg-brown-50 text-brown-900 rounded-full px-3 py-1.5 font-medium text-base shadow hover:bg-brown-100 transition"
            >
              Last inn lagret kalkyle
            </button>
          </div>
          <div className="w-full text-brown-900 font-bold text-xl text-center mt-4">
            Estimert pris: {pris > 0 ? pris.toLocaleString("no-NO", {maximumFractionDigits: 0}) : "—"} kr
          </div>
        </div>
        {/* Rom-oversikt seksjon */}
        {romListe.length > 0 && (
          <div className="w-full border border-brown-200 rounded-2xl bg-white/90 p-6 mb-6">
            <h3 className="text-lg font-bold text-brown-800 mb-2 flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-green-700" /> Valgte rom
            </h3>
            <ul className="divide-y divide-brown-200 mb-4">
              {romListe.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-1">
                    {romIkoner[r.navn]}
                    {r.navn} ({r.areal} m², {r.finish})
                  </span>
                  <span>{(r.areal * r.prisPerM2 * (1 + r.tillegg)).toLocaleString("no-NO")} kr</span>
                  <button
                    className="ml-4 text-red-600 hover:underline text-sm"
                    onClick={() => fjernRom(i)}
                    type="button"
                  >
                    Fjern
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mb-2">
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
            {/* Summering med lys bakgrunn og border */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-brown-900 font-bold text-lg text-right shadow-sm">
              Totalpris: {totalPris.toLocaleString("no-NO")} kr
              {buffer && (
                <>
                  <br />
                  <span className="text-green-700 font-normal">Med buffer: {totalMedBuffer.toLocaleString("no-NO")} kr</span>
                </>
              )}
            </div>
            {/* Del/eksport-knapper */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={sendEpost}
                className="bg-brown-100 text-brown-900 rounded-full px-4 py-2 font-medium text-base shadow hover:bg-brown-200 transition"
              >
                Send til e-post
              </button>
              <button
                type="button"
                onClick={lastNedPDF}
                className="bg-brown-100 text-brown-900 rounded-full px-4 py-2 font-medium text-base shadow hover:bg-brown-200 transition"
              >
                Last ned som PDF
              </button>
            </div>
            {/* Infoboks */}
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-4 text-green-900 text-sm flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-green-600" />
              Prisene er veiledende og kan variere med materialvalg, standard og håndverker.
            </div>
          </div>
        )}
        {/* Info under hvis ingen rom */}
        {romListe.length === 0 && (
          <p className="text-brown-700 text-sm mt-2 text-center">
            Prisestimatet er veiledende og kan variere med materialvalg, standard og håndverker.
          </p>
        )}
        {/* Tips-seksjon */}
        <div className="w-full max-w-xl mt-6">
          <div className="bg-brown-50 border border-brown-200 rounded-xl p-4 text-brown-900 text-base flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <Paintbrush className="w-5 h-5 text-brown-700" />
              Gode tips til oppussing
            </div>
            <ul className="list-disc pl-6 text-brown-900 text-sm">
              <li>🛠️ Husk å innhente tilbud fra flere håndverkere for best pris og kvalitet.</li>
              <li>🚿 Sjekk krav til våtrom og bruk godkjente fagfolk på bad og kjøkken.</li>
              <li>🏛️ Husk søknad til kommunen ved store endringer, som flytting av vegger eller endring av bærende konstruksjoner.</li>
              <li>📋 Sett opp et detaljert budsjett og legg inn buffer for uforutsette kostnader.</li>
              <li>🧾 Be om skriftlig kontrakt og dokumentasjon på alt arbeid.</li>
              <li>♻️ Tenk miljø: velg holdbare materialer og sørg for god avfallshåndtering.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
