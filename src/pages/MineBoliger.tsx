import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function MineBoliger() {
  const [user, setUser] = useState<any>(null);
  const [boliger, setBoliger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    supabase.from('boliger').select('*').eq('bruker_id', user.id).then(({ data }) => {
      setBoliger(data || []);
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-brown-800">Du må være innlogget for å se dine boliger.</div>;
  }

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-8">Mine boliger</h1>
      <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-3xl p-10 flex flex-col items-center min-h-[300px]">
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
            {boliger.map((bolig) => (
              <div key={bolig.id} className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-4 border border-brown-100 hover:shadow-lg transition relative">
                <img src={bolig.bilde} alt="Bolig" className="w-32 h-24 object-cover rounded-lg shadow" />
                <div className="flex-1">
                  <h4 className="text-2xl font-seriflogo font-bold text-brown-900 mb-1">{bolig.adresse}</h4>
                  <div className="text-brown-700 font-semibold mb-1">{bolig.pris?.toLocaleString("no-NO")} kr – {bolig.type}</div>
                  <div className="text-brown-400 text-xs mt-1">{bolig.lenke}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

