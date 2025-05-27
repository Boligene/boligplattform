// Hent kvadratmeterpriser fra SSB Statbank API (tabell 07241)
// Dokumentasjon: https://www.ssb.no/omssb/tjenester-og-verktoy/api
// Tabell: https://www.ssb.no/statbank/table/07241/

export type SSBKvmPris = {
  område: string; // f.eks. kommune eller "Hele landet"
  boligtype: string; // f.eks. "Enebolig", "Blokk", "Rekkehus"
  pris: number;
  år: string;
  kvartal: string;
};

// Hent siste tilgjengelige kvartal og år automatisk
type SSBResponse = {
  value: number[];
  dimension: {
    Tid: { category: { index: Record<string, number>; label: Record<string, string> } };
    Boligtype: { category: { index: Record<string, number>; label: Record<string, string> } };
    ContentsCode: { category: { index: Record<string, number>; label: Record<string, string> } };
    Region: { category: { index: Record<string, number>; label: Record<string, string> } };
  };
};

// Fallback-data (importeres kun ved behov)
let fallbackData: SSBKvmPris[] | null = null;
async function getFallbackData(): Promise<SSBKvmPris[]> {
  if (fallbackData) return fallbackData;
  // Prøv å importere fallback, men håndter hvis filen ikke finnes
  try {
    const mod = await import("../data/ssb_kvm_fallback.json");
    fallbackData = mod.default as SSBKvmPris[];
    return fallbackData;
  } catch (err) {
    throw new Error("Fallback-data mangler: Opprett src/data/ssb_kvm_fallback.json med eksportert SSBKvmPris[] for offline-støtte.");
  }
}

// Strukturér til priser[periode][postnummer][boligtype] = pris
export function structureSsbPriserByPeriodePostnummer(
  priser: SSBKvmPris[],
  postnummerTilKommune: Record<string, string>
): Record<string, Record<string, Record<string, number>>> {
  const result: Record<string, Record<string, Record<string, number>>> = {};
  for (const entry of priser) {
    const periode = `Q${entry.kvartal} ${entry.år}`;
    if (!result[periode]) result[periode] = {};
    const kommuneNavn = entry.område.trim().toLowerCase();
    const relevantePostnummer = Object.entries(postnummerTilKommune)
      .filter(([, kommune]) => kommune.trim().toLowerCase() === kommuneNavn)
      .map(([postnr]) => postnr);
    for (const postnr of relevantePostnummer) {
      if (!result[periode][postnr]) result[periode][postnr] = {};
      result[periode][postnr][entry.boligtype] = entry.pris;
    }
    if (kommuneNavn === "hele landet") {
      if (!result[periode]["*"]) result[periode]["*"] = {};
      result[periode]["*"][entry.boligtype] = entry.pris;
    }
  }
  return result;
}

// Oppdater fetchSsbKvmPriser til å hente alle perioder
export async function fetchSsbKvmPriser(): Promise<SSBKvmPris[]> {
  const url = "https://data.ssb.no/api/v0/no/table/07241";
  const query = {
    query: [
      { code: "Region", selection: { filter: "all", values: [] } },
      { code: "Boligtype", selection: { filter: "all", values: [] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["Kvadratmeterpris"] } },
      { code: "Tid", selection: { filter: "all", values: [] } } // Hent alle perioder
    ],
    response: { format: "json-stat2" }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query)
    });
    if (!res.ok) throw new Error("Kunne ikke hente data fra SSB");
    const data: SSBResponse = await res.json();

    // Finn labels for region, boligtype, tid
    const regionLabels = data.dimension.Region.category.label;
    const boligtypeLabels = data.dimension.Boligtype.category.label;
    const tidLabels = data.dimension.Tid.category.label;
    const tidKeys = Object.keys(tidLabels);

    // Data er flat array, rekkefølge: region x boligtype x tid
    const regionKeys = Object.keys(regionLabels);
    const boligtypeKeys = Object.keys(boligtypeLabels);
    const result: SSBKvmPris[] = [];
    let i = 0;
    for (const tidKey of tidKeys) {
      const tidLabel = tidLabels[tidKey];
      const [år, kvartal] = tidLabel.split("-");
      for (const regionKey of regionKeys) {
        for (const boligtypeKey of boligtypeKeys) {
          const pris = data.value[i];
          if (pris && !isNaN(pris)) {
            result.push({
              område: regionLabels[regionKey],
              boligtype: boligtypeLabels[boligtypeKey],
              pris,
              år,
              kvartal
            });
          }
          i++;
        }
      }
    }
    return result;
  } catch (err) {
    // Fallback til lokal fil
    return await getFallbackData();
  }
} 