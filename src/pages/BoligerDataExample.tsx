import * as React from 'react';
import { supabase } from '../supabaseClient';
import { Tables } from '../types/database.types';

type Bolig = Tables<'boliger'>;

const BoligerDataExample: React.FC = () => {
  const [boliger, setBoliger] = React.useState<Bolig[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // For enkel add-form
  const [adresse, setAdresse] = React.useState('');
  const [pris, setPris] = React.useState<number>(0);
  const [type, setType] = React.useState('');
  const [bilde, setBilde] = React.useState('');
  const [lenke, setLenke] = React.useState('');

  const fetchBoliger = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('boliger')
      .select('*')
      .order('opprettet', { ascending: false });
    if (error) setError(error.message);
    else setBoliger(data || []);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchBoliger();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Get current user for bruker_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Du må være logget inn for å legge til boliger');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('boliger').insert([
      { 
        adresse, 
        pris, 
        type, 
        bilde, 
        lenke,
        bruker_id: user.id,
        tittel: adresse // Use address as title if not provided
      }
    ]);
    if (error) setError(error.message);
    else {
      setAdresse(''); setPris(0); setType(''); setBilde(''); setLenke('');
      fetchBoliger();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Boliger fra Supabase</h1>
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse" className="border p-2 rounded" required />
        <input value={pris} onChange={e => setPris(Number(e.target.value))} type="number" placeholder="Pris" className="border p-2 rounded" required />
        <input value={type} onChange={e => setType(e.target.value)} placeholder="Type" className="border p-2 rounded" required />
        <input value={bilde} onChange={e => setBilde(e.target.value)} placeholder="Bilde-url" className="border p-2 rounded" />
        <input value={lenke} onChange={e => setLenke(e.target.value)} placeholder="Lenke" className="border p-2 rounded" />
        <button type="submit" className="col-span-1 md:col-span-5 bg-blue-600 text-white py-2 rounded disabled:opacity-50" disabled={loading}>Legg til bolig</button>
      </form>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading && <div>Laster...</div>}
      <ul className="space-y-2">
        {boliger.map(bolig => (
          <li key={bolig.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center gap-2">
            {bolig.bilde && <img src={bolig.bilde} alt="bilde" className="w-24 h-16 object-cover rounded" />}
            <div className="flex-1">
              <div className="font-semibold">{bolig.adresse}</div>
              <div>{bolig.type} | {bolig.pris?.toLocaleString()} kr</div>
              {bolig.lenke && <a href={bolig.lenke} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Se annonse</a>}
            </div>
            <div className="text-xs text-gray-500">{bolig.opprettet && new Date(bolig.opprettet).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BoligerDataExample; 