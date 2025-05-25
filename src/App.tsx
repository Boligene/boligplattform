import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Kalkulatorer from "./pages/Kalkulatorer";
import Kalkulator from './pages/Kalkulator';
import MineBoliger from './pages/MineBoliger';
import Boliger from './pages/Boliger';
import Oppussing from './pages/Oppussing';
import Utleiekalkulator from "./pages/Utleiekalkulator";
import Kjopskalkulator from "./pages/Kjopskalkulator";

// Header-komponent her (kopiert fra Home.tsx)
function Header() {
  return (
    <header className="w-full flex justify-between items-center py-6 px-10 bg-white/90 shadow-lg rounded-b-2xl mb-8">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 tracking-tight">
        <Link to="/">Boligene</Link>
      </h1>
      <nav className="flex gap-8 font-medium text-brown-800">
        <Link to="/" className="hover:text-brown-500 transition">Hjem</Link>
        <Link to="/boliger" className="hover:text-brown-500 transition">Boliger</Link>
        <Link to="/kalkulatorer" className="...">Kalkulatorer</Link>
        <Link to="/mineboliger" className="hover:text-brown-500 transition">Mine boliger</Link>
      </nav>
      <button className="rounded-full px-6 py-2 bg-brown-100 text-brown-800 font-semibold hover:bg-brown-200 transition shadow">
        Logg inn
      </button>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kalkulator" element={<Kalkulator />} />
        <Route path="/kalkulatorer" element={<Kalkulatorer />} />
         <Route path="/kjopskalkulator" element={<Kjopskalkulator />} />
         <Route path="/utleiekalkulator" element={<Utleiekalkulator />} />
        <Route path="/mineboliger" element={<MineBoliger />} />
        <Route path="/boliger" element={<Boliger />} />
        <Route path="/oppussing" element={<Oppussing />} />
      </Routes>
    </Router>
  );
}
