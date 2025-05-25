import { useBolig } from "../context/BoligContext";

export default function MineBoliger() {
  const { boliger } = useBolig();

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-8">Mine boliger</h1>
      <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-3xl p-10 flex flex-col items-center min-h-[300px]">
        {boliger.length === 0 ? (
          <p className="text-brown-800 text-lg">
            Du har ikke lagret noen boliger ennå.
            <br />
            <span className="text-brown-500 text-base">Legg inn en FINN-lenke på forsiden for å importere bolig.</span>
          </p>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {boliger.map((bolig) => (
              <a
                key={bolig.id}
                href={bolig.lenke}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-4 border border-brown-100 hover:shadow-lg transition"
              >
                <img
                  src={bolig.bilde}
                  alt="Bolig"
                  className="w-32 h-24 object-cover rounded-lg shadow"
                />
                <div className="flex-1">
                  <h4 className="text-2xl font-seriflogo font-bold text-brown-900 mb-1">{bolig.adresse}</h4>
                  <div className="text-brown-700 font-semibold mb-1">
                    {bolig.pris && bolig.pris.toLocaleString
                      ? bolig.pris.toLocaleString("no-NO")
                      : bolig.pris} kr – {bolig.type}
                  </div>
                  <div className="text-brown-600 text-sm">
                    {bolig.soverom} soverom • {bolig.areal}
                  </div>
                  <div className="text-brown-400 text-xs mt-1">{bolig.lenke}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
