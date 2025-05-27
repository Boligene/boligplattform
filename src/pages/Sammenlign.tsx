import React from "react";
import { useBolig } from "../context/BoligContext";
import { Link } from "react-router-dom";

// REALISTISKE STANDARDER (kan tilpasses)
const DEFAULT_KVM = 70;                  // Gjett default hvis ukjent
const DEFAULT_KOMMUNALE = 1200;          // Kommunale avg per mnd hvis mangler
const DEFAULT_FELLES = 0;                // Felleskostn. hvis ikke oppgitt
const DEFAULT_STROMPRIS = 1.25;          // kr/kWh
const DEFAULT_FORBRUK_KVM = 150;         // kWh/kvm/år
const DEFAULT_LANERENTE = 0.056;         // 5.6% nominell, mai 2025
const DEFAULT_LANETID = 25;              // 25 år

function kalkulerLaanekostnad(pris: number, rente = DEFAULT_LANERENTE, lanetid = DEFAULT_LANETID) {
  const mndRente = rente / 12;
  const antMnd = lanetid * 12;
  return Math.round((pris * mndRente) / (1 - Math.pow(1 + mndRente, -antMnd)));
}

function kalkulerStrom(kvm: number, prisPerKwh = DEFAULT_STROMPRIS) {
  // 150 kWh/m2/år
  const forbruk = kvm * DEFAULT_FORBRUK_KVM;
  return Math.round((forbruk * prisPerKwh) / 12);
}

function kalkulerTotalKostnad(b: any) {
  // Hent ut og konverter relevante felter fra FINN-data
  const pris = Number(b.pris) || 0;
  const kvm = Number(b.bruksareal) || Number(b.kvm) || DEFAULT_KVM;
  const kommunale = Number(b.kommunaleAvg) || DEFAULT_KOMMUNALE;
  const felles = Number(b.felleskostnader) || DEFAULT_FELLES;
  const strøm = kalkulerStrom(kvm);
  const laan = kalkulerLaanekostnad(pris);

  return {
    laan,
    kommunale,
    strøm,
    felles,
    total: laan + kommunale + strøm + felles
  }
}

export default function Sammenlign() {
  const { boliger, valgtForSammenligning } = useBolig();
  const sammenlignBoliger = boliger.filter((b: any) => valgtForSammenligning.includes(b.id));

  // Farger for total kostnad
  function kostFarge(total: number) {
    if (total < 18000) return "text-green-700";
    if (total < 30000) return "text-orange-500";
    return "text-red-600";
  }

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed py-10 px-4 flex flex-col items-center">
      <div className="max-w-6xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6 text-center">Sammenlign valgte boliger</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-brown-100 text-brown-900 text-lg">
                <th className="p-3 text-left">Felt</th>
                {sammenlignBoliger.map((bolig: any) => (
                  <th key={bolig.id} className="p-3 text-left font-normal">
                    <div className="flex flex-col items-start">
                      <img src={bolig.bilde} alt="Boligbilde" className="w-40 h-28 object-cover rounded shadow mb-2" />
                      <a
                        href={bolig.lenke}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brown-700 underline text-sm"
                      >
                        Gå til Finn-annonse
                      </a>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-brown-900">
              <tr>
                <td className="p-3 font-semibold">Adresse/navn</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>{b.adresse || b.tittel || "-"}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Pris</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>{b.pris ? b.pris.toLocaleString("no-NO") + " kr" : "-"}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Størrelse (kvm)</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>
                    {b.bruksareal || b.kvm ? (b.bruksareal || b.kvm) + " kvm" : <span className="text-brown-400">Ikke tilgjengelig</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Felleskostnader</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>
                    {b.felleskostnader ? b.felleskostnader.toLocaleString("no-NO") + " kr/mnd" : <span className="text-brown-400">Ikke oppgitt</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Kommunale avgifter</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>
                    {b.kommunaleAvg ? b.kommunaleAvg.toLocaleString("no-NO") + " kr/mnd" : <span className="text-brown-400">Ikke oppgitt</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Boligtype</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>{b.type || "-"}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Primærrom/BRA/P-rom</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>{b.primarrom || b.BRA || b.prom || "-"}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Kalkulert total månedskostnad</td>
                {sammenlignBoliger.map((b: any) => {
                  const kost = kalkulerTotalKostnad(b);
                  return (
                    <td className={`p-3 font-bold ${kostFarge(kost.total)}`} key={b.id}>
                      {kost.total.toLocaleString("no-NO")} kr/mnd
                      <div className="text-xs text-brown-400">
                        (Lån: {kost.laan.toLocaleString()} + strøm: {kost.strøm.toLocaleString()} + komm.avg: {kost.kommunale.toLocaleString()} + felles: {kost.felles.toLocaleString()})
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="p-3 font-semibold">Oppussingsbehov</td>
                {sammenlignBoliger.map((b: any) => (
                  <td className="p-3" key={b.id}>
                    <span className="italic text-brown-400">Ikke tilgjengelig</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-8">
          <Link
            to="/"
            className="rounded-full px-6 py-3 bg-brown-200 text-brown-900 font-semibold shadow hover:bg-brown-300 transition"
          >
            Tilbake til forsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
