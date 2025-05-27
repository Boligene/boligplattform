import React, { useState, useEffect } from "react";
import { useBolig } from "../context/BoligContext";
import { Home, Hammer, Calculator, Star, ArrowRight, Trash2, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Hjelpefunksjon for lagring i localStorage
function lagreBoligerLokalt(boliger: any[]) {
  localStorage.setItem("boligene_boliger", JSON.stringify(boliger));
}
function hentBoligerLokalt() {
  const data = localStorage.getItem("boligene_boliger");
  return data ? JSON.parse(data) : [];
}

export default function HomePage() {
  const {
    addBolig,
    boliger,
    clearBoliger,
    valgtForSammenligning,
    toggleValgtForSammenligning,
    removeBolig
  } = useBolig();

  const [finnUrl, setFinnUrl] = useState("");
  const [feilmelding, setFeilmelding] = useState("");
  const [laster, setLaster] = useState(false);
  const navigate = useNavigate();

  // Hent fra localStorage ved oppstart
  useEffect(() => {
    if (boliger.length === 0) {
      const lagret = hentBoligerLokalt();
      if (lagret.length > 0) {
        lagret.forEach((bolig: any) => addBolig(bolig));
      }
    }
    // eslint-disable-next-line
  }, []);

  // Oppdater localStorage når boliger endres
  useEffect(() => {
    lagreBoligerLokalt(boliger);
  }, [boliger]);

  async function handleHentData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeilmelding("");
    if (!finnUrl.includes("finn.no")) {
      setFeilmelding("Vennligst lim inn en gyldig FINN-lenke.");
      return;
    }
    setLaster(true);
    try {
      const response = await fetch("http://localhost:4444/api/parse-finn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finnUrl })
      });
      const data = await response.json();

      if (data.error) {
        setFeilmelding("Kunne ikke hente FINN-data.");
        setLaster(false);
        return;
      }

      // NY: LAGRE ALLE FELTENE DU SCRAPER
      const nyBolig = {
        id: Date.now().toString(),
        adresse: data.adresse || "Ukjent",
        pris: Number(data.pris?.replace(/[^\d]/g, "")) || 0,
        type: data.boligtype || "Leilighet",
        bilde: data.bilde || "",
        bruksareal: data.bruksareal || "",
        eierform: data.eierform || "",
        byggeaar: data.byggeaar || "",
        kommunaleAvg: data.kommunaleAvg || "",
        eiendomsskatt: data.eiendomsskatt || "",
        felleskostnader: data.felleskostnader || "",
        tittel: data.tittel || "",
        lenke: finnUrl
      };
      addBolig(nyBolig);
      setFinnUrl("");
    } catch (err) {
      setFeilmelding("Teknisk feil ved henting av FINN-data.");
    }
    setLaster(false);
  }

  // Slett én bolig
  function handleRemoveBolig(id: string) {
    if (window.confirm("Er du sikker på at du vil slette denne boligen?")) {
      removeBolig(id);
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
              disabled={laster}
            />
            <button
              type="submit"
              className="rounded-full px-6 py-3 bg-brown-500 text-white font-semibold text-lg hover:bg-brown-600 transition flex items-center gap-2 shadow"
              disabled={laster}
            >
              {laster ? "Henter..." : <>Hent data <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          {feilmelding && (
            <div className="bg-red-100 text-red-700 rounded p-2 mb-4 w-full text-center">
              {feilmelding}
            </div>
          )}

          {boliger.length > 0 && (
            <div className="w-full mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-seriflogo text-xl text-brown-900">Importerte boliger</h3>
                <button
                  onClick={clearBoliger}
                  className="flex items-center gap-2 text-sm text-brown-500 hover:text-red-600"
                  title="Slett alle"
                >
                  <Trash2 className="w-4 h-4" /> Slett alle
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {boliger.map((bolig: any, i: number) => {
                  const valgt = valgtForSammenligning?.includes(bolig.id);
                  return (
                    <div
                      key={bolig.id}
                      className={`bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-4 border 
                        ${valgt ? 'border-green-600 bg-green-50' : 'border-brown-100'} hover:shadow-lg transition relative`}
                    >
                      {/* Slett én bolig-knapp */}
                      <button
                        onClick={() => handleRemoveBolig(bolig.id)}
                        className="absolute top-4 right-4 text-brown-400 hover:text-red-600 transition"
                        title="Slett denne boligen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={valgt}
                        onChange={() => toggleValgtForSammenligning(bolig.id)}
                        className="absolute top-4 left-4 w-5 h-5 accent-green-600"
                        aria-label="Velg for sammenligning"
                      />
                      {/* Valgt ikon */}
                      {valgt && (
                        <span className="absolute top-4 left-4 bg-green-600 rounded-full p-1">
                          <Check className="w-4 h-4 text-white" />
                        </span>
                      )}

                      <img
                        src={bolig.bilde}
                        alt="Bolig"
                        className="w-32 h-24 object-cover rounded-lg shadow"
                      />
                      <div className="flex-1">
                        <h4 className="text-2xl font-seriflogo font-bold text-brown-900 mb-1">{bolig.adresse}</h4>
                        <div className="text-brown-700 font-semibold mb-1">{bolig.pris.toLocaleString("no-NO")} kr – {bolig.type}</div>
                        <div className="text-brown-400 text-xs mt-1">{bolig.lenke}</div>
                        {valgt && (
                          <div className="mt-2 text-green-700 font-semibold">Valgt for sammenligning</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sammenlign-knapp */}
              {valgtForSammenligning && valgtForSammenligning.length >= 2 && (
                <button
                  className="mt-6 mb-2 px-6 py-3 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition w-full"
                  onClick={() => navigate("/sammenlign")}
                >
                  Sammenlign {valgtForSammenligning.length} boliger
                </button>
              )}
            </div>
          )}
        </div>

        {/* Meny, behold som før */}
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
            <Link to="/kjopskalkulator" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Calculator className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Kjøpskostnadskalkulator</span>
            </Link>
            <Link to="/verdivurdering" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Calculator className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Verdivurdering</span>
            </Link>
            <Link to="/mineboliger" className="flex flex-col items-center group cursor-pointer transition hover:scale-105 active:scale-95">
              <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                <Star className="w-8 h-8 text-brown-800" />
              </div>
              <span className="font-semibold text-brown-800 mb-1">Mine boliger</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
