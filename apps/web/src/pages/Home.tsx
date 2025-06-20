import { supabase } from '@boligplattform/core';
import { ArrowRight, Calculator, Check, FileText, Hammer, HelpCircle, Home, Star, Trash2 } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useBolig } from '../context/BoligContext';

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

  const [finnUrl, setFinnUrl] = React.useState("");
  const [feilmelding, setFeilmelding] = React.useState("");
  const [laster, setLaster] = React.useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [lagreStatus, setLagreStatus] = useState<{[id: string]: string}>({});
  const [favoritter, setFavoritter] = useState<{[localId: string]: string}>({});

  // Hent fra localStorage ved oppstart
  React.useEffect(() => {
    if (boliger.length === 0) {
      const lagret = hentBoligerLokalt();
      if (lagret.length > 0) {
        lagret.forEach((bolig: any) => addBolig(bolig));
      }
    }
    // eslint-disable-next-line
  }, []);

  // Oppdater localStorage når boliger endres
  React.useEffect(() => {
    lagreBoligerLokalt(boliger);
  }, [boliger]);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Hent favoritter fra Supabase for innlogget bruker
  useEffect(() => {
    if (!user) return;
    supabase.from('boliger').select('id, adresse, pris, type, bilde, lenke').eq('bruker_id', user.id).then(({ data }) => {
      if (data) {
        const favs: {[localId: string]: string} = {};
        data.forEach((b: any) => {
          // Lag en lokal nøkkel basert på adresse+pris+type for å matche importerte boliger
          const localKey = `${b.adresse}|${b.pris}|${b.type}`;
          favs[localKey] = b.id;
        });
        setFavoritter(favs);
      }
    });
  }, [user]);

  async function handleHentData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeilmelding("");
    if (!finnUrl.includes("finn.no")) {
      setFeilmelding("Vennligst lim inn en gyldig FINN-lenke.");
      return;
    }
    setLaster(true);
    try {
      const response = await fetch("http://localhost:3001/api/parse-finn", {
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

      // OPPDATERT: LAGRE ALLE DE NYE OMFATTENDE FELTENE
      const nyBolig = {
        id: Date.now().toString(),
        adresse: data.adresse || "Ukjent",
        pris: Number(data.pris?.replace(/[^\d]/g, "")) || 0,
        type: data.boligtype || data.type || "Leilighet",
        bilde: data.hovedbilde || data.bilde || "",
        bruksareal: data.bruksareal || data.areal || "",
        eierform: data.eierform || "",
        byggeaar: data.byggeaar || "",
        kommunaleAvg: data.kommunaleAvg || data.kommunaleavgifter || "",
        eiendomsskatt: data.eiendomsskatt || "",
        felleskostnader: data.felleskostnader || "",
        fellesgjeld: data.fellesgjeld || "",
        tittel: data.tittel || "",
        lenke: finnUrl,
        // Nye felter fra den oppgraderte scraperen
        primaerareal: data.primaerareal || "",
        totalareal: data.totalareal || "",
        antallRom: data.antallRom || "",
        antallSoverom: data.antallSoverom || "",
        etasje: data.etasje || "",
        energimerking: data.energimerking || "",
        parkering: data.parkering || "",
        balkong: data.balkong || "",
        terrasse: data.terrasse || "",
        hage: data.hage || "",
        kjeller: data.kjeller || "",
        oppvarming: data.oppvarming || "",
        kommune: data.kommune || "",
        bydel: data.bydel || "",
        postnummer: data.postnummer || "",
        megler: data.megler || "",
        visningsdato: data.visningsdato || "",
        budfrister: data.budfrister || "",
        beskrivelse: data.beskrivelse || "",
        bilder: data.bilder || [],
        prisPerKvm: data.prisPerKvm || "",
        formuesverdi: data.formuesverdi || ""
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

  async function handleLagreIBasen(bolig: any) {
    if (!user) return;
    setLagreStatus(s => ({...s, [bolig.id]: 'Lagrer...'}));
    const boligData = { ...bolig };
    delete boligData.id;
    boligData.bruker_id = user.id;
    console.log("user.id fra Supabase Auth:", user?.id, boligData);
    const { data, error } = await supabase.from('boliger').insert([boligData]).select();
    if (error || !data || !data[0]) {
      setLagreStatus(s => ({...s, [bolig.id]: 'Feil!'}));
    } else {
      setLagreStatus(s => ({...s, [bolig.id]: 'Lagret!'}));
      const localKey = `${bolig.adresse}|${bolig.pris}|${bolig.type}`;
      setFavoritter(f => ({...f, [localKey]: data[0].id}));
    }
  }

  async function handleFjernFraFavoritter(bolig: any) {
    if (!user) return;
    setLagreStatus(s => ({...s, [bolig.id]: 'Fjerner...'}));
    const localKey = `${bolig.adresse}|${bolig.pris}|${bolig.type}`;
    const supabaseId = favoritter[localKey];
    if (supabaseId) {
      await supabase.from('boliger').delete().eq('id', supabaseId).eq('bruker_id', user.id);
    }
    setLagreStatus(s => ({...s, [bolig.id]: ''}));
    setFavoritter(f => {
      const copy = { ...f };
      delete copy[localKey];
      return copy;
    });
  }

  return (
    <div className="min-h-screen w-full bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col overflow-x-hidden">
      <main className="flex flex-col items-center justify-center flex-1 w-full">

        <div className="bg-white/80 rounded-2xl shadow-xl p-2 sm:p-6 md:p-10 w-full max-w-2xl flex flex-col items-center mb-8">
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

          <div className="flex gap-4 w-full max-w-md">
            <Link 
              to="/boliger" 
              className="flex-1 rounded-full px-6 py-3 bg-brown-200 text-brown-800 font-semibold text-lg hover:bg-brown-300 transition text-center"
            >
              Legg til bolig manuelt
            </Link>
          </div>

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
                {boliger.map((bolig: any, _i: number) => {
                  const valgt = valgtForSammenligning?.includes(bolig.id);
                  const localKey = `${bolig.adresse}|${bolig.pris}|${bolig.type}`;
                  const erFavoritt = !!favoritter[localKey];
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
                      {/* Favoritt-checkbox */}
                      {user && (
                        <label className="absolute top-4 left-12 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={erFavoritt}
                            onChange={e => {
                              if (e.target.checked) handleLagreIBasen(bolig);
                              else handleFjernFraFavoritter(bolig);
                            }}
                            className="w-5 h-5 accent-brown-600"
                            aria-label="Lagre i Mine boliger"
                          />
                          <span className="text-xs text-brown-700">Favoritt</span>
                        </label>
                      )}
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
                      {user && (
                        <button
                          className="mt-2 px-4 py-2 rounded-full bg-brown-500 text-white font-semibold hover:bg-brown-600 transition shadow"
                          onClick={() => handleLagreIBasen(bolig)}
                          disabled={lagreStatus[bolig.id] === 'Lagret!'}
                        >
                          {lagreStatus[bolig.id] || 'Lagre i Mine boliger'}
                        </button>
                      )}
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
        <section className="w-full max-w-2xl flex flex-col items-center px-2 sm:px-0">
          <div className="bg-white/70 rounded-2xl shadow-lg px-2 sm:px-8 py-4 sm:py-6 w-full mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-6">
              <Link to="/boliger" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <Home className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Boliger</span>
              </Link>
              <Link to="/oppussing" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <Hammer className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Oppussing</span>
              </Link>
              <Link to="/kjopskalkulator" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <Calculator className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Kjøpskostnadskalkulator</span>
              </Link>
              <Link to="/hjelpeverktoy-for-boligkjopere" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <HelpCircle className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Hjelpeverktøy</span>
              </Link>
              <Link to="/verdivurdering" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <Calculator className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Verdivurdering</span>
              </Link>
              <Link to="/mineboliger" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <Star className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Mine boliger</span>
              </Link>
              <Link to="/takstrapportanalyse" className="flex flex-col items-center min-w-[110px] group cursor-pointer transition hover:scale-105 active:scale-95">
                <div className="bg-brown-100 rounded-full w-16 h-16 flex items-center justify-center shadow group-hover:bg-brown-200 transition mb-2">
                  <FileText className="w-8 h-8 text-brown-800" />
                </div>
                <span className="font-semibold text-brown-800 mb-1 text-center text-sm sm:text-base whitespace-normal break-words">Takstrapportanalyse</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
