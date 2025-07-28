import { Bot, Building2, Calculator, Zap } from "lucide-react";
import React from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="text-center group">
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-brown-100 rounded-full mb-4 sm:mb-6 shadow-lg group-hover:bg-brown-200 group-hover:scale-110 transition-all duration-300">
        <div className="text-brown-800 w-8 h-8 sm:w-10 sm:h-10">
          {icon}
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl font-seriflogo font-bold text-brown-900 mb-3 sm:mb-4">
        {title}
      </h3>
      <p className="text-brown-700 leading-relaxed text-base sm:text-lg">
        {description}
      </p>
    </div>
  );
};

export const ValueProposition: React.FC = () => {
  const features = [
    {
      icon: <Bot className="w-full h-full" />,
      title: "AI-Assistent",
      description: "Avansert boliganalyse med automatisk datahenting og intelligente anbefalinger basert på markedsdata"
    },
    {
      icon: <Building2 className="w-full h-full" />,
      title: "FINN-Integrasjon",
      description: "Direkte import av boligdata fra FINN.no annonser med omfattende detaljer og automatisk organisering"
    },
    {
      icon: <Calculator className="w-full h-full" />,
      title: "Profesjonelle Verktøy",
      description: "Komplette kalkulatorer for kjøpskostnader, verdivurdering, oppussing og utleiepotensialet"
    }
  ];

  return (
    <section id="value-proposition" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-screen-xl mx-auto px-4 pl-safe pr-safe">
        
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-brown-500 rounded-full mb-6 sm:mb-8">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-seriflogo font-bold text-brown-900 mb-4 sm:mb-6">
            Hvorfor Boligene?
          </h2>
          
          <p className="text-lg sm:text-xl text-brown-700 max-w-3xl mx-auto leading-relaxed">
            Vi kombinerer kunstig intelligens, markedsdata og profesjonelle verktøy 
            for å gi deg den beste boligopplevelsen i Norge
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 lg:gap-16">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16 lg:mt-20">
          <div className="inline-flex flex-col sm:flex-row gap-4 sm:gap-6">
            <button
              onClick={() => {
                const element = document.getElementById('tools-grid');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="rounded-full py-4 px-8 bg-brown-500 text-white font-semibold text-lg hover:bg-brown-600 hover:scale-105 transition-all shadow-xl tap-target"
            >
              Se alle verktøy
            </button>
            
            <button
              onClick={() => {
                const element = document.getElementById('ai-callout');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="rounded-full py-4 px-8 bg-transparent border-2 border-brown-500 text-brown-500 font-semibold text-lg hover:bg-brown-500 hover:text-white hover:scale-105 transition-all tap-target"
            >
              Prøv AI-analysen
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}; 