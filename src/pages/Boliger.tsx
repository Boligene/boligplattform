export default function Boliger() {
  return (
    <div className="min-h-screen bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center py-10">
      {/* Midlertidig tittel */}
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 mb-8">Boligsøk og sammenligning</h1>

      {/* Tomt område for søkeresultater / innhold */}
      <div className="bg-white/90 rounded-2xl shadow-lg w-full max-w-3xl p-10 flex flex-col items-center min-h-[300px]">
        <p className="text-brown-800 text-lg">
          Her kommer søkeresultater og sammenligning av boliger.  
          <br />
          <span className="text-brown-500 text-base">Siden er under utvikling.</span>
        </p>
      </div>
    </div>
  );
}
