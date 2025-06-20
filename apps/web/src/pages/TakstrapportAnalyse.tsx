import { AIBoligService } from '@boligplattform/core';
import { AlertTriangle, ArrowRight, CheckCircle, FileText, Loader2, Upload } from "lucide-react";
import * as React from "react";

export default function TakstrapportAnalyse() {
  const [step, setStep] = React.useState(1); // 1: Last opp, 2: Analyserer, 3: Resultat
  const [file, setFile] = React.useState<File | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<any>(null);
  const [manualText, setManualText] = React.useState("");
  const [showManual, setShowManual] = React.useState(false);
  const [suggestedTitle, setSuggestedTitle] = React.useState("");
  // const navigate = useNavigate(); // Unused for now

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setError("");
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === "application/pdf") {
      setFile(files[0]);
      setStep(2);
      analysePdf(files[0]);
    } else {
      setError("Vennligst last opp en PDF-fil.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const files = e.target.files;
    if (files && files[0] && files[0].type === "application/pdf") {
      setFile(files[0]);
      setStep(2);
      analysePdf(files[0]);
    } else {
      setError("Vennligst last opp en PDF-fil.");
    }
  }

  async function analysePdf(pdfFile: File) {
    setError("");
    setResult(null);
    setStep(2);
    try {
      const data = await AIBoligService.analysePDFOrText(pdfFile);
      setResult(data);
      setSuggestedTitle(data.forslagTittel || "");
      setStep(3);
    } catch (err: any) {
      console.error('PDF analyse feil:', err);
      setError("Kunne ikke lese PDF. Prøv å lime inn tekst manuelt.");
      setShowManual(true);
      setStep(1);
    }
  }

  async function analyseManualText() {
    setError("");
    setResult(null);
    setStep(2);
    try {
      const data = await AIBoligService.analysePDFOrText(undefined, manualText);
      setResult(data);
      setSuggestedTitle(data.forslagTittel || "");
      setStep(3);
    } catch (err: any) {
      console.error('Tekst analyse feil:', err);
      setError("Kunne ikke analysere tekst. Prøv igjen.");
      setStep(1);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  // Dummy-resultat for design/demo (hvis ingen OpenAI API key)
  const dummyResult = {
    sammendrag: "Dette er et sammendrag av takstrapporten. Boligen har noen avvik, men generelt god stand.",
    avvik: [
      { beskrivelse: "Fukt i kjeller", tg: "TG2" },
      { beskrivelse: "Råte i vindu", tg: "TG3" },
      { beskrivelse: "Normal slitasje bad", tg: "TG2" },
    ],
    risiko: "Moderat risiko. TG3-avvik bør utbedres snarlig.",
    forslagTittel: "Takstrapport for Eksempelveien 1",
  };

  // For demo: bruk dummy-resultat hvis result == null og step === 3
  const visResultat = result || (step === 3 ? dummyResult : null);

  return (
    <div className="min-h-screen bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col">
      <main className="flex flex-col items-center justify-center flex-1">
        <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6 md:p-10 w-full max-w-2xl flex flex-col items-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-seriflogo font-bold text-brown-900 text-center mb-4 sm:mb-6 leading-tight">
            Takstrapportanalyse
          </h2>
          <p className="text-brown-600 text-center mb-6 text-sm sm:text-base">
            Last opp salgsoppgave eller takstrapport for detaljert AI-analyse
          </p>
          
          {/* Fremgangsindikator */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 w-full text-sm sm:text-base">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-green-700' : 'text-brown-400'}`}>
              <Upload className="w-4 h-4" />
              1. Last opp
            </div>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-brown-300" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-green-700' : 'text-brown-400'}`}>
              <Loader2 className="w-4 h-4" />
              2. Analyser
            </div>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-brown-300" />
            <div className={`flex items-center gap-2 ${step === 3 ? 'text-green-700' : 'text-brown-400'}`}>
              <CheckCircle className="w-4 h-4" />
              3. Få svar
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Dropzone eller loader/resultat */}
          {step === 1 && !showManual && (
            <div className="w-full flex flex-col items-center">
              <div
                className="w-full border-2 border-dashed border-brown-300 bg-brown-50 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-brown-100 transition mb-4 min-h-[120px] sm:min-h-[160px]"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-brown-400 mb-2" />
                <div className="text-brown-700 font-semibold text-base sm:text-lg mb-1 text-center">Dra inn eller klikk for å laste opp PDF</div>
                <div className="text-brown-400 text-xs sm:text-sm text-center">Salgsoppgave eller takstrapport</div>
                <input
                  id="fileInput"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <button
                className="text-brown-500 hover:text-brown-700 text-xs sm:text-sm underline transition-colors"
                onClick={() => setShowManual(true)}
              >
                Eller lim inn tekst manuelt
              </button>
            </div>
          )}

          {/* Manuell tekstinnliming */}
          {step === 1 && showManual && (
            <div className="w-full flex flex-col items-center">
              <textarea
                className="w-full min-h-[100px] sm:min-h-[120px] rounded-xl border border-brown-200 p-3 sm:p-4 mb-3 sm:mb-4 text-brown-800 bg-brown-50 focus:outline-none focus:ring-2 focus:ring-brown-400 text-sm sm:text-base resize-y"
                placeholder="Lim inn tekst fra PDF her..."
                value={manualText}
                onChange={e => setManualText(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  className="rounded-full px-4 sm:px-6 py-3 bg-brown-500 text-white font-semibold text-base sm:text-lg hover:bg-brown-600 active:bg-brown-700 transition flex items-center gap-2 shadow w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={analyseManualText}
                  disabled={!manualText.trim()}
                >
                  Analyser tekst <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  className="rounded-full px-4 sm:px-6 py-3 bg-brown-100 text-brown-700 font-semibold text-base sm:text-lg hover:bg-brown-200 active:bg-brown-300 transition flex items-center gap-2 shadow w-full justify-center"
                  onClick={() => setShowManual(false)}
                >
                  Tilbake
                </button>
              </div>
            </div>
          )}

          {/* Loader */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center w-full py-8 sm:py-12">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-brown-400 animate-spin mb-4" />
              <div className="text-brown-700 font-semibold text-base sm:text-lg">Analyserer dokument...</div>
              <div className="text-brown-500 text-sm mt-2">Dette kan ta noen sekunder</div>
            </div>
          )}

          {/* Resultat */}
          {step === 3 && visResultat && (
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                <div className="text-green-700 font-semibold text-base sm:text-lg">Analyse klar!</div>
              </div>
              {suggestedTitle && (
                <div className="text-brown-900 font-seriflogo text-lg sm:text-2xl font-bold mb-2 text-center">{suggestedTitle}</div>
              )}
              <div className="bg-brown-50 rounded-xl p-3 sm:p-4 w-full mb-4">
                <div className="font-semibold text-brown-700 mb-1 text-sm sm:text-base">Sammendrag</div>
                <div className="text-brown-800 mb-2 text-sm sm:text-base whitespace-pre-line">{visResultat.sammendrag}</div>
                <div className="font-semibold text-brown-700 mb-1 mt-2 text-sm sm:text-base">Risikovurdering</div>
                <div className="text-brown-800 mb-2 text-sm sm:text-base whitespace-pre-line">{visResultat.risiko}</div>
                <div className="font-semibold text-brown-700 mb-1 mt-2 text-sm sm:text-base">Viktige avvik</div>
                <ul className="flex flex-col gap-2">
                  {visResultat.avvik.map((avvik: any, i: number) => (
                    <li key={i} className={`flex items-center gap-2 rounded px-2 sm:px-3 py-2 ${avvik.tg === 'TG3' ? 'bg-red-100' : avvik.tg === 'TG2' ? 'bg-yellow-100' : 'bg-brown-100'}`}>
                      <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${avvik.tg === 'TG3' ? 'text-red-600' : avvik.tg === 'TG2' ? 'text-yellow-600' : 'text-brown-400'}`} />
                      <span className="font-semibold text-xs sm:text-sm">{avvik.tg}</span>
                      <span className="text-brown-800 text-xs sm:text-sm">{avvik.beskrivelse}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="rounded-full px-4 sm:px-6 py-3 bg-brown-500 text-white font-semibold text-base sm:text-lg hover:bg-brown-600 active:bg-brown-700 transition flex items-center gap-2 shadow mt-2"
                onClick={() => setStep(1)}
              >
                Analyser ny rapport
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 