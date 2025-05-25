import React, { useState } from "react";

export default function Oppussing() {
  // Enkle satser per romtype
  const romtyper = [
    { navn: "Kjøkken", prisPerM2: 20000 },
    { navn: "Bad", prisPerM2: 30000 },
    { navn: "Soverom", prisPerM2: 7000 },
    { navn: "Stue", prisPerM2: 8000 },
    { navn: "Gang", prisPerM2: 6000 }
  ];

  const [rom, setRom] = useState(romtyper[0].navn);
  const [areal, setAreal] = useState(10);

  const valgt = romtyper.find(r => r.navn === rom) || romtyper[0];
  const pris = valgt.prisPerM2 * areal;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">
          Oppussingskalkulator
        </h2>
        <form className="w-full flex flex-col gap-4 mb-8">
          <label>
            Romtype
            <select
              value={rom}
              onChange={e => setRom(e.target.value)}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
            >
              {romtyper.map(r => (
                <option key={r.navn} value={r.navn}>{r.navn}</option>
              ))}
            </select>
          </label>
          <label>
            Areal (m²)
            <input
              type="number"
              value={areal}
              onChange={e => setAreal(Number(e.target.value))}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
              min={1}
              max={100}
            />
          </label>
        </form>
        <div className="w-full text-brown-900 font-bold text-xl text-center">
          Estimert pris: {pris > 0 ? pris.toLocaleString("no-NO", {maximumFractionDigits: 0}) : "—"} kr
        </div>
        <p className="text-brown-700 text-sm mt-2 text-center">
          Prisestimatet er veiledende og kan variere med materialvalg, standard og håndverker.
        </p>
      </div>
    </div>
  );
}
