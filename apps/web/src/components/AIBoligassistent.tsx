import { AIBoligService } from '@boligplattform/core';
import { AlertTriangle, Bot, Brain, CheckCircle, Download, FileText, Info, MessageCircle, Send, Upload, XCircle } from 'lucide-react';
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
  
  // **STATE VARIABLER FOR PDF-UPLOAD - ALLTID TILGJENGELIG**
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const [manualPDFAnalysis, setManualPDFAnalysis] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'scraping' | 'manual_pdf' | 'combined'>('scraping');

  console.log('AIBoligassistent component rendering');

  const handleAnalyse = async () => {
    if (!urlInput.trim()) {
      alert('Vennligst legg inn en Finn.no lenke');
      return;
    }

    console.log('Analyse clicked - bruker utvidet salgsoppgave-analyse');
    setLoading(true);
    
    // **RYDD OPP STATE FRA FORRIGE ANALYSE**
    setPdfUploadError('');
    setManualPDFAnalysis(null);
    setDataSource('scraping');
    
    try {
      // Bruk den nye utvidede analysen som inkluderer salgsoppgave
      const analysisResult = await AIBoligService.analyseMedSalgsoppgave(urlInput);
      console.log('Utvidet analyse result:', analysisResult);
      setAnalysis(analysisResult);
      
    } catch (error) {
      console.error('Service error:', error);
      alert('Noe gikk galt under analysen. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  // **FORBEDRET FUNKSJON FOR PDF-UPLOAD AV SALGSOPPGAVE**
  const handlePDFUpload = async (file: File) => {
    console.log('📄 Starter manuell PDF-upload av salgsoppgave');
    setPdfUploading(true);
    setPdfUploadError('');
    
    try {
      // Bruk AIBoligService for å laste opp PDF
      const pdfResult = await AIBoligService.analyseSalgsoppgavePDF(file, urlInput || '');
      console.log('✅ PDF-analyse fullført:', pdfResult);
      
      setManualPDFAnalysis(pdfResult);
      
      // **FORBEDRET KOMBINERINGSSTRATEGI**
      if (analysis) {
        // Kombiner PDF-analyse med eksisterende scraping-data
        const combinedAnalysis = {
          ...analysis,
          // Overstyr salgsoppgave-delen med PDF-resultatet (høyere prioritet)
          salgsoppgaveAnalyse: {
            ...pdfResult,
            _isManualUpload: true,
            _uploadTimestamp: new Date().toISOString(),
            _originalFileName: file.name
          },
          // Behold scraping-data som sekundær kilde
          _dataSources: {
            primary: 'manual_pdf',
            secondary: 'scraping',
            scrapingData: analysis.scraping_data || analysis.boligData,
            manualPDFData: pdfResult
          }
        };
        
        console.log('🔄 Kombinerer PDF-analyse med eksisterende scraping-data');
        setAnalysis(combinedAnalysis);
        setDataSource('combined');
      } else {
        // Hvis vi ikke har eksisterende analyse, opprett ny basert kun på PDF
        const pdfOnlyAnalysis = {
          salgsoppgaveAnalyse: {
            ...pdfResult,
            _isManualUpload: true,
            _uploadTimestamp: new Date().toISOString(),
            _originalFileName: file.name
          },
          _dataSources: {
            primary: 'manual_pdf_only',
            manualPDFData: pdfResult
          },
          // Generer en grunnleggende score basert på PDF-analysen
          score: pdfResult.analysis?.score || 75,
          sammendrag: pdfResult.analysis?.sammendrag || 'Analyse basert på opplastet salgsoppgave-PDF'
        };
        
        setAnalysis(pdfOnlyAnalysis);
        setDataSource('manual_pdf');
      }
      
      // **BEHOLD PDF-UPLOAD SEKSJONEN ÅPEN MED SUKSESS-MELDING**
      // setShowPDFUpload(false); // Fjernet - lar brukeren se resultatet
      
    } catch (error) {
      console.error('❌ PDF-upload feilet:', error);
      setPdfUploadError(error instanceof Error ? error.message : 'Ukjent feil ved PDF-upload');
    } finally {
      setPdfUploading(false);
    }
  };

  // **FUNKSJON FOR Å ÅPNE/LUKKE PDF-UPLOAD SEKSJONEN**
  const togglePDFUpload = () => {
    setShowPDFUpload(!showPDFUpload);
    if (!showPDFUpload) {
      setPdfUploadError('');
    }
  };

  // **NY FUNKSJON FOR Å OVERSKRIVE EKSISTERENDE ANALYSE**
  const handleOverwriteAnalysis = () => {
    setShowPDFUpload(true);
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
      // **NYT: Pre-processing av spørsmål for å sikre presise svar på romstørrelser**
      console.log('🤖 Behandler spørsmål:', question);
      console.log('📊 Tilgjengelig analyse-data:', {
        hasAnalysis: !!analysis,
        hasSalgsoppgave: !!(analysis?.salgsoppgaveAnalyse?.success),
        hasManualPDF: !!manualPDFAnalysis,
        hasDetailedInfo: !!(analysis?.salgsoppgaveAnalyse?.detailedInfo),
        hasRomInfo: !!(analysis?.salgsoppgaveAnalyse?.detailedInfo?.romInformasjon)
      });

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
          // **INKLUDER MANUELL PDF-DATA MED FULL TEKST**
          manualPDFData: manualPDFAnalysis ? {
            ...manualPDFAnalysis,
            // Sikre at hele PDF-teksten sendes til AI
            fullText: manualPDFAnalysis.extractedText || manualPDFAnalysis.fullText || '',
            extractedText: manualPDFAnalysis.extractedText || manualPDFAnalysis.fullText || ''
          } : null
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

      // **FORBEDRET: Bruk AIBoligService med full debugging**
      console.log('🚀 Sender spørsmål til AI med kontekst:', {
        questionLength: question.length,
        contextSize: JSON.stringify(enrichedAnalysis).length,
        hasAllData: !!enrichedAnalysis.allData,
        hasManualPDF: !!enrichedAnalysis.allData?.manualPDFData,
        pdfTextLength: enrichedAnalysis.allData?.manualPDFData?.fullText?.length || 0
      });
      
      const response = await AIBoligService.chatMedAI(question, enrichedAnalysis, chatMessages);
      
      console.log('✅ AI-respons mottatt:', {
        responseLength: response.content.length,
        timestamp: response.timestamp
      });
      
      return response.content;
    } catch (error) {
      console.error('❌ Chat-feil:', error);
      
      // **FORBEDRET FEILMELDING MED CONTEXT**
      if (error instanceof Error) {
        if (error.message.includes('API')) {
          return 'OpenAI API-feil. Sjekk API-nøkkel eller prøv igjen senere.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          return 'Nettverksfeil. Sjekk internettforbindelsen og prøv igjen.';
        }
      }
      
      return 'Beklager, jeg kunne ikke svare på det akkurat nå. Prøv igjen eller last opp salgsoppgave-PDF for bedre analyse.';
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
    <div className="space-y-8">
        
        {/* **ELEGANTE INFORMASJONSKORT FØR ANALYSE** */}
        {!analysis && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-brown-100 p-8">
            
            {/* **FEATURE HIGHLIGHTS** */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-brown-50 to-brown-100 rounded-2xl p-6 border border-brown-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-brown-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-seriflogo font-bold text-brown-900">Automatisk Analyse</h3>
                </div>
                <p className="text-brown-700 leading-relaxed">
                  Lim inn Finn.no-lenke for automatisk henting av boligdata, salgsoppgave og AI-drevet markedsanalyse
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl p-6 border border-stone-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-stone-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-seriflogo font-bold text-brown-900">PDF-analyse</h3>
                </div>
                <p className="text-brown-700 leading-relaxed">
                  Last opp salgsoppgave direkte for øyeblikkelig og komplett AI-tolkning av alle detaljer
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-seriflogo font-bold text-brown-900">AI Chat</h3>
                </div>
                <p className="text-brown-700 leading-relaxed">
                  Still oppfølgingsspørsmål og få detaljerte svar basert på komplett analyse
                </p>
              </div>
            </div>

            {/* **SOFISTIKERT INPUT-SEKSJON** */}
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Lim inn Finn.no-lenke for automatisk analyse..."
                  className="w-full h-16 px-6 text-lg bg-white border-2 border-brown-200 rounded-2xl focus:border-brown-400 focus:outline-none transition-all placeholder:text-brown-400 shadow-sm"
                />
                <button
                  onClick={handleAnalyse}
                  disabled={loading || !urlInput.trim()}
                  className="absolute right-2 top-2 h-12 px-8 bg-gradient-to-r from-brown-600 to-brown-700 text-white font-semibold rounded-xl hover:from-brown-700 hover:to-brown-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              
              {/* **ELEGANT ELLER-SEPARATOR** */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brown-300 to-transparent"></div>
                <span className="text-brown-500 font-medium px-4">eller</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brown-300 to-transparent"></div>
              </div>
              
              {/* **PREMIUM PDF-UPLOAD KNAPP** */}
              <div className="text-center">
                <button
                  onClick={togglePDFUpload}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-stone-100 to-stone-200 text-stone-800 rounded-2xl hover:from-stone-200 hover:to-stone-300 transition-all border border-stone-300 shadow-sm font-semibold"
                >
                  <Upload className="w-5 h-5" />
                  {showPDFUpload ? 'Skjul PDF-upload' : 'Last opp salgsoppgave direkte'}
                </button>
                <p className="text-sm text-brown-600 mt-2">
                  Perfekt hvis du har mottatt salgsoppgaven på e-post eller ønsker øyeblikkelig analyse
                </p>
              </div>
            </div>
          </div>
        )}

        {/* **PREMIUM PDF-UPLOAD SEKSJON** */}
        {(showPDFUpload || (analysis && !manualPDFAnalysis)) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-brown-100 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-stone-600 to-stone-700 rounded-2xl mb-4 shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-seriflogo font-bold text-brown-900 mb-2">
                {analysis 
                  ? manualPDFAnalysis 
                    ? 'Last opp ny salgsoppgave for oppdatert analyse' 
                    : 'Har du en oppdatert salgsoppgave? Last opp for komplett analyse'
                  : 'Last opp salgsoppgave for direkte analyse'
                }
              </h3>
              <p className="text-brown-700 max-w-2xl mx-auto">
                {analysis 
                  ? 'Upload en ny PDF for å overskrive og forbedre den eksisterende analysen med de nyeste dataene'
                  : 'Dra og slipp PDF-filen her, eller klikk for å velge fil. Støtter filer opp til 50MB'
                }
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <PDFDropzone onFileSelect={handlePDFUpload} />
            </div>
            
            {pdfUploading && (
              <div className="mt-6 flex items-center justify-center gap-3 text-brown-700">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brown-600"></div>
                <span className="font-medium">Analyserer PDF med AI...</span>
              </div>
            )}

            {pdfUploadError && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-800">Feil ved PDF-upload</h4>
                </div>
                <p className="text-red-700 text-sm">{pdfUploadError}</p>
              </div>
            )}

            {manualPDFAnalysis && !pdfUploading && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-semibold text-emerald-800">PDF analysert!</h4>
                </div>
                <p className="text-emerald-700 text-sm">
                  Salgsoppgaven er analysert og integrert i analysen nedenfor.
                  {manualPDFAnalysis._originalFileName && ` (${manualPDFAnalysis._originalFileName})`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* **PREMIUM LOADING STATE** */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-brown-100 p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-brown-600 mx-auto mb-8"></div>
              <h3 className="text-3xl font-seriflogo font-bold text-brown-900 mb-4">
                Avansert AI-analyse pågår
              </h3>
              <div className="max-w-lg mx-auto space-y-3 text-brown-700">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brown-400 rounded-full animate-pulse"></div>
                  <span>Henter boligdata fra Finn.no</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brown-400 rounded-full animate-pulse delay-100"></div>
                  <span>Søker etter salgsoppgave og dokumenter</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brown-400 rounded-full animate-pulse delay-200"></div>
                  <span>Analyserer PDF-innhold med AI</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-brown-400 rounded-full animate-pulse delay-300"></div>
                  <span>Genererer profesjonell markedsanalyse</span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* **REDESIGNET ANALYSE-RESULTATER** */}
        {analysis && (
          <div className="space-y-8">
          {/* **PREMIUM SCORE OVERVIEW** */}
          <div className="bg-gradient-to-br from-brown-50 to-brown-100 rounded-3xl p-8 border border-brown-200 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-seriflogo font-bold text-brown-900">
                    AI-analyse fullført
                  </h3>
                  {/* **DATAKILDE-INDIKATOR** */}
                  {dataSource === 'manual_pdf' && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-stone-100 rounded-full border border-stone-200">
                      <Download className="w-4 h-4 text-stone-600" />
                      <span className="text-sm text-stone-700 font-medium">PDF-basert</span>
                    </div>
                  )}
                  {dataSource === 'combined' && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-brown-200 rounded-full border border-brown-300">
                        <FileText className="w-4 h-4 text-brown-600" />
                        <span className="text-sm text-brown-800 font-medium">Kombinert analyse</span>
                    </div>
                  )}
                  {dataSource === 'scraping' && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                      <Bot className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700 font-medium">Automatisk</span>
                  </div>
                  )}
                </div>
                <p className="text-brown-700 font-medium">{analysis.finn_url || analysis.url || 'Analyse basert på opplastet PDF'}</p>
                </div>
              <div className="flex items-center gap-4">
                    {getScoreIcon(analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75)}
                <span className={`text-5xl font-seriflogo font-bold ${getScoreColor(analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75)}`}>
                  {analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75}/100
                    </span>
                </div>
              </div>

            {/* **ALWAYS-VISIBLE PDF UPLOAD OPTION** */}
            <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-brown-200">
              <div className="flex items-center gap-2 text-brown-700">
                <Upload className="w-5 h-5" />
                <span className="font-medium">
                  {manualPDFAnalysis 
                    ? 'Analysen er oppdatert med opplastet PDF' 
                    : 'Ønsker du å laste opp salgsoppgave-PDF for enda bedre analyse?'
                  }
                </span>
                    </div>
                    <button
                onClick={togglePDFUpload}
                className="px-4 py-2 bg-brown-600 text-white rounded-xl hover:bg-brown-700 transition font-medium"
                    >
                {showPDFUpload ? 'Skjul' : 'Last opp PDF'}
                    </button>
                  </div>

            {/* **STATUS INDICATORS** */}
            <div className="flex flex-wrap gap-3 mt-6">
              {analysis.raw_openai_response && analysis.raw_openai_response !== "Mock analyse - ingen ekte OpenAI respons" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full border border-emerald-200">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-emerald-700 font-medium">Analysert med ekte OpenAI GPT</span>
                </div>
              )}
              {(!analysis.raw_openai_response || analysis.raw_openai_response === "Mock analyse - ingen ekte OpenAI respons") && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-orange-700 font-medium">Demo-analyse</span>
            </div>
              )}
              
              {analysis.salgsoppgaveAnalyse && analysis.salgsoppgaveAnalyse.success && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full border border-amber-200">
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                  <span className="text-sm text-amber-800 font-medium">
                    Salgsoppgave funnet
                  </span>
                </div>
              )}
            </div>
            </div>

          {/* **SALGSOPPGAVE-FAKTA** */}
          {analysis.salgsoppgaveAnalyse?.salgsoppgaveFakta && Object.keys(analysis.salgsoppgaveAnalyse.salgsoppgaveFakta).length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-brown-100 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-br from-brown-600 to-brown-700 p-4 rounded-2xl shadow-lg">
                  <Info className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-seriflogo font-bold text-brown-900">Fakta fra salgsoppgave</h3>
                  <p className="text-brown-700">Strukturerte data ekstrahert fra dokumenter</p>
              </div>
            </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analysis.salgsoppgaveAnalyse.salgsoppgaveFakta).map(([key, value]) => (
                  <div key={key} className="bg-gradient-to-br from-brown-50 to-brown-100 rounded-2xl p-4 border border-brown-200">
                    <div className="text-sm text-brown-600 font-medium mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </div>
                    <div className="text-brown-900 font-semibold">
                      {String(value)}
              </div>
            </div>
                ))}
                </div>
              </div>
          )}

          {/* **ERSTATT "THE GOOD, THE BAD, THE UGLY" MED PROFESJONELL ANALYSE** */}
          {(analysis.the_good || (analysis.standard_analyse && analysis.standard_analyse.the_good)) && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-brown-100 shadow-xl">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-seriflogo font-bold text-brown-900 mb-2">
                  Analyse-oversikt
                </h3>
                <p className="text-brown-700">Komplett vurdering av boligens egenskaper</p>
              </div>

                             <div className="grid lg:grid-cols-3 gap-6">
                 {/* **HØYDEPUNKTER** */}
                 <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg">
                       <CheckCircle className="w-6 h-6 text-white" />
                     </div>
                     <h4 className="font-seriflogo font-bold text-emerald-800 text-xl">Høydepunkter</h4>
                   </div>
                   <ul className="space-y-3">
                     {(analysis.the_good || analysis.standard_analyse?.the_good || []).map((item: string, index: number) => (
                       <li key={index} className="text-emerald-800 flex items-start gap-3">
                         <span className="text-emerald-600 font-bold mt-1 text-lg">•</span>
                         <span className="leading-relaxed font-medium">{item}</span>
                       </li>
                     ))}
                   </ul>
             </div>

                 {/* **VURDERINGSPUNKTER** */}
                 <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="bg-amber-600 p-3 rounded-2xl shadow-lg">
                       <AlertTriangle className="w-6 h-6 text-white" />
                     </div>
                     <h4 className="font-seriflogo font-bold text-amber-800 text-xl">Vurderingspunkter</h4>
                   </div>
                   <ul className="space-y-3">
                     {(analysis.the_bad || analysis.standard_analyse?.the_bad || []).map((item: string, index: number) => (
                       <li key={index} className="text-amber-800 flex items-start gap-3">
                         <span className="text-amber-600 font-bold mt-1 text-lg">•</span>
                         <span className="leading-relaxed font-medium">{item}</span>
                       </li>
                     ))}
                   </ul>
             </div>

                 {/* **RØDE FLAGG** */}
                 <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="bg-red-600 p-3 rounded-2xl shadow-lg">
                       <XCircle className="w-6 h-6 text-white" />
                     </div>
                     <h4 className="font-seriflogo font-bold text-red-800 text-xl">Røde flagg</h4>
                   </div>
                   <ul className="space-y-3">
                     {(analysis.the_ugly || analysis.standard_analyse?.the_ugly || []).length > 0 ? (
                       (analysis.the_ugly || analysis.standard_analyse?.the_ugly || []).map((item: string, index: number) => (
                         <li key={index} className="text-red-800 flex items-start gap-3">
                           <span className="text-red-600 font-bold mt-1 text-lg">•</span>
                           <span className="leading-relaxed font-medium">{item}</span>
                         </li>
                       ))
                     ) : (
                       <li className="text-stone-600 italic font-medium flex items-start gap-3">
                         <span className="text-emerald-600 font-bold mt-1 text-lg">✓</span>
                         <span>Ingen kritiske problemer identifisert</span>
                       </li>
                     )}
                   </ul>
                 </div>
               </div>
            </div>
          )}

          {/* **PROFESJONELL SAMMENDRAG** */}
          {(analysis.sammendrag || (analysis.standard_analyse && analysis.standard_analyse.sammendrag)) && (
            <div className="bg-gradient-to-br from-brown-50 to-brown-100 rounded-3xl p-8 border border-brown-200 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-br from-brown-600 to-brown-700 p-4 rounded-2xl shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-2xl font-seriflogo font-bold text-brown-900">AI-sammendrag</h4>
                  <p className="text-brown-700">Ekspertens konklusjon</p>
                </div>
              </div>
              <p className="text-brown-800 leading-relaxed text-lg font-medium">
                {analysis.sammendrag || analysis.standard_analyse?.sammendrag}
              </p>
            </div>
          )}

          {/* **PREMIUM CHAT SECTION** */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-brown-100 shadow-xl">
            <div className="p-8 border-b border-brown-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-brown-600 to-brown-700 p-4 rounded-2xl shadow-lg">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-seriflogo font-bold text-brown-900">Chat med AI-assistenten</h4>
                    <div className="flex items-center gap-6 mt-2">
                      {AIBoligService.hasApiKey() && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-emerald-700 font-medium">Ekte OpenAI chat aktivert</span>
                </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-brown-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-brown-700 font-medium">Har tilgang til all analyse-data</span>
              </div>
            </div>
                </div>
              </div>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="px-6 py-3 bg-brown-600 text-white rounded-2xl hover:bg-brown-700 transition font-semibold"
                >
                  {showChat ? 'Skjul chat' : 'Åpne chat'}
                </button>
            </div>
            </div>

            {showChat && (
              <div className="p-8">
                {/* Chat Messages */}
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto bg-brown-50/50 rounded-2xl p-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-brown-700 py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-brown-400" />
                      <p className="font-semibold mb-3">Still spørsmål om boligen!</p>
                      <div className="text-sm text-brown-600 space-y-2">
                        <p>• Alle grunnleggende boligdata</p>
                        {analysis.salgsoppgaveAnalyse?.success && <p>• Komplett salgsoppgave-analyse</p>}
                        {analysis.salgsoppgaveAnalyse?.salgsoppgaveFakta && <p>• Strukturerte fakta fra salgsoppgave</p>}
                        <p>• AI-analyse og anbefalinger</p>
                </div>
              </div>
                  )}
                  
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-sm ${
                          message.role === 'user'
                            ? 'bg-brown-600 text-white'
                            : 'bg-white border border-brown-200 text-brown-900'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                </div>
              </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-brown-200 text-brown-900 max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brown-600"></div>
                          <span className="font-medium">AI analyserer all tilgjengelig data...</span>
                </div>
              </div>
            </div>
                  )}
            </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex gap-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Still et spørsmål om boligen..."
                    className="flex-1 rounded-2xl px-6 py-4 bg-white border border-brown-200 focus:outline-none focus:ring-2 focus:ring-brown-400 placeholder:text-brown-400 font-medium"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="rounded-2xl px-8 py-4 bg-brown-600 text-white hover:bg-brown-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                </div>
            )}
            </div>

          {/* **ELEGANT NEW ANALYSIS BUTTON** */}
          <div className="text-center">
            <button
              onClick={() => {
                setAnalysis(null);
                setUrlInput('');
                setChatMessages([]);
                setShowChat(false);
              }}
              className="rounded-2xl px-8 py-4 bg-gradient-to-r from-stone-100 to-stone-200 border border-stone-300 text-stone-800 font-semibold hover:from-stone-200 hover:to-stone-300 transition-all shadow-lg"
            >
              Analyser ny bolig
            </button>
                </div>
              </div>
      )}

      {/* **STATUS INFO** */}
      {!analysis && !loading && (
        <div className="text-center py-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-brown-100 max-w-md mx-auto">
            <p className="font-seriflogo text-xl text-brown-800 mb-3">Klar for AI-analyse!</p>
            <div className="text-sm text-brown-600 space-y-2">
              <p>OpenAI: {AIBoligService.hasApiKey() ? '✅ Tilkoblet' : '❌ Demo-modus'}</p>
              <p>Salgsoppgave-søk: ✅ Aktivert</p>
              <p>PDF-analyse: ✅ Implementert</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 