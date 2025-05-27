import React, { useState, useEffect } from "react";
import { fetchSsbKvmPriser, structureSsbPriserByPeriodePostnummer, SSBKvmPris } from "../utils/ssbApi";

// Dummy mapping: postnummer -> kommune (utvid for bedre dekning)
const postnummerTilKommune: Record<string, string> = {
  "0170": "Oslo",
  "5003": "Trondheim",
  // ... legg til flere for bedre dekning
};

export default function Verdivurdering() {
  const [adresse, setAdresse] = useState("");
  const [postnummer, setPostnummer] = useState("");
  const [boligtype, setBoligtype] = useState<string>("");
  const [kvm, setKvm] = useState("");
  const [verdi, setVerdi] = useState<number | null>(null);
  const [brukteSnitt, setBrukteSnitt] = useState<number | null>(null);
  const [brukteNasjonalt, setBrukteNasjonalt] = useState(false);
  const [ssbPriser, setSsbPriser] = useState<Record<string, Record<string, Record<string, number>>> | null>(null);
  const [periode, setPeriode] = useState<string>("");
  const [tilgjengeligePerioder, setTilgjengeligePerioder] = useState<string[]>([]);
  const [boligtyper, setBoligtyper] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorPris, setErrorPris] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSsbKvmPriser()
      .then((data: SSBKvmPris[]) => {
        setError(null);
        const strukturert = structureSsbPriserByPeriodePostnummer(data, postnummerTilKommune);
        const perioder = Object.keys(strukturert).sort().reverse();
        setTilgjengeligePerioder(perioder);
        setPeriode(perioder[0] || "");
        setSsbPriser(strukturert);
        // Finn alle boligtyper fra datasettet
        const alleBoligtyper = Array.from(new Set(data.map(d => d.boligtype)));
        setBoligtyper(alleBoligtyper);
        setBoligtype(alleBoligtyper[0] || "");
      })
      .catch(() => setError("Kunne ikke hente prisdata fra SSB eller fallback."))
      .finally(() => setLoading(false));
  }, []);

  function beregnVerdi(e: React.FormEvent) {
    e.preventDefault();
    const kvmTall = Number(kvm);
    setErrorPris(null);
    if (!postnummer.match(/^\d{4}$/) || !kvmTall || kvmTall <= 0 || !ssbPriser || !periode || !boligtype) {
      setVerdi(null);
      setErrorPris("Fyll ut alle felter korrekt.");
      return;
    }
    const pris =
      ssbPriser[periode]?.[postnummer]?.[boligtype] ??
      ssbPriser[periode]?.["*"]?.[boligtype] ??
      null;
    if (!pris) {
      setVerdi(null);
      setErrorPris("Fant ingen pris for valgt postnummer og boligtype i valgt periode.");
      return;
    }
    setVerdi(pris * kvmTall);
    setBrukteSnitt(pris);
    setBrukteNasjonalt(!(ssbPriser[periode]?.[postnummer]?.[boligtype]));
  }

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col items-center justify-center py-10 px-2">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6 text-center">Verdivurdering</h2>
        {loading ? (
          <div className="text-brown-700 mb-4">Henter prisdata fra SSB…</div>
        ) : error ? (
          <div className="text-red-700 mb-4">{error}</div>
        ) : (
          <>
            <form onSubmit={beregnVerdi} className="w-full flex flex-col gap-5 mb-8">
              <input
                type="text"
                placeholder="Adresse"
                className="rounded-full px-6 py-4 text-lg bg-brown-50 border border-brown-200 focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 shadow"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Postnummer (4 siffer)"
                className="rounded-full px-6 py-4 text-lg bg-brown-50 border border-brown-200 focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 shadow"
                value={postnummer}
                onChange={e => setPostnummer(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                required
                pattern="\d{4}"
                maxLength={4}
              />
              <select
                className="rounded-full px-6 py-4 text-lg bg-brown-50 border border-brown-200 focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 shadow appearance-none"
                value={boligtype}
                onChange={e => setBoligtype(e.target.value)}
              >
                {boligtyper.map(bt => (
                  <option key={bt}>{bt}</option>
                ))}
              </select>
              <select
                className="rounded-full px-6 py-4 text-lg bg-brown-50 border border-brown-200 focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 shadow appearance-none"
                value={periode}
                onChange={e => setPeriode(e.target.value)}
              >
                {tilgjengeligePerioder.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Størrelse (kvm)"
                className="rounded-full px-6 py-4 text-lg bg-brown-50 border border-brown-200 focus:ring-2 focus:ring-brown-400 focus:outline-none transition w-full font-seriflogo text-brown-900 shadow"
                value={kvm}
                onChange={e => setKvm(e.target.value.replace(/[^0-9]/g, ""))}
                min={1}
                required
              />
              <button
                type="submit"
                className="rounded-full px-6 py-4 bg-brown-500 text-white font-semibold text-lg hover:bg-brown-600 transition shadow mt-2"
              >
                Beregn verdi
              </button>
              {errorPris && (
                <div className="text-red-700 text-sm text-center mt-2">{errorPris}</div>
              )}
            </form>
            {verdi !== null && (
              <div className="w-full flex flex-col items-center mb-4">
                <div className="text-4xl font-bold text-green-700 mb-2">{verdi.toLocaleString("no-NO")} kr</div>
                <div className="text-brown-700 text-base mb-1">Estimert boligverdi</div>
                <div className="text-xs text-brown-500 mb-2">
                  {brukteNasjonalt
                    ? "(Nasjonalt snitt brukt)"
                    : `(${postnummer} snitt: ${brukteSnitt?.toLocaleString("no-NO")} kr/kvm)`}
                </div>
                <div className="text-brown-600 text-xs text-center max-w-xs">
                  Basert på snittpris i området. Faktisk verdi kan variere.
                </div>
              </div>
            )}
            <div className="bg-brown-50 rounded-xl p-4 text-brown-800 text-sm text-center mt-2">
              Dette er et grovt estimat basert på tilgjengelige snittpriser. Kontakt megler for en nøyaktig verdivurdering.<br />
              {periode && <span className="block mt-2 text-xs text-brown-500">Kilde: SSB{periode ? `, ${periode}` : ""}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 