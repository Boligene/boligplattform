import { ArrowRight, Bot, MessageCircle, Sparkles } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

export const CalloutAI: React.FC = () => {
  const chatMessages = [
    {
      type: "user",
      message: "Kan du analysere denne FINN-annonsen for meg?",
      time: "10:32"
    },
    {
      type: "ai", 
      message: "Jeg ser at dette er en 3-roms leilighet på 78m² til 4.5M kr. La meg analysere prisen...",
      time: "10:32"
    },
    {
      type: "ai",
      message: "🏠 Basert på sammenlignbare salg i området ligger prisen 8% over markedet. Felleskostnadene på 5.200 kr/mnd er også høye for denne typen leilighet.",
      time: "10:33"
    },
    {
      type: "user",
      message: "Hva anbefaler du?",
      time: "10:33"
    },
    {
      type: "ai",
      message: "💡 Jeg anbefaler å by 4.2M kr og undersøke årsakene til høye felleskostnader. Skal jeg generere en full rapport?",
      time: "10:33"
    }
  ];

  return (
    <section id="ai-callout" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-brown-800 via-brown-900 to-brown-800 text-white relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-brown-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-brown-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-brown-600/5 to-brown-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-screen-xl mx-auto px-4 pl-safe pr-safe">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brown-600/30 rounded-full backdrop-blur-sm">
                <Bot className="w-8 h-8 text-brown-300" />
              </div>
              <span className="text-brown-300 font-semibold text-lg">AI-Boligassistent</span>
            </div>
            
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-seriflogo font-bold mb-6 sm:mb-8 leading-tight">
              Få profesjonell boliganalyse på
              <span className="text-brown-300"> sekunder</span>
            </h3>
            
            <p className="text-lg sm:text-xl text-brown-100 mb-8 sm:mb-10 leading-relaxed">
              Vår AI-assistent analyserer FINN-annonser, sammenligner priser, 
              og gir deg personlige anbefalinger basert på markedsdata og din situasjon.
            </p>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-brown-300 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-brown-100 mb-1">Automatisk analyse</h4>
                  <p className="text-brown-200 text-sm">Instant tolkning av FINN-annonser</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-brown-300 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-brown-100 mb-1">Intelligent chat</h4>
                  <p className="text-brown-200 text-sm">Svar på alle dine boligspørsmål</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <Link
                to="/ai-boligassistent"
                className="inline-flex items-center justify-center rounded-full py-4 px-8 bg-white text-brown-800 font-semibold text-lg hover:bg-brown-50 hover:scale-105 transition-all shadow-xl tap-target"
              >
                Start AI-analyse
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              
              <button
                onClick={() => {
                  const element = document.getElementById('imported-boliger');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center rounded-full py-4 px-8 bg-transparent border-2 border-brown-300 text-brown-100 font-semibold text-lg hover:bg-brown-300 hover:text-brown-800 hover:scale-105 transition-all tap-target"
              >
                Se eksempel
              </button>
            </div>
          </div>

          {/* Right Content - Chat Mockup */}
          <div className="order-1 lg:order-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-brown-600/30">
              
              {/* Chat Header */}
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-brown-600/30">
                <div className="w-10 h-10 bg-brown-500 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-brown-100">AI Boligassistent</h4>
                  <p className="text-sm text-brown-300">Tilgjengelig 24/7</p>
                </div>
                <div className="ml-auto w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 sm:p-4 ${
                        msg.type === 'user'
                          ? 'bg-brown-500 text-white ml-8'
                          : 'bg-white/20 text-brown-100 mr-8 backdrop-blur-sm'
                      }`}
                    >
                      <p className="text-sm sm:text-base leading-relaxed">{msg.message}</p>
                      <span className="text-xs opacity-70 mt-1 block">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Typing Indicator */}
              <div className="flex justify-start mt-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mr-8">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-brown-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brown-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-brown-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}; 