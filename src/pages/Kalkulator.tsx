import { useBolig } from "../context/BoligContext";
import React, { useState } from "react";

export default function Kalkulator() {
  // State for lånebeløp, rente og nedbetalingstid
  const [belop, setBelop] = useState(3000000);
  const [rente, setRente] = useState(5.0);
  const [ar, setAr] = useState(25);
  const { boliger, valgtBolig, setValgtBolig } = useBolig();

// I JSX-delen:
<select
  value={valgtBolig?.id || ""}
  onChange={e => {
    const valgt = boliger.find(b => b.id === e.target.value);
    setValgtBolig(valgt || null);
  }}>
  <option value="">Velg bolig...</option>
  {boliger.map(b => (
    <option key={b.id} value={b.id}>
      {b.adresse} ({b.pris?.toLocaleString("no-NO")} kr)
    </option>
  ))}
</select>


  // Kalkuler terminbeløp (annuitetslån-formel)
  const r = rente / 100 / 12;
  const n = ar * 12;
  const terminbelop = belop > 0 && r > 0 && n > 0
    ? (belop * r) / (1 - Math.pow(1 + r, -n))
    : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">
          Boliglånskalkulator
        </h2>

        <form className="w-full flex flex-col gap-4 mb-8">
          <label>
            Lånebeløp (kr)
            <input
              type="number"
              value={belop}
              onChange={e => setBelop(Number(e.target.value))}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
              min={100000}
              step={10000}
            />
          </label>
          <label>
            Rente (%)
            <input
              type="number"
              value={rente}
              onChange={e => setRente(Number(e.target.value))}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
              min={0.1}
              step={0.1}
            />
          </label>
          <label>
            Nedbetalingstid (år)
            <input
              type="number"
              value={ar}
              onChange={e => setAr(Number(e.target.value))}
              className="w-full rounded px-4 py-2 border border-brown-200 text-lg focus:outline-none mt-1"
              min={1}
              max={40}
            />
          </label>
        </form>

        <div className="w-full text-brown-900 font-bold text-xl text-center">
          Terminbeløp: {terminbelop > 0 ? terminbelop.toLocaleString("no-NO", {maximumFractionDigits: 0}) : "—"} kr/mnd
        </div>
      </div>
    </div>
  );
}
