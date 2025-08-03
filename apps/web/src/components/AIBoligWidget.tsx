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
      const analysis = await AIBoligService.analyseMedSalgsoppgave(finnUrl);
      console.log('🔍 Widget mottok analyse:', analysis);

      // **INTELLIGENT DATAEKSTRAKSJON** for å håndtere oppgraderte API-responser
      const extractScore = () => {
        // Prøv ny struktur først, deretter fallback til gammel
        if (analysis.salgsoppgaveAnalyse?.analysis?.tekniskTilstand?.score) {
          return analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.score * 10; // Skaler fra 1-10 til 1-100
        }
        if (analysis.salgsoppgaveAnalyse?.analysis?.prisvurdering?.score) {
          return analysis.salgsoppgaveAnalyse.analysis.prisvurdering.score * 10;
        }
        return analysis.score || 75; // Fallback
      };
      
      const extractSummary = () => {
        // Prøv ny struktur først, deretter fallback til gammel
        if (analysis.salgsoppgaveAnalyse?.analysis?.konklusjon) {
          return analysis.salgsoppgaveAnalyse.analysis.konklusjon.substring(0, 150) + '...';
        }
        if (analysis.salgsoppgaveAnalyse?.analysis?.tekniskTilstand?.sammendrag) {
          return analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.sammendrag.substring(0, 150) + '...';
        }
        return (analysis.sammendrag || 'Analyse fullført').substring(0, 150) + '...';
      };

      setQuickAnalysis({
        score: extractScore(),
        summary: extractSummary(),
        adresse: analysis.scraping_data?.adresse,
        pris: analysis.scraping_data?.pris,
        type: analysis.scraping_data?.type,
        textAnalysis: analysis.textAnalysis,
        needsPDFUpload: analysis.needsPDFUpload,
        userFriendlyMessage: analysis.userFriendlyMessage
      });
      
      console.log('✅ Widget analyse ekstrahert:', {
        score: extractScore(),
        summaryLength: extractSummary().length,
        hasEnhancedData: !!analysis.salgsoppgaveAnalyse?.analysis
      });
    } catch (error) {
      console.error('Quick analysis error:', error);
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
    <div className={`bg-gradient-to-br from-brown-50 to-amber-100 border border-brown-200 rounded-2xl p-4 md:p-6 w-full ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-2 mb-4 md:mb-4">
        <div className="flex items-center gap-3 md:gap-2">
          <div className="p-2 bg-brown-100 rounded-lg flex-shrink-0">
            <Bot className="w-5 h-5 text-brown-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-seriflogo text-brown-900 text-base md:text-lg">AI Boligassistent</h3>
            <p className="text-sm text-brown-600 break-words">Få AI-analyse av boliger på sekunder</p>
          </div>
        </div>
      </div>

      {!quickAnalysis ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={finnUrl}
              onChange={(e) => setFinnUrl(e.target.value)}
              placeholder="Lim inn Finn.no lenke..."
              className="flex-1 px-3 py-3 md:py-2 text-sm border border-brown-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent min-h-[44px]"
            />
            <button
              onClick={handleQuickAnalysis}
              disabled={loading || !finnUrl.trim()}
              className="px-4 py-3 md:py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            className="inline-flex items-center justify-center gap-2 text-sm text-brown-600 hover:text-brown-800 font-medium p-2 rounded-lg transition-colors min-h-[44px]"
          >
            <Lightbulb className="w-4 h-4 flex-shrink-0" />
            <span className="break-words">Se full AI-analyse og chat</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quickAnalysis.adresse && (
            <div className="bg-white rounded-lg p-3 border border-brown-200 w-full">
              <div className="text-sm">
                <div className="font-medium text-brown-800 mb-1 break-words">{quickAnalysis.adresse}</div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-gray-600 text-xs md:text-sm">
                  {quickAnalysis.pris && <span className="break-words">{quickAnalysis.pris}</span>}
                  {quickAnalysis.type && <span className="break-words">{quickAnalysis.type}</span>}
                </div>
              </div>
            </div>
          )}

          {quickAnalysis.textAnalysis && (
            <div className={`bg-white rounded-lg p-3 border w-full ${
              quickAnalysis.textAnalysis.quality === 'høy' ? 'border-green-200' :
              quickAnalysis.textAnalysis.quality === 'medium' ? 'border-yellow-200' :
              'border-red-200'
            }`}>
              <div className="flex items-start gap-2 mb-2">
                {quickAnalysis.textAnalysis.quality === 'høy' ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm font-medium text-gray-700 break-words">
                  Salgsoppgave: {AIBoligService.formatTextQuality(quickAnalysis.textAnalysis)}
                </span>
              </div>
              {quickAnalysis.userFriendlyMessage && (
                <p className="text-sm text-gray-600 mb-2 break-words">
                  {quickAnalysis.userFriendlyMessage}
                </p>
              )}
              {quickAnalysis.needsPDFUpload && (
                <Link 
                  to="/takstrapport-analyse"
                  className="inline-flex items-center gap-2 text-sm text-brown-600 hover:text-brown-800 font-medium p-2 rounded-lg transition-colors min-h-[44px]"
                >
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">Last opp PDF for bedre analyse</span>
                </Link>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg p-4 border border-brown-200 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">AI-Score</span>
              <span className={`text-lg font-bold ${
                quickAnalysis.score >= 80 ? 'text-green-600' :
                quickAnalysis.score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {quickAnalysis.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed break-words">
              {quickAnalysis.summary}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link 
              to="/ai-boligassistent"
              state={{ finnUrl, quickAnalysis }}
              className="flex-1 bg-brown-600 text-white text-center py-3 px-4 rounded-lg hover:bg-brown-700 text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
            >
              Se full analyse
            </Link>
            <button
              onClick={() => {
                setQuickAnalysis(null);
                setFinnUrl('');
              }}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              Ny analyse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 