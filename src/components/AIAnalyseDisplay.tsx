import { AlertTriangle, Car, CheckCircle, DollarSign, Home, MapPin, TreePine, User, XCircle, Zap } from 'lucide-react';
import React from 'react';
import { BoligAnalyse, BoligScrapingData } from '../types/ai.types';

interface AIAnalyseDisplayProps {
  analysis: BoligAnalyse;
  boligData: BoligScrapingData | null;
}

export const AIAnalyseDisplay: React.FC<AIAnalyseDisplayProps> = ({ analysis, boligData }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Score and Summary */}
      <div className="bg-gradient-to-r from-brown-50 to-amber-50 rounded-2xl p-6 border border-brown-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-seriflogo text-brown-800">AI-vurdering</h3>
          <div className={`px-4 py-2 rounded-full font-bold text-lg ${getScoreColor(analysis.score)}`}>
            {analysis.score}/100
          </div>
        </div>
        <p className="text-brown-700 leading-relaxed">{analysis.sammendrag}</p>
      </div>

      {/* The Good, The Bad, The Ugly */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* The Good */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-seriflogo text-green-800">The Good</h4>
          </div>
          <ul className="space-y-2">
            {analysis.the_good.map((item, index) => (
              <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* The Bad */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h4 className="font-seriflogo text-yellow-800">The Bad</h4>
          </div>
          <ul className="space-y-2">
            {analysis.the_bad.map((item, index) => (
              <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* The Ugly */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-seriflogo text-red-800">The Ugly</h4>
          </div>
          <ul className="space-y-2">
            {analysis.the_ugly.length > 0 ? (
              analysis.the_ugly.map((item, index) => (
                <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 italic">Ingen alvorlige problemer funnet</li>
            )}
          </ul>
        </div>
      </div>

      {/* Comprehensive Bolig Details */}
      {boligData && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-white border border-brown-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-brown-600" />
              <h4 className="font-seriflogo text-brown-800">Boligdetaljer</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Adresse:</span>
                <span className="font-medium">{boligData.adresse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{boligData.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bruksareal:</span>
                <span className="font-medium">{boligData.areal}</span>
              </div>
              {boligData.primaerareal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Primærareal:</span>
                  <span className="font-medium">{boligData.primaerareal}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Antall rom:</span>
                <span className="font-medium">{boligData.antallRom}</span>
              </div>
              {boligData.antallSoverom && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Soverom:</span>
                  <span className="font-medium">{boligData.antallSoverom}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Byggeår:</span>
                <span className="font-medium">{boligData.byggeaar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Eierform:</span>
                <span className="font-medium">{boligData.eierform}</span>
              </div>
              {boligData.etasje && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Etasje:</span>
                  <span className="font-medium">{boligData.etasje}</span>
                </div>
              )}
            </div>
          </div>

          {/* Economic Details */}
          <div className="bg-white border border-brown-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-brown-600" />
              <h4 className="font-seriflogo text-brown-800">Økonomi</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pris:</span>
                <span className="font-medium text-lg">{boligData.pris}</span>
              </div>
              {boligData.prisPerKvm && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pris per kvm:</span>
                  <span className="font-medium">{boligData.prisPerKvm}</span>
                </div>
              )}
              {boligData.felleskostnader && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Felleskostnader:</span>
                  <span className="font-medium">{boligData.felleskostnader}</span>
                </div>
              )}
              {boligData.kommunaleavgifter && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kommunale avgifter:</span>
                  <span className="font-medium">{boligData.kommunaleavgifter}</span>
                </div>
              )}
              {boligData.eiendomsskatt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Eiendomsskatt:</span>
                  <span className="font-medium">{boligData.eiendomsskatt}</span>
                </div>
              )}
              {boligData.fellesgjeld && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fellesgjeld:</span>
                  <span className="font-medium">{boligData.fellesgjeld}</span>
                </div>
              )}
              {boligData.formuesverdi && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Formuesverdi:</span>
                  <span className="font-medium">{boligData.formuesverdi}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location & Features */}
          <div className="bg-white border border-brown-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-brown-600" />
              <h4 className="font-seriflogo text-brown-800">Beliggenhet</h4>
            </div>
            <div className="space-y-3 text-sm">
              {boligData.kommune && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kommune:</span>
                  <span className="font-medium">{boligData.kommune}</span>
                </div>
              )}
              {boligData.bydel && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Bydel:</span>
                  <span className="font-medium">{boligData.bydel}</span>
                </div>
              )}
              {boligData.postnummer && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Postnummer:</span>
                  <span className="font-medium">{boligData.postnummer}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Energimerking:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  boligData.energimerking === 'A' ? 'bg-green-100 text-green-800' :
                  boligData.energimerking === 'B' ? 'bg-green-100 text-green-700' :
                  boligData.energimerking === 'C' ? 'bg-yellow-100 text-yellow-700' :
                  boligData.energimerking === 'D' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {boligData.energimerking}
                </span>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div className="bg-white border border-brown-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TreePine className="w-5 h-5 text-brown-600" />
              <h4 className="font-seriflogo text-brown-800">Fasiliteter</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {boligData.parkering && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-gray-500" />
                  <span>{boligData.parkering}</span>
                </div>
              )}
              {boligData.balkong && (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span>Balkong: {boligData.balkong}</span>
                </div>
              )}
              {boligData.terrasse && (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span>Terrasse: {boligData.terrasse}</span>
                </div>
              )}
              {boligData.hage && (
                <div className="flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-gray-500" />
                  <span>Hage: {boligData.hage}</span>
                </div>
              )}
              {boligData.kjeller && (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span>Kjeller: {boligData.kjeller}</span>
                </div>
              )}
              {boligData.oppvarming && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span>{boligData.oppvarming}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sales Info */}
      {boligData && (boligData.megler || boligData.visningsdato || boligData.budfrister) && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h4 className="font-seriflogo text-blue-800">Salgsinfo</h4>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {boligData.megler && (
              <div>
                <span className="text-gray-600 block">Megler:</span>
                <span className="font-medium">{boligData.megler}</span>
              </div>
            )}
            {boligData.visningsdato && (
              <div>
                <span className="text-gray-600 block">Visning:</span>
                <span className="font-medium">{boligData.visningsdato}</span>
              </div>
            )}
            {boligData.budfrister && (
              <div>
                <span className="text-gray-600 block">Budfrist:</span>
                <span className="font-medium">{boligData.budfrister}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Gallery */}
      {boligData?.bilder && boligData.bilder.length > 0 && (
        <div className="bg-white border border-brown-200 rounded-2xl p-6">
          <h4 className="font-seriflogo text-brown-800 mb-4">Bilder</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boligData.bilder.slice(0, 8).map((bilde, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={bilde} 
                  alt={`Boligbilde ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-house.jpg';
                  }}
                />
              </div>
            ))}
          </div>
          {boligData.bilder.length > 8 && (
            <p className="text-sm text-gray-500 mt-2">
              +{boligData.bilder.length - 8} flere bilder
            </p>
          )}
        </div>
      )}
    </div>
  );
}; 