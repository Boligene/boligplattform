import Sammenlign from "./pages/Sammenlign";
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Kalkulatorer from "./pages/Kalkulatorer";
import MineBoliger from './pages/MineBoliger';
import Boliger from './pages/Boliger';
import Oppussing from './pages/Oppussing';
import Utleiekalkulator from "./pages/Utleiekalkulator";
import Kjopskalkulator from "./pages/Kjopskalkulator";
import Verdivurdering from './pages/Verdivurdering';
import TakstrapportAnalyse from "./pages/TakstrapportAnalyse";
import Login from './pages/Login';
import BoligerDataExample from './pages/BoligerDataExample';
import LogoutButton from './components/LogoutButton';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Header-komponent
function Header() {
  const [user, setUser] = useState<any>(null);

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

  return (
    <header className="w-full flex flex-col sm:flex-row justify-between items-center py-4 px-2 sm:px-10 bg-white/90 shadow-lg rounded-b-2xl mb-4 sm:mb-8 gap-2 sm:gap-0">
      <h1 className="text-3xl font-seriflogo font-bold text-brown-800 tracking-tight w-full sm:w-auto text-center sm:text-left">
        <Link to="/">Boligene</Link>
      </h1>
      <nav className="flex flex-wrap justify-center gap-4 font-medium text-brown-800 w-full sm:w-auto">
        <Link to="/" className="hover:text-brown-500 transition">Hjem</Link>
        <Link to="/boliger" className="hover:text-brown-500 transition">Boliger</Link>
        <Link to="/kalkulatorer" className="hover:text-brown-500 transition">Kalkulatorer</Link>
        <Link to="/mineboliger" className="hover:text-brown-500 transition">Mine boliger</Link>
      </nav>
      {user ? (
        <LogoutButton />
      ) : (
        <Link
          to="/login"
          className="rounded-full px-6 py-2 bg-brown-100 text-brown-800 font-semibold hover:bg-brown-200 transition shadow w-full sm:w-auto text-center"
        >
        Logg inn
        </Link>
      )}
    </header>
  );
}

const App: React.FC = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kalkulatorer" element={<Kalkulatorer />} />
        <Route path="/kjopskalkulator" element={<Kjopskalkulator />} />
        <Route path="/utleiekalkulator" element={<Utleiekalkulator />} />
        <Route path="/mineboliger" element={<MineBoliger />} />
        <Route path="/boliger" element={<Boliger />} />
        <Route path="/oppussing" element={<Oppussing />} />
        <Route path="/sammenlign" element={<Sammenlign />} />
        <Route path="/verdivurdering" element={<Verdivurdering />} />
        <Route path="/takstrapportanalyse" element={<TakstrapportAnalyse />} />
        <Route path="/login" element={<Login />} />
        <Route path="/BoligerDataExample" element={<BoligerDataExample />} />
      </Routes>
    </>
  );
};

export default App;
