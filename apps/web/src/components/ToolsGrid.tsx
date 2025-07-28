import { Calculator, FileText, Hammer, HelpCircle, Home, Star } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

interface ToolCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: 'primary' | 'secondary' | 'tertiary';
}

const ToolCard: React.FC<ToolCardProps> = ({ to, icon, title, description, variant }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-br from-stone-50 to-stone-100 border-stone-200 hover:from-stone-100 hover:to-stone-200 hover:border-stone-300';
      case 'secondary':
        return 'bg-gradient-to-br from-brown-50 to-brown-100 border-brown-200 hover:from-brown-100 hover:to-brown-200 hover:border-brown-300';
      case 'tertiary':
        return 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 hover:from-slate-100 hover:to-slate-200 hover:border-slate-300';
      default:
        return 'bg-gradient-to-br from-stone-50 to-stone-100 border-stone-200 hover:from-stone-100 hover:to-stone-200 hover:border-stone-300';
    }
  };

  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl ${getVariantStyles()} p-6 sm:p-8 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-2xl tap-target border-2 text-brown-900`}
    >
      {/* Subtle overlay pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-transparent via-brown-900 to-transparent group-hover:opacity-[0.04] transition-opacity"></div>
      
      {/* Content */}
      <div className="relative flex flex-col items-center text-center h-full min-h-[160px]">
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md group-hover:shadow-xl group-hover:scale-110 transition-all border border-brown-100">
          <div className="w-8 h-8 sm:w-10 sm:h-10 text-brown-700 group-hover:text-brown-800 transition-colors">
            {icon}
          </div>
        </div>
        
        <h3 className="text-lg sm:text-xl font-seriflogo font-bold mb-2 sm:mb-3 leading-tight text-brown-800 group-hover:text-brown-900 transition-colors">
          {title}
        </h3>
        
        <p className="text-sm sm:text-base leading-relaxed flex-1 text-brown-600 group-hover:text-brown-700 transition-colors">
          {description}
        </p>
        
        {/* Hover arrow */}
        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <span className="text-xs sm:text-sm font-semibold bg-brown-800/10 text-brown-800 px-4 py-2 rounded-full border border-brown-200">
            Utforsk →
          </span>
        </div>
      </div>
    </Link>
  );
};

export const ToolsGrid: React.FC = () => {
  const tools = [
    {
      to: "/boliger",
      icon: <Home className="w-full h-full" />,
      title: "Boliger",
      description: "Administrer og sammenlign dine favorittboliger",
      variant: 'primary' as const
    },
    {
      to: "/ai-boligassistent",
      icon: <Star className="w-full h-full" />,
      title: "AI-Assistent", 
      description: "Intelligent boliganalyse og anbefalinger",
      variant: 'secondary' as const
    },
    {
      to: "/oppussing",
      icon: <Hammer className="w-full h-full" />,
      title: "Oppussing",
      description: "Kalkuler kostnader for renovering og oppgradering", 
      variant: 'tertiary' as const
    },
    {
      to: "/kjopskalkulator", 
      icon: <Calculator className="w-full h-full" />,
      title: "Kjøpskalkulator",
      description: "Beregn totale kjøpskostnader og månedlige utgifter",
      variant: 'primary' as const
    },
    {
      to: "/verdivurdering",
      icon: <Calculator className="w-full h-full" />,
      title: "Verdivurdering", 
      description: "Estimer markedsverdi basert på sammenlignbare salg",
      variant: 'secondary' as const
    },
    {
      to: "/hjelpeverktoy-for-boligkjopere",
      icon: <HelpCircle className="w-full h-full" />,
      title: "Hjelpeverktøy",
      description: "Sjekklister og veiledning for boligkjøp",
      variant: 'tertiary' as const
    }
  ];

  return (
    <section id="tools-grid" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-screen-xl mx-auto px-4 pl-safe pr-safe">
        
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-seriflogo font-bold text-brown-900 mb-4 sm:mb-6">
            Alle verktøy du trenger
          </h2>
          
          <p className="text-lg sm:text-xl text-brown-700 max-w-3xl mx-auto leading-relaxed">
            Fra FINN-integrasjon til AI-analyse - alt samlet på ett sted for din boligreise
          </p>
        </div>

        {/* Tools Grid - Clean 2x3 grid on mobile, 3x2 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <ToolCard
              key={tool.to}
              to={tool.to}
              icon={tool.icon}
              title={tool.title}
              description={tool.description}
              variant={tool.variant}
            />
          ))}
        </div>

        {/* Bottom CTA - Elegantly styled with neutral tones */}
        <div className="text-center mt-12 sm:mt-16 lg:mt-20">
          <div className="inline-flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Link
              to="/takstrapportanalyse"
              className="rounded-2xl py-4 px-8 bg-gradient-to-r from-brown-600 to-brown-700 text-white font-semibold text-lg hover:from-brown-700 hover:to-brown-800 hover:scale-105 transition-all shadow-xl tap-target text-center border border-brown-800"
            >
              <FileText className="inline w-5 h-5 mr-2" />
              Takstrapport-analyse
            </Link>
            
            <Link
              to="/mineboliger"
              className="rounded-2xl py-4 px-8 bg-gradient-to-r from-stone-50 to-stone-100 border-2 border-brown-600 text-brown-700 font-semibold text-lg hover:from-brown-600 hover:to-brown-700 hover:text-white hover:scale-105 transition-all shadow-xl tap-target text-center"
            >
              <Star className="inline w-5 h-5 mr-2" />
              Mine boliger
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}; 