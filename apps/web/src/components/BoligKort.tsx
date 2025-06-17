import { useBolig } from "@web/context/BoligContext";
import React from "react";

type BoligKortProps = {
  bolig: {
    id: string;
    adresse: string;
    pris: number;
    type: string;
    bilde: string;
    lenke: string;
  };
};

const BoligKort: React.FC<BoligKortProps> = ({ bolig }) => {
  const { valgtForSammenligning, toggleValgtForSammenligning } = useBolig();
  const valgt = valgtForSammenligning.includes(bolig.id);

  return (
    <div
      className={`relative rounded-xl shadow p-6 flex items-center gap-6 border transition 
      ${valgt ? "border-green-600 bg-green-50" : "border-brown-100 bg-white"}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={valgt}
        onChange={() => toggleValgtForSammenligning(bolig.id)}
        className="absolute top-3 left-3 w-5 h-5 accent-green-500"
        aria-label="Velg for sammenligning"
      />

      {/* Bilde */}
      <img src={bolig.bilde} alt={bolig.adresse} className="w-32 h-24 object-cover rounded-lg shadow mr-6" />

      {/* Info */}
      <div className="flex-1">
        <div className="text-xl font-bold mb-1">{bolig.adresse}</div>
        <div className="text-brown-700 font-semibold mb-1">
          {bolig.pris.toLocaleString("no-NO")} kr – {bolig.type}
        </div>
        <div className="text-brown-400 text-xs mb-2">{bolig.lenke}</div>
        {valgt && <div className="text-green-700 font-bold mt-2">Valgt for sammenligning</div>}
      </div>
    </div>
  );
};

export default BoligKort;
