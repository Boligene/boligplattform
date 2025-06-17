import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import LogoutButton from './components/LogoutButton';
import AIBoligassistentPage from './pages/AIBoligassistent';
import AuthCallback from './pages/AuthCallback';
import Boliger from './pages/Boliger';
import BoligerDataExample from './pages/BoligerDataExample';
import HjelpeverktoyForBoligkjopere from './pages/HjelpeverktoyForBoligkjopere';
import Home from './pages/Home';
import Kalkulatorer from "./pages/Kalkulatorer";
import Kjopskalkulator from "./pages/Kjopskalkulator";
import Login from './pages/Login';
import MineBoliger from './pages/MineBoliger';
import Oppussing from './pages/Oppussing';
import OppussingPremium from './pages/OppussingPremium';

import Sammenlign from "./pages/Sammenlign";
import SjekklisteForBoligkjop from './pages/SjekklisteForBoligkjop';
import SjekklisteVisning from './pages/SjekklisteVisning';
import TakstrapportAnalyse from "./pages/TakstrapportAnalyse";
import Utleiekalkulator from "./pages/Utleiekalkulator";
import Verdivurdering from './pages/Verdivurdering';
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
        <Link to="/ai-boligassistent" className="hover:text-brown-500 transition">AI-Assistent</Link>
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
        <Route path="/ai-boligassistent" element={<AIBoligassistentPage />} />
        <Route path="/kalkulatorer" element={<Kalkulatorer />} />
        <Route path="/kjopskalkulator" element={<Kjopskalkulator />} />
        <Route path="/utleiekalkulator" element={<Utleiekalkulator />} />
        <Route path="/mineboliger" element={<MineBoliger />} />
        <Route path="/boliger" element={<Boliger />} />
        <Route path="/oppussing" element={<Oppussing />} />
        <Route path="/oppussing-premium" element={<OppussingPremium />} />
        <Route path="/sammenlign" element={<Sammenlign />} />
        <Route path="/verdivurdering" element={<Verdivurdering />} />
        <Route path="/takstrapportanalyse" element={<TakstrapportAnalyse />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/BoligerDataExample" element={<BoligerDataExample />} />
        <Route path="/sjekkliste-visning" element={<SjekklisteVisning />} />
        <Route path="/sjekkliste-for-boligkjop" element={<SjekklisteForBoligkjop />} />
        <Route path="/hjelpeverktoy-for-boligkjopere" element={<HjelpeverktoyForBoligkjopere />} />
        
      </Routes>
    </>
  );
};

export default App;
