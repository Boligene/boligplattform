import { Link } from "react-router-dom";

export default function Kalkulatorer() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 w-full max-w-xl mt-10 flex flex-col items-center">
        <h2 className="text-3xl font-seriflogo font-bold text-brown-900 mb-6">Kalkulatorer</h2>
        <div className="flex flex-col gap-6 w-full">
          <Link to="/oppussing" className="rounded-lg bg-brown-50 px-6 py-4 font-semibold text-brown-900 hover:bg-brown-100 shadow transition">Oppussingskalkulator</Link>
          <Link to="/kjopskalkulator" className="rounded-lg bg-brown-50 px-6 py-4 font-semibold text-brown-900 hover:bg-brown-100 shadow transition">Kjøpskostnadskalkulator</Link>
          <Link to="/utleiekalkulator" className="rounded-lg bg-brown-50 px-6 py-4 font-semibold text-brown-900 hover:bg-brown-100 shadow transition">Utleiekalkulator</Link>
        </div>
      </div>
    </div>
  );
}
