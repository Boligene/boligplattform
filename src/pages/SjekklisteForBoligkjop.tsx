import { AlertCircle, Building, Calculator, CheckCircle, ChevronDown, ChevronRight, ChevronUp, DollarSign, FileText, Plus, RotateCcw, TrendingUp, Users, Wrench } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

interface BudSimulation {
  startpris: number;
  antattPrisgrense: number;
  finansieringsbevis: number;
  taktikk: 'forsiktig' | 'aggressiv' | 'reaktiv';
  antallBudgivere: number;
  markedssituasjon: 'hot' | 'normal' | 'cold';
  selgerProfil: 'ivrig' | 'tålmodig' | 'profesjonell';
  tidspress: number; // 1-10 hvor 10 er høyest press
}

interface Competitor {
  id: number;
  name: string;
  budgetRange: { min: number; max: number };
  aggressiveness: number; // 1-10
  patience: number; // 1-10
  lastBid?: number;
}

interface BudEntry {
  id: number;
  bud: number;
  respons: string;
  motpartBud?: number;
  timestamp: Date;
  status: 'avslått' | 'motbud' | 'akseptert' | 'venter' | 'utkonkurrert' | 'budkrig';
  competitorActivity?: string;
  timeLeft?: number; // minutter til frist
  marketPressure?: 'lav' | 'middels' | 'høy' | 'ekstrem';
}

interface ChecklistStep {
  id: string;
  title: string;
  completed: boolean;
}

const SjekklisteForBoligkjop: React.FC = () => {
  const [budSimulation, setBudSimulation] = useState<BudSimulation>({
    startpris: 0,
    antattPrisgrense: 0,
    finansieringsbevis: 0,
    taktikk: 'forsiktig',
    antallBudgivere: 3,
    markedssituasjon: 'normal',
    selgerProfil: 'profesjonell',
    tidspress: 5
  });

  const [currentBud, setCurrentBud] = useState<number>(0);
  const [budLogg, setBudLogg] = useState<BudEntry[]>([]);
  const [budCounter, setBudCounter] = useState<number>(1);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [currentHighestBid, setCurrentHighestBid] = useState<number>(0);
  const [auctionActive, setAuctionActive] = useState<boolean>(false);

  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    economic: true,
    legal: true,
    technical: true,
    coop: true,
    evaluation: true
  });

  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const [checklist, setChecklist] = useState<{[category: string]: ChecklistStep[]}>({
    economic: [
      {
        id: 'financing_proof',
        title: 'Har du finansieringsbevis som dekker maksprisen?',
        completed: false
      },
      {
        id: 'costs_overview',
        title: 'Har du oversikt over dokumentavgift og omkostninger?',
        completed: false
      },
      {
        id: 'buffer_costs',
        title: 'Har du lagt inn en buffer for uforutsette kostnader?',
        completed: false
      },
      {
        id: 'interest_increase',
        title: 'Kan du håndtere renteøkning på 3–4%?',
        completed: false
      }
    ],
    legal: [
      {
        id: 'condition_report',
        title: 'Har du lest og forstått tilstandsrapport?',
        completed: false
      },
      {
        id: 'self_declaration',
        title: 'Har du sett gjennom egenerklæringsskjema?',
        completed: false
      },
      {
        id: 'registered_liens',
        title: 'Har du kontrollert tinglyste heftelser?',
        completed: false
      }
    ],
    technical: [
      {
        id: 'renovation_needs',
        title: 'Er det kjent behov for oppussing eller utbedringer?',
        completed: false
      },
      {
        id: 'bathroom_condition',
        title: 'Er bad/våtrom innen normal levetid?',
        completed: false
      },
      {
        id: 'electrical_work',
        title: 'Vet du når det sist ble gjort elektrisk arbeid?',
        completed: false
      }
    ],
    coop: [
      {
        id: 'common_costs_coverage',
        title: 'Hva dekker felleskostnadene?',
        completed: false
      },
      {
        id: 'planned_maintenance',
        title: 'Er det planlagt større vedlikehold?',
        completed: false
      },
      {
        id: 'board_meetings',
        title: 'Har du lest referater fra styremøter?',
        completed: false
      }
    ],
    evaluation: [
      {
        id: 'personal_feeling',
        title: 'Føles boligen som "deg"?',
        completed: false
      },
      {
        id: 'market_comparison',
        title: 'Har du sammenlignet med lignende boliger i området?',
        completed: false
      },
      {
        id: 'area_commitment',
        title: 'Er du klar for å binde deg til området i flere år?',
        completed: false
      }
    ]
  });

  const toggleStep = (category: string, stepId: string) => {
    setChecklist(prev => ({
      ...prev,
      [category]: prev[category].map(step =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateBudSimulation = (field: keyof BudSimulation, value: number | string) => {
    setBudSimulation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const generateCompetitors = (): Competitor[] => {
    const competitorNames = [
      'Familie Hansen', 'Unge par fra Oslo', 'Investor Larsen', 
      'Pensjonist-paret', 'Førstegangskjøper', 'Oppussings-entusiast',
      'Lokal familie', 'Tilflytter-paret', 'Arvings-kjøper'
    ];
    
    const competitors: Competitor[] = [];
    for (let i = 0; i < budSimulation.antallBudgivere; i++) {
      const baseRange = budSimulation.startpris;
      competitors.push({
        id: i + 1,
        name: competitorNames[i] || `Budgiver ${i + 1}`,
        budgetRange: {
          min: baseRange * (0.9 + Math.random() * 0.1),
          max: baseRange * (1.1 + Math.random() * 0.3)
        },
        aggressiveness: Math.floor(Math.random() * 10) + 1,
        patience: Math.floor(Math.random() * 10) + 1
      });
    }
    return competitors;
  };

  const simulateCompetitorBids = (myBid: number): { highestCompetitorBid: number; activity: string } => {
    let highestBid = myBid;
    let activity = "";
    
    competitors.forEach(competitor => {
      const willBid = Math.random() > 0.3; // 70% sjanse for at konkurrent byr
      if (willBid && competitor.budgetRange.max > myBid) {
        const maxWilling = Math.min(
          competitor.budgetRange.max,
          myBid * (1 + (competitor.aggressiveness / 100))
        );
        const competitorBid = myBid + (Math.random() * (maxWilling - myBid));
        
        if (competitorBid > highestBid) {
          highestBid = competitorBid;
          activity += `${competitor.name} byr ${formatNumber(Math.round(competitorBid))} kr. `;
        }
      }
    });
    
    if (highestBid > myBid) {
      activity += "Du er utkonkurrert!";
    } else {
      activity = "Ditt bud holder som høyest for nå.";
    }
    
    return { highestCompetitorBid: Math.round(highestBid), activity };
  };

  const calculateMarketPressure = (bud: number): 'lav' | 'middels' | 'høy' | 'ekstrem' => {
    const overStartpris = (bud / budSimulation.startpris - 1) * 100;
    const markedFaktor = {
      'hot': 1.5,
      'normal': 1.0,
      'cold': 0.6
    }[budSimulation.markedssituasjon];
    
    const adjustedPress = overStartpris * markedFaktor;
    
    if (adjustedPress > 15) return 'ekstrem';
    if (adjustedPress > 10) return 'høy';
    if (adjustedPress > 5) return 'middels';
    return 'lav';
  };

  const getTimeLeft = (): number => {
    // Simuler at det er 2-48 timer igjen avhengig av tidspress
    const baseTime = 24 - (budSimulation.tidspress * 2.2);
    return Math.max(2, Math.round(baseTime + (Math.random() * 12)));
  };

  const simulerAvansertMotpartRespons = (bud: number): { 
    respons: string; 
    motpartBud?: number; 
    status: 'avslått' | 'motbud' | 'akseptert' | 'venter' | 'utkonkurrert' | 'budkrig';
    competitorActivity?: string;
    timeLeft?: number;
    marketPressure?: 'lav' | 'middels' | 'høy' | 'ekstrem';
  } => {
    const { startpris, antattPrisgrense, selgerProfil, markedssituasjon } = budSimulation;
    
    // Simuler konkurransesituasjon
    const { highestCompetitorBid, activity } = simulateCompetitorBids(bud);
    const isOutbid = highestCompetitorBid > bud;
    const timeLeft = getTimeLeft();
    const marketPressure = calculateMarketPressure(Math.max(bud, highestCompetitorBid));
    
    // Ekstrem undervurdering
    if (bud <= startpris * 0.7) {
      return { 
        respons: "Budet er så lavt at selger ikke engang svarer. Megler anbefaler betydelig høyere bud.", 
        status: 'avslått',
        competitorActivity: activity,
        timeLeft,
        marketPressure
      };
    }

    // Hvis utkonkurrert av andre
    if (isOutbid) {
      return {
        respons: `Du er utkonkurrert! ${activity} Selger vil vurdere alle bud. Du har ${timeLeft} timer på å forbedre budet.`,
        status: 'utkonkurrert',
        motpartBud: highestCompetitorBid,
        competitorActivity: activity,
        timeLeft,
        marketPressure
      };
    }

    // Super høyt bud - umiddelbar aksept
    if (bud >= antattPrisgrense * 1.2) {
      return { 
        respons: "Selger aksepterer umiddelbart! Dette budet var så godt at de avsluttet visninger. Gratulerer!", 
        status: 'akseptert',
        competitorActivity: "Alle andre budgivere trekker seg.",
        timeLeft: 0,
        marketPressure
      };
    }

    // Høyt bud med stor sannsynlighet for aksept
    if (bud >= antattPrisgrense * 1.05) {
      const acceptChance = selgerProfil === 'ivrig' ? 0.8 : selgerProfil === 'tålmodig' ? 0.4 : 0.6;
      if (Math.random() < acceptChance) {
        return { 
          respons: `Selger er meget fornøyd og aksepterer budet! ${activity}`, 
          status: 'akseptert',
          competitorActivity: activity,
          timeLeft: 0,
          marketPressure
        };
      }
    }

    // Budkrig-scenario i hot market
    if (markedssituasjon === 'hot' && marketPressure === 'høy') {
      const motbud = Math.round(bud * (1.02 + Math.random() * 0.04));
      return {
        respons: `BUDKRIG! Flere interessenter kjemper om boligen. Selger setter budfristen til ${timeLeft} timer og ber om endelige bud. Motbud: ${formatNumber(motbud)} kr.`,
        status: 'budkrig',
        motpartBud: motbud,
        competitorActivity: `${activity} Ekstrem konkurranse!`,
        timeLeft,
        marketPressure
      };
    }

    // Selger-spesifikke responser
    const budOverStartpris = (bud / startpris - 1) * 100;
    const randomFactor = Math.random();
    
    if (selgerProfil === 'ivrig') {
      if (budOverStartpris > 5) {
        if (randomFactor > 0.6) {
          return { 
            respons: `Selger er ivrig etter salg og vurderer seriøst. ${activity} Svar innen ${timeLeft} timer.`, 
            status: 'venter',
            competitorActivity: activity,
            timeLeft,
            marketPressure
          };
        } else {
          const motbud = Math.round(bud * (1.01 + randomFactor * 0.02));
          return { 
            respons: `Ivrig selger ønsker å avslutte raskt. Kommer med beskjedent motbud på ${formatNumber(motbud)} kr.`, 
            status: 'motbud',
            motpartBud: motbud,
            competitorActivity: activity,
            timeLeft,
            marketPressure
          };
        }
      } else {
        return { 
          respons: "Selv ivrig selger synes budet er for lavt. Ber om betydelig høyere bud.", 
          status: 'avslått',
          competitorActivity: activity,
          timeLeft,
          marketPressure
        };
      }
    } else if (selgerProfil === 'tålmodig') {
      if (budOverStartpris > 8) {
        const motbud = Math.round(bud * (1.02 + randomFactor * 0.03));
        return { 
          respons: `Tålmodig selger tar seg tid og kommer med gjennomtenkt motbud på ${formatNumber(motbud)} kr. ${activity}`, 
          status: 'motbud',
          motpartBud: motbud,
          competitorActivity: activity,
          timeLeft: timeLeft + 12, // Tålmodig selger gir mer tid
          marketPressure
        };
      } else {
        return { 
          respons: `Selger har god tid og ønsker å vente på bedre bud. ${activity}`, 
          status: 'avslått',
          competitorActivity: activity,
          timeLeft: timeLeft + 6,
          marketPressure
        };
      }
    } else { // profesjonell
      if (budOverStartpris > 6) {
        if (randomFactor > 0.5) {
          const motbud = Math.round(bud * (1.025 + randomFactor * 0.025));
          return { 
            respons: `Profesjonell håndtering: Megler presenterer motbud på ${formatNumber(motbud)} kr basert på markedsanalyse.`, 
            status: 'motbud',
            motpartBud: motbud,
            competitorActivity: activity,
            timeLeft,
            marketPressure
          };
        } else {
          return { 
            respons: `Megler koordinerer med selger. ${activity} Profesjonell vurdering pågår.`, 
            status: 'venter',
            competitorActivity: activity,
            timeLeft,
            marketPressure
          };
        }
      } else {
        return { 
          respons: "Megler anbefaler høyere bud basert på sammenlignbare salg i området.", 
          status: 'avslått',
          competitorActivity: activity,
          timeLeft,
          marketPressure
        };
      }
    }
  };

  // Initialize competitors when simulation starts
  React.useEffect(() => {
    if (budSimulation.startpris > 0 && competitors.length === 0) {
      setCompetitors(generateCompetitors());
    }
  }, [budSimulation.startpris, budSimulation.antallBudgivere]);

  const leggInnBud = () => {
    if (currentBud <= 0) return;
    
    const { respons, motpartBud, status, competitorActivity, timeLeft, marketPressure } = simulerAvansertMotpartRespons(currentBud);
    
    const newEntry: BudEntry = {
      id: budCounter,
      bud: currentBud,
      respons,
      motpartBud,
      timestamp: new Date(),
      status,
      competitorActivity,
      timeLeft,
      marketPressure
    };
    
    setBudLogg(prev => [newEntry, ...prev]);
    setBudCounter(prev => prev + 1);
    
    // Update highest bid
    if (motpartBud && motpartBud > currentHighestBid) {
      setCurrentHighestBid(motpartBud);
    }
    
    // Smart auto-forslag basert på situasjon
    if (status === 'utkonkurrert' && motpartBud) {
      setCurrentBud(motpartBud + 25000);
    } else if (motpartBud) {
      const diff = motpartBud - currentBud;
      const marketMultiplier = marketPressure === 'ekstrem' ? 1.5 : marketPressure === 'høy' ? 1.2 : 1.0;
      const smartIncrement = Math.round((diff < 100000 ? 25000 : diff < 200000 ? 50000 : 75000) * marketMultiplier);
      setCurrentBud(motpartBud + smartIncrement);
    } else if (status === 'avslått' && currentBud < budSimulation.startpris * 1.1) {
      setCurrentBud(Math.round(currentBud * 1.08));
    }

    if (status === 'budkrig') {
      setAuctionActive(true);
    }
  };

  const resetSimulator = () => {
    setBudLogg([]);
    setBudCounter(1);
    setCurrentBud(0);
    setCurrentHighestBid(0);
    setCompetitors([]);
    setAuctionActive(false);
  };

  const getCategoryProgress = (category: string) => {
    const steps = checklist[category];
    const completed = steps.filter(step => step.completed).length;
    return Math.round((completed / steps.length) * 100);
  };

  const getTotalProgress = () => {
    const allSteps = Object.values(checklist).flat();
    const completed = allSteps.filter(step => step.completed).length;
    return Math.round((completed / allSteps.length) * 100);
  };

  const isReadyToBid = () => {
    return getTotalProgress() === 100;
  };

  const getBudAnalyse = () => {
    if (currentBud <= 0 || budSimulation.startpris <= 0) return null;
    
    const overStartpris = ((currentBud / budSimulation.startpris - 1) * 100);
    const underFinansiering = budSimulation.finansieringsbevis > 0 && currentBud > budSimulation.finansieringsbevis;
    const overPrisgrense = budSimulation.antattPrisgrense > 0 && currentBud > budSimulation.antattPrisgrense;
    
    return {
      overStartpris,
      underFinansiering,
      overPrisgrense,
      riskLevel: overPrisgrense ? 'høy' : overStartpris > 10 ? 'middels' : 'lav'
    };
  };

  const categoryConfig = {
    economic: { title: '💰 Økonomisk trygghet', icon: DollarSign, color: 'green' },
    legal: { title: '📝 Juridisk og dokumentasjon', icon: FileText, color: 'blue' },
    technical: { title: '🔧 Teknisk og vedlikehold', icon: Wrench, color: 'orange' },
    coop: { title: '🏠 Sameie og fellesutgifter', icon: Building, color: 'purple' },
    evaluation: { title: '🤔 Kjøpsvurdering og magefølelse', icon: Users, color: 'red' }
  };

  const budAnalyse = getBudAnalyse();

  return (
    <div className="min-h-screen w-full bg-[url('/bg-livingroom.png')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col">
      <main className="flex-1 w-full p-3 sm:p-4 lg:p-6">
        
        {/* Header */}
        <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-5xl mx-auto mb-6">
          <h1 className="text-2xl sm:text-3xl font-seriflogo font-bold text-brown-900 text-center mb-4 leading-tight">
            Sjekkliste for boligkjøp
          </h1>
          <p className="text-center text-brown-700 mb-6 text-lg font-medium">
            Gjør deg klar til å by på drømmeboligen – her er alt du må tenke på før du legger inn bud.
          </p>

          {/* Overall Progress */}
          <div className="bg-brown-100 p-4 rounded-2xl shadow-inner mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-brown-800 font-semibold">Total fremgang:</span>
              <span className="text-brown-900 font-bold text-xl">{getTotalProgress()}%</span>
            </div>
            <div className="w-full bg-brown-200 rounded-full h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-brown-500 to-brown-600 h-3 rounded-full transition-all duration-500 shadow-md"
                style={{ width: `${getTotalProgress()}%` }}
              ></div>
            </div>
          </div>

          {/* Ready to bid status */}
          <div className={`p-4 rounded-xl text-center ${
            isReadyToBid() 
              ? 'bg-green-100 border-2 border-green-300' 
              : 'bg-yellow-100 border-2 border-yellow-300'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {isReadyToBid() ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              )}
              <span className={`font-bold text-lg ${
                isReadyToBid() ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {isReadyToBid() ? 'Klar for budgiving!' : 'Gå gjennom alle punktene før du byr'}
              </span>
            </div>
            {!isReadyToBid() && (
              <p className="text-yellow-700 text-sm">
                Fullført: {Object.values(checklist).flat().filter(step => step.completed).length} av {Object.values(checklist).flat().length} punkter
              </p>
            )}
          </div>
        </div>

        {/* Avansert Budsimulator */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-seriflogo font-bold text-brown-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Avansert Budstrategi-simulator
              </h2>
              <button
                onClick={resetSimulator}
                className="flex items-center gap-2 px-3 py-2 bg-brown-200 hover:bg-brown-300 rounded-lg transition-colors text-brown-800 font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Forklaring på hvordan simulatoren fungerer */}
            <div className="mb-6">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="w-full flex items-center justify-between p-3 bg-brown-100 hover:bg-brown-200 rounded-lg transition-colors border border-brown-300"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <span className="font-semibold text-brown-900">Hvordan bruke den avanserte budsimulatoren</span>
                </div>
                {showExplanation ? (
                  <ChevronUp className="w-5 h-5 text-brown-700" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-brown-700" />
                )}
              </button>
              
              {showExplanation && (
                <div className="mt-3 bg-brown-50 border border-brown-300 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-brown-800">
                    <div>
                      <h4 className="font-semibold mb-2 text-brown-900">📊 Steg 1: Sett opp scenario</h4>
                      <ul className="space-y-1 text-xs text-brown-700">
                        <li>• <strong>Startpris:</strong> Prisantydning fra megler/annonse</li>
                        <li>• <strong>Din prisgrense:</strong> Maks du ønsker å betale</li>
                        <li>• <strong>Finansiering:</strong> Bankens låneramme</li>
                        <li>• <strong>Antall budgivere:</strong> Hvor mange konkurrenter</li>
                        <li>• <strong>Markedssituasjon:</strong> Hot/normal/cold marked</li>
                        <li>• <strong>Selger-profil:</strong> Ivrig/tålmodig/profesjonell</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-brown-900">🎯 Steg 2: Øv på budkrig</h4>
                      <ul className="space-y-1 text-xs text-brown-700">
                        <li>• Simulatoren skaper realistiske konkurrenter</li>
                        <li>• Andre budgivere responderer på dine bud</li>
                        <li>• Få tidspress og markedspress-indikatorer</li>
                        <li>• Opplev budkrig, utkonkurrering og strategier</li>
                        <li>• Lær når du skal gi opp eller eskalere</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-brown-200 rounded-lg">
                    <p className="text-xs text-brown-800">
                      <strong>🚀 Verdens mest realistiske budsimulator:</strong> Inkluderer konkurrenter med egne budsjetter, 
                      markedspsykologi, selger-personligheter, tidsfrister og realistiske scenarioer som budkrig!
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Innstillinger */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="space-y-6">
                <h3 className="font-semibold text-brown-800 text-lg">📊 Grunndata</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Startpris/prisantydning: {formatNumber(budSimulation.startpris)} kr
                  </label>
                  <input
                    type="range"
                    min="1000000"
                    max="15000000"
                    step="50000"
                    value={budSimulation.startpris}
                    onChange={(e) => updateBudSimulation('startpris', Number(e.target.value))}
                    className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #8B4513 0%, #D2B48C 50%, #F5DEB3 100%)' }}
                  />
                  <div className="flex justify-between text-xs text-brown-600 mt-1">
                    <span>1M</span>
                    <span>15M</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Din prisgrense: {formatNumber(budSimulation.antattPrisgrense)} kr
                  </label>
                  <input
                    type="range"
                    min="1000000"
                    max="20000000"
                    step="50000"
                    value={budSimulation.antattPrisgrense}
                    onChange={(e) => updateBudSimulation('antattPrisgrense', Number(e.target.value))}
                    className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #8B4513 0%, #D2B48C 50%, #F5DEB3 100%)' }}
                  />
                  <div className="flex justify-between text-xs text-brown-600 mt-1">
                    <span>1M</span>
                    <span>20M</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Finansieringsbevis: {formatNumber(budSimulation.finansieringsbevis)} kr
                  </label>
                  <input
                    type="range"
                    min="1000000"
                    max="25000000"
                    step="50000"
                    value={budSimulation.finansieringsbevis}
                    onChange={(e) => updateBudSimulation('finansieringsbevis', Number(e.target.value))}
                    className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #8B4513 0%, #D2B48C 50%, #F5DEB3 100%)' }}
                  />
                  <div className="flex justify-between text-xs text-brown-600 mt-1">
                    <span>1M</span>
                    <span>25M</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-brown-800 text-lg">🎭 Scenario-innstillinger</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Antall andre budgivere: {budSimulation.antallBudgivere}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={budSimulation.antallBudgivere}
                    onChange={(e) => updateBudSimulation('antallBudgivere', Number(e.target.value))}
                    className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #8B4513 0%, #D2B48C 50%, #F5DEB3 100%)' }}
                  />
                  <div className="flex justify-between text-xs text-brown-600 mt-1">
                    <span>1</span>
                    <span>8</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Markedssituasjon:
                  </label>
                  <select
                    value={budSimulation.markedssituasjon}
                    onChange={(e) => updateBudSimulation('markedssituasjon', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-brown-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  >
                    <option value="cold">🥶 Cold - Kjøpers marked</option>
                    <option value="normal">😐 Normal - Balansert marked</option>
                    <option value="hot">🔥 Hot - Selgers marked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Selger-profil:
                  </label>
                  <select
                    value={budSimulation.selgerProfil}
                    onChange={(e) => updateBudSimulation('selgerProfil', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-brown-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  >
                    <option value="ivrig">⚡ Ivrig - Vil selge raskt</option>
                    <option value="profesjonell">👔 Profesjonell - Erfaren selger</option>
                    <option value="tålmodig">🕒 Tålmodig - Kan vente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Tidspress-nivå: {budSimulation.tidspress}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={budSimulation.tidspress}
                    onChange={(e) => updateBudSimulation('tidspress', Number(e.target.value))}
                    className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #8B4513 0%, #D2B48C 50%, #F5DEB3 100%)' }}
                  />
                  <div className="flex justify-between text-xs text-brown-600 mt-1">
                    <span>Rolig</span>
                    <span>Hektisk</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-brown-800 text-lg">💡 Budtrening</h3>
                
                {auctionActive && (
                  <div className="bg-red-100 border-2 border-red-400 p-3 rounded-lg">
                    <div className="text-red-800 font-bold text-center">🔥 BUDKRIG AKTIV! 🔥</div>
                    <div className="text-red-600 text-sm text-center">Høyeste bud: {formatNumber(currentHighestBid)} kr</div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Ditt bud: {formatNumber(currentBud)} kr
                  </label>
                  <input
                    type="range"
                    min="1000000"
                    max="25000000"
                    step="25000"
                    value={currentBud}
                    onChange={(e) => setCurrentBud(Number(e.target.value))}
                    className="w-full h-2 bg-brown-200 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #8B4513 0%, #D2B48C 50%, #F5DEB3 100%)' }}
                  />
                  <div className="flex justify-between text-xs text-brown-600 mt-1">
                    <span>1M</span>
                    <span>25M</span>
                  </div>
                </div>

                <button
                  onClick={leggInnBud}
                  disabled={currentBud <= 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brown-600 hover:bg-brown-700 disabled:bg-brown-300 text-white rounded-lg transition-colors font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Simuler bud
                </button>

                {budAnalyse && (
                  <div className="bg-brown-50 p-4 rounded-xl">
                    <h4 className="font-semibold text-brown-800 mb-2">Budanalyse:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Over startpris:</span>
                        <span className="font-bold">{budAnalyse.overStartpris.toFixed(1)}%</span>
                      </div>
                      {budAnalyse.underFinansiering && (
                        <div className="text-red-600 font-medium">⚠️ Over finansieringsbevis!</div>
                      )}
                      {budAnalyse.overPrisgrense && (
                        <div className="text-red-600 font-medium">⚠️ Over din prisgrense!</div>
                      )}
                      <div className="flex justify-between">
                        <span>Risikonivå:</span>
                        <span className={`font-bold ${
                          budAnalyse.riskLevel === 'høy' ? 'text-red-600' :
                          budAnalyse.riskLevel === 'middels' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {budAnalyse.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Competitor status */}
                {competitors.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-gray-800 text-sm mb-2">👥 Konkurrenter aktive:</h5>
                    <div className="space-y-1 text-xs">
                      {competitors.slice(0, 3).map(comp => (
                        <div key={comp.id} className="flex justify-between">
                          <span>{comp.name}</span>
                          <span className="text-gray-600">Maks: {formatNumber(comp.budgetRange.max)} kr</span>
                        </div>
                      ))}
                      {competitors.length > 3 && (
                        <div className="text-gray-500">...og {competitors.length - 3} andre</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budlogg */}
            {budLogg.length > 0 && (
              <div className="border-t-2 border-brown-200 pt-6">
                <h3 className="font-semibold text-brown-800 text-lg mb-4">📝 Avansert Budlogg</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {budLogg.map((entry) => (
                    <div key={entry.id} className={`p-4 rounded-lg border-l-4 ${
                      entry.status === 'akseptert' ? 'bg-green-50 border-green-400' :
                      entry.status === 'budkrig' ? 'bg-red-50 border-red-400' :
                      entry.status === 'utkonkurrert' ? 'bg-orange-50 border-orange-400' :
                      'bg-brown-50 border-brown-400'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brown-900">
                            Bud #{entry.id}: {formatNumber(entry.bud)} kr
                          </span>
                          {entry.marketPressure && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              entry.marketPressure === 'ekstrem' ? 'bg-red-200 text-red-800' :
                              entry.marketPressure === 'høy' ? 'bg-orange-200 text-orange-800' :
                              entry.marketPressure === 'middels' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-green-200 text-green-800'
                            }`}>
                              {entry.marketPressure.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          entry.status === 'akseptert' ? 'bg-green-200 text-green-800' :
                          entry.status === 'motbud' ? 'bg-blue-200 text-blue-800' :
                          entry.status === 'budkrig' ? 'bg-red-200 text-red-800' :
                          entry.status === 'utkonkurrert' ? 'bg-orange-200 text-orange-800' :
                          entry.status === 'avslått' ? 'bg-gray-200 text-gray-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {entry.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-brown-700 text-sm mb-2 font-medium">{entry.respons}</p>
                      
                      {entry.competitorActivity && (
                        <p className="text-orange-700 text-xs mb-2 italic">
                          🏃‍♂️ {entry.competitorActivity}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-brown-500">
                        <span>{entry.timestamp.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-3">
                          {entry.timeLeft && (
                            <span className="flex items-center gap-1">
                              ⏰ {entry.timeLeft}t igjen
                            </span>
                          )}
                          {entry.motpartBud && (
                            <span className="font-medium">
                              Motbud: {formatNumber(entry.motpartBud)} kr
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Checklist Categories */}
        <div className="max-w-5xl mx-auto space-y-6">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            const progress = getCategoryProgress(key);
            const steps = checklist[key];
            
            return (
              <div key={key} className="bg-white/80 rounded-2xl shadow-xl overflow-hidden">
                
                {/* Category Header */}
                <div 
                  className="bg-brown-200/70 px-4 sm:px-6 py-4 border-b-2 border-brown-300 cursor-pointer hover:bg-brown-200 transition-colors"
                  onClick={() => toggleSection(key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-brown-700" />
                      <h3 className="text-lg font-seriflogo font-bold text-brown-900">
                        {config.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-brown-700 font-semibold text-sm">
                        {steps.filter(step => step.completed).length} av {steps.length}
                      </span>
                      <div className="w-16 bg-brown-300 rounded-full h-2 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-brown-500 to-brown-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-brown-800 font-bold text-sm min-w-[3rem]">
                        {progress}%
                      </span>
                      {expandedSections[key] ? (
                        <ChevronUp className="w-5 h-5 text-brown-700" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-brown-700" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Steps */}
                {expandedSections[key] && (
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3">
                      {steps.map((step) => (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-4 rounded-xl transition-colors border-2 ${
                            step.completed 
                              ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                              : 'bg-brown-50 border-brown-200 hover:bg-brown-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`${key}-${step.id}`}
                            checked={step.completed}
                            onChange={() => toggleStep(key, step.id)}
                            className="w-5 h-5 text-brown-600 bg-brown-50 border-2 border-brown-300 rounded focus:ring-brown-500 focus:ring-2 flex-shrink-0"
                          />
                          <label
                            htmlFor={`${key}-${step.id}`}
                            className={`text-base font-medium cursor-pointer flex-1 ${
                              step.completed ? 'text-green-800 line-through' : 'text-brown-900'
                            }`}
                          >
                            {step.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 max-w-5xl mx-auto">
          <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6">
            <h3 className="text-xl font-seriflogo font-bold text-brown-900 mb-4 text-center">
              🔗 Relaterte verktøy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="/sjekkliste-visning"
                className="flex items-center gap-3 p-4 bg-brown-50 rounded-xl hover:bg-brown-100 transition-colors border border-brown-200"
              >
                <FileText className="w-6 h-6 text-brown-700" />
                <div>
                  <div className="font-semibold text-brown-900">Sjekkliste for visning</div>
                  <div className="text-sm text-brown-600">Detaljert befaring</div>
                </div>
                <ChevronRight className="w-5 h-5 text-brown-600 ml-auto" />
              </a>
              
              <a
                href="/kjopskalkulator"
                className="flex items-center gap-3 p-4 bg-brown-50 rounded-xl hover:bg-brown-100 transition-colors border border-brown-200"
              >
                <Calculator className="w-6 h-6 text-brown-700" />
                <div>
                  <div className="font-semibold text-brown-900">Kjøpskalkulator</div>
                  <div className="text-sm text-brown-600">Beregn totalkostnader</div>
                </div>
                <ChevronRight className="w-5 h-5 text-brown-600 ml-auto" />
              </a>
              
              <a
                href="/verdivurdering"
                className="flex items-center gap-3 p-4 bg-brown-50 rounded-xl hover:bg-brown-100 transition-colors border border-brown-200"
              >
                <TrendingUp className="w-6 h-6 text-brown-700" />
                <div>
                  <div className="font-semibold text-brown-900">Verdivurdering</div>
                  <div className="text-sm text-brown-600">Analyser markedsverdi</div>
                </div>
                <ChevronRight className="w-5 h-5 text-brown-600 ml-auto" />
              </a>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default SjekklisteForBoligkjop; 