import React, { createContext, useContext, useState } from "react";

export type Bolig = {
  id: string;
  adresse: string;
  pris: number;
  felleskostnader?: number;
  type?: string;
  soverom?: number;
  areal?: string;
  bilde?: string;
  [key: string]: any;
};

type BoligContextType = {
  boliger: Bolig[];
  addBolig: (b: Bolig) => void;
  valgtBolig: Bolig | null;
  setValgtBolig: (b: Bolig | null) => void;
};

const BoligContext = createContext<BoligContextType | undefined>(undefined);

export const useBolig = () => {
  const ctx = useContext(BoligContext);
  if (!ctx) throw new Error("useBolig må brukes inni BoligProvider");
  return ctx;
};

export const BoligProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boliger, setBoliger] = useState<Bolig[]>([]);
  const [valgtBolig, setValgtBolig] = useState<Bolig | null>(null);

  const addBolig = (b: Bolig) => setBoliger(prev => [...prev, b]);

  return (
    <BoligContext.Provider value={{ boliger, addBolig, valgtBolig, setValgtBolig }}>
      {children}
    </BoligContext.Provider>
  );
};
