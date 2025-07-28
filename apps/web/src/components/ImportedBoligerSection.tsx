import { supabase } from '@boligplattform/core';
import { ArrowRight, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBolig } from '../context/BoligContext';

export const ImportedBoligerSection: React.FC = () => {
  const {
    boliger,
    clearBoliger,
    valgtForSammenligning,
    toggleValgtForSammenligning,
    removeBolig
  } = useBolig();

  const [user, setUser] = useState<any>(null);
  const [lagreStatus, setLagreStatus] = useState<{[id: string]: string}>({});
  const [favoritter, setFavoritter] = useState<{[localId: string]: string}>({});

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
          const localKey = `${b.adresse}|${b.pris}|${b.type}`;
          favs[localKey] = b.id;
        });
        setFavoritter(favs);
      }
    });
  }, [user]);

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

  if (boliger.length === 0) {
    return null;
  }

  return (
    <div className="py-12 sm:py-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
        <div>
          <h2 className="text-3xl sm:text-4xl font-seriflogo font-bold text-brown-900 mb-2">
            Dine importerte boliger
          </h2>
          <p className="text-lg text-brown-700">
            {boliger.length} bolig{boliger.length !== 1 ? 'er' : ''} hentet fra FINN
          </p>
        </div>
        
        <button
          onClick={clearBoliger}
          className="flex items-center gap-2 px-6 py-3 text-brown-600 hover:text-red-600 hover:bg-red-50/80 rounded-full transition-colors tap-target border border-brown-200/50 hover:border-red-200 bg-white/80 backdrop-blur-sm"
          title="Slett alle boliger"
        >
          <Trash2 className="w-5 h-5" />
          <span className="font-semibold">Slett alle</span>
        </button>
      </div>

      {/* Boliger Grid */}
      <div className="grid gap-6 sm:gap-8">
        {boliger.map((bolig: any) => {
          const valgt = valgtForSammenligning?.includes(bolig.id);
          const localKey = `${bolig.adresse}|${bolig.pris}|${bolig.type}`;
          const erFavoritt = !!favoritter[localKey];
          
          return (
            <div
              key={bolig.id}
              className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 sm:p-8 border-2 
                ${valgt ? 'border-green-500 bg-green-50/90' : 'border-brown-200/50 hover:border-brown-300'}`}
            >
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Image */}
                <div className="lg:w-80 flex-shrink-0">
                  <img
                    src={bolig.bilde || '/placeholder-house.jpg'}
                    alt={bolig.adresse}
                    className="w-full h-48 sm:h-56 lg:h-full object-cover rounded-xl shadow-md"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl sm:text-3xl font-seriflogo font-bold text-brown-900 mb-2 break-words">
                        {bolig.adresse}
                      </h3>
                      <div className="text-xl font-semibold text-brown-700 mb-2">
                        {bolig.pris.toLocaleString("no-NO")} kr • {bolig.type}
                      </div>
                      {bolig.bruksareal && (
                        <div className="text-brown-600 mb-2">
                          Bruksareal: {bolig.bruksareal}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleRemoveBolig(bolig.id)}
                      className="text-brown-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 tap-target flex-shrink-0"
                      title="Slett denne boligen"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                    <label className="flex items-center gap-3 cursor-pointer tap-target">
                      <input
                        type="checkbox"
                        checked={valgt}
                        onChange={() => toggleValgtForSammenligning(bolig.id)}
                        className="w-5 h-5 accent-green-600 rounded"
                      />
                      <span className="text-brown-700 font-medium">
                        Sammenlign
                      </span>
                    </label>
                    
                    {user && (
                      <label className="flex items-center gap-3 cursor-pointer tap-target">
                        <input
                          type="checkbox"
                          checked={erFavoritt}
                          onChange={e => {
                            if (e.target.checked) handleLagreIBasen(bolig);
                            else handleFjernFraFavoritter(bolig);
                          }}
                          className="w-5 h-5 accent-brown-600 rounded"
                        />
                        <span className="text-brown-700 font-medium">
                          Favoritt
                        </span>
                      </label>
                    )}
                  </div>

                  {/* FINN Link */}
                  <div className="text-sm text-brown-500 mb-4 break-all">
                    <a 
                      href={bolig.lenke} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-brown-700 transition-colors"
                    >
                      {bolig.lenke}
                    </a>
                  </div>

                  {/* Status Messages */}
                  {valgt && (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
                      ✓ Valgt for sammenligning
                    </div>
                  )}

                  {user && lagreStatus[bolig.id] && (
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block mr-4 ${
                      lagreStatus[bolig.id] === 'Lagret!' 
                        ? 'bg-green-100 text-green-800' 
                        : lagreStatus[bolig.id] === 'Feil!' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-brown-100 text-brown-800'
                    }`}>
                      {lagreStatus[bolig.id]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sammenlign CTA */}
      {valgtForSammenligning && valgtForSammenligning.length >= 2 && (
        <div className="mt-12 text-center">
          <Link
            to="/sammenlign"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-semibold text-lg rounded-full hover:bg-green-700 hover:scale-105 transition-all shadow-xl tap-target"
          >
            Sammenlign {valgtForSammenligning.length} boliger
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
}; 