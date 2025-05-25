import React, { useState } from "react";

export default function Kjopskalkulator() {
  const [kjopesum, setKjopesum] = useState(4000000);
  const [fellesgjeld, setFellesgjeld] = useState(0);

  // Statlige satser (per 2024)
  const dokumentavgift = kjopesum * 0.025;
  const tinglysning = 585;
  const pantobligasjon = 500;
  const total = kjopesum + fellesgjeld + dokumentavgift + tinglysning + pantobligasjon;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">
          Kjøpskostnadskalkulator
        </h2>
        <form className="w-full flex flex-col gap-4 mb-8">
          <label>
            Kjøpesum (kr)
            <input
              type="number"
              value={kjopesum}
              onChange={e => setKjopesum(Number(e.target.value))}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
              min={100000}
              step={10000}
            />
          </label>
          <label>
            Fellesgjeld (kr)
            <input
              type="number"
              value={fellesgjeld}
              onChange={e => setFellesgjeld(Number(e.target.value))}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
              min={0}
              step={10000}
            />
          </label>
        </form>
        <div className="w-full text-brown-900 font-bold text-xl text-center mb-2">
          Totale kjøpskostnader: {total.toLocaleString("no-NO", {maximumFractionDigits: 0})} kr
        </div>
        <ul className="text-brown-800 text-sm mb-1">
          <li>Dokumentavgift (2,5%): {dokumentavgift.toLocaleString("no-NO", {maximumFractionDigits: 0})} kr</li>
          <li>Tinglysning skjøte: {tinglysning} kr</li>
          <li>Tinglysning pant: {pantobligasjon} kr</li>
        </ul>
      </div>
    </div>
  );
}
