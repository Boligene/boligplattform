import { useBolig } from "../context/BoligContext";
import { useState } from "react";
import { Home, Hammer, Calculator, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  // Hent context-funksjoner og boligliste
  const { addBolig, boliger } = useBolig();
  const [finnUrl, setFinnUrl] = useState("");
  const [feilmelding, setFeilmelding] = useState("");

  // Håndter innsending av FINN-lenke og lagre dummy-bolig til context
async function handleHentData(e: React.FormEvent) {
  e.preventDefault();
  setFeilmelding("");
  if (!finnUrl.includes("finn.no")) {
    setFeilmelding("Vennligst lim inn en gyldig FINN-lenke.");
    return;
  }

  // Kall backend for å hente ut data fra FINN
  try {
    const response = await fetch("http://localhost:4444/api/parse-finn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: finnUrl })
    });
    const data = await response.json();

    if (data.error) {
      setFeilmelding("Kunne ikke hente FINN-data.");
      return;
    }
    // Legg til i context!
    addBolig({
      id: Date.now().toString(),
      adresse: data.adresse || "Ukjent",
      pris: Number(data.pris.replace(/[^\d]/g, "")) || 0,
      felleskostnader: Number(data.felleskost.replace(/[^\d]/g, "")) || 0,
      type: "Leilighet", // Du kan hente type også!
      soverom: 0, // Oppdater hvis du klarer å hente soverom
      areal: data.areal || "",
      bilde: data.bilde || "",
      lenke: finnUrl
    });
    setFinnUrl("");
  } catch (err) {
    setFeilmelding("Teknisk feil ved henting av FINN-data.");
  }
}

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col">
      <main className="flex flex-col items-center justify-center flex-1">
        <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-2xl flex flex-col items-center mb-8">
          <h2 className="text-4xl font-seriflogo font-bold text-brown-900 text-center mb-6 leading-tight">
            Kom i gang med<br />boligreisen din
          </h2>
          <form className="flex w-full max-w-md gap-4 mb-6" onSubmit={handleHentData}>
            <input
              type="text"
              placeholder="Lim inn FINN-lenke"
              className="flex-1 rounded-full px-5 py-3 bg-brown-50 border border-brown-200 text-lg focus:outline-none focus:ring-2 focus:ring-brown-400 placeholder:text-brown-400"
              value={finnUrl}
              onChange={e => setFinnUrl(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-full px-6 py-3 bg-brown-500 text-white font-semibold text-lg hover:bg-brown-600 transition flex items-center gap-2 shadow"
            >
              Hent data
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {feilmelding && (
            <div className="bg-red-100 text-red-700 rounded p-2 mb-4 w-full text-center">
              {feilmelding}
            </div>
          )}

          {boliger.length > 0 && (
            <div className="w-full mt-4">
              <h3 className="font-seriflogo text-xl text-brown-900 mb-3">Importerte boliger</h3>
              <div className="flex flex-col gap-4">
                {boliger.map((bolig, i) => (
                  <a
                    key={bolig.id}
                    href={bolig.lenke}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-4 border border-brown-100 hover:shadow-lg transition"
                  >
                    <img
                      src={bolig.bilde}
                      alt="Bolig"
                      className="w-32 h-24 object-cover rounded-lg shadow"
                    />
                    <div className="flex-1">
                      <h4 className="text-2xl font-seriflogo font-bold text-brown-900 mb-1">{bolig.adresse}</h4>
                      <div className="text-brown-700 font-semibold mb-1">{bolig.pris.toLocaleString("no-NO")} kr – {bolig.type}</div>
                      <div className="text-brown-600 text-sm">{bolig.soverom} soverom • {bolig.areal}</div>
                      <div className="text-brown-400 text-xs mt-1">{bolig.lenke}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Verktøykort / hovedmeny */}
        <section className="w-full max-w-4xl flex flex-col items-center">
          <div className="bg-white/70 rounded-2xl shadow-lg px-8 py-6 w-full flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
            <Link to="/boliger" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Home className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Boliger</span>
            </Link>
            <Link to="/oppussing" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Hammer className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Oppussing</span>
            </Link>
            <Link to="/kalkulator" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Calculator className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Boliglånskalkulator</span>
            </Link>
            <Link to="/mineboliger" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Star className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Mine boliger</span>
            </Link>
          </div>

          {/* Kort beskrivelse under */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full">
            <div>
              <h3 className="font-bold text-brown-900 text-lg mb-2">Utforsk boliger</h3>
              <p className="text-brown-800 text-sm">Finn boliger som matcher dine ønsker og behov. Sammenlign, lagre og følg med.</p>
            </div>
            <div>
              <h3 className="font-bold text-brown-900 text-lg mb-2">Oppussingskalkulator</h3>
              <p className="text-brown-800 text-sm">Få oversikt over hva det koster å pusse opp ulike rom og prosjekter.</p>
            </div>
            <div>
              <h3 className="font-bold text-brown-900 text-lg mb-2">Boliglånskalkulator</h3>
              <p className="text-brown-800 text-sm">Regn ut hvor mye du kan låne, og hva lånet vil koste deg over tid.</p>
            </div>
            <div>
              <h3 className="font-bold text-brown-900 text-lg mb-2">Mine boliger</h3>
              <p className="text-brown-800 text-sm">Se din personlige oversikt over boliger du har lagret, vurdert eller fulgt.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
