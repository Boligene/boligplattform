import React from 'react';
import { AIBoligassistent } from '../components/AIBoligassistent';

const AIBoligassistentPage: React.FC = () => {
  return (
    <div className="min-h-screen relative bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed">
      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/20"></div>
      
      {/* Content */}
      <div className="relative">
        {/* Hero Section */}
        <section className="pt-8 pb-16 sm:pt-12 sm:pb-20">
          <div className="max-w-screen-xl mx-auto px-4 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brown-600 to-brown-700 rounded-3xl mb-6 shadow-2xl">
              <span className="text-3xl">🤖</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-seriflogo font-bold text-brown-900 mb-6">
              AI Boligassistent
            </h1>
            <p className="text-lg sm:text-xl text-brown-800 max-w-3xl mx-auto leading-relaxed mb-8">
              Profesjonell boliganalyse drevet av kunstig intelligens. Automatisk datahenting, salgsoppgave-tolkning og ekspertanbefalinger på sekunder.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto px-4">
            <AIBoligassistent />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIBoligassistentPage; 