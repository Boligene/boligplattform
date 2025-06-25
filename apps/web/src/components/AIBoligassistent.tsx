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
    <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* **REDESIGNET HEADER - EKSKLUSIV OG PROFESJONELL** */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl mb-6 shadow-2xl">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-seriflogo font-bold text-slate-900 mb-4">
            AI Boligassistent
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Din digitale ekspert for avansert boliganalyse med automatisk datahenting og salgsoppgave-tolkning
          </p>
        </div>

        {/* **ELEGANT ANALYSE-SEKSJON** */}
        {!analysis && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200 p-8 mb-8">
            
            {/* **ELEGANTE INFORMASJONSKORT** */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🌐</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">Automatisk Analyse</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Lim inn Finn.no-lenke for automatisk henting av boligdata, salgsoppgave og AI-drevet markedsanalyse
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">Direkte PDF-analyse</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Last opp salgsoppgave direkte for øyeblikkelig og komplett AI-tolkning av alle detaljer
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
                  className="w-full h-16 px-6 text-lg bg-white border-2 border-slate-200 rounded-2xl focus:border-slate-400 focus:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
                <button
                  onClick={handleAnalyse}
                  disabled={loading || !urlInput.trim()}
                  className="absolute right-2 top-2 h-12 px-8 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                <span className="text-slate-500 font-medium px-4">eller</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
              </div>
              
              {/* **PREMIUM PDF-UPLOAD KNAPP** */}
              <div className="text-center">
                <button
                  onClick={togglePDFUpload}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 rounded-2xl hover:from-amber-200 hover:to-amber-300 transition-all border border-amber-300 shadow-sm font-medium"
                >
                  <Upload className="w-5 h-5" />
                  {showPDFUpload ? 'Skjul PDF-upload' : 'Last opp salgsoppgave direkte'}
                </button>
                <p className="text-sm text-slate-500 mt-2">
                  Perfekt hvis du har mottatt salgsoppgaven på e-post eller ønsker øyeblikkelig analyse
                </p>
              </div>
            </div>
          </div>
        )}

        {/* **PREMIUM PDF-UPLOAD SEKSJON** */}
        {(showPDFUpload || (analysis && !manualPDFAnalysis)) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200 p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-seriflogo font-bold text-slate-900 mb-2">
                {analysis 
                  ? manualPDFAnalysis 
                    ? 'Last opp ny salgsoppgave for oppdatert analyse' 
                    : 'Har du en oppdatert salgsoppgave? Last opp for komplett analyse'
                  : 'Last opp salgsoppgave for direkte analyse'
                }
              </h3>
              <p className="text-slate-600 max-w-2xl mx-auto">
                {analysis 
                  ? 'Upload en ny PDF for å overskrive og forbedre den eksisterende analysen med de nyeste dataene'
                  : 'Dra og slipp PDF-filen her, eller klikk for å velge fil. Støtter filer opptil 50MB'
                }
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <PDFDropzone onFileSelect={handlePDFUpload} />
            </div>
            
            {pdfUploading && (
              <div className="mt-6 flex items-center justify-center gap-3 text-slate-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
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
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200 p-12 mb-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-slate-800 mx-auto mb-8"></div>
              <h3 className="text-3xl font-seriflogo font-bold text-slate-900 mb-4">
                Avansert AI-analyse pågår
              </h3>
              <div className="max-w-lg mx-auto space-y-3 text-slate-600">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                  <span>Henter boligdata fra Finn.no</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-100"></div>
                  <span>Søker etter salgsoppgave og dokumenter</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></div>
                  <span>Analyserer PDF-innhold med AI</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></div>
                  <span>Genererer profesjonell markedsanalyse</span>
                </div>
                <p className="text-sm text-slate-500 mt-6">
                  Analyse tar vanligvis 30-90 sekunder avhengig av dokumentkompleksitet
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Analysis Results */}
        {analysis && (
          <div className="space-y-8">
          {/* Score Overview med datakilde-indikatorer */}
          <div className="bg-gradient-to-r from-brown-50 to-brown-100 rounded-2xl p-6 border border-brown-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-seriflogo font-bold text-brown-900">
                    AI-analyse fullført
                  </h3>
                  {/* **DATAKILDE-INDIKATOR** */}
                  {dataSource === 'manual_pdf' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                      <Download className="w-4 h-4 text-orange-600" />
                      <span className="text-xs text-orange-700 font-medium">PDF-basert</span>
                    </div>
                  )}
                  {dataSource === 'combined' && (
                                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-amber-800 font-medium">Kombinert analyse</span>
                    </div>
                  )}
                  {dataSource === 'scraping' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full">
                      <Bot className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-slate-700 font-medium">Automatisk</span>
                  </div>
                  )}
                </div>
                <p className="text-brown-600">{analysis.finn_url || analysis.url || 'Analyse basert på opplastet PDF'}</p>
                
                {/* **ANALYSE DATAKILDE-INFORMASJON** */}
                <div className="mt-2 text-sm text-brown-600">
                  {dataSource === 'manual_pdf' && (
                    <span>Basert på: Opplastet salgsoppgave-PDF</span>
                  )}
                  {dataSource === 'combined' && (
                    <span>Basert på: Opplastet PDF + automatisk data fra Finn.no</span>
                  )}
                  {dataSource === 'scraping' && analysis.salgsoppgaveAnalyse?.success && (
                    <span>Basert på: Automatisk hentet data og salgsoppgave</span>
                  )}
                  {dataSource === 'scraping' && !analysis.salgsoppgaveAnalyse?.success && (
                    <span>Basert på: Automatisk hentet data (uten salgsoppgave)</span>
                  )}
                  </div>
                </div>
              <div className="flex items-center gap-3">
                    {getScoreIcon(analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75)}
                <span className={`text-4xl font-seriflogo font-bold ${getScoreColor(analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75)}`}>
                  {analysis.score || (analysis.standard_analyse && analysis.standard_analyse.score) || 75}/100
                    </span>
                </div>
              </div>

            {/* **ALLTID SYNLIG PDF-UPLOAD MULIGHET I ANALYSE-VISNING** */}
            <div className="flex items-center justify-between mb-4 p-3 bg-white/60 rounded-lg border border-brown-200">
              <div className="flex items-center gap-2 text-sm text-brown-700">
                <Upload className="w-4 h-4" />
                <span>
                  {manualPDFAnalysis 
                    ? 'Analysen er oppdatert med opplastet PDF' 
                    : 'Ønsker du å laste opp salgsoppgave-PDF for enda bedre analyse?'
                  }
                </span>
                    </div>
                    <button
                onClick={togglePDFUpload}
                className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition"
                    >
                {showPDFUpload ? 'Skjul' : 'Last opp PDF'}
                    </button>
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
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full">
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                  <span className="text-sm text-amber-800 font-medium">
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
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-700 font-medium">Ekte data fra Finn.no</span>
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
            </div>
                </div>
              </div>
              );
            })()
          )}

          {/* Salgsoppgave-fakta (strukturerte data) */}
          {analysis.salgsoppgaveAnalyse?.salgsoppgaveFakta && Object.keys(analysis.salgsoppgaveAnalyse.salgsoppgaveFakta).length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-stone-100 rounded-3xl p-6 border border-stone-200 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-amber-700 to-amber-800 p-3 rounded-2xl shadow-lg">
                  <Info className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-seriflogo font-bold text-slate-900">Strukturerte fakta fra salgsoppgave</h3>
                  <p className="text-slate-700">Nøkkeldata ekstrahert direkte fra salgsoppgave (prioriteres over scraping)</p>
              </div>
            </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analysis.salgsoppgaveAnalyse.salgsoppgaveFakta).map(([key, value]) => (
                  <div key={key} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-slate-600 font-medium mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </div>
                    <div className="text-slate-900 font-semibold">
                      {String(value)}
              </div>
            </div>
                ))}
                </div>
              </div>
          )}

          {/* Salgsoppgave-analyse seksjon */}
          {analysis.salgsoppgaveAnalyse && analysis.salgsoppgaveAnalyse.success && analysis.salgsoppgaveAnalyse.analysis && (
            <div className="bg-gradient-to-br from-slate-50 to-stone-100 rounded-3xl p-6 border border-stone-200 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-amber-700 to-amber-800 p-3 rounded-2xl shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-seriflogo font-bold text-slate-900">Salgsoppgave-analyse</h3>
                  <p className="text-slate-700">Dyp analyse basert på full salgsoppgave</p>
              </div>
            </div>

              {/* Hvis vi har strukturert analyse */}
              {analysis.salgsoppgaveAnalyse.analysis && typeof analysis.salgsoppgaveAnalyse.analysis === 'object' && analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Teknisk tilstand */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">Teknisk tilstand</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-amber-700">
                        {analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.score}/10
                      </span>
                      <span className="text-slate-600">Score</span>
                </div>
                    <p className="text-slate-700 mb-3">{analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.sammendrag}</p>
                    {analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.hovedFunn && (
                      <ul className="space-y-1">
                        {analysis.salgsoppgaveAnalyse.analysis.tekniskTilstand.hovedFunn.map((funn: string, index: number) => (
                          <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-amber-600 mt-1">•</span>
                            <span>{funn}</span>
                          </li>
                        ))}
                      </ul>
                    )}
            </div>

                  {/* Risiko */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">Risikoanalyse</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-amber-700">
                        {analysis.salgsoppgaveAnalyse.analysis.risiko.score}/10
                      </span>
                      <span className="text-slate-600">Risiko</span>
                </div>
                    <p className="text-slate-700 mb-3">{analysis.salgsoppgaveAnalyse.analysis.risiko.sammendrag}</p>
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
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">Prisvurdering</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-amber-700">
                        {analysis.salgsoppgaveAnalyse.analysis.prisvurdering.score}/10
                      </span>
                      <span className="text-slate-600">Verdi</span>
                </div>
                    <p className="text-slate-700 mb-3">{analysis.salgsoppgaveAnalyse.analysis.prisvurdering.sammendrag}</p>
                    <p className="text-sm text-slate-600">{analysis.salgsoppgaveAnalyse.analysis.prisvurdering.markedsvurdering}</p>
            </div>

                  {/* Oppussingsbehov */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">Oppussingsbehov</h4>
                    {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.estimertKostnad && (
                      <p className="text-lg font-semibold text-amber-700 mb-3">
                        {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.estimertKostnad}
                      </p>
                    )}
                    {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.nodvendig && (
                      <div className="mb-3">
                        <h5 className="font-semibold text-slate-700 mb-1">Nødvendig:</h5>
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
                        <h5 className="font-semibold text-slate-700 mb-1">Ønskelig:</h5>
                        <ul className="space-y-1">
                          {analysis.salgsoppgaveAnalyse.analysis.oppussingBehov.onsket.map((tiltak: string, index: number) => (
                            <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-amber-600 mt-1">○</span>
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
                <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">Anbefalte spørsmål til visning</h4>
                  <ul className="space-y-2">
                    {analysis.salgsoppgaveAnalyse.analysis.anbefalteSporsmal.map((sporsmal: string, index: number) => (
                      <li key={index} className="text-slate-700 flex items-start gap-2">
                        <span className="text-amber-600 mt-1">?</span>
                        <span>{sporsmal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Konklusjon */}
              {analysis.salgsoppgaveAnalyse.analysis && analysis.salgsoppgaveAnalyse.analysis.konklusjon && (
                <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">Konklusjon</h4>
                  <p className="text-slate-700 leading-relaxed">{analysis.salgsoppgaveAnalyse.analysis.konklusjon}</p>
                </div>
              )}

              {/* Fallback for rå analyse */}
              {analysis.salgsoppgaveAnalyse.analysis && analysis.salgsoppgaveAnalyse.analysis.raaAnalyse && (
                <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-seriflogo font-semibold text-slate-800 text-lg mb-3">AI-analyse av salgsoppgave</h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.salgsoppgaveAnalyse.analysis.raaAnalyse}</p>
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
        <div className="text-center text-slate-600 py-6">
          <p className="font-seriflogo text-lg">Klar for utvidet AI-analyse!</p>
          <div className="text-sm text-slate-500 mt-2 space-y-1">
            <p>OpenAI: {AIBoligService.hasApiKey() ? '✅ Tilkoblet' : '❌ Ikke konfigurert (bruker mock data)'}</p>
            <p>Salgsoppgave-søk: ✅ Aktivert</p>
            <p>PDF-ekstraksjonslogikk: ✅ Implementert</p>
                </div>
              </div>
      )}
        </div>
      </div>
  );
}; 