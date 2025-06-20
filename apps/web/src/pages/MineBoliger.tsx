import type { Bolig } from '@boligplattform/core';
import { supabase } from '@boligplattform/core';
import { useEffect, useState } from 'react';

export default function MineBoliger() {
  const [user, setUser] = useState<any>(null);
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedBoliger, setSelectedBoliger] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Med RLS aktivert trenger vi ikke .eq('bruker_id', user.id)
    // RLS policies sørger automatisk for at brukeren bare ser sine egne boliger
    supabase.from('boliger').select('*').then(({ data, error }) => {
      if (error) {
        console.error('Feil ved henting av boliger:', error);
      }
      setBoliger(data || []);
      setLoading(false);
    });
  }, [user]);

  const handleDeleteBolig = async (boligId: string, adresse: string) => {
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette "${adresse}"?\n\nDenne handlingen kan ikke angres.`
    );
    
    if (!confirmed) return;

    setDeletingId(boligId);
    
    try {
      const { error } = await supabase
        .from('boliger')
        .delete()
        .eq('id', boligId);

      if (error) {
        console.error('Feil ved sletting av bolig:', error);
        alert('Kunne ikke slette boligen. Prøv igjen senere.');
      } else {
        // Fjern boligen fra lokal state
        setBoliger(prev => prev.filter(bolig => bolig.id !== boligId));
        
        // Vis suksessmelding
        alert('Boligen ble slettet!');
      }
    } catch (error) {
      console.error('Uventet feil ved sletting:', error);
      alert('En uventet feil oppstod. Prøv igjen senere.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleBoligSelection = (boligId: string) => {
    setSelectedBoliger(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boligId)) {
        newSet.delete(boligId);
      } else {
        newSet.add(boligId);
      }
      return newSet;
    });
  };

  const selectAllBoliger = () => {
    setSelectedBoliger(new Set(boliger.map(b => b.id)));
  };

  const deselectAllBoliger = () => {
    setSelectedBoliger(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedBoliger.size === 0) return;
    
    const selectedBoligupper = boliger.filter(b => selectedBoliger.has(b.id));
    const adresser = selectedBoligupper.map(b => b.adresse).join(', ');
    
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette ${selectedBoliger.size} boliger?\n\n${adresser}\n\nDenne handlingen kan ikke angres.`
    );
    
    if (!confirmed) return;

    setBulkDeleting(true);
    
    try {
      const { error } = await supabase
        .from('boliger')
        .delete()
        .in('id', Array.from(selectedBoliger));

      if (error) {
        console.error('Feil ved bulk sletting:', error);
        alert('Kunne ikke slette alle boligene. Prøv igjen senere.');
      } else {
        // Fjern boligene fra lokal state
        setBoliger(prev => prev.filter(bolig => !selectedBoliger.has(bolig.id)));
        setSelectedBoliger(new Set());
        
        // Vis suksessmelding
        alert(`${selectedBoligupper.length} boliger ble slettet!`);
      }
    } catch (error) {
      console.error('Uventet feil ved bulk sletting:', error);
      alert('En uventet feil oppstod. Prøv igjen senere.');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-brown-800">Du må være innlogget for å se dine boliger.</div>;
  }

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-8">Mine boliger</h1>
      <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-4xl p-10 flex flex-col items-center min-h-[300px]">
        {loading ? (
          <p className="text-brown-800 text-lg">Laster boliger…</p>
        ) : boliger.length === 0 ? (
          <p className="text-brown-800 text-lg">
            Du har ikke lagret noen boliger ennå.
            <br />
            <span className="text-brown-500 text-base">Importer og lagre boliger fra forsiden.</span>
          </p>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {/* Bulk operasjoner kontroller */}
            <div className="bg-brown-50 rounded-xl p-4 border border-brown-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-brown-800 font-medium">
                    {selectedBoliger.size} av {boliger.length} boliger valgt
                  </span>
                  {selectedBoliger.size === 0 ? (
                    <button
                      onClick={selectAllBoliger}
                      className="text-brown-600 hover:text-brown-800 underline text-sm transition"
                    >
                      Velg alle
                    </button>
                  ) : (
                    <button
                      onClick={deselectAllBoliger}
                      className="text-brown-600 hover:text-brown-800 underline text-sm transition"
                    >
                      Velg ingen
                    </button>
                  )}
                </div>
                
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting || selectedBoliger.size === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-md ${
                    bulkDeleting || selectedBoliger.size === 0
                      ? 'bg-brown-300 text-brown-500 cursor-not-allowed opacity-60'
                      : 'bg-brown-700 text-white hover:bg-brown-800'
                  }`}
                >
                  {bulkDeleting ? (
                    <>
                      <span className="animate-spin">⭘</span>
                      Sletter {selectedBoliger.size} boliger...
                    </>
                  ) : (
                    <>
                      🗑️ Slett {selectedBoliger.size > 0 ? `${selectedBoliger.size} valgte` : 'valgte boliger'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bolig liste */}
            {boliger.map((bolig) => (
              <div key={bolig.id} className={`bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-4 border transition relative ${
                selectedBoliger.has(bolig.id) 
                  ? 'border-brown-400 bg-brown-50' 
                  : 'border-brown-100 hover:shadow-lg'
              }`}>
                {/* Checkbox for selecting */}
                <div className="absolute top-4 left-4">
                  <input
                    type="checkbox"
                    checked={selectedBoliger.has(bolig.id)}
                    onChange={() => toggleBoligSelection(bolig.id)}
                    className="w-5 h-5 text-brown-600 bg-white border-brown-300 rounded focus:ring-brown-500 focus:ring-2"
                  />
                </div>
                
                <img src={bolig.bilde || '/placeholder-home.jpg'} alt="Bolig" className="w-32 h-24 object-cover rounded-lg shadow ml-8 md:ml-0" />
                <div className="flex-1">
                  <h4 className="text-2xl font-seriflogo font-bold text-brown-900 mb-1">{bolig.adresse}</h4>
                  <div className="text-brown-700 font-semibold mb-1">{bolig.pris?.toLocaleString("no-NO")} kr – {bolig.type || 'Ukjent type'}</div>
                  <div className="text-brown-400 text-xs mt-1">{bolig.lenke}</div>
                  
                  {/* Ekstra boliginfo hvis tilgjengelig */}
                  {(bolig.bruksareal_m2 || bolig.byggeaar_tall) && (
                    <div className="text-brown-500 text-sm mt-2">
                      {bolig.bruksareal_m2 && `${bolig.bruksareal_m2}m²`}
                      {bolig.bruksareal_m2 && bolig.byggeaar_tall && ' • '}
                      {bolig.byggeaar_tall && `Byggeår ${bolig.byggeaar_tall}`}
                    </div>
                  )}
                  
                  {/* Kostnader */}
                  {(bolig.kommunale_avg_kr || bolig.eiendomsskatt_kr || bolig.felleskostnader_kr) && (
                    <div className="text-brown-400 text-xs mt-2 space-y-1">
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
                  )}
                </div>
                
                                 {/* Action knapper */}
                 <div className="flex flex-col gap-2">
                   {/* Vis til Finn-lenke hvis tilgjengelig - alltid synlig */}
                   {bolig.lenke && (
                     <a
                       href={bolig.lenke}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-4 py-2 rounded-lg text-sm font-medium bg-brown-700 text-white hover:bg-brown-800 transition text-center shadow-md"
                     >
                       Se på Finn
                     </a>
                   )}
                   
                   {/* Slett-knapp */}
                   <button
                     onClick={() => handleDeleteBolig(bolig.id, bolig.adresse || 'Ukjent adresse')}
                     disabled={deletingId === bolig.id || bulkDeleting}
                     className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                       deletingId === bolig.id || bulkDeleting
                         ? 'bg-brown-200 text-brown-400 cursor-not-allowed'
                         : 'bg-brown-100 text-brown-700 hover:bg-brown-200 hover:text-brown-800'
                     }`}
                     title="Slett denne boligen permanent"
                   >
                     {deletingId === bolig.id ? (
                       <>
                         <span className="animate-spin">⭘</span>
                         Sletter...
                       </>
                     ) : (
                       <>
                         🗑️ Slett bolig
                       </>
                     )}
                   </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

