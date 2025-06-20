import { AIBoligService } from '@boligplattform/core';
import { AlertTriangle, Bot, Brain, CheckCircle, FileText, Info, Lightbulb, MessageCircle, Send, Upload, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { PDFDropzone } from './PDFDropzone';

interface AIBoligassistentProps {
  finnUrl?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIBoligassistent: React.FC<AIBoligassistentProps> = ({
  finnUrl
}) => {
  const [urlInput, setUrlInput] = useState(finnUrl || '');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // **NYE STATE VARIABLER FOR PDF-UPLOAD**
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const [manualPDFAnalysis, setManualPDFAnalysis] = useState<any>(null);

  console.log('AIBoligassistent component rendering');

  const handleAnalyse = async () => {
    if (!urlInput.trim()) {
      alert('Vennligst legg inn en Finn.no lenke');
      return;
    }

    console.log('Analyse clicked - bruker utvidet salgsoppgave-analyse');
    setLoading(true);
    
    // **RYDD OPP STATE FRA FORRIGE ANALYSE**
    setShowPDFUpload(false);
    setPdfUploadError('');
    setManualPDFAnalysis(null);
    
    try {
      // Bruk den nye utvidede analysen som inkluderer salgsoppgave
      const analysisResult = await AIBoligService.analyseMedSalgsoppgave(urlInput);
      console.log('Utvidet analyse result:', analysisResult);
      setAnalysis(analysisResult);
      
      // **SJEKK OM VI TRENGER PDF-UPLOAD**
      const needsPDFUpload = analysisResult?.salgsoppgaveAnalyse?.textAnalysis?.needsPDFUpload;
      if (needsPDFUpload) {
        console.log('🔄 Backend indikerer at PDF-upload trengs');
        setShowPDFUpload(true);
      }
      
    } catch (error) {
      console.error('Service error:', error);
      alert('Noe gikk galt under analysen. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  // **NY FUNKSJON FOR PDF-UPLOAD AV SALGSOPPGAVE**
  const handlePDFUpload = async (file: File) => {
    console.log('📄 Starter manuell PDF-upload av salgsoppgave');
    setPdfUploading(true);
    setPdfUploadError('');
    
    try {
      // Bruk AIBoligService for å laste opp PDF
      const pdfResult = await AIBoligService.analyseSalgsoppgavePDF(file, urlInput);
      console.log('✅ PDF-analyse fullført:', pdfResult);
      
      setManualPDFAnalysis(pdfResult);
      
      // **KOMBINER PDF-ANALYSE MED EKSISTERENDE ANALYSE**
      if (analysis) {
        const combinedAnalysis = {
          ...analysis,
          // Overstyr salgsoppgave-delen med PDF-resultatet
          salgsoppgaveAnalyse: pdfResult,
          // Marker at vi har fått bedre data
          _pdfUploadEnhanced: true,
          _combinedSources: {
            scraping: analysis.scraping_data || analysis.boligData,
            manualPDF: pdfResult
          }
        };
        
        console.log('🔄 Kombinerer PDF-analyse med eksisterende data');
        setAnalysis(combinedAnalysis);
      } else {
        // Hvis vi ikke har eksisterende analyse, bruk bare PDF-resultatet
        setAnalysis({
          salgsoppgaveAnalyse: pdfResult,
          _pdfUploadOnly: true
        });
      }
      
      // **SKJUL PDF-UPLOAD SEKSJONEN ETTER VELLYKKET UPLOAD**
      setShowPDFUpload(false);
      
    } catch (error) {
      console.error('❌ PDF-upload feilet:', error);
      setPdfUploadError(error instanceof Error ? error.message : 'Ukjent feil ved PDF-upload');
    } finally {
      setPdfUploading(false);
    }
  };

  // **FUNKSJON FOR Å LUKKE PDF-UPLOAD SEKSJONEN**
  const handleClosePDFUpload = () => {
    setShowPDFUpload(false);
    setPdfUploadError('');
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Bruk den forbedrede chat-funksjonen med all tilgjengelig data
      const response = await generateChatResponse(chatInput, analysis);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Beklager, jeg kunne ikke svare på det akkurat nå. Prøv igjen senere.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const generateChatResponse = async (question: string, analysis: any): Promise<string> => {
    try {
      // Bygg utvidet kontekst med all tilgjengelig data (inkludert manuell PDF)
      const enrichedAnalysis = {
        ...analysis,
        // Legg til alle kilder av data for chat-kontekst
        allData: {
          scrapingData: analysis.scraping_data || analysis.boligData || {},
          salgsoppgaveFakta: analysis.salgsoppgaveAnalyse?.salgsoppgaveFakta || {},
          detailedInfo: analysis.salgsoppgaveAnalyse?.detailedInfo || {},
          textAnalysis: analysis.salgsoppgaveAnalyse?.textAnalysis || {},
          standardAnalyse: analysis.standard_analyse || {},
          salgsoppgaveAnalyse: analysis.salgsoppgaveAnalyse?.analysis || {},
          // **INKLUDER MANUELL PDF-DATA**
          manualPDFData: manualPDFAnalysis || null
        },
        // Metadata om datakvalitet (oppdatert med PDF-info)
        dataQuality: {
          hasRealData: analysis.scraping_data && analysis.scraping_data.adresse !== "Testveien 123, 0123 Oslo",
          hasSalgsoppgave: analysis.salgsoppgaveAnalyse?.success || false,
          hasManualPDF: !!manualPDFAnalysis,
          textQuality: analysis.salgsoppgaveAnalyse?.textAnalysis?.quality || 'ukjent',
          needsPDFUpload: analysis.salgsoppgaveAnalyse?.textAnalysis?.needsPDFUpload || false,
          sources: {
            scraping: !!analysis.scraping_data,
            salgsoppgave: !!(analysis.salgsoppgaveAnalyse?.success),
            manualPDF: !!manualPDFAnalysis,
            standardAnalyse: !!analysis.standard_analyse,
            detailedInfo: !!(analysis.salgsoppgaveAnalyse?.detailedInfo)
          }
        }
      };

      // Bruk AIBoligService med den rikede konteksten
      const response = await AIBoligService.chatMedAI(question, enrichedAnalysis, chatMessages);
      return response.content;
    } catch (error) {
      console.error('Chat error:', error);
      return 'Beklager, jeg kunne ikke svare på det akkurat nå. Prøv igjen senere.';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getTextQualityInfo = (textAnalysis: any) => {
    if (!textAnalysis) return null;
    
    const qualityColors: Record<string, string> = {
      'høy': 'text-green-600 bg-green-50 border-green-200',
      'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200', 
      'lav': 'text-orange-600 bg-orange-50 border-orange-200',
      'svært lav': 'text-red-600 bg-red-50 border-red-200',
      'ingen': 'text-gray-600 bg-gray-50 border-gray-200'
    };
    
    const quality = textAnalysis.quality || 'ukjent';
    const colorClass = qualityColors[quality] || 'text-gray-600 bg-gray-50 border-gray-200';
    
    return {
      quality,
      colorClass,
      textLength: textAnalysis.textLength || 0,
      needsPDFUpload: textAnalysis.needsPDFUpload || false,
      userFriendlyMessage: textAnalysis.userFriendlyMessage
    };
  };

  return (
    <div className="bg-white/80 rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-brown-100 p-3 rounded-2xl">
          <Bot className="w-8 h-8 text-brown-700" />
        </div>
        <div>
          <h2 className="text-3xl font-seriflogo font-bold text-brown-900">AI Boligassistent</h2>
          <p className="text-brown-600">Din personlige digitale boligrådgiver med salgsoppgave-analyse</p>
        </div>
      </div>

      {/* URL Input Section */}
      {!analysis && (
        <div className="mb-8 p-6 bg-brown-50/60 rounded-2xl border border-brown-200">
          <h3 className="text-xl font-seriflogo font-semibold mb-4 flex items-center gap-2 text-brown-800">
            <Lightbulb className="w-6 h-6" />
            Utvidet boliganalyse med salgsoppgave
          </h3>
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">🚀 Nye funksjoner implementert:</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• <strong>Intelligent PDF-søk:</strong> Finner salgsoppgaver i iframe, object og viewer-sider</li>
              <li>• <strong>Tekstkvalitet-vurdering:</strong> Vurderer hvor mye informasjon som ble funnet</li>
              <li>• <strong>PDF-upload anbefaling:</strong> Foreslår direkte opplasting hvis lite tekst funnet</li>
              <li>• <strong>Strukturerte fakta:</strong> Ekstraherer nøkkeldata direkte fra salgsoppgave</li>
              <li>• <strong>Forbedret chat:</strong> AI-assistenten har tilgang til all tilgjengelig data</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Lim inn Finn.no lenke her..."
              className="flex-1 rounded-full px-5 py-3 bg-white border border-brown-200 text-lg focus:outline-none focus:ring-2 focus:ring-brown-400 placeholder:text-brown-400"
            />
            <button
              onClick={handleAnalyse}
              disabled={loading || !urlInput.trim()}
              className="rounded-full px-6 py-3 bg-brown-500 text-white font-semibold text-lg hover:bg-brown-600 transition flex items-center gap-2 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyserer...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  Analyser
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brown-500 mx-auto mb-6"></div>
            <h3 className="text-xl font-seriflogo font-semibold text-brown-800 mb-2">
              Utvidet AI-analyse pågår
            </h3>
            <div className="space-y-2 text-brown-600">
              <p>• Henter boligdata fra Finn.no</p>
              <p>• Søker etter salgsoppgave og dokumenter</p>
              <p>• Analyserer PDF-innhold med iframe/object støtte</p>
              <p>• Vurderer tekstkvalitet og datakomplethet</p>
              <p>• Analyserer med OpenAI GPT</p>
              <p className="text-sm">Dette kan ta 30-90 sekunder...</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-8">
          {/* Score Overview med tekstkvalitet */}
          <div className="bg-gradient-to-r from-brown-50 to-brown-100 rounded-2xl p-6 border border-brown-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-seriflogo font-bold text-brown-900">
                  {analysis.salgsoppgaveAnalyse ? 'Utvidet AI-analyse fullført' : 'AI-analyse fullført'}
                </h3>
                <p className="text-brown-600 mt-1">{analysis.finn_url || analysis.url}</p>
              </div>
              <div className="flex items-center gap-3">
                {getScoreIcon(analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75)}
                <span className={`text-4xl font-seriflogo font-bold ${getScoreColor(analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75)}`}>
                  {analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75}/100
                </span>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-3">
              {/* Standard analyse status */}
              {analysis.raw_openai_response && analysis.raw_openai_response !== "Mock analyse - ingen ekte OpenAI respons" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">Analysert med ekte OpenAI GPT</span>
                </div>
              )}
              {(!analysis.raw_openai_response || analysis.raw_openai_response === "Mock analyse - ingen ekte OpenAI respons") && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-orange-700 font-medium">Demo-analyse (OpenAI ikke tilgjengelig)</span>
                </div>
              )}
              
              {/* Salgsoppgave status */}
              {analysis.salgsoppgaveAnalyse && analysis.salgsoppgaveAnalyse.success && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-purple-700 font-medium">
                    Salgsoppgave funnet ({analysis.salgsoppgaveAnalyse.source?.split(':')[0] || 'PDF'})
                  </span>
                </div>
              )}
              {analysis.salgsoppgaveAnalyse && !analysis.salgsoppgaveAnalyse.success && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-orange-700 font-medium">Salgsoppgave ikke tilgjengelig</span>
                </div>
              )}
              
              {/* Scraping status */}
              {analysis.scraping_data && analysis.scraping_data.adresse !== "Testveien 123, 0123 Oslo" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700 font-medium">Ekte data fra Finn.no</span>
                </div>
              )}
              {analysis.scraping_data && analysis.scraping_data.adresse === "Testveien 123, 0123 Oslo" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">Demo-data (Finn.no scraper ikke tilgjengelig)</span>
                </div>
              )}
            </div>
          </div>

          {/* Tekstkvalitet og PDF-upload anbefaling */}
          {analysis.salgsoppgaveAnalyse?.textAnalysis && (
            (() => {
              const qualityInfo = getTextQualityInfo(analysis.salgsoppgaveAnalyse.textAnalysis);
              if (!qualityInfo) return null;
              
              return (
                <div className={`rounded-2xl p-6 border ${qualityInfo.colorClass}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {qualityInfo.needsPDFUpload ? (
                        <Upload className="w-8 h-8 text-orange-600" />
                      ) : (
                        <FileText className="w-8 h-8 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-seriflogo font-semibold">
                          Tekstkvalitet: <span className="capitalize">{qualityInfo.quality}</span>
                        </h4>
                        <span className="text-sm px-2 py-1 bg-white/50 rounded-full">
                          {qualityInfo.textLength} tegn
                        </span>
                      </div>
                      
                      {qualityInfo.userFriendlyMessage && (
                        <p className="mb-3 text-sm leading-relaxed">
                          {qualityInfo.userFriendlyMessage}
                        </p>
                      )}
                      
                      {qualityInfo.needsPDFUpload && !showPDFUpload && (
                        <div className="bg-white/50 rounded-lg p-3 border border-orange-200">
                          <p className="text-sm font-medium mb-2">💡 Anbefaling:</p>
                          <p className="text-sm mb-3">
                            Vi fant ikke nok informasjon i salgsoppgaven automatisk. 
                            For en komplett analyse, last opp PDF direkte her.
                          </p>
                          <button
                            onClick={() => setShowPDFUpload(true)}
                            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Last opp salgsoppgave-PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* **PDF-UPLOAD SEKSJON** */}
          {showPDFUpload && (
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-200 p-3 rounded-2xl">
                    <Upload className="w-8 h-8 text-orange-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-seriflogo font-bold text-orange-900">Last opp salgsoppgave-PDF</h3>
                    <p className="text-orange-600">Få en komplett analyse ved å laste opp PDF-en direkte</p>
                  </div>
                </div>
                <button
                  onClick={handleClosePDFUpload}
                  className="text-orange-600 hover:text-orange-800 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <PDFDropzone
                onFileSelect={handlePDFUpload}
                title="Dra salgsoppgave-PDF hit"
                description="Eller klikk for å velge PDF-fil fra datamaskinen din"
                maxSize={50}
                isLoading={pdfUploading}
                error={pdfUploadError}
                className="mb-4"
              />

              {pdfUploading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                  <p className="text-orange-700 font-medium">Analyserer PDF...</p>
                  <p className="text-sm text-orange-600">Dette kan ta 15-30 sekunder</p>
                </div>
              )}

              {pdfUploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Feil ved PDF-upload</h4>
                  </div>
                  <p className="text-red-700 text-sm">{pdfUploadError}</p>
                </div>
              )}

              <div className="bg-white/50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">📋 Instruksjoner:</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Last opp salgsoppgave-PDF fra Finn.no eller megler</li>
                  <li>• Kun PDF-filer støttes (maks 50MB)</li>
                  <li>• AI-en vil analysere all tekst og strukturerte data</li>
                  <li>• Resultatet kombineres med eksisterende boligdata</li>
                </ul>
              </div>
            </div>
          )}

          {/* Salgsoppgave-fakta (strukturerte data) */}
          {analysis.salgsoppgaveAnalyse?.salgsoppgaveFakta && Object.keys(analysis.salgsoppgaveAnalyse.salgsoppgaveFakta).length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-200 p-3 rounded-2xl">
                  <Info className="w-8 h-8 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-2xl font-seriflogo font-bold text-indigo-900">Strukturerte fakta fra salgsoppgave</h3>
                  <p className="text-indigo-600">Nøkkeldata ekstrahert direkte fra salgsoppgave (prioriteres over scraping)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analysis.salgsoppgaveAnalyse.salgsoppgaveFakta).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-xl p-4 border border-indigo-200">
                    <div className="text-sm text-indigo-600 font-medium mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </div>
                    <div className="text-indigo-900 font-semibold">
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salgsoppgave-analyse seksjon */}
          {analysis.salgsoppgaveAnalyse && analysis.salgsoppgaveAnalyse.success && analysis.salgsoppgaveAnalyse.analysis && (
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-200 p-3 rounded-2xl">
                  <Brain className="w-8 h-8 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-2xl font-seriflogo font-bold text-purple-900">Salgsoppgave-analyse</h3>
                  <p className="text-purple-600">Dyp analyse basert på full salgsoppgave</p>
                </div>
              </div>

              {/* Hvis vi har strukturert analyse */}
              {analysis.salgsoppgaveAnalyse.analysis && typeof analysis.salgsoppgaveAnalyse.analysis === 'object' && analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Teknisk tilstand */}
                  <div className="bg-white rounded-xl p-5 border border-purple-200">
                    <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">Teknisk tilstand</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-purple-700">
                        {analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.score}/10
                      </span>
                      <span className="text-purple-600">Score</span>
                    </div>
                    <p className="text-purple-700 mb-3">{analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.sammendrag}</p>
                    {analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.hovedFunn && (
                      <ul className="space-y-1">
                        {analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.hovedFunn.map((funn: string, index: number) => (
                          <li key={index} className="text-sm text-purple-600 flex items-start gap-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>{funn}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Risiko */}
                  <div className="bg-white rounded-xl p-5 border border-purple-200">
                    <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">Risikoanalyse</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-purple-700">
                        {analysis.salgsoppgaveAnalyse.analysis.risiko.score}/10
                      </span>
                      <span className="text-purple-600">Risiko</span>
                    </div>
                    <p className="text-purple-700 mb-3">{analysis.salgsoppgaveAnalyse.analysis.risiko.sammendrag}</p>
                    {analysis.salgsoppgaveAnalyse.analysis.risiko.risikoer && (
                      <ul className="space-y-1">
                        {analysis.salgsoppgaveAnalyse.analysis.risiko.risikoer.map((risiko: string, index: number) => (
                          <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                            <span className="text-red-400 mt-1">⚠</span>
                            <span>{risiko}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Prisvurdering */}
                  <div className="bg-white rounded-xl p-5 border border-purple-200">
                    <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">Prisvurdering</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-purple-700">
                        {analysis.salgsoppgaveAnalyse.analysis.prisvurdering.score}/10
                      </span>
                      <span className="text-purple-600">Verdi</span>
                    </div>
                    <p className="text-purple-700 mb-3">{analysis.salgsoppgaveAnalyse.analysis.prisvurdering.sammendrag}</p>
                    <p className="text-sm text-purple-600">{analysis.salgsoppgaveAnalyse.analysis.prisvurdering.markedsvurdering}</p>
                  </div>

                  {/* Oppussingsbehov */}
                  <div className="bg-white rounded-xl p-5 border border-purple-200">
                    <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">Oppussingsbehov</h4>
                    {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.estimertKostnad && (
                      <p className="text-lg font-semibold text-purple-700 mb-3">
                        {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.estimertKostnad}
                      </p>
                    )}
                    {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.nodvendig && (
                      <div className="mb-3">
                        <h5 className="font-semibold text-purple-700 mb-1">Nødvendig:</h5>
                        <ul className="space-y-1">
                          {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.nodvendig.map((tiltak: string, index: number) => (
                            <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                              <span className="text-red-400 mt-1">✗</span>
                              <span>{tiltak}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.onsket && (
                      <div>
                        <h5 className="font-semibold text-purple-700 mb-1">Ønskelig:</h5>
                        <ul className="space-y-1">
                          {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.onsket.map((tiltak: string, index: number) => (
                            <li key={index} className="text-sm text-purple-600 flex items-start gap-2">
                              <span className="text-purple-400 mt-1">○</span>
                              <span>{tiltak}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Anbefalte spørsmål */}
              {analysis.salgsoppgaveAnalyse.analysis && analysis.salgsoppgaveAnalyse.analysis.anbefalteSporsmal && (
                <div className="mt-6 bg-white rounded-xl p-5 border border-purple-200">
                  <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">Anbefalte spørsmål til visning</h4>
                  <ul className="space-y-2">
                    {analysis.salgsoppgaveAnalyse.analysis.anbefalteSporsmal.map((sporsmal: string, index: number) => (
                      <li key={index} className="text-purple-700 flex items-start gap-2">
                        <span className="text-purple-400 mt-1">?</span>
                        <span>{sporsmal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Konklusjon */}
              {analysis.salgsoppgaveAnalyse.analysis && analysis.salgsoppgaveAnalyse.analysis.konklusjon && (
                <div className="mt-6 bg-white rounded-xl p-5 border border-purple-200">
                  <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">Konklusjon</h4>
                  <p className="text-purple-700 leading-relaxed">{analysis.salgsoppgaveAnalyse.analysis.konklusjon}</p>
                </div>
              )}

              {/* Fallback for rå analyse */}
              {analysis.salgsoppgaveAnalyse.analysis && analysis.salgsoppgaveAnalyse.analysis.raaAnalyse && (
                <div className="mt-6 bg-white rounded-xl p-5 border border-purple-200">
                  <h4 className="font-seriflogo font-semibold text-purple-800 text-lg mb-3">AI-analyse av salgsoppgave</h4>
                  <p className="text-purple-700 leading-relaxed whitespace-pre-wrap">{analysis.salgsoppgaveAnalyse.analysis.raaAnalyse}</p>
                </div>
              )}
            </div>
          )}

          {/* The Good, The Bad, The Ugly - støtter både old og new format */}
          {(analysis.the_good || (analysis.standard_analyse && analysis.standard_analyse.the_good)) && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* The Good */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h4 className="font-seriflogo font-semibold text-green-800 text-lg">The Good</h4>
                </div>
                <ul className="space-y-3">
                  {(analysis.the_good || analysis.standard_analyse?.the_good || []).map((item: string, index: number) => (
                    <li key={index} className="text-green-700 flex items-start gap-3">
                      <span className="text-green-500 font-bold mt-1">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The Bad */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  <h4 className="font-seriflogo font-semibold text-yellow-800 text-lg">The Bad</h4>
                </div>
                <ul className="space-y-3">
                  {(analysis.the_bad || analysis.standard_analyse?.the_bad || []).map((item: string, index: number) => (
                    <li key={index} className="text-yellow-700 flex items-start gap-3">
                      <span className="text-yellow-500 font-bold mt-1">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The Ugly */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <h4 className="font-seriflogo font-semibold text-red-800 text-lg">The Ugly</h4>
                </div>
                <ul className="space-y-3">
                  {(analysis.the_ugly || analysis.standard_analyse?.the_ugly || []).length > 0 ? (
                    (analysis.the_ugly || analysis.standard_analyse?.the_ugly || []).map((item: string, index: number) => (
                      <li key={index} className="text-red-700 flex items-start gap-3">
                        <span className="text-red-500 font-bold mt-1">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">Ingen alvorlige problemer funnet</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Summary - støtter både old og new format */}
          {(analysis.sammendrag || (analysis.standard_analyse && analysis.standard_analyse.sammendrag)) && (
            <div className="bg-brown-50/60 rounded-2xl p-6 border border-brown-200">
              <h4 className="text-xl font-seriflogo font-semibold text-brown-800 mb-4">Standard AI-sammendrag</h4>
              <p className="text-brown-700 leading-relaxed text-lg">
                {analysis.sammendrag || analysis.standard_analyse?.sammendrag}
              </p>
            </div>
          )}

          {/* Chat Section - forbedret med full kontekst */}
          <div className="bg-brown-50/60 rounded-2xl border border-brown-200">
            <div className="p-6 border-b border-brown-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-6 h-6 text-brown-700" />
                  <div>
                    <h4 className="text-xl font-seriflogo font-semibold text-brown-800">Chat med AI-assistenten</h4>
                    <div className="flex items-center gap-4 mt-1">
                      {AIBoligService.hasApiKey() && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-700 font-medium">Ekte OpenAI chat aktivert</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-700 font-medium">Har tilgang til all analyse-data</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-4 py-2 bg-brown-100 text-brown-800 rounded-full hover:bg-brown-200 transition"
                >
                  {showChat ? 'Skjul chat' : 'Åpne chat'}
                </button>
              </div>
            </div>

            {showChat && (
              <div className="p-6">
                {/* Chat Messages */}
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-brown-600 py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-brown-400" />
                      <p className="mb-3">Still spørsmål om boligen! Jeg har tilgang til:</p>
                      <div className="text-sm text-brown-500 space-y-1">
                        <p>• Alle grunnleggende boligdata</p>
                        {analysis.salgsoppgaveAnalyse?.success && <p>• Komplett salgsoppgave-analyse</p>}
                        {analysis.salgsoppgaveAnalyse?.salgsoppgaveFakta && <p>• Strukturerte fakta fra salgsoppgave</p>}
                        {analysis.salgsoppgaveAnalyse?.detailedInfo && <p>• Detaljert teknisk informasjon</p>}
                        <p>• Standard AI-analyse og sammendrag</p>
                      </div>
                    </div>
                  )}
                  
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-brown-500 text-white'
                            : 'bg-white border border-brown-200 text-brown-800'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-brown-200 text-brown-800 max-w-xs lg:max-w-md px-4 py-3 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brown-500"></div>
                          <span>AI analyserer all tilgjengelig data...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Still et spørsmål om boligen..."
                    className="flex-1 rounded-full px-4 py-3 bg-white border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400 placeholder:text-brown-400"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="rounded-full px-6 py-3 bg-brown-500 text-white hover:bg-brown-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* New Analysis Button */}
          <div className="text-center pt-4">
            <button
              onClick={() => {
                setAnalysis(null);
                setUrlInput('');
                setChatMessages([]);
                setShowChat(false);
              }}
              className="rounded-full px-8 py-3 bg-brown-100 text-brown-800 font-semibold hover:bg-brown-200 transition shadow"
            >
              Analyser ny bolig
            </button>
          </div>
        </div>
      )}

      {/* Status info */}
      {!analysis && !loading && (
        <div className="text-center text-brown-600 py-6">
          <p className="font-seriflogo text-lg">Klar for utvidet AI-analyse!</p>
          <div className="text-sm text-brown-500 mt-2 space-y-1">
            <p>OpenAI: {AIBoligService.hasApiKey() ? '✅ Tilkoblet' : '❌ Ikke konfigurert (bruker mock data)'}</p>
            <p>Salgsoppgave-søk: ✅ Aktivert</p>
            <p>PDF-ekstraksjonslogikk: ✅ Implementert</p>
          </div>
        </div>
      )}
    </div>
  );
}; 