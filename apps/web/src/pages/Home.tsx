import React from "react";
import { Link } from "react-router-dom";
import { CalloutAI } from "../components/CalloutAI";
import { HeroSection } from "../components/HeroSection";
import { ToolsGrid } from "../components/ToolsGrid";
import { ValueProposition } from "../components/ValueProposition";

const Footer: React.FC = () => {
  return (
    <footer className="bg-brown-900 text-white py-16 sm:py-20">
      <div className="max-w-screen-xl mx-auto px-4 pl-safe pr-safe">
        <div className="grid md:grid-cols-4 gap-8 sm:gap-12">
          
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl sm:text-3xl font-seriflogo font-bold text-brown-300 mb-4">
              Boligene
            </h3>
            <p className="text-brown-200 mb-6 leading-relaxed max-w-md">
              Din smarte partner for boliganalyse, kalkulatorer og FINN-integrasjon. 
              Vi gjør boligkjøp enklere med AI-drevet teknologi.
            </p>
            <div className="flex gap-4">
              <Link to="/" className="text-brown-300 hover:text-white transition-colors tap-target">
                Hjem
              </Link>
              <span className="text-brown-500">|</span>
              <Link to="/ai-boligassistent" className="text-brown-300 hover:text-white transition-colors tap-target">
                AI-Assistent
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-brown-300 mb-4">Verktøy</h4>
            <ul className="space-y-2">
              <li><Link to="/boliger" className="text-brown-200 hover:text-white transition-colors tap-target">Boliger</Link></li>
              <li><Link to="/ai-boligassistent" className="text-brown-200 hover:text-white transition-colors tap-target">AI-Assistent</Link></li>
              <li><Link to="/kalkulatorer" className="text-brown-200 hover:text-white transition-colors tap-target">Kalkulatorer</Link></li>
              <li><Link to="/oppussing" className="text-brown-200 hover:text-white transition-colors tap-target">Oppussing</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-brown-300 mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/hjelpeverktoy-for-boligkjopere" className="text-brown-200 hover:text-white transition-colors tap-target">Hjelpeverktøy</Link></li>
              <li><Link to="/mineboliger" className="text-brown-200 hover:text-white transition-colors tap-target">Mine boliger</Link></li>
              <li><Link to="/login" className="text-brown-200 hover:text-white transition-colors tap-target">Logg inn</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-brown-700 mt-12 pt-8 text-center">
          <p className="text-brown-300 text-sm">
            © 2024 Boligene. Moderne norsk boligplattform med AI-teknologi.
          </p>
        </div>
      </div>
    </footer>
  );
};

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Navigation */}
      {/* TransparentNavigation component was removed as it's now handled globally in App.tsx */}

      {/* Hero Section (includes ImportedBoligerSection) */}
      <HeroSection />

      {/* Value Proposition */}
      <ValueProposition />

      {/* Tools Grid */}
      <ToolsGrid />

      {/* AI Callout */}
      <CalloutAI />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;
