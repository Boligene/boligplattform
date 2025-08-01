import { ArrowRight } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useBolig } from '../context/BoligContext';
import { ImportedBoligerSection } from './ImportedBoligerSection';

export const HeroSection: React.FC = () => {
  const { addBolig } = useBolig();
  const [finnUrl, setFinnUrl] = useState("");
  const [feilmelding, setFeilmelding] = useState("");
  const [laster, setLaster] = useState(false);


  async function handleHentData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeilmelding("");
    
    if (!finnUrl.includes("finn.no")) {
      setFeilmelding("Vennligst lim inn en gyldig FINN-lenke.");
      return;
    }
    
    setLaster(true);
    try {
      const response = await fetch("/api/parse-finn", {
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

      // Lag boligobjekt med alle felt
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

  return (
    <section className="relative w-full bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed">
      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/10"></div>
      
      {/* Content */}
      <div className="relative px-4 pl-safe pr-safe pt-20 pb-8">
        
        {/* Hero Content */}
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-2xl w-full text-center">
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-seriflogo font-bold text-brown-900 mb-6 leading-tight">
              Kom i gang med<br />
              <span className="text-brown-700">boligreisen</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg sm:text-xl md:text-2xl text-brown-800 mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed">
              Din smarte partner for boliganalyse, kalkulatorer og FINN-integrasjon
            </p>

            {/* FINN Input Form */}
            <form onSubmit={handleHentData} className="mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Lim inn FINN-lenke her..."
                  className="flex-1 rounded-full px-6 py-4 sm:py-5 bg-white/90 backdrop-blur-sm border-2 border-brown-200 text-brown-900 text-lg placeholder:text-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-400 focus:border-brown-400 shadow-lg tap-target"
                  value={finnUrl}
                  onChange={e => setFinnUrl(e.target.value)}
                  disabled={laster}
                />
                <button
                  type="submit"
                  className="rounded-full px-8 py-4 sm:py-5 bg-brown-500 text-white font-semibold text-lg hover:bg-brown-600 hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-lg tap-target"
                  disabled={laster}
                >
                  {laster ? "Henter..." : <>Hent data <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>

              {feilmelding && (
                <div className="bg-red-100/90 backdrop-blur-sm text-red-700 rounded-full px-6 py-3 mb-4 text-center border border-red-200">
                  {feilmelding}
                </div>
              )}
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12">
              <button
                onClick={() => {
                  const element = document.getElementById('value-proposition');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto rounded-full py-4 px-8 bg-brown-600 text-white font-semibold text-lg hover:bg-brown-700 hover:scale-105 transition-all shadow-xl tap-target"
              >
                Utforsk verktøy
              </button>
              
              <Link
                to="/boliger"
                className="w-full sm:w-auto rounded-full py-4 px-8 bg-white/90 backdrop-blur-sm text-brown-800 font-semibold text-lg hover:bg-white hover:scale-105 transition-all shadow-xl border-2 border-brown-200 tap-target text-center"
              >
                Legg til manuelt
              </Link>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-brown-600 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-brown-600 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Imported Boliger - directly below FINN input */}
        <div className="max-w-screen-xl mx-auto">
          <ImportedBoligerSection />
        </div>
      </div>
    </section>
  );
}; 