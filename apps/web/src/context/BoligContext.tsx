// src/context/BoligContext.tsx

import React, { createContext, useContext, useState } from "react";

// Oppdatert Bolig-type med alle nye felter fra oppgradert scraper
export type Bolig = {
  id: string;
  adresse: string;
  pris: number;
  type: string;
  bilde: string;
  lenke: string;
  tittel?: string;
  
  // Grunnleggende boligdata
  bruksareal?: string;
  primaerareal?: string;
  totalareal?: string;
  antallRom?: string;
  antallSoverom?: string;
  etasje?: string;
  eierform?: string;
  byggeaar?: string;
  energimerking?: string;
  
  // Økonomiske data
  kommunaleAvg?: string;
  eiendomsskatt?: string;
  felleskostnader?: string;
  fellesgjeld?: string;
  prisPerKvm?: string;
  formuesverdi?: string;
  
  // Fasiliteter
  parkering?: string;
  balkong?: string;
  terrasse?: string;
  hage?: string;
  kjeller?: string;
  oppvarming?: string;
  
  // Beliggenhet
  kommune?: string;
  bydel?: string;
  postnummer?: string;
  
  // Salgsinfo
  megler?: string;
  visningsdato?: string;
  budfrister?: string;
  
  // Tilleggsdata
  beskrivelse?: string;
  bilder?: string[];
};

type BoligContextType = {
  boliger: Bolig[];
  addBolig: (bolig: Bolig) => void;
  clearBoliger: () => void;
  valgtForSammenligning: string[];
  toggleValgtForSammenligning: (id: string) => void;
  clearSammenligning: () => void;
  removeBolig: (id: string) => void;
};

const BoligContext = createContext<BoligContextType | undefined>(undefined);

export function useBolig() {
  const ctx = useContext(BoligContext);
  if (!ctx) throw new Error("useBolig må brukes innenfor BoligProvider");
  return ctx;
}

export const BoligProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [valgtForSammenligning, setValgtForSammenligning] = useState<string[]>([]);

  function addBolig(bolig: Bolig) {
    setBoliger(prev => [...prev, bolig]);
  }
  function clearBoliger() {
    setBoliger([]);
    setValgtForSammenligning([]);
  }
  function toggleValgtForSammenligning(id: string) {
    setValgtForSammenligning(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  }
  function clearSammenligning() {
    setValgtForSammenligning([]);
  }
  function removeBolig(id: string) {
    setBoliger(prev => prev.filter(b => b.id !== id));
    setValgtForSammenligning(prev => prev.filter(v => v !== id));
  }

  return (
    <BoligContext.Provider value={{
      boliger,
      addBolig,
      clearBoliger,
      valgtForSammenligning,
      toggleValgtForSammenligning,
      clearSammenligning,
      removeBolig
    }}>
      {children}
    </BoligContext.Provider>
  );
};
