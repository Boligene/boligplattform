import { ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  relevantFor?: ('leilighet' | 'rekkehus' | 'enebolig')[];
}

interface ChecklistCategory {
  id: string;
  title: string;
  items: ChecklistItem[];
}

type BoligType = 'alle' | 'leilighet' | 'rekkehus' | 'enebolig';

const SjekklisteVisning: React.FC = () => {
  const [boligType, setBoligType] = useState<BoligType>('alle');
  const [categoryNotes, setCategoryNotes] = useState<{[categoryId: string]: string}>({});
  const [egneNotater, setEgneNotater] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<{[categoryId: string]: boolean}>({
    'beliggenhet': true,
    'bygg': true,
    'bad-kjokken': true,
    'elektro': true,
    'oppvarming': true,
    'ventilasjon': true,
    'sikkerhet': true,
    'okonomi-juridisk': true,
  });

  const [categories, setCategories] = useState<ChecklistCategory[]>([
    {
      id: 'beliggenhet',
      title: 'Beliggenhet og område',
      items: [
        { id: 'transportmuligheter', text: 'Gode transportmuligheter (kollektivtransport, veier)', checked: false },
        { id: 'nabolag', text: 'Trygt og attraktivt nabolag', checked: false },
        { id: 'skoler', text: 'Gode skoler i nærheten', checked: false },
        { id: 'butikker', text: 'Butikker og tjenester tilgjengelig', checked: false },
        { id: 'support', text: 'Støynivå akseptabelt', checked: false },
        { id: 'parkering', text: 'Parkeringsmuligheter vurdert', checked: false },
        { id: 'gronnomrader', text: 'Tilgang til grøntområder og parker', checked: false },
        { id: 'solforhold', text: 'Solforhold sjekket for uteområde', checked: false },
      ]
    },
    {
      id: 'bygg',
      title: 'Bygg og konstruksjon',
      items: [
        { id: 'konstruksjon', text: 'Solid konstruksjon og fundament', checked: false },
        { id: 'tak', text: 'Tak i god stand', checked: false, relevantFor: ['rekkehus', 'enebolig'] },
        { id: 'fasade', text: 'Fasade uten skader', checked: false },
        { id: 'vinduer', text: 'Vinduer og dører fungerer godt', checked: false },
        { id: 'isolasjon', text: 'God isolasjon og energieffektivitet', checked: false },
        { id: 'hage', text: 'Hage og utendørsområder i god stand', checked: false, relevantFor: ['rekkehus', 'enebolig'] },
        { id: 'kjellerrrom', text: 'Kjeller/bod tilstand vurdert', checked: false, relevantFor: ['rekkehus', 'enebolig'] },
        { id: 'balkong', text: 'Balkong/terrasse i god stand', checked: false },
      ]
    },
    {
      id: 'bad-kjokken',
      title: 'Bad og kjøkken',
      items: [
        { id: 'vanntrykk', text: 'Godt vanntrykk og temperatur', checked: false },
        { id: 'ror', text: 'Rør og avløp fungerer', checked: false },
        { id: 'fliser', text: 'Fliser og fuger i god stand', checked: false },
        { id: 'kjokken-utstyr', text: 'Kjøkkenutstyr og benkeplate OK', checked: false },
        { id: 'ventilasjon-bad', text: 'God ventilasjon i bad', checked: false },
        { id: 'oppvaskmaskin', text: 'Oppvaskmaskin tilkoblet og fungerer', checked: false },
        { id: 'vaskemaskin', text: 'Vaskemaskin-tilkobling sjekket', checked: false },
        { id: 'membran-bad', text: 'Membran på bad sjekket og i god stand', checked: false },
        { id: 'fall-bad', text: 'Riktig fall på bad til sluk', checked: false },
        { id: 'sluk-problematikk', text: 'Gammelt støpejernssluk og nytt bad = dårlig løsning som vil gi skade før eller senere', checked: false },
      ]
    },
    {
      id: 'elektro',
      title: 'Elektriske installasjoner',
      items: [
        { id: 'sikring', text: 'Sikringsskap og sikringer i orden', checked: false },
        { id: 'stikkontakter', text: 'Tilstrekkelig med stikkontakter', checked: false },
        { id: 'belysning', text: 'God belysning i alle rom', checked: false },
        { id: 'jordning', text: 'Elektrisk anlegg er jordet', checked: false },
        { id: 'elektro-installasjon', text: 'Installasjon ser trygg ut', checked: false },
        { id: 'fiber', text: 'Internett/fiber-tilkobling sjekket', checked: false },
        { id: 'ladepunkt', text: 'Mulighet for elbil-lading', checked: false, relevantFor: ['rekkehus', 'enebolig'] },
        { id: 'samsvarserklaering', text: 'Eksisterer oppdatert samsvarsærklering for elektrisk anlegg', checked: false },
      ]
    },
    {
      id: 'oppvarming',
      title: 'Oppvarming og energi',
      items: [
        { id: 'varmesystem', text: 'Varmesystem fungerer effektivt', checked: false },
        { id: 'radiatorer', text: 'Radiatorer/gulvvarme virker', checked: false },
        { id: 'temperatur', text: 'Jevn temperatur i alle rom', checked: false },
        { id: 'varmekost', text: 'Rimelige varmekostnader', checked: false },
        { id: 'styring', text: 'God styring av temperatur', checked: false },
        { id: 'vedovn', text: 'Vedovn/peis i god stand', checked: false, relevantFor: ['rekkehus', 'enebolig'] },
        { id: 'energimerking', text: 'Energimerking sjekket', checked: false },
      ]
    },
    {
      id: 'ventilasjon',
      title: 'Ventilasjon og luftkvalitet',
      items: [
        { id: 'luftkvalitet', text: 'God luftkvalitet i alle rom', checked: false },
        { id: 'ventilasjon-system', text: 'Ventilasjonsanlegg fungerer', checked: false },
        { id: 'fukt', text: 'Ingen fuktproblemer', checked: false },
        { id: 'luft-sirkulasjon', text: 'God luftsirkulasjon', checked: false },
        { id: 'filter', text: 'Filtre i ventilasjonsanlegg rene', checked: false },
        { id: 'mugg', text: 'Ingen tegn til mugg eller kondens', checked: false },
      ]
    },
    {
      id: 'sikkerhet',
      title: 'Sikkerhet og trygghet',
      items: [
        { id: 'roykvarslere', text: 'Røykvarslere installert og fungerer', checked: false },
        { id: 'brannslokker', text: 'Brannslokkeutstyr tilgjengelig', checked: false },
        { id: 'laasglass', text: 'Gode låser på dører og vinduer', checked: false },
        { id: 'belysning-ute', text: 'God belysning utendørs', checked: false },
        { id: 'alarm', text: 'Alarmsystem hvis nødvendig', checked: false },
        { id: 'innbruddssikring', text: 'Innbruddssikring av inngang', checked: false, relevantFor: ['leilighet'] },
        { id: 'ringeklokke', text: 'Ringeklokke og porttelefon fungerer', checked: false, relevantFor: ['leilighet'] },
      ]
    },
    {
      id: 'okonomi-juridisk',
      title: 'Økonomi og juridiske forhold',
      items: [
        { id: 'eierforhold', text: 'Eierforhold og rettigheter klargjort', checked: false },
        { id: 'heftelser', text: 'Ingen uventede heftelser', checked: false },
        { id: 'omkostninger', text: 'Fellesutgifter og avgifter akseptable', checked: false },
        { id: 'forsikring', text: 'Forsikringsforhold avklart', checked: false },
        { id: 'vedlikehold', text: 'Vedlikeholdsplan for felles arealer', checked: false },
        { id: 'husleie', text: 'Felleskostnader vs husleie sammenligning', checked: false, relevantFor: ['leilighet'] },
        { id: 'eiendomsskatt', text: 'Eiendomsskatt og kommunale avgifter', checked: false },
        { id: 'garantier', text: 'Eventuelle garantier på arbeid/utstyr', checked: false },
        { id: 'arbeid-dokumentert', text: 'Er arbeid/endringer utført dokumentert', checked: false },
      ]
    }
  ]);

  const toggleItem = (categoryId: string, itemId: string) => {
    setCategories(prevCategories =>
      prevCategories.map(category =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              )
            }
          : category
      )
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleCategoryNoteChange = (categoryId: string, note: string) => {
    setCategoryNotes(prev => ({
      ...prev,
      [categoryId]: note
    }));
  };

  const getFilteredCategories = () => {
    if (boligType === 'alle') {
      return categories;
    }
    
    return categories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        !item.relevantFor || item.relevantFor.includes(boligType as 'leilighet' | 'rekkehus' | 'enebolig')
      )
    }));
  };

  const getCompletionPercentage = (category: ChecklistCategory) => {
    const checkedItems = category.items.filter(item => item.checked).length;
    return category.items.length > 0 ? Math.round((checkedItems / category.items.length) * 100) : 0;
  };

  const getTotalCompletionPercentage = () => {
    const filteredCategories = getFilteredCategories();
    const totalItems = filteredCategories.reduce((acc, category) => acc + category.items.length, 0);
    const checkedItems = filteredCategories.reduce(
      (acc, category) => acc + category.items.filter(item => item.checked).length,
      0
    );
    return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  };

  const filteredCategories = getFilteredCategories();

  return (
    <div className="min-h-screen w-full bg-[url('/bg-livingroom-compressed.webp')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col">
      <main className="flex-1 w-full p-3 sm:p-4 lg:p-6">
        
        {/* Header - Mer kompakt */}
        <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-4xl mx-auto mb-6">
          <h1 className="text-2xl sm:text-3xl font-seriflogo font-bold text-brown-900 text-center mb-4 leading-tight">
            Sjekkliste for visning
          </h1>

          {/* Dropdown for boligtype - Mer kompakt */}
          <div className="mb-6 text-center">
            <label htmlFor="boligtype" className="block text-base font-semibold text-brown-800 mb-2">
              Velg boligtype:
            </label>
            <select
              id="boligtype"
              value={boligType}
              onChange={(e) => setBoligType(e.target.value as BoligType)}
              className="px-4 py-2 border-2 border-brown-300 rounded-full bg-brown-50 text-brown-900 font-semibold focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-brown-500 shadow-md hover:bg-brown-100 transition"
            >
              <option value="alle">🏠 Alle boligtyper</option>
              <option value="leilighet">🏢 Leilighet</option>
              <option value="rekkehus">🏘️ Rekkehus</option>
              <option value="enebolig">🏡 Enebolig</option>
            </select>
          </div>

          {/* Progress bar - Mer kompakt */}
          <div className="bg-brown-100 p-4 rounded-2xl shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-brown-800 font-semibold">Total fremgang:</span>
              <span className="text-brown-900 font-bold text-xl">{getTotalCompletionPercentage()}%</span>
            </div>
            <div className="w-full bg-brown-200 rounded-full h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-brown-500 to-brown-600 h-3 rounded-full transition-all duration-500 shadow-md"
                style={{ width: `${getTotalCompletionPercentage()}%` }}
              ></div>
            </div>
          </div>
          
          {boligType !== 'alle' && (
            <div className="mt-3 text-center">
              <span className="inline-block bg-brown-200 text-brown-800 px-3 py-1 rounded-full font-medium">
                📋 Filtrert for: {boligType}
              </span>
            </div>
          )}
        </div>

        {/* Categories - Mer kompakt med kollapse funksjonalitet */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white/80 rounded-2xl shadow-xl overflow-hidden">
              
              {/* Category header - Klikkbar for kollapse */}
              <div 
                className="bg-brown-200/70 px-4 sm:px-6 py-4 border-b-2 border-brown-300 cursor-pointer hover:bg-brown-200 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-seriflogo font-bold text-brown-900">
                      {category.title}
                    </h2>
                    {expandedCategories[category.id] ? (
                      <ChevronUp className="w-5 h-5 text-brown-700" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-brown-700" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-brown-700 font-semibold text-sm">
                      {category.items.filter(item => item.checked).length} av {category.items.length}
                    </span>
                    <div className="w-16 bg-brown-300 rounded-full h-2 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-brown-500 to-brown-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getCompletionPercentage(category)}%` }}
                      ></div>
                    </div>
                    <span className="text-brown-800 font-bold text-sm min-w-[3rem]">
                      {getCompletionPercentage(category)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Category items - Vises bare hvis expanded */}
              {expandedCategories[category.id] && (
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 mb-4">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-brown-50 transition-colors border border-transparent hover:border-brown-200"
                      >
                        <input
                          type="checkbox"
                          id={`${category.id}-${item.id}`}
                          checked={item.checked}
                          onChange={() => toggleItem(category.id, item.id)}
                          className="w-5 h-5 text-brown-600 bg-brown-50 border-2 border-brown-300 rounded focus:ring-brown-500 focus:ring-2 mt-0.5 flex-shrink-0"
                        />
                        <label
                          htmlFor={`${category.id}-${item.id}`}
                          className={`text-sm sm:text-base cursor-pointer select-none font-medium ${
                            item.checked
                              ? 'text-brown-500 line-through'
                              : 'text-brown-900'
                          }`}
                        >
                          {item.text}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Category notes - Mer kompakt */}
                  <div className="border-t-2 border-brown-200 pt-4">
                    <label 
                      htmlFor={`notes-${category.id}`}
                      className="block text-sm font-semibold text-brown-800 mb-2"
                    >
                      📝 Notater for {category.title}:
                    </label>
                    <textarea
                      id={`notes-${category.id}`}
                      value={categoryNotes[category.id] || ''}
                      onChange={(e) => handleCategoryNoteChange(category.id, e.target.value)}
                      placeholder="Skriv dine observasjoner og notater her..."
                      className="w-full px-3 py-2 border-2 border-brown-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-brown-500 bg-brown-50/50 text-brown-900 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Egne notater - Mer kompakt */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-seriflogo font-bold text-brown-900 mb-4 text-center">
              📖 Egne notater
            </h3>
            <textarea
              value={egneNotater}
              onChange={(e) => setEgneNotater(e.target.value)}
              placeholder="Skriv alle andre notater, observasjoner, spørsmål eller tanker her..."
              className="w-full px-4 py-3 border-2 border-brown-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-brown-500 bg-brown-50/50 text-brown-900 text-sm"
              rows={4}
            />
          </div>
        </div>

        {/* Tips section - Mer kompakt */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white/80 rounded-2xl shadow-xl p-4 sm:p-6">
            <h3 className="text-xl font-seriflogo font-bold text-brown-900 mb-4 text-center">
              💡 Tips for bruk av sjekklisten
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-brown-50 rounded-xl p-4">
                <h4 className="text-base font-semibold text-brown-800 mb-3 flex items-center gap-2">
                  ✅ Under visning
                </h4>
                <ul className="text-brown-700 space-y-1 text-sm font-medium">
                  <li>• Gå systematisk gjennom alle punkter</li>
                  <li>• Ta bilder av potensielle problemer</li>
                  <li>• Still oppfølgingsspørsmål til megler</li>
                  <li>• Bruk notatfeltene aktivt</li>
                </ul>
              </div>
              <div className="bg-brown-50 rounded-xl p-4">
                <h4 className="text-base font-semibold text-brown-800 mb-3 flex items-center gap-2">
                  🔍 Etter visning
                </h4>
                <ul className="text-brown-700 space-y-1 text-sm font-medium">
                  <li>• Gå gjennom notatene dine</li>
                  <li>• Beregn totale kjøpskostnader</li>
                  <li>• Sammenlign med andre boliger</li>
                  <li>• Vurder profesjonell takst ved behov</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default SjekklisteVisning; 