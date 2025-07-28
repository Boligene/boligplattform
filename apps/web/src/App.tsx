import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { TransparentNavigation } from './components/TransparentNavigation';
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

const App: React.FC = () => {
  return (
    <>
      <TransparentNavigation />
      {/* Add padding-top to account for fixed navigation */}
      <div className="pt-16">
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
      </div>
    </>
  );
};

export default App;
