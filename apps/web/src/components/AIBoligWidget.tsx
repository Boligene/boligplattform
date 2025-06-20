import { AIBoligService } from '@boligplattform/core';
import { AlertTriangle, ArrowRight, Bot, CheckCircle, Lightbulb, Upload } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface AIBoligWidgetProps {
  className?: string;
}

export const AIBoligWidget: React.FC<AIBoligWidgetProps> = ({ className = '' }) => {
  const [finnUrl, setFinnUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickAnalysis, setQuickAnalysis] = useState<{
    score: number;
    summary: string;
    adresse?: string;
    pris?: string;
    type?: string;
    textAnalysis?: any;
    needsPDFUpload?: boolean;
    userFriendlyMessage?: string;
  } | null>(null);

  const handleQuickAnalysis = async () => {
    if (!finnUrl.trim()) return;

    setLoading(true);
    try {
      // Bruk den nye utvidede analysen som inkluderer salgsoppgave
      const analysis = await AIBoligService.analyseMedSalgsoppgave(finnUrl);

      setQuickAnalysis({
        score: analysis.score,
        summary: analysis.sammendrag.substring(0, 150) + '...',
        adresse: analysis.scraping_data?.adresse,
        pris: analysis.scraping_data?.pris,
        type: analysis.scraping_data?.type,
        textAnalysis: analysis.textAnalysis,
        needsPDFUpload: analysis.needsPDFUpload,
        userFriendlyMessage: analysis.userFriendlyMessage
      });
    } catch (error) {
      console.error('Quick analysis error:', error);
      // Fallback til standard analyse
      try {
        const fallbackAnalysis = await AIBoligService.analyseBolig(finnUrl);
        setQuickAnalysis({
          score: fallbackAnalysis.score,
          summary: fallbackAnalysis.sammendrag.substring(0, 150) + '...',
          adresse: fallbackAnalysis.scraping_data?.adresse,
          pris: fallbackAnalysis.scraping_data?.pris,
          type: fallbackAnalysis.scraping_data?.type
        });
      } catch (fallbackError) {
        console.error('Fallback analysis error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-brown-50 to-amber-100 border border-brown-200 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-brown-100 rounded-lg">
          <Bot className="w-5 h-5 text-brown-600" />
        </div>
        <div>
          <h3 className="font-seriflogo text-brown-900">AI Boligassistent</h3>
          <p className="text-sm text-brown-600">Få AI-analyse av boliger på sekunder</p>
        </div>
      </div>

      {!quickAnalysis ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={finnUrl}
              onChange={(e) => setFinnUrl(e.target.value)}
              placeholder="Lim inn Finn.no lenke..."
              className="flex-1 px-3 py-2 text-sm border border-brown-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
            />
            <button
              onClick={handleQuickAnalysis}
              disabled={loading || !finnUrl.trim()}
              className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Analyser'
              )}
            </button>
          </div>

          <Link 
            to="/ai-boligassistent"
            className="inline-flex items-center gap-2 text-sm text-brown-600 hover:text-brown-800 font-medium"
          >
            <Lightbulb className="w-4 h-4" />
            Se full AI-analyse og chat
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {quickAnalysis.adresse && (
            <div className="bg-white rounded-lg p-3 border border-brown-200">
              <div className="text-sm">
                <div className="font-medium text-brown-800 mb-1">{quickAnalysis.adresse}</div>
                <div className="flex justify-between text-gray-600">
                  {quickAnalysis.pris && <span>{quickAnalysis.pris}</span>}
                  {quickAnalysis.type && <span>{quickAnalysis.type}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Tekstkvalitet og PDF-upload anbefaling */}
          {quickAnalysis.textAnalysis && (
            <div className={`bg-white rounded-lg p-3 border ${
              quickAnalysis.textAnalysis.quality === 'høy' ? 'border-green-200' :
              quickAnalysis.textAnalysis.quality === 'medium' ? 'border-yellow-200' :
              'border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {quickAnalysis.textAnalysis.quality === 'høy' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  Salgsoppgave: {AIBoligService.formatTextQuality(quickAnalysis.textAnalysis)}
                </span>
              </div>
              {quickAnalysis.userFriendlyMessage && (
                <p className="text-sm text-gray-600 mb-2">
                  {quickAnalysis.userFriendlyMessage}
                </p>
              )}
              {quickAnalysis.needsPDFUpload && (
                <Link 
                  to="/takstrapport-analyse"
                  className="inline-flex items-center gap-2 text-sm text-brown-600 hover:text-brown-800 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Last opp PDF for bedre analyse
                </Link>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg p-4 border border-brown-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">AI-Score</span>
              <span className={`text-lg font-bold ${
                quickAnalysis.score >= 80 ? 'text-green-600' :
                quickAnalysis.score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {quickAnalysis.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {quickAnalysis.summary}
            </p>
          </div>

          <div className="flex gap-2">
            <Link 
              to="/ai-boligassistent"
              state={{ finnUrl, quickAnalysis }}
              className="flex-1 bg-brown-600 text-white text-center py-2 px-4 rounded-lg hover:bg-brown-700 text-sm font-medium transition-colors"
            >
              Se full analyse
            </Link>
            <button
              onClick={() => {
                setQuickAnalysis(null);
                setFinnUrl('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              Ny analyse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 