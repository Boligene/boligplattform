/**
 * OMFATTENDE TEST-SUITE FOR FORBEDRET BRA-EKSTRAKSJON
 * 
 * Tester den nye intelligente 4-fase prioriteringen som erstatter
 * de gamle arealmønstrene for mer nøyaktig BRA-deteksjon.
 */

const { extractBRAWithPriority } = require('../server');

describe('BRA Extraction - Forbedret 4-fase prioritering', () => {
  
  describe('Prioriterer riktig BRA over interne/eksterne arealer', () => {
    test('velger hovedbruksareal over interne/eksterne varianter', () => {
      const tekst = `
      Internt bruksareal: 82 m²
      Eksternt bruksareal: 15 m²  
      Bruksareal: 105 m²
      Totalareal: 120 m²
      Garasje: 25 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('105 m²');
      expect(result._metadata.confidence).toBeGreaterThan(80);
      expect(result._metadata.source).toBe('bruksareal');
    });

    test('forkaster kun interne/eksterne arealer', () => {
      const tekst = `
      BRA-I: 93 m²
      BRA-E: 12 m²
      Garasje: 25 m²
      Takterrasse: 15 m²
      Kjeller: 30 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).toBeNull(); // Skal ikke returnere delarealer
    });

    test('velger primærareal som nest-beste alternativ', () => {
      const tekst = `
      Internt bruksareal: 82 m²
      Primærareal: 95 m²
      Totalareal: 120 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
      expect(result._metadata.source).toBe('primærareal');
    });
  });

  describe('Håndterer realistiske størrelser', () => {
    test('velger mest realistisk størrelse', () => {
      const tekst = `
      Takterrasse: 450 m²
      Bruksareal: 95 m²
      Tomt: 1200 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
    });

    test('forkaster urealistiske størrelser', () => {
      const testCases = [
        'Bruksareal: 5 m²',      // For liten
        'Bruksareal: 2500 m²',   // For stor
        'Bruksareal: 0 m²',      // Null
        'Bruksareal: 9999 m²'    // Ekstrem
      ];
      
      testCases.forEach(tekst => {
        const result = extractBRAWithPriority(tekst);
        expect(result).toBeNull();
      });
    });

    test('godtar normale størrelser', () => {
      const testCases = [
        { tekst: 'Bruksareal: 15 m²', forventet: '15 m²' },
        { tekst: 'Bruksareal: 45 m²', forventet: '45 m²' },
        { tekst: 'Bruksareal: 125 m²', forventet: '125 m²' },
        { tekst: 'Bruksareal: 350 m²', forventet: '350 m²' },
        { tekst: 'Bruksareal: 1500 m²', forventet: '1500 m²' }
      ];
      
      testCases.forEach(({ tekst, forventet }) => {
        const result = extractBRAWithPriority(tekst);
        expect(result).not.toBeNull();
        expect(result.bruksareal).toBe(forventet);
      });
    });
  });

  describe('Robust mot formatvarianter', () => {
    test('håndterer ulike enheter korrekt', () => {
      const varianter = [
        'BRA 95m2',
        'Bruksareal: 95 kvm',
        'P-rom: 95 m²',
        'Primærareal 95m²',
        'Boligen er 95 kvadratmeter'
      ];
      
      varianter.forEach(tekst => {
        const result = extractBRAWithPriority(tekst);
        expect(result).not.toBeNull();
        expect(result.bruksareal).toBe('95 m²');
      });
    });

    test('håndterer whitespace og formatering', () => {
      const varianter = [
        'Bruksareal:95m²',           // Ingen mellomrom
        'Bruksareal: 95 m²',         // Normal formatering
        'Bruksareal:\n95 m²',        // Linjeskift
        'Bruksareal    :    95   m²', // Ekstra mellomrom
        '   Bruksareal: 95 m²   '    // Surrounding whitespace
      ];
      
      varianter.forEach(tekst => {
        const result = extractBRAWithPriority(tekst);
        expect(result).not.toBeNull();
        expect(result.bruksareal).toBe('95 m²');
      });
    });

    test('håndterer norske tegn korrekt', () => {
      const varianter = [
        'Primærareal: 95 m²',
        'Bruksareal bygning: 95 m²',
        'Areal boligen: 95 m²',
        'Størrelse på bolig: 95 m²'
      ];
      
      varianter.forEach(tekst => {
        const result = extractBRAWithPriority(tekst);
        expect(result).not.toBeNull();
        expect(result.bruksareal).toBe('95 m²');
      });
    });
  });

  describe('Prioriteringssystem', () => {
    test('prioriterer eksakt BRA over generelle areal-betegnelser', () => {
      const tekst = `
      Areal: 85 m²
      Bruksareal: 95 m²
      Størrelse: 110 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
      expect(result._metadata.confidence).toBe(100); // Høyeste prioritet
    });

    test('velger primærareal over generelt areal', () => {
      const tekst = `
      Areal: 85 m²
      Primærareal: 95 m²
      Størrelse: 110 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
      expect(result._metadata.confidence).toBe(90);
    });

    test('foretrekker typiske størrelser ved lik prioritet', () => {
      const tekst = `
      Areal: 15 m²
      Størrelse: 85 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('85 m²'); // 85m² er mer typisk enn 15m²
    });
  });

  describe('Edge cases og feilhåndtering', () => {
    test('håndterer tom eller ugyldig input', () => {
      const testCases = [
        null,
        undefined,
        '',
        '   ',
        'Ingen areal-informasjon her',
        'Dette er bare en test uten tall'
      ];
      
      testCases.forEach(tekst => {
        const result = extractBRAWithPriority(tekst);
        expect(result).toBeNull();
      });
    });

    test('håndterer multiple identiske verdier', () => {
      const tekst = `
      Bruksareal: 95 m²
      Primærareal: 95 m²
      Areal: 95 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
      expect(result._metadata.confidence).toBe(100); // Velger høyeste prioritet
    });

    test('ekskluderer garasje og kjeller', () => {
      const tekst = `
      Garasjeareal: 25 m²
      Kjeller: 45 m²
      Loft: 30 m²
      Bruksareal: 95 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
    });

    test('håndterer kompleks tekst med støy', () => {
      const tekst = `
      Boligen er en sjarmerende 3-roms leilighet med følgende:
      
      - Inngangsparti med garderobe
      - Spisestue og stue i åpen løsning
      - Kjøkken med hvitevarer
      - 2 soverom
      - Bad med dusj
      - Balkong på 8 m²
      
      Bruksareal: 95 m²
      Totalareal inkl. balkong: 103 m²
      
      Bygget i 1987, rehabilitert i 2015.
      Fellesgjeld: kr 125.000
      `;
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
    });
  });

  describe('Metadata og debugging', () => {
    test('returnerer riktig metadata', () => {
      const tekst = 'Bruksareal: 95 m²';
      
      const result = extractBRAWithPriority(tekst);
      expect(result).not.toBeNull();
      expect(result._metadata).toBeDefined();
      expect(result._metadata.confidence).toBe(100);
      expect(result._metadata.source).toBe('bruksareal');
      expect(result._metadata.context).toContain('95');
      expect(result._metadata.alternativeCandidates).toBe(1);
    });

    test('logger tilstrekkelig informasjon for debugging', () => {
      // Mock console.log for å teste logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const tekst = `
      Garasje: 25 m²
      Bruksareal: 95 m²
      Takterrasse: 450 m²
      `;
      
      const result = extractBRAWithPriority(tekst);
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result.bruksareal).toBe('95 m²');
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Integrasjonstester', () => {
  test('fungerer med typisk salgsoppgave-tekst', () => {
    const realistiskSalgsoppgave = `
    SALGSOPPGAVE
    
    Adresse: Eksempelveien 42, 0123 Oslo
    Boligtype: Leilighet
    Antall rom: 3
    Antall soverom: 2
    Bruksareal: 85 m²
    Byggeår: 1995
    
    BESKRIVELSE:
    Lys og luftig 3-roms leilighet i 2. etasje.
    
    TEKNISKE INSTALLASJONER:
    - Vann og avløp: Tilfredsstillende
    - Elektrisk anlegg: Oppgradert 2018
    
    Pris: kr 4.500.000
    `;
    
    const result = extractBRAWithPriority(realistiskSalgsoppgave);
    expect(result).not.toBeNull();
    expect(result.bruksareal).toBe('85 m²');
    expect(result._metadata.confidence).toBeGreaterThan(90);
  });
});