import * as React from 'react';
import { Link } from 'react-router-dom';
import { Home, Calculator, CheckSquare, TrendingUp, FileText, DollarSign } from 'lucide-react';

const HjelpeverktoyForBoligkjopere: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col">
      <main className="flex-1 w-full p-6 lg:p-12">
        
        {/* Header */}
        <div className="bg-white/80 rounded-2xl shadow-xl p-6 w-full max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-seriflogo font-bold text-brown-900">
              Hjelpeverktøy for boligkjøpere
            </h1>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-brown-600 text-white rounded-full hover:bg-brown-700 transition font-semibold shadow-md"
            >
              <Home className="w-5 h-5" />
              Tilbake til hjem
            </Link>
          </div>
          <p className="text-brown-700 leading-relaxed">
            Samling av nyttige verktøy og sjekklister for å hjelpe deg gjennom boligkjøpsprosessen.
          </p>
        </div>

        {/* Verktøy */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sjekkliste for boligkjøp */}
            <Link 
              to="/sjekkliste-for-boligkjop"
              className="group bg-white/80 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] block"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-brown-100 p-3 rounded-full group-hover:bg-brown-200 transition-colors">
                  <DollarSign className="w-8 h-8 text-brown-700" />
                </div>
                <h2 className="text-xl font-seriflogo font-bold text-brown-900 group-hover:text-brown-700 transition-colors">
                  Sjekkliste for boligkjøp
                </h2>
              </div>
              <p className="text-brown-600 leading-relaxed mb-4">
                Omfattende guide som veileder deg gjennom hele kjøpsprosessen, fra forberedelse til budgiving. Inkluderer budsimulator og risikovurdering.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-brown-500">
                  Komplett kjøpsguide
                </span>
                <span className="text-brown-400 group-hover:text-brown-600 transition-colors">
                  →
                </span>
              </div>
            </Link>

            {/* Sjekkliste for visning */}
            <Link 
              to="/sjekkliste-visning"
              className="group bg-white/80 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] block"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-brown-100 p-3 rounded-full group-hover:bg-brown-200 transition-colors">
                  <CheckSquare className="w-8 h-8 text-brown-700" />
                </div>
                <h2 className="text-xl font-seriflogo font-bold text-brown-900 group-hover:text-brown-700 transition-colors">
                  Sjekkliste for visning
                </h2>
              </div>
              <p className="text-brown-600 leading-relaxed mb-4">
                Detaljert sjekkliste for å vurdere boligens tilstand under visning. Inkluderer tekniske punkter og notatmuligheter.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-brown-500">
                  Befaring og vurdering
                </span>
                <span className="text-brown-400 group-hover:text-brown-600 transition-colors">
                  →
                </span>
              </div>
            </Link>

          </div>
        </div>

      </main>
    </div>
  );
};

export default HjelpeverktoyForBoligkjopere; 