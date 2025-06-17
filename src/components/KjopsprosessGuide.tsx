import { AlertCircle, ArrowRight, CheckCircle, Clock, FileText } from 'lucide-react';
import * as React from 'react';
import { KjopsprosessVeiledning } from '../types/ai.types';

interface KjopsprosessGuideProps {
  guide: KjopsprosessVeiledning;
  onPhaseChange: (phase: 'visning' | 'bud' | 'finansiering' | 'takst' | 'overlevering') => void;
}

export const KjopsprosessGuide: React.FC<KjopsprosessGuideProps> = ({ 
  guide, 
  onPhaseChange 
}) => {
  const phases = [
    { key: 'visning', label: 'Visning', icon: '👀' },
    { key: 'bud', label: 'Bud', icon: '💰' },
    { key: 'finansiering', label: 'Finansiering', icon: '🏦' },
    { key: 'takst', label: 'Takst', icon: '📋' },
    { key: 'overlevering', label: 'Overlevering', icon: '🔑' }
  ] as const;

  const getCurrentPhaseIndex = () => {
    return phases.findIndex(phase => phase.key === guide.fase);
  };

  const getTotalEstimatedDays = () => {
    return guide.tidslinje.reduce((total, item) => total + item.dager_estimat, 0);
  };

  return (
    <div className="space-y-6">
      {/* Phase Navigation */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Kjøpsprosess</h3>
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => {
            const isActive = phase.key === guide.fase;
            const isCompleted = getCurrentPhaseIndex() > index;
            
            return (
              <React.Fragment key={phase.key}>
                <button
                  onClick={() => onPhaseChange(phase.key)}
                  className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                      : isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-white text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl mb-1">{phase.icon}</span>
                  <span className="text-xs font-medium">{phase.label}</span>
                  {isCompleted && <CheckCircle className="w-4 h-4 text-green-600 mt-1" />}
                </button>
                
                {index < phases.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current Phase Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">
            {phases.find(p => p.key === guide.fase)?.icon}
          </span>
          <h3 className="text-xl font-bold capitalize">{guide.fase}</h3>
        </div>

        {/* Recommendations */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Anbefalinger
          </h4>
          <ul className="space-y-2">
            {guide.anbefalinger.map((anbefaling, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{anbefaling}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Important Checklists */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Viktige sjekklister
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {guide.viktige_sjekklister.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Tidslinje ({getTotalEstimatedDays()} dager totalt)
          </h4>
          <div className="space-y-3">
            {guide.tidslinje.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.beskrivelse}</p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  {item.dager_estimat} {item.dager_estimat === 1 ? 'dag' : 'dager'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Neste steg</h4>
        <p className="text-sm text-blue-700 mb-3">
          Når du har fullført {guide.fase}-fasen, gå videre til neste steg i prosessen.
        </p>
        <div className="flex gap-2">
          {getCurrentPhaseIndex() < phases.length - 1 && (
            <button
              onClick={() => onPhaseChange(phases[getCurrentPhaseIndex() + 1].key)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Gå til {phases[getCurrentPhaseIndex() + 1].label.toLowerCase()}
            </button>
          )}
          {getCurrentPhaseIndex() > 0 && (
            <button
              onClick={() => onPhaseChange(phases[getCurrentPhaseIndex() - 1].key)}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
            >
              Tilbake til {phases[getCurrentPhaseIndex() - 1].label.toLowerCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 