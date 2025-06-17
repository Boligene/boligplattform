import { useEffect, useState } from 'react';
import { supabase } from '@boligplattform/core';
import type { OffentligBolig } from '@boligplattform/core';

export default function Boliger() {
  const [boliger, setBoliger] = useState<OffentligBolig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffentligeBoliger = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('offentlige_boliger')
        .select('*')
        .order('opprettet', { ascending: false });

      if (error) {
        console.error('Feil ved henting av offentlige boliger:', error);
      } else {
        setBoliger(data || []);
      }
      setLoading(false);
    };

    fetchOffentligeBoliger();
  }, []);

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-8">Boligsøk og sammenligning</h1>

      <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-6xl p-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-brown-800 mb-2">Offentlige boliger</h2>
          <p className="text-brown-600 text-sm">
            Alle aktive boliger på plattformen. Brukerinformasjon er skjult for personvern.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-brown-800 text-lg">Laster boliger…</p>
          </div>
        ) : boliger.length === 0 ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-brown-800 text-lg text-center">
              Ingen offentlige boliger funnet.
              <br />
              <span className="text-brown-500 text-base">Bli medlem og legg til boliger for å se dem her.</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boliger.map((bolig) => (
              <div key={bolig.id} className="bg-white rounded-xl shadow p-6 border border-brown-100 hover:shadow-lg transition">
                <img 
                  src={bolig.bilde || '/placeholder-home.jpg'} 
                  alt="Bolig" 
                  className="w-full h-48 object-cover rounded-lg shadow mb-4" 
                />
                <div>
                  <h4 className="text-lg font-seriflogo font-bold text-brown-900 mb-2">
                    {bolig.adresse}
                  </h4>
                  <div className="text-brown-700 font-semibold mb-2">
                    {bolig.pris?.toLocaleString("no-NO")} kr
                  </div>
                  <div className="text-brown-600 text-sm mb-2">
                    {bolig.type} • {bolig.bruksareal_m2}m²
                  </div>
                  {bolig.byggeaar_tall && (
                    <div className="text-brown-500 text-sm mb-2">
                      Byggeår: {bolig.byggeaar_tall}
                    </div>
                  )}
                  <div className="text-brown-500 text-sm">
                    {bolig.eierform}
                  </div>
                  {(bolig.kommunale_avg_kr || bolig.eiendomsskatt_kr || bolig.felleskostnader_kr) && (
                    <div className="mt-3 pt-3 border-t border-brown-100">
                      <div className="text-xs text-brown-500 space-y-1">
                        {bolig.kommunale_avg_kr && (
                          <div>Kommunale avg: {bolig.kommunale_avg_kr.toLocaleString('no-NO')} kr/år</div>
                        )}
                        {bolig.eiendomsskatt_kr && (
                          <div>Eiendomsskatt: {bolig.eiendomsskatt_kr.toLocaleString('no-NO')} kr/år</div>
                        )}
                        {bolig.felleskostnader_kr && (
                          <div>Felleskost: {bolig.felleskostnader_kr.toLocaleString('no-NO')} kr/mnd</div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-brown-100">
                    <div className="text-xs text-green-600">
                      ✓ Offentlig visning - ingen persondata eksponert
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
