import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Bolig, BoligInsert } from '../types/database.types';

export default function RLSDemo() {
  const [user, setUser] = useState<any>(null);
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [offentligeBoliger, setOffentligeBoliger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);

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
    if (user) {
      runRLSTests();
    }
  }, [user]);

  const runRLSTests = async () => {
    setLoading(true);
    const results: string[] = [];

    try {
      // Test 1: Hent boliger (RLS skal automatisk filtrere til brukerens boliger)
      const { data: brukerBoliger, error: selectError } = await supabase
        .from('boliger')
        .select('*');
      
      if (selectError) {
        results.push(`❌ SELECT feilet: ${selectError.message}`);
      } else {
        results.push(`✅ SELECT: Hentet ${brukerBoliger?.length || 0} boliger (kun dine egne pga RLS)`);
        setBoliger(brukerBoliger || []);
      }

      // Test 2: Hent offentlige boliger (view uten bruker-info)
      const { data: offentlige, error: viewError } = await supabase
        .from('offentlige_boliger')
        .select('*');
      
      if (viewError) {
        results.push(`❌ VIEW feilet: ${viewError.message}`);
      } else {
        results.push(`✅ VIEW: Hentet ${offentlige?.length || 0} offentlige boliger`);
        setOffentligeBoliger(offentlige || []);
      }

      // Test 3: Prøv å opprette en bolig med riktig bruker_id
      const testBolig: BoligInsert = {
        bruker_id: user!.id,
        adresse: "RLS Test Adresse 123",
        pris: 1000000,
        type: "leilighet",
        bruksareal_m2: 50,
        byggeaar_tall: 2024,
        status: "aktiv",
        tittel: "RLS Test Bolig"
      };

      const { error: insertError } = await supabase
        .from('boliger')
        .insert(testBolig);

      if (insertError) {
        results.push(`❌ INSERT feilet: ${insertError.message}`);
      } else {
        results.push(`✅ INSERT: Opprettet testbolig med riktig bruker_id`);
      }

      // Test 4: Prøv å opprette en bolig med feil bruker_id (skal feile)
      const feilBolig: BoligInsert = {
        bruker_id: '00000000-0000-0000-0000-000000000000', // Fiktiv ID
        adresse: "Denne skal feile",
        pris: 999999,
        type: "enebolig",
        tittel: "Skal ikke fungere"
      };

      const { error: forbiddenInsertError } = await supabase
        .from('boliger')
        .insert(feilBolig);

      if (forbiddenInsertError) {
        results.push(`✅ RLS FUNGERER: Kan ikke opprette bolig med fremmed bruker_id`);
      } else {
        results.push(`❌ RLS PROBLEM: Klarte å opprette bolig med fremmed bruker_id`);
      }

      // Test 5: Test slette-funksjonalitet på testbolig
      if (brukerBoliger && brukerBoliger.length > 0) {
        const testBoligTilSletting = brukerBoliger.find(b => b.tittel === 'RLS Test Bolig');
        if (testBoligTilSletting) {
          const { error: deleteError } = await supabase
            .from('boliger')
            .delete()
            .eq('id', testBoligTilSletting.id);

          if (deleteError) {
            results.push(`❌ DELETE feilet: ${deleteError.message}`);
          } else {
            results.push(`✅ DELETE: Slettet testbolig med RLS beskyttelse`);
          }
        }
      }

    } catch (error) {
      results.push(`❌ Uventet feil: ${error}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  const cleanupTestData = async () => {
    const { error } = await supabase
      .from('boliger')
      .delete()
      .eq('tittel', 'RLS Test Bolig');
    
    if (!error) {
      setTestResults(prev => [...prev, '🧹 Ryddet opp testdata']);
      runRLSTests(); // Kjør testene på nytt
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
        <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-4xl p-10">
          <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-4">RLS Demo</h1>
          <p className="text-brown-700">
            Du må være innlogget for å teste Row Level Security (RLS) funksjonalitet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
      <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-6xl p-10">
        <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-6">RLS Demo</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Results */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-brown-800 mb-4">RLS Test Resultater</h2>
            {loading ? (
              <p className="text-brown-600">Kjører RLS tester...</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {result}
                  </div>
                ))}
                <button
                  onClick={runRLSTests}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                >
                  Kjør tester på nytt
                </button>
                <button
                  onClick={cleanupTestData}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Rydd opp testdata
                </button>
              </div>
            )}
          </div>

          {/* Mine Boliger */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-brown-800 mb-4">Mine Boliger (RLS Filtrert)</h2>
            <p className="text-sm text-brown-600 mb-4">
              Disse boligene er hentet med: <code className="bg-gray-100 px-1 rounded">supabase.from('boliger').select('*')</code>
              <br />
              RLS sørger automatisk for at du kun ser dine egne boliger.
            </p>
            {boliger.length === 0 ? (
              <p className="text-brown-500">Ingen boliger funnet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {boliger.map((bolig, index) => (
                  <div key={bolig.id} className="bg-gray-50 p-3 rounded text-sm">
                    <strong>{bolig.adresse}</strong>
                    <br />
                    <span className="text-gray-600">
                      {bolig.pris?.toLocaleString('no-NO')} kr - {bolig.type}
                    </span>
                    <br />
                    <span className="text-xs text-gray-500">
                      Bruker ID: {bolig.bruker_id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offentlige Boliger */}
          <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-brown-800 mb-4">Offentlige Boliger (View)</h2>
            <p className="text-sm text-brown-600 mb-4">
              Disse boligene er hentet fra <code className="bg-gray-100 px-1 rounded">offentlige_boliger</code> view.
              Denne view viser alle aktive boliger uten å eksponere bruker-informasjon.
            </p>
            {offentligeBoliger.length === 0 ? (
              <p className="text-brown-500">Ingen offentlige boliger funnet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {offentligeBoliger.map((bolig, index) => (
                  <div key={bolig.id || index} className="bg-gray-50 p-3 rounded text-sm">
                    <strong>{bolig.adresse}</strong>
                    <br />
                    <span className="text-gray-600">
                      {bolig.pris?.toLocaleString('no-NO')} kr - {bolig.type}
                    </span>
                    <br />
                    <span className="text-xs text-green-600">
                      ✓ Ingen bruker-info eksponert
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Forklaring */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Hvordan RLS Fungerer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-semibold mb-2">🔒 Automatisk Sikkerhet:</h4>
              <ul className="space-y-1">
                <li>• SELECT: Kun dine egne boliger</li>
                <li>• INSERT: Kun med din bruker_id</li>
                <li>• UPDATE: Kun dine egne boliger</li>
                <li>• DELETE: Kun dine egne boliger</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Fordeler:</h4>
              <ul className="space-y-1">
                <li>• Ingen manuell filtrering nødvendig</li>
                <li>• Sikkerhet på database-nivå</li>
                <li>• Automatisk på alle API-kall</li>
                <li>• Ingen kode-duplikasjon</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 