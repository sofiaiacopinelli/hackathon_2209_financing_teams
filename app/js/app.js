/* ============================================================
   FinanzaFacile — App Logic
   ============================================================ */

const MARKET_RATES = { fisso: 3.5, variabile: 2.8, taeg_medio: 4.2 };
const MORTGAGE_DURATIONS = [10, 15, 20, 25, 30];

/* ============================================================
   MarketDataSkill — recupera dati finanziari aggiornati
   Parte in background dopo il completamento del quiz.
   Non richiede API key: usa fonti pubbliche (BCE SDMX REST API).
   ============================================================ */
const MarketDataSkill = (() => {

  const ECB_BASE = 'https://sdw-wsrest.ecb.europa.eu/service/data';

  async function fetchSeries(path, lastN = 1) {
    const url = `${ECB_BASE}/${path}?lastNObservations=${lastN}&format=jsondata`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`ECB ${r.status}`);
    return r.json();
  }

  function parseLatest(json) {
    const series = Object.values(json.dataSets[0].series)[0];
    const obsKeys = Object.keys(series.observations).sort((a, b) => +a - +b);
    const lastKey = obsKeys[obsKeys.length - 1];
    const value = series.observations[lastKey][0];
    const dateLabel = json.structure.dimensions.observation[0].values[+lastKey]?.name || '';
    return { value, date: dateLabel };
  }

  async function fetchAll() {
    const [ecbRate, fixedMir, varMir, hicp] = await Promise.allSettled([
      fetchSeries('FM/B.U2.EUR.4F.KR.MRR_FR.LEV'),
      fetchSeries('MIR/M.IT.B.A2A.AM.R.A.2240.EUR.N', 2),
      fetchSeries('MIR/M.IT.B.A2C.AM.R.A.2240.EUR.N', 2),
      fetchSeries('ICP/M.IT.N.000000.4.ANR', 2)
    ]);

    return {
      bceRate:     ecbRate.status === 'fulfilled'    ? parseLatest(ecbRate.value)    : null,
      fisso:       fixedMir.status === 'fulfilled'   ? parseLatest(fixedMir.value)   : null,
      variabile:   varMir.status === 'fulfilled'     ? parseLatest(varMir.value)     : null,
      inflazione:  hicp.status === 'fulfilled'       ? parseLatest(hicp.value)       : null,
      fetchedAt:   new Date().toLocaleString('it-IT')
    };
  }

  // Aggiorna MARKET_RATES con i dati reali; restituisce true se almeno un valore è stato ottenuto
  function applyToMarketRates(data) {
    let anyFetched = false;
    if (data.fisso)     { MARKET_RATES.fisso     = parseFloat(data.fisso.value.toFixed(2));     anyFetched = true; }
    if (data.variabile) { MARKET_RATES.variabile = parseFloat(data.variabile.value.toFixed(2)); anyFetched = true; }
    if (data.bceRate)   { MARKET_RATES.bce       = parseFloat(data.bceRate.value.toFixed(2));   anyFetched = true; }
    if (data.inflazione){ MARKET_RATES.inflazione = parseFloat(data.inflazione.value.toFixed(1)); anyFetched = true; }
    if (anyFetched) {
      MARKET_RATES.live      = true;
      MARKET_RATES.fetchedAt = data.fetchedAt;
      MARKET_RATES.dateRef   = data.fisso?.date || data.variabile?.date || '';
    }
    return anyFetched;
  }

  function buildSummaryText(data, anyFetched) {
    if (!anyFetched) {
      return `📋 Dati BCE non raggiungibili — in uso valori di riferimento:\n• Tasso fisso: ${MARKET_RATES.fisso}% · Variabile: ${MARKET_RATES.variabile}%`;
    }
    const lines = ['📡 Dati aggiornati (BCE / Banca d\'Italia):'];
    if (data.bceRate)    lines.push(`• Tasso BCE: ${data.bceRate.value.toFixed(2)}% (${data.bceRate.date})`);
    if (data.fisso)      lines.push(`• Tassi fissi mutui IT: ${data.fisso.value.toFixed(2)}% (${data.fisso.date})`);
    if (data.variabile)  lines.push(`• Tassi variabili mutui IT: ${data.variabile.value.toFixed(2)}% (${data.variabile.date})`);
    if (data.inflazione) lines.push(`• Inflazione IT (HICP): ${data.inflazione.value.toFixed(1)}% (${data.inflazione.date})`);
    return lines.join('\n');
  }

  // Entry point: avvia in background, risolve con i dati ottenuti
  async function run() {
    try {
      const data = await fetchAll();
      const anyFetched = applyToMarketRates(data);
      return { ok: anyFetched, summary: buildSummaryText(data, anyFetched), data };
    } catch (e) {
      return { ok: false, summary: `📋 BCE non raggiungibile — in uso valori di riferimento:\n• Tasso fisso: ${MARKET_RATES.fisso}% · Variabile: ${MARKET_RATES.variabile}%`, data: null };
    }
  }

  return { run };
})();

function calcolaRata(importo, tassoAnnuo, durataAnni) {
  const r = tassoAnnuo / 100 / 12;
  const n = durataAnni * 12;
  if (r === 0) return importo / n;
  return importo * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcolaImportoMax(rataMax, tassoAnnuo, durataAnni) {
  const r = tassoAnnuo / 100 / 12;
  const n = durataAnni * 12;
  if (r === 0) return rataMax * n;
  return rataMax * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

const app = (() => {

  // ── State ──
  const state = {
    quizStep: 0,
    answers: [],
    knowledgeScore: 0,
    lifestyleScore: 0,
    mortgageContext: {},
    lifestyleContext: {},
    level: 'principiante',
    income: 0,
    expenses: {},
    evalData: null,
    chart: null,
    marketDataReady: false,
    marketDataSummary: ''
  };

  // ── Quiz data ──
  const QUIZ = [
    // ── Sezione 1: Conoscenza Finanziaria (5 domande) ──
    {
      type: 'knowledge',
      category: 'Sezione 1 — Conoscenza Finanziaria',
      text: 'Cosa indica il TAEG di un prestito?',
      options: [
        'Il costo totale del credito in percentuale annua: include interessi, commissioni e tutte le spese obbligatorie',
        'Il tasso di interesse nominale del prestito, senza includere le spese accessorie',
        'Una percentuale fissa che la banca applica solo sui conti correnti'
      ],
      correct: 0, partial: 1,
      feedback: {
        correct: "Perfetto! Il TAEG (Tasso Annuo Effettivo Globale) include tutto il costo reale, non solo gli interessi nominali. Usalo sempre per confrontare due offerte di credito.",
        partial: "Ci sei quasi! Hai pensato al tasso nominale — ma il TAEG va oltre: aggiunge commissioni, spese di istruttoria e costi obbligatori. Per questo è sempre più alto del tasso nominale.",
        wrong: "Non è corretto. Il TAEG non riguarda i conti correnti. Misura il costo reale di un prestito includendo interessi e tutte le spese obbligatorie."
      }
    },
    {
      type: 'knowledge',
      category: 'Sezione 1 — Conoscenza Finanziaria',
      text: "Cosa significa 'inflazione'?",
      options: [
        "L'aumento generale dei prezzi nel tempo: con la stessa somma di denaro, compri meno cose",
        "Un aumento temporaneo dei prezzi in un settore specifico, che di solito si riassorbe",
        "La crescita automatica dello stipendio in base all'anzianità di servizio"
      ],
      correct: 0, partial: 1,
      feedback: {
        correct: "Esatto! L'inflazione corrode il potere d'acquisto: 1.000€ oggi con inflazione al 2% valgono circa 820€ tra 10 anni se li tieni fermi.",
        partial: "In parte giusto — ma l'inflazione strutturale non è temporanea né settoriale: persiste nel tempo e corrode il potere d'acquisto di tutti i risparmi, ogni anno.",
        wrong: "Non è corretto. L'inflazione non riguarda lo stipendio: è l'aumento generale dei prezzi. Con il 2% annuo, ogni anno con gli stessi soldi compri il 2% in meno."
      }
    },
    {
      type: 'knowledge',
      category: 'Sezione 1 — Conoscenza Finanziaria',
      text: 'Hai 1.000€ in un conto al 5% di interesse annuo composto. Dopo 2 anni avrai circa:',
      options: [
        '1.102,50€ — il secondo anno il 5% si applica su 1.050€, non su 1.000€',
        '1.100€ esatti — 50€ di interesse fisso per ogni anno',
        '1.050€ — il 5% applicato una sola volta'
      ],
      correct: 0, partial: 1,
      feedback: {
        correct: "Esatto! Primo anno: 1.000€ × 5% = 50€ → 1.050€. Secondo anno: 1.050€ × 5% = 52,50€ → 1.102,50€. Gli interessi del primo anno generano altri interessi: è il potere dell'interesse composto!",
        partial: "Quasi! Hai calcolato l'interesse semplice (50€ × 2 = 100€). Con il composto, al secondo anno il 5% si applica su 1.050€ già accumulati, non sul capitale iniziale. Risultato: 1.102,50€.",
        wrong: "Non è corretto. 1.050€ sarebbe il risultato dopo solo 1 anno. Con l'interesse composto, al secondo anno si applica il 5% su 1.050€: risultato 1.102,50€."
      }
    },
    {
      type: 'knowledge',
      category: 'Sezione 1 — Conoscenza Finanziaria',
      text: "Cos'è il 'fondo di emergenza' in finanza personale?",
      options: [
        'Una riserva di 3-6 mesi di spese, tenuta in un conto liquidissimo e facilmente accessibile',
        'Qualsiasi somma risparmiata messa da parte, indipendentemente da dove è investita',
        "Un'assicurazione vita obbligatoria richiesta dalla banca per ottenere un mutuo"
      ],
      correct: 0, partial: 1,
      feedback: {
        correct: "Perfetto! Il fondo di emergenza è la base della sicurezza finanziaria: 3-6 mesi di spese, immediatamente accessibili (conto corrente o deposito), separati dai risparmi per investimento.",
        partial: "Il concetto è giusto, ma manca la parte cruciale: il fondo di emergenza deve essere in un conto liquidissimo, non investito. Se lo investi, potresti non poterlo usare nel momento del bisogno.",
        wrong: "Non è corretto. Il fondo di emergenza non è un'assicurazione: è una riserva liquida di 3-6 mesi di spese che gestisci tu, da tenere sempre accessibile per imprevisti."
      }
    },
    {
      type: 'knowledge',
      category: 'Sezione 1 — Conoscenza Finanziaria',
      text: "Cosa significa 'diversificare' un portafoglio di investimenti?",
      options: [
        'Distribuire il capitale su più asset diversi (azioni, obbligazioni, mercati geografici) per ridurre il rischio complessivo',
        'Investire in molte azioni diverse tutte appartenenti allo stesso mercato azionario nazionale',
        'Concentrare tutto il capitale sul singolo investimento con il rendimento atteso più elevato'
      ],
      correct: 0, partial: 1,
      feedback: {
        correct: "Perfetto! La diversificazione riduce il rischio perché asset diversi non si muovono allo stesso modo. Se un settore scende, un altro può compensare. È il classico 'non mettere tutte le uova nello stesso paniere'.",
        partial: "In parte giusto — ma investire in più azioni dello stesso mercato è diversificazione parziale. Quella vera combina classi di asset diverse (azioni, obbligazioni, liquidità) e mercati geografici differenti.",
        wrong: "Non è corretto — è l'opposto. Concentrare tutto sul miglior investimento massimizza il rischio: se quell'asset crolla, perdi tutto. La diversificazione serve proprio a proteggersi da questo scenario."
      }
    },
    // ── Transizione tra sezioni ──
    {
      type: 'section_break',
      icon: '🎯',
      title: 'Sezione 1 completata!',
      description: "Hai risposto alle domande sulla conoscenza finanziaria. Ora passiamo a capire il tuo contesto di vita e le tue abitudini con il denaro.",
      nextLabel: 'Vai alla Sezione 2 →'
    },
    // ── Sezione 2: Stile di vita — Contesto ──
    {
      type: 'lifestyle_context',
      category: 'Sezione 2 — Il tuo contesto',
      text: 'In che tipo di contesto abiti?',
      options: [
        'Grande città (Milano, Roma, Torino, Napoli…)',
        'Città media o capoluogo di provincia',
        'Piccolo comune o area rurale'
      ]
    },
    {
      type: 'lifestyle_context',
      category: 'Sezione 2 — Il tuo contesto',
      text: 'Qual è la tua situazione familiare?',
      options: [
        'Vivo da solo/a',
        'Con partner, senza figli',
        'Con partner e figli',
        'Con genitori o coinquilini'
      ]
    },
    {
      type: 'lifestyle_context',
      category: 'Sezione 2 — Il tuo contesto',
      text: 'Hai figli a carico?',
      options: [
        'No',
        'Sì, uno',
        'Sì, due o più'
      ]
    },
    {
      type: 'lifestyle_context',
      category: 'Sezione 2 — Il tuo contesto',
      text: 'Quante auto ha il tuo nucleo familiare?',
      options: [
        'Nessuna — uso trasporto pubblico o condiviso',
        'Una',
        'Due o più'
      ]
    },
    {
      type: 'lifestyle_context',
      key: 'housing',
      category: 'Sezione 2 — Il tuo contesto',
      text: 'Qual è la tua situazione abitativa attuale?',
      options: [
        'In affitto',
        'Proprietario (ho già un mutuo in corso)',
        'Con la famiglia / senza spese fisse per l\'abitazione'
      ]
    },
    // ── Sezione 2: Stile di vita — Abitudini ──
    {
      type: 'lifestyle',
      category: 'Sezione 2 — Le tue abitudini',
      text: 'Come gestisci i tuoi risparmi ogni mese?',
      options: [
        'Non riesco a risparmiare, arrivo quasi sempre a zero',
        'Risparmio qualcosa quando avanza a fine mese',
        'Metto da parte un importo fisso prima di spendere il resto'
      ],
      scores: [0, 1, 2]
    },
    {
      type: 'lifestyle',
      category: 'Sezione 2 — Le tue abitudini',
      text: 'Hai debiti o prestiti attivi (escluso mutuo casa)?',
      options: [
        'Sì, più di uno (auto, personale, carta rateale…)',
        'Sì, uno',
        'No, nessuno'
      ],
      scores: [0, 1, 2]
    },
    {
      type: 'lifestyle',
      category: 'Sezione 2 — Le tue abitudini',
      text: 'Con quale frequenza monitori le tue spese?',
      options: [
        'Mai, preferisco non pensarci troppo',
        'Ogni tanto, solo quando mi sembra di spendere troppo',
        'Regolarmente: ho un budget e so dove vanno i miei soldi'
      ],
      scores: [0, 1, 2]
    },
    // ── Contesto mutuo ──
    {
      type: 'mortgage_context',
      category: 'Il tuo obiettivo',
      text: 'Stai pensando di acquistare casa con un mutuo?',
      options: [
        'Sì, è il mio obiettivo principale',
        'Ci sto pensando, ma non ho ancora deciso',
        'No, voglio solo capire la mia situazione finanziaria'
      ]
    },
    {
      type: 'mortgage_context',
      category: 'Il tuo obiettivo',
      text: 'Hai già una somma da usare come anticipo (caparra/acconto)?',
      options: [
        'No, non ho risparmi sufficienti',
        'Sì, ho tra €5.000 e €20.000',
        'Sì, ho più di €20.000',
        'Non lo so ancora'
      ]
    }
  ];

  // ── Categorie spese ──
  const CATEGORIES = [
    { id: 'affitto',      label: 'Affitto / Mutuo',      icon: '🏠', hint: 800  },
    { id: 'spesa',        label: 'Spesa alimentare',      icon: '🛒', hint: 300  },
    { id: 'ristoranti',   label: 'Ristoranti e bar',      icon: '🍕', hint: 150  },
    { id: 'trasporti',    label: 'Trasporti',              icon: '🚗', hint: 100  },
    { id: 'bollette',     label: 'Bollette',               icon: '💡', hint: 120  },
    { id: 'abbonamenti',  label: 'Abbonamenti',            icon: '📱', hint: 50   },
    { id: 'shopping',     label: 'Shopping',               icon: '👗', hint: 100  },
    { id: 'salute',       label: 'Salute / Farmacia',      icon: '💊', hint: 50   },
    { id: 'svago',        label: 'Svago / Hobby',          icon: '🎮', hint: 80   },
    { id: 'altro',        label: 'Altro',                  icon: '📦', hint: 50   }
  ];

  // ── Profili utente ──
  const PROFILES = [
    {
      id: 'principiante',
      icon: '🌱',
      title: 'Esploratore Finanziario',
      desc: "Stai iniziando il tuo percorso — e c'è molto da scoprire! Con le giuste informazioni e qualche piccola abitudine puoi migliorare tantissimo la tua situazione economica.",
      range: [0, 5]
    },
    {
      id: 'intermedio',
      icon: '📊',
      title: 'Risparmiatore Consapevole',
      desc: "Hai già buone basi e prendi decisioni ragionate. Ora puoi concentrarti sull'ottimizzare le tue scelte e far lavorare meglio i tuoi risparmi.",
      range: [6, 9]
    },
    {
      id: 'esperto',
      icon: '🏆',
      title: 'Investitore Strategico',
      desc: "Hai una solida comprensione delle finanze personali. Sei in posizione ottima per costruire ricchezza nel lungo periodo con strategie di investimento consapevoli.",
      range: [10, 11]
    }
  ];

  // ── Tips per concetto ──
  const TIPS = {
    interesse: {
      icon: '📈', title: 'Interesse', color: '#2563EB',
      principiante: {
        simple: "L'interesse è il 'prezzo' del denaro nel tempo. Se la banca ti presta 1.000€ al 5%, dopo un anno le devi 1.050€ — quei 50€ sono l'interesse. Ma funziona anche al contrario: se depositi soldi, la banca ti paga un interesse.",
        example: "Presti 10.000€ per comprare un'auto al 7% annuo: paghi 700€ di interessi solo nel primo anno."
      },
      intermedio: {
        simple: "L'interesse composto è il più potente della finanza: gli interessi guadagnati si sommano al capitale e generano altri interessi. Nel lungo periodo la crescita diventa esponenziale.",
        example: "1.000€ al 5% per 20 anni: senza reinvestire → 2.000€. Con interesse composto → 2.653€. La differenza è l'interesse sugli interessi."
      },
      esperto: {
        simple: "Distingui tasso nominale da tasso reale (al netto dell'inflazione). L'interesse composto su orizzonti lunghi è il principale driver di creazione di ricchezza nella finanza personale.",
        example: "7% lordo con inflazione 2% = 5% netto reale. Su 30 anni, 10.000€ diventano ~43.000€ in termini reali."
      }
    },
    tasso: {
      icon: '🎯', title: 'Tasso', color: '#7C3AED',
      principiante: {
        simple: "Il tasso è una percentuale che indica quanto costa o quanto rende il denaro nel tempo. Lo trovi su mutui, prestiti, conti deposito, investimenti. Più è alto: paghi di più (se è un debito) o guadagni di più (se è un investimento).",
        example: "Conto deposito al 3%: 1.000€ → 1.030€ dopo un anno. Prestito al 10%: 1.000€ → ne devi 1.100€."
      },
      intermedio: {
        simple: "Esistono tassi fissi (sempre uguale per tutta la durata) e variabili (cambia, spesso legato all'Euribor). Il fisso ti protegge se i tassi salgono; il variabile conviene se scendono.",
        example: "Mutuo 200.000€ a 20 anni: fisso 3% → rata 1.109€/mese. Variabile 2% → 1.012€/mese ora, ma potrebbe salire."
      },
      esperto: {
        simple: "Il tasso è il prezzo del rischio. Confronta sempre tasso nominale vs TAEG, e considera il costo opportunità rispetto al rendimento atteso degli investimenti.",
        example: "BTP decennale al 4% con inflazione 2% → rendimento reale ~2%. Azionario storico ~7% lordo: diverso profilo rischio/rendimento."
      }
    },
    inflazione: {
      icon: '📉', title: 'Inflazione', color: '#DC2626',
      principiante: {
        simple: "L'inflazione è l'aumento generale dei prezzi nel tempo. I tuoi risparmi fermi perdono valore: 1.000€ oggi comprano più cose di 1.000€ tra 10 anni. Per proteggerti, i tuoi soldi devono crescere almeno quanto l'inflazione.",
        example: "Inflazione media 2%: in 10 anni i prezzi salgono del 22%. 10.000€ fermi valgono come ~8.200€ oggi."
      },
      intermedio: {
        simple: "L'inflazione è il nemico del risparmio immobile. Il tuo rendimento deve essere almeno uguale all'inflazione (tasso reale ≥ 0%). Investire è il modo principale per batterla nel lungo periodo.",
        example: "Conto deposito 2% con inflazione 2% = tasso reale 0%: stai fermo. Investimento 6% con inflazione 2% = tasso reale 4%: stai crescendo."
      },
      esperto: {
        simple: "L'inflazione erode i rendimenti nominali. In periodi di alta inflazione, asset reali (immobili, azionario, BTP indicizzati all'inflazione) proteggono meglio dei bond nominali.",
        example: "2022: inflazione IT ~12%. Un BTP al 3% aveva rendimento reale del -9%. L'azionario globale ha perso meno in termini reali."
      }
    },
    rata: {
      icon: '📅', title: 'Rata', color: '#16A34A',
      principiante: {
        simple: "La rata è la quota mensile che paghi per restituire un prestito o mutuo. Ogni rata ha una parte di capitale (i soldi che hai ricevuto) e una parte di interessi (il costo del prestito). All'inizio paghi più interessi, alla fine più capitale.",
        example: "Prestito 5.000€ a 24 mesi al 6%: rata ~222€/mese. In totale pagherai ~5.328€ — 328€ sono interessi."
      },
      intermedio: {
        simple: "Con l'ammortamento alla francese (il più comune in Italia), la rata è costante ma la composizione cambia: le prime rate vanno quasi tutte agli interessi. Estinguere prima può risparmiare molto.",
        example: "Mutuo 150.000€ a 20 anni al 3%: rata 832€/mese. Al 5° anno hai ancora ~125.000€ di debito residuo."
      },
      esperto: {
        simple: "Analizza il piano di ammortamento completo. La convenienza dell'estinzione anticipata dipende dal costo opportunità: se il debito costa meno del rendimento atteso, potrebbe non convenire estinguere.",
        example: "Estinguere un mutuo al 2% con liquidità che potrebbe rendere il 5% netto non conviene (spread positivo di 3%)."
      }
    },
    taeg: {
      icon: '🔍', title: 'TAEG', color: '#D97706',
      principiante: {
        simple: "Il TAEG è il costo VERO di un prestito in percentuale annua. Include tutto: interessi + commissioni + spese obbligatorie. È lo strumento giusto per confrontare due prestiti. Non guardare solo il tasso nominale — può essere ingannevolmente basso.",
        example: "Prestito A: tasso 5% + spese → TAEG 7%. Prestito B: tasso 6% senza spese → TAEG 6,2%. Il Prestito B è più conveniente!"
      },
      intermedio: {
        simple: "Il TAEG è obbligatorio per legge su tutti i prodotti creditizi. Attenzione alle carte revolving: hanno spesso TAEG superiori al 20-25%, rendendo il debito molto costoso se non lo estingui ogni mese.",
        example: "Carta revolving TAEG 22%: lasci 1.000€ di saldo per un anno → paghi ~220€ di interessi, solo per rimandare il pagamento."
      },
      esperto: {
        simple: "Il TAEG non include costi eventuali (assicurazioni facoltative, interessi di mora). L'effetto leva è positivo solo se il ROI supera il TAEG del finanziamento. Considera anche la deducibilità fiscale degli interessi passivi.",
        example: "TAEG mutuo 3% vs rendimento atteso portafoglio 6%: conviene mantenere il mutuo e investire la liquidità. Ma il calcolo cambia con la tua aliquota fiscale."
      }
    }
  };

  // ── Azioni per livello ──
  const ACTIONS = {
    principiante: [
      { title: 'Inizia con il 10% di risparmio', text: "Prova a mettere da parte almeno il 10% dello stipendio ogni mese, prima di spendere il resto. Anche 100-150€ fanno la differenza nel tempo." },
      { title: 'Traccia le spese per un mese', text: "Usa un'app (Wallet, Spendee, o anche un foglio Excel) per annotare ogni uscita. Spesso scopri dove i soldi 'spariscono' senza accorgertene." },
      { title: 'Evita le carte revolving', text: "Le carte rateali hanno spesso TAEG superiori al 20%. Paga sempre il saldo per intero ogni mese — mai lasciare debito residuo." },
      { title: 'Crea un fondo di emergenza', text: "Prima di pensare a investire, accumula 3-6 mesi di spese in un conto facilmente accessibile. Ti protegge dalle sorprese della vita." }
    ],
    intermedio: [
      { title: 'Applica la regola 50-30-20', text: "50% per necessità (affitto, cibo, bollette), 30% per desideri (svago, ristoranti), 20% per risparmio/investimento. Verifica dove sei." },
      { title: 'Inizia con i PAC su ETF', text: "Un Piano di Accumulo Capitale su ETF globali (es. MSCI World) con piccole somme mensili riduce il rischio e crea ricchezza nel lungo periodo." },
      { title: 'Rinegozia le spese fisse', text: "Assicurazioni, mutuo, utenze — ogni 1-2 anni confronta le offerte. Puoi risparmiare centinaia di euro all'anno senza cambiare stile di vita." },
      { title: 'Valuta il fondo pensione', text: "Contribuire a un fondo pensione complementare riduce le tasse oggi (deducibilità) e accumula per il futuro. Verifica se conviene nel tuo caso." }
    ],
    esperto: [
      { title: 'Definisci la tua asset allocation', text: "Stabilisci un'allocazione target (es. 70% azionario, 25% obbligazionario, 5% liquidità) e ribilancia almeno una volta all'anno." },
      { title: "Sfrutta l'efficienza fiscale", text: "Usa i PIR (Piani Individuali di Risparmio) per benefici su investimenti in aziende italiane. Valuta il regime dichiarativo vs. amministrato per ottimizzare le imposte." },
      { title: 'Analizza il costo dei debiti', text: "Confronta il TAEG dei debiti con il rendimento atteso degli investimenti. Se il debito costa meno, potrebbe convenire mantenerlo e investire la liquidità." },
      { title: 'Diversifica valutariamente', text: "ETF globali in USD/GBP riducono la concentrazione sull'Euro. Considera la hedging valutaria se l'orizzonte è breve." }
    ]
  };

  // ── Utilità ──
  function fmt(n) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }

  function totalExpenses() {
    return Object.values(state.expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }

  function monthlySavings() {
    return state.income - totalExpenses();
  }

  function getProfile() {
    const total = state.knowledgeScore + state.lifestyleScore;
    return PROFILES.find(p => total >= p.range[0] && total <= p.range[1]) || PROFILES[0];
  }

  // Crescita con interesse composto + versamento mensile
  function compoundGrowth(pmt, years, annualRate) {
    if (pmt <= 0) return 0;
    const r = annualRate / 12;
    const n = years * 12;
    if (r === 0) return pmt * n;
    return pmt * ((Math.pow(1 + r, n) - 1) / r);
  }

  // ── Navigazione tra step ──
  const FLOW_ORDER = ['quiz', 'expenses', 'profile', 'simulation', 'mortgage'];

  function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-' + id).classList.add('active');

    // Progress bar (thin top line)
    const allSteps = ['landing', 'quiz', 'profile', 'expenses', 'simulation'];
    const idx = allSteps.indexOf(id);
    document.getElementById('progressBarFill').style.width =
      idx > 0 ? (idx / (allSteps.length - 1) * 100) + '%' : '0%';

    // Step flow indicator
    const flow = document.getElementById('stepFlow');
    const flowIdx = FLOW_ORDER.indexOf(id);
    if (flowIdx < 0) {
      flow.style.display = 'none';
    } else {
      flow.style.display = 'flex';
      FLOW_ORDER.forEach((step, i) => {
        const el = document.getElementById('sf-' + step);
        if (!el) return;
        el.classList.remove('sf-active', 'sf-done');
        if (i === flowIdx) {
          el.classList.add('sf-active');
          el.onclick = null;
        } else if (i < flowIdx) {
          el.classList.add('sf-done');
          el.onclick = () => navigateBack(step, flowIdx, i);
        } else {
          el.onclick = null;
        }
      });
    }

    window.scrollTo(0, 0);
  }

  function navigateBack(targetStep, currentIdx, targetIdx) {
    if (targetIdx >= currentIdx) return;
    if (targetStep === 'quiz') {
      backToQuiz();
    } else {
      showStep(targetStep);
    }
  }

  // ── Quiz ──
  function startQuiz() {
    state.quizStep = 0;
    state.answers = new Array(QUIZ.length).fill(null);
    showStep('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = QUIZ[state.quizStep];
    const badge   = document.getElementById('quizBadge');
    const titleEl = document.getElementById('questionTitle');
    const textEl  = document.getElementById('questionText');
    const listEl  = document.getElementById('optionsList');
    const nextBtn = document.getElementById('btnNextQ');
    const prevBtn = document.getElementById('btnPrevQ');

    // Remove stale feedback and section-break card
    const oldFb    = document.getElementById('quizFeedback');
    const oldBreak = document.getElementById('sectionBreakContent');
    if (oldFb)    oldFb.remove();
    if (oldBreak) oldBreak.remove();

    if (q.type === 'section_break') {
      badge.style.display   = 'none';
      titleEl.style.display = 'none';
      textEl.style.display  = 'none';
      listEl.style.display  = 'none';

      const card = document.createElement('div');
      card.id = 'sectionBreakContent';
      card.className = 'section-break-card';
      card.innerHTML = `
        <div class="sb-icon">${q.icon}</div>
        <h3 class="sb-title">${q.title}</h3>
        <p class="sb-desc">${q.description}</p>
        <div class="sb-sections">
          <div class="sb-sec sb-done">✅ Conoscenza finanziaria — completata</div>
          <div class="sb-sec sb-next">→ Stile di vita — prossima</div>
        </div>`;
      document.querySelector('#step-quiz .question-container').appendChild(card);

      prevBtn.textContent = '← Indietro';
      nextBtn.textContent = q.nextLabel;
      nextBtn.disabled    = false;
      return;
    }

    // Restore visibility for normal questions
    badge.style.display   = '';
    titleEl.style.display = '';
    textEl.style.display  = '';
    listEl.style.display  = '';

    // Badge: count only real questions (no section_break)
    const totalQ   = QUIZ.filter(x => x.type !== 'section_break').length;
    const currentQ = QUIZ.slice(0, state.quizStep + 1).filter(x => x.type !== 'section_break').length;
    badge.textContent   = `Domanda ${currentQ} di ${totalQ}`;
    titleEl.textContent = q.category;
    textEl.textContent  = q.text;

    const saved = state.answers[state.quizStep];
    listEl.innerHTML = '';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-item';
      btn.textContent = opt;

      if (saved !== null) {
        btn.disabled = true;
        if (q.type === 'knowledge') {
          if (i === q.correct)                           btn.classList.add('correct');
          else if (i === saved && i === q.partial)       btn.classList.add('partial');
          else if (i === saved)                          btn.classList.add('wrong');
        } else {
          if (i === saved) btn.classList.add('selected');
        }
      } else {
        btn.onclick = () => selectAnswer(i);
      }
      listEl.appendChild(btn);
    });

    if (saved !== null && q.type === 'knowledge') showKnowledgeFeedback(q, saved);

    nextBtn.disabled    = saved === null;
    nextBtn.textContent = state.quizStep === QUIZ.length - 1 ? 'Vedi il mio profilo →' : 'Avanti →';
    prevBtn.textContent = state.quizStep === 0 ? '← Home' : '← Indietro';
  }

  function showKnowledgeFeedback(q, selectedIdx) {
    const isCorrect = selectedIdx === q.correct;
    const isPartial = selectedIdx === q.partial;
    const type      = isCorrect ? 'correct' : isPartial ? 'partial' : 'wrong';
    const icons     = { correct: '✅', partial: '🟡', wrong: '❌' };
    const labels    = { correct: 'Esatto!', partial: 'Quasi — ma non del tutto', wrong: 'Non è corretto' };

    const existing = document.getElementById('quizFeedback');
    if (existing) existing.remove();

    const fb = document.createElement('div');
    fb.id = 'quizFeedback';
    fb.className = `quiz-feedback fb-${type}`;

    // Testo statico come fallback immediato
    const staticText = q.feedback?.[type] ?? '';
    fb.innerHTML = `
      <div class="fb-header">
        <span class="fb-icon">${icons[type]}</span>
        <strong class="fb-label">${labels[type]}</strong>
      </div>
      <p class="fb-text" id="fbText">${staticText || '⏳ Analisi in corso…'}</p>`;

    document.getElementById('optionsList').after(fb);

    // Feedback dinamico via Claude (solo per risposte non corrette)
    if (!isCorrect) {
      // Stima il livello corrente dai punteggi parziali durante il quiz
      let ks = 0, ls = 0;
      QUIZ.forEach((qz, i) => {
        const ans = state.answers[i];
        if (ans == null) return;
        if (qz.type === 'lifestyle') ls += (qz.scores?.[ans] ?? 0);
        if (qz.type === 'knowledge' && ans === qz.correct) ks++;
      });
      const t = ks + ls;
      const currentLevel = t >= 10 ? 'esperto' : t >= 6 ? 'intermedio' : 'principiante';

      fetch(`${SERVER}/quiz-feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:        q.text,
          options:         q.options,
          selected_idx:    selectedIdx,
          correct_idx:     q.correct,
          answer_type:     type,
          level:           currentLevel,
        }),
      })
      .then(r => r.json())
      .then(data => {
        const el = document.getElementById('fbText');
        if (el && data.feedback) el.textContent = data.feedback;
      })
      .catch(() => {
        // Se il server non risponde, resta il testo statico
        const el = document.getElementById('fbText');
        if (el && !el.textContent.trim()) el.textContent = staticText;
      });
    }
  }

  function selectAnswer(idx) {
    const q = QUIZ[state.quizStep];
    state.answers[state.quizStep] = idx;

    document.querySelectorAll('.option-item').forEach((btn, i) => {
      btn.disabled = true;
      if (q.type === 'knowledge') {
        if (i === q.correct)                     btn.classList.add('correct');
        else if (i === idx && i === q.partial)   btn.classList.add('partial');
        else if (i === idx)                      btn.classList.add('wrong');
      } else {
        if (i === idx) btn.classList.add('selected');
      }
    });

    if (q.type === 'knowledge') showKnowledgeFeedback(q, idx);

    document.getElementById('btnNextQ').disabled = false;
  }

  function nextQuestion() {
    if (state.quizStep < QUIZ.length - 1) {
      state.quizStep++;
      renderQuestion();
    } else {
      goToExpenses();
    }
  }

  function goToProfile() {
    computeScores();
    renderProfile();
    showStep('profile');
  }

  function prevQuestion() {
    if (state.quizStep > 0) {
      state.quizStep--;
      renderQuestion();
    } else {
      showStep('landing');
    }
  }

  function backToQuiz() {
    state.quizStep = QUIZ.length - 1;
    showStep('quiz');
    renderQuestion();
  }

  function computeScores() {
    state.knowledgeScore = 0;
    state.lifestyleScore = 0;
    state.mortgageContext = {};
    state.lifestyleContext = {};
    QUIZ.forEach((q, i) => {
      if (q.type === 'section_break') return;
      const ans = state.answers[i];
      if (ans === null) return;
      if (q.type === 'knowledge' && ans === q.correct) state.knowledgeScore++;
      if (q.type === 'lifestyle') state.lifestyleScore += q.scores[ans];
      if (q.type === 'mortgage_context') state.mortgageContext[i] = ans;
      if (q.type === 'lifestyle_context') state.lifestyleContext[q.key ?? i] = ans;
    });
    state.level = getProfile().id;

    // Calcola le aree deboli (passate poi al tip-explainer)
    const weakAreas = [];
    if (state.knowledgeScore < 3) weakAreas.push('conoscenza_finanziaria');
    if (state.lifestyleScore < 3)  weakAreas.push('abitudini_risparmio');
    if (state.lifestyleScore <= 1) weakAreas.push('gestione_debiti');
    if (!weakAreas.length)         weakAreas.push('investimenti');
    state.weakAreas = weakAreas;

    // Avvia MarketDataSkill in background: aggiorna i tassi prima che l'utente arrivi al mutuo
    state.marketDataReady = false;
    MarketDataSkill.run().then(result => {
      state.marketDataReady = true;
      state.marketDataSummary = result.summary;
    });
  }

  // ── Profilo ──
  function renderProfile() {
    const p = getProfile();
    document.getElementById('profileIcon').textContent = p.icon;
    document.getElementById('profileTitle').textContent = p.title;
    document.getElementById('profileDesc').textContent = p.desc;

    const kPct = (state.knowledgeScore / 5 * 100).toFixed(0);
    const lPct = (state.lifestyleScore / 6 * 100).toFixed(0);

    setTimeout(() => {
      document.getElementById('knowledgeBar').style.width = kPct + '%';
      document.getElementById('lifestyleBar').style.width = lPct + '%';
    }, 120);

    const kLabels = ['In crescita', 'Base', 'Discreto', 'Buono', 'Ottimo', 'Eccellente'];
    const lLabels = ['Da migliorare', 'Base', 'Discreto', 'Buono', 'Ottimo', 'Eccellente', 'Top'];
    document.getElementById('knowledgeLabel').textContent = kLabels[state.knowledgeScore] || '';
    document.getElementById('lifestyleLabel').textContent = lLabels[state.lifestyleScore] || '';

    // Riepilogo contesto (lifestyle_context)
    const ctxItems = QUIZ
      .map((q, i) => q.type === 'lifestyle_context' && state.answers[i] !== null
        ? q.options[state.answers[i]] : null)
      .filter(Boolean);
    const ctxEl = document.getElementById('profileContextRow');
    if (ctxEl) {
      if (ctxItems.length > 0) {
        ctxEl.textContent = ctxItems.join('  ·  ');
        ctxEl.style.display = 'block';
      } else {
        ctxEl.style.display = 'none';
      }
    }
  }

  // ── Spese ──
  // Medie ISTAT approssimate per single/coppia in Italia
  const ISTAT_AVERAGES = {
    affitto: 700, spesa: 280, ristoranti: 130, trasporti: 90,
    bollette: 110, abbonamenti: 45, shopping: 90, salute: 45, svago: 70, altro: 40
  };

  function goToExpenses(skipRender = false) {
    if (!skipRender) renderExpenseForm();

    // Stima il livello per adattare il subtitle
    let ks = 0, ls = 0;
    QUIZ.forEach((q, i) => {
      const ans = state.answers[i];
      if (ans == null) return;
      if (q.type === 'lifestyle') ls += (q.scores?.[ans] ?? 0);
      if (q.type === 'knowledge' && ans === q.correct) ks++;
    });
    const t = ks + ls;
    const estLevel = t >= 10 ? 'esperto' : t >= 6 ? 'intermedio' : 'principiante';

    const expSubtitles = {
      principiante: "Quanto spendi al mese? Puoi inserire i valori a mano, usare 📊 per le medie italiane come punto di partenza, oppure chiedere all'AI ✨ di stimarli in base al tuo stipendio e alle risposte che hai dato.",
      intermedio:   "Inserisci le tue spese mensili. Puoi usare i valori medi ISTAT come benchmark (📊), oppure lasciare che l'AI ✨ stimi le voci in base al tuo profilo e reddito.",
      esperto:      "Imposta il tuo cash-flow mensile. Valori medi di riferimento disponibili via 📊 (fonte ISTAT). L'AI ✨ può stimare le voci dal tuo reddito e profilo per un benchmark personalizzato.",
    };
    const subEl = document.querySelector('#step-expenses .step-subtitle');
    if (subEl) subEl.textContent = expSubtitles[estLevel] || expSubtitles.principiante;

    showStep('expenses');
  }

  function fillAverageValues() {
    const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
    const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
    const housingAvg = housing === 0 ? 810 : housing === 1 ? 700 : 0;
    document.querySelectorAll('[data-cat]').forEach(inp => {
      const cat = inp.dataset.cat;
      inp.value = cat === 'affitto' ? housingAvg : (ISTAT_AVERAGES[cat] || 0);
    });
    updateSavings();
  }

  // ── AI Expense Suggestion Skill ──
  async function requestExpenseAI() {
    const btn = document.getElementById('btnExpenseAI');
    btn.textContent = '⏳ Analisi in corso…';
    btn.disabled = true;

    const alreadyFilled = {};
    document.querySelectorAll('[data-cat]').forEach(inp => {
      const val = parseFloat(inp.value);
      if (val > 0) alreadyFilled[inp.dataset.cat] = val;
    });
    const income = parseFloat(document.getElementById('incomeInput').value) || 0;

    // Estrae il contesto quiz direttamente da state.answers (computeScores non è ancora stato chiamato)
    const quizContext = {};
    const lifestyleAnswers = [];
    let ks = 0, ls = 0;
    QUIZ.forEach((q, i) => {
      const ans = state.answers[i];
      if (ans === null || ans === undefined) return;
      if (q.type === 'lifestyle_context') quizContext[q.text] = q.options[ans];
      if (q.type === 'lifestyle')         { lifestyleAnswers.push({ question: q.text, answer: q.options[ans] }); ls += (q.scores?.[ans] ?? 0); }
      if (q.type === 'knowledge' && ans === q.correct) ks++;
    });
    const total = ks + ls;
    const currentLevel = total >= 10 ? 'esperto' : total >= 6 ? 'intermedio' : 'principiante';

    try {
      const res = await fetch(`${SERVER}/suggest-expenses`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level:              currentLevel,
          income,
          lifestyle_context:  quizContext,
          lifestyle_answers:  lifestyleAnswers,
          already_filled:     alreadyFilled,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      document.querySelectorAll('[data-cat]').forEach(inp => {
        const cat = inp.dataset.cat;
        if (alreadyFilled[cat]) return;
        if (data.expenses[cat] !== undefined) inp.value = Math.round(data.expenses[cat]);
      });
      updateSavings();

      btn.textContent = '✅ Valori suggeriti';
      setTimeout(() => { btn.textContent = '✨ Suggerisci con AI'; btn.disabled = false; }, 2500);

    } catch (err) {
      const isNetwork = err.message.includes('fetch') || err.message.includes('Failed');
      if (isNetwork) alert('Server non raggiungibile — avvia il server con npm start in app/server/');
      else alert('Errore suggerimento AI: ' + err.message);
      btn.textContent = '✨ Suggerisci con AI';
      btn.disabled = false;
    }
  }

  function buildVisibleCategories() {
    // Legge la risposta housing direttamente dalle answers del quiz (disponibile prima di computeScores)
    const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
    const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
    let housingCat;
    if (housing === 0)        housingCat = { id: 'affitto', label: 'Affitto mensile',         icon: '🏠', hint: 810 };
    else if (housing === 1)   housingCat = { id: 'affitto', label: 'Rata mutuo',               icon: '🏦', hint: 700 };
    else if (housing === 2)   housingCat = null; // vive con famiglia: nessuna spesa abitativa
    else                      housingCat = { id: 'affitto', label: 'Affitto / Mutuo',          icon: '🏠', hint: 800 };

    const rest = CATEGORIES.filter(c => c.id !== 'affitto');
    return housingCat ? [housingCat, ...rest] : rest;
  }

  function renderExpenseForm() {
    const grid = document.getElementById('expenseGrid');
    grid.innerHTML = '';

    // Controlla se l'utente ha un mutuo in corso per aggiungere nota contestuale
    const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
    const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
    const hasMortgage = housing === 1;

    buildVisibleCategories().forEach(cat => {
      const card = document.createElement('div');
      card.className = 'expense-card';
      // Se è la voce "affitto" e l'utente ha un mutuo, mostra nota contestuale
      const note = (cat.id === 'affitto' && hasMortgage)
        ? `<p class="expense-card-note">💡 Inserisci la rata mensile che paghi oggi alla banca</p>`
        : '';
      card.innerHTML = `
        <div class="expense-card-header">
          <span class="expense-card-icon">${cat.icon}</span>
          <span class="expense-card-label">${cat.label}</span>
        </div>
        <div class="expense-input-wrap">
          <span class="expense-prefix">€</span>
          <input type="number" min="0" placeholder="${cat.hint}" data-cat="${cat.id}" oninput="app.updateSavings()">
        </div>
        ${note}`;
      grid.appendChild(card);
    });
  }

  function updateSavings() {
    state.income = parseFloat(document.getElementById('incomeInput').value) || 0;
    state.expenses = {};
    document.querySelectorAll('[data-cat]').forEach(inp => {
      state.expenses[inp.dataset.cat] = parseFloat(inp.value) || 0;
    });

    const total = totalExpenses();
    const savings = monthlySavings();
    const preview = document.getElementById('savingsPreview');

    if (state.income > 0 || total > 0) {
      preview.style.display = 'block';
      document.getElementById('previewIncome').textContent = '+' + fmt(state.income);
      document.getElementById('previewExpenses').textContent = '-' + fmt(total);
      const el = document.getElementById('previewSavings');
      el.textContent = fmt(savings);
      el.className = 'savings-amount ' + (savings >= 0 ? 'positive' : 'negative');
    } else {
      preview.style.display = 'none';
    }

    const aiBtn = document.getElementById('btnExpenseAI');
    if (aiBtn) aiBtn.disabled = state.income <= 0;
  }

  // ── Simulazione ──
  function goToSimulation() {
    renderSimulation();
    showStep('simulation');
  }

  function renderSimulation() {
    // Aggiorna il subtitle in base al livello
    const simSubtitles = {
      principiante: "Ecco cosa succede ai tuoi risparmi nei prossimi 20 anni: tenerli fermi, metterli in un conto deposito, o investirli? Il grafico mostra la differenza.",
      intermedio:   "Proiezione a 20 anni su tre scenari di allocazione del risparmio mensile, con confronto al potere d'acquisto reale deflazionato al 2%.",
      esperto:      "Simulazione Monte-Carlo semplificata su 20 anni: benchmark 0%, proxy 2% (conto deposito/BTP), portafoglio bilanciato 5%, e deflator inflazione 2%.",
    };
    const simSubEl = document.querySelector('#step-simulation .step-subtitle');
    if (simSubEl) simSubEl.textContent = simSubtitles[state.level] || simSubtitles.principiante;

    const pmt = Math.max(0, monthlySavings());
    const years = 20;
    const labels = Array.from({ length: years + 1 }, (_, i) => i === 0 ? 'Oggi' : `Anno ${i}`);

    const noInterest = labels.map((_, i) => pmt * i * 12);
    const low        = labels.map((_, i) => compoundGrowth(pmt, i, 0.02));
    const mid        = labels.map((_, i) => compoundGrowth(pmt, i, 0.05));
    const realPower  = labels.map((_, i) => (pmt * i * 12) / Math.pow(1.02, i));

    // Metriche
    const savings = monthlySavings();
    document.getElementById('metricsGrid').innerHTML = `
      <div class="metric-card">
        <div class="metric-label">Risparmio mensile</div>
        <div class="metric-value" style="color:${savings >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(savings)}</div>
        <div class="metric-sub">${savings >= 0 ? 'ottimo punto di partenza' : 'da riequilibrare'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">In 10 anni — solo risparmio</div>
        <div class="metric-value">${fmt(Math.max(0, noInterest[10]))}</div>
        <div class="metric-sub">senza rendimenti</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">In 10 anni — investendo al 5%</div>
        <div class="metric-value" style="color:var(--success)">${fmt(Math.max(0, mid[10]))}</div>
        <div class="metric-sub">${mid[10] > noInterest[10] ? '+' + fmt(mid[10] - noInterest[10]) + ' extra' : ''}</div>
      </div>`;

    // Grafico
    if (state.chart) state.chart.destroy();
    const ctx = document.getElementById('simulationChart').getContext('2d');
    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Solo risparmio (0%)',              data: noInterest, borderColor: '#94A3B8', borderWidth: 2,  tension: 0.3, fill: false },
          { label: 'Conto deposito (2%)',               data: low,        borderColor: '#2563EB', borderWidth: 2,  tension: 0.3, fill: false },
          { label: 'Investimento moderato (5%)',         data: mid,        borderColor: '#16A34A', borderWidth: 3,  tension: 0.3, fill: { target: 'origin', above: 'rgba(22,163,74,0.06)' } },
          { label: 'Potere acquisto reale (inflaz. 2%)', data: realPower,  borderColor: '#DC2626', borderWidth: 2,  tension: 0.3, fill: false, borderDash: [6, 4] }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt(c.raw) } }
        },
        scales: { y: { ticks: { callback: v => fmt(v) } } }
      }
    });

    // Legenda testuale — adattata al livello
    const legendByLevel = {
      principiante: [
        { color: '#94A3B8', text: 'Soldi fermi sul conto corrente — non crescono, anzi perdono valore col tempo' },
        { color: '#2563EB', text: 'Conto deposito — la banca ti paga un piccolo interesse (circa 2% all\'anno), i soldi sono al sicuro' },
        { color: '#16A34A', text: 'Investimento in fondi — rischio moderato, ma storicamente rende circa il 5% all\'anno — la linea verde mostra quanto potresti avere in più' },
        { color: '#DC2626', text: 'Potere d\'acquisto reale — con l\'inflazione, €1.000 oggi varranno meno tra 10 anni: questa linea mostra l\'effetto' },
      ],
      intermedio: [
        { color: '#94A3B8', text: 'Risparmio puro (0%) — baseline senza rendimenti' },
        { color: '#2563EB', text: 'Conto deposito vincolato al 2% annuo — rendimento basso ma privo di rischio di mercato' },
        { color: '#16A34A', text: 'Portafoglio bilanciato al 5% annuo — rendimento storico medio dei fondi azionari globali (es. MSCI World)' },
        { color: '#DC2626', text: 'Potere d\'acquisto reale — valore deflazionato al 2% di inflazione annua' },
      ],
      esperto: [
        { color: '#94A3B8', text: 'Benchmark zero-return — capitale nominale accumulato' },
        { color: '#2563EB', text: '2% annuo — proxy conto deposito / BTP breve termine' },
        { color: '#16A34A', text: '5% annuo — rendimento reale medio di portafoglio azionario diversificato a lungo termine' },
        { color: '#DC2626', text: 'Valore reale — potere d\'acquisto deflazionato con inflazione attesa 2%' },
      ],
    };
    const legend = legendByLevel[state.level] || legendByLevel.principiante;
    document.getElementById('chartLegendDesc').innerHTML =
      legend.map(l => `<div class="legend-item"><div class="legend-dot" style="background:${l.color}"></div>${l.text}</div>`).join('');

    renderTips();
    renderActions(savings);
  }

  // Cache degli approfondimenti AI (topic → testo) per non richiamare Claude due volte
  const _tipDetailCache = {};

  function renderTips() {
    const level = state.level || 'principiante';
    const introText = {
      principiante: "Clicca su un concetto per un approfondimento personalizzato — spiegato in parole semplici, con esempi dalla tua situazione.",
      intermedio:   "Clicca su un concetto per un approfondimento AI adattato al tuo profilo e ai tuoi numeri.",
      esperto:      "Clicca su un concetto per un'analisi tecnica applicata alla tua situazione finanziaria.",
    };
    document.getElementById('tipsIntro').textContent = introText[level];

    const grid = document.getElementById('tipsGrid');
    grid.innerHTML = '';
    Object.entries(TIPS).forEach(([key, tip]) => {
      const content = tip[level];
      const card = document.createElement('div');
      card.className = 'tip-card tip-card--clickable';
      card.style.borderLeftColor = tip.color;
      card.dataset.tipKey = key;
      card.innerHTML = `
        <div class="tip-header">
          <div class="tip-title">${tip.icon} ${tip.title}</div>
          <span class="tip-expand-hint">Approfondisci ↓</span>
        </div>
        <p class="tip-simple">${content.simple}</p>
        <div class="tip-example">${content.example}</div>
        <div class="tip-detail" id="tip-detail-${key}" style="display:none">
          <div class="tip-detail-body" id="tip-detail-body-${key}"></div>
        </div>`;
      card.querySelector('.tip-header').addEventListener('click', () => expandTip(key, tip, card));
      grid.appendChild(card);
    });
  }

  async function expandTip(key, tip, card) {
    const detailEl = document.getElementById(`tip-detail-${key}`);
    const bodyEl   = document.getElementById(`tip-detail-body-${key}`);
    const hintEl   = card.querySelector('.tip-expand-hint');

    // Toggle chiusura
    if (detailEl.style.display !== 'none') {
      detailEl.style.display = 'none';
      hintEl.textContent = 'Approfondisci ↓';
      card.classList.remove('tip-card--open');
      return;
    }

    // Apertura
    detailEl.style.display = 'block';
    hintEl.textContent = 'Chiudi ↑';
    card.classList.add('tip-card--open');

    // Se già in cache, mostra subito
    if (_tipDetailCache[key]) {
      bodyEl.textContent = _tipDetailCache[key];
      return;
    }

    // Altrimenti chiama Claude
    bodyEl.innerHTML = '<span class="tip-detail-loading">⏳ Claude sta preparando un approfondimento per te…</span>';

    try {
      const res = await fetch(`${SERVER}/tip-detail`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic:      key,
          level:      state.level || 'principiante',
          income:     state.income,
          savings:    monthlySavings(),
          weak_areas: state.weakAreas || [],
        }),
      });
      const data = await res.json();
      if (data.ok && data.detail) {
        _tipDetailCache[key] = data.detail;
        bodyEl.textContent = data.detail;
      } else {
        bodyEl.textContent = 'Approfondimento non disponibile — riprova più tardi.';
      }
    } catch {
      bodyEl.textContent = 'Server non raggiungibile. Avvia il server con npm start in app/server/.';
    }
  }

  function renderActions(savings) {
    const level = state.level || 'principiante';
    let actions = [...(ACTIONS[level] || ACTIONS.principiante)];

    if (savings < 0) {
      actions.unshift({
        title: '⚠️ Le uscite superano le entrate',
        text: "La priorità assoluta è riequilibrare il budget. Identifica le spese più facili da ridurre (ristoranti, abbonamenti, shopping) e punta ad avere almeno qualcosa da parte ogni mese."
      });
    }

    document.getElementById('actionList').innerHTML = actions.slice(0, 4).map((a, i) => `
      <div class="action-item">
        <div class="action-num">${i + 1}</div>
        <div class="action-text">
          <strong>${a.title}</strong>
          <span>${a.text}</span>
        </div>
      </div>`).join('');
  }

  // ── Analisi AI (server Node locale) ──
  const SERVER = 'http://localhost:3000';

  async function requestAIAnalysis() {
    const btn = document.querySelector('#aiBanner .btn-ai');
    btn.textContent = '⏳ Analisi in corso…';
    btn.disabled = true;

    const mortgageInterest = Object.values(state.mortgageContext ?? {}).some(v => v === 0);

    try {
      const res = await fetch(`${SERVER}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_score:   state.knowledgeScore,
          lifestyle_score:   state.lifestyleScore,
          income:            state.income,
          expenses:          state.expenses,
          lifestyle_context: state.lifestyleContext,
          mortgage_context:  state.mortgageContext,
          mortgage_interest: mortgageInterest,
          market_data:       state.marketDataSummary || null,
          market_rates:      MARKET_RATES.live ? { fisso: MARKET_RATES.fisso, variabile: MARKET_RATES.variabile } : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      document.getElementById('aiResultBody').textContent = data.analysis;
      document.getElementById('aiResult').style.display = 'block';
      document.getElementById('aiBanner').style.display = 'none';

    } catch (err) {
      const isNetwork = err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError');
      if (isNetwork) {
        alert('Server non raggiungibile.\n\nAvvia il server dal terminale di Claude Code:\n  cd server\n  npm install\n  npm start');
      } else {
        alert('Errore analisi AI: ' + err.message);
      }
      btn.textContent = 'Analizza con AI';
      btn.disabled = false;
    }
  }

  // ── Mutuo Affordability ──
  function goToMortgage() {
    renderMortgage();
    showStep('mortgage');
  }

  function renderMortgage() {
    // Subtitle e intro adattivi al livello
    const mortSubtitles = {
      principiante: "Basato su quello che hai inserito, ecco quanto mutuo potresti permetterti — e cosa significa in pratica ogni numero.",
      intermedio:   "Analisi di affordability basata su reddito e surplus mensile, con regola del 30% e tabella di capacità per durata.",
      esperto:      "Affordability analysis: DSC (Debt Service Coverage) sul surplus mensile, stress test sui tassi, LTV implicito per durata.",
    };
    const mortSubEl = document.querySelector('#step-mortgage .step-subtitle');
    if (mortSubEl) mortSubEl.textContent = mortSubtitles[state.level] || mortSubtitles.principiante;

    const surplus = monthlySavings();
    const rataMax30 = state.income * 0.30;
    const rataMaxReale = Math.max(0, surplus * 0.50);
    const rataPct = state.income > 0 ? (rataMaxReale / state.income * 100) : 0;
    const status = rataPct >= 20 ? 'ok' : rataPct >= 10 ? 'warning' : 'danger';
    const statusLabel = { ok: '✅ Situazione favorevole per un mutuo', warning: '⚠️ Margine limitato — valuta con attenzione', danger: '❌ Da rafforzare prima di accendere un mutuo' };

    const liveTag = MARKET_RATES.live
      ? `<span class="market-live-badge" title="${state.marketDataSummary}">📡 Dati live BCE${MARKET_RATES.dateRef ? ' · ' + MARKET_RATES.dateRef : ''}</span>`
      : `<span class="market-live-badge market-live-badge--fallback">📋 Dati stimati</span>`;

    document.getElementById('mortgageResultCard').innerHTML = `
      <div class="mortgage-status ${status}">
        <div class="ms-icon">${status === 'ok' ? '🏠' : status === 'warning' ? '⚠️' : '🔴'}</div>
        <div class="ms-body">
          <strong>${statusLabel[status]}</strong>
          <span>Rata max realistica: <b>${fmt(rataMaxReale)}/mese</b> &nbsp;|&nbsp; Soglia del 30%: ${fmt(rataMax30)}/mese</span>
        </div>
      </div>
      <div class="mortgage-table">
        <div class="mt-row header"><span>Durata</span><span>Importo max</span><span>Rata stimata</span></div>
        ${MORTGAGE_DURATIONS.map(d => {
          const imp = calcolaImportoMax(rataMaxReale, MARKET_RATES.fisso, d);
          const rata = calcolaRata(imp, MARKET_RATES.fisso, d);
          return `<div class="mt-row"><span>${d} anni</span><span class="mt-amount">${fmt(imp)}</span><span class="mt-rata">${fmt(rata)}/mese</span></div>`;
        }).join('')}
      </div>
      <p class="mt-note">${liveTag} Calcolato con tasso fisso ${MARKET_RATES.fisso}% · variabile ${MARKET_RATES.variabile}%${MARKET_RATES.inflazione ? ' · inflazione ' + MARKET_RATES.inflazione + '%' : ''}. Il TAEG effettivo varia per banca.</p>
      ${state.level === 'principiante' ? `
      <div class="explainer-card" style="margin-top:16px;padding:14px 16px;background:var(--bg-card2);border-left:3px solid var(--accent);font-size:0.86rem;color:var(--text-muted)">
        <strong style="color:var(--text)">📖 Come leggere questi numeri</strong><br>
        <b>Rata mensile</b> = quello che paghi ogni mese alla banca, come un "affitto" per i soldi che ti hanno prestato.<br>
        <b>Regola del 30%</b> = le banche di solito prestano solo se la rata non supera il 30% del tuo stipendio netto — altrimenti il rischio è troppo alto.<br>
        <b>Durata</b> = più anni hai per restituire, meno paghi ogni mese, ma in totale paghi più interessi.
      </div>` : ''}`;

    renderMortgageOptimal();
    updateMortgageSim();
  }

  // ── Profilo ottimale mutuo — skill mirrored dal server ──────
  // Statistiche medie italiane (Banca d'Italia 2023)
  const IT_MORTGAGE_AVG = {
    importo:       136000,
    durata:        24,
    ltv:           72,
    rata_reddito:  26,
    anticipo_pct:  25,
    reddito_medio: 1850,
  };

  function renderMortgageOptimal() {
    const surplus       = monthlySavings();
    const rataOttimale  = Math.min(state.income * 0.28, Math.max(0, surplus * 0.50));
    const durazioni     = [15, 20, 25, 30];

    const scenari = durazioni.map(anni => {
      const importo         = Math.round(calcolaImportoMax(rataOttimale, MARKET_RATES.fisso, anni));
      const anticipo        = Math.round(importo * IT_MORTGAGE_AVG.anticipo_pct / 100);
      const rispMensile     = surplus * 0.50;
      const mesiAnticipo    = rispMensile > 0 ? Math.ceil(anticipo / rispMensile) : null;
      return { anni, importo, anticipo, anni_anticipo: mesiAnticipo ? Math.round(mesiAnticipo / 12 * 10) / 10 : null };
    });

    const opt       = scenari.find(s => s.anni === 25) ?? scenari[2];
    const userPct   = state.income > 0 ? Math.round(rataOttimale / state.income * 100) : 0;
    const gapImp    = opt.importo - IT_MORTGAGE_AVG.importo;
    const gapPct    = Math.round(gapImp / IT_MORTGAGE_AVG.importo * 100);
    const situaz    = rataOttimale <= 0 ? 'danger' : opt.importo >= IT_MORTGAGE_AVG.importo * 0.65 ? 'ok' : 'warning';

    const colors = { ok: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' };

    // Indicatori di confronto
    const comparisons = [
      {
        label:    '% reddito per rata',
        user_val: userPct + '%',
        avg_val:  IT_MORTGAGE_AVG.rata_reddito + '%',
        user_pct: Math.min(100, userPct / 40 * 100),
        avg_pct:  Math.min(100, IT_MORTGAGE_AVG.rata_reddito / 40 * 100),
        user_col: userPct <= 28 ? 'var(--success)' : userPct <= 35 ? 'var(--warning)' : 'var(--danger)',
        note:     userPct <= 28 ? 'Ottimo — sotto la soglia consigliata' : userPct <= 35 ? 'Accettabile' : 'Elevato — attenzione',
      },
      {
        label:    'Importo accessibile (25 anni)',
        user_val: fmt(opt.importo),
        avg_val:  fmt(IT_MORTGAGE_AVG.importo),
        user_pct: Math.min(100, opt.importo / (IT_MORTGAGE_AVG.importo * 1.5) * 100),
        avg_pct:  Math.min(100, IT_MORTGAGE_AVG.importo / (IT_MORTGAGE_AVG.importo * 1.5) * 100),
        user_col: colors[situaz],
        note:     gapPct >= 0 ? `+${gapPct}% vs media italiana` : `${gapPct}% vs media italiana`,
      },
    ];

    // Tabella scenari
    const tabHtml = scenari.map(s => {
      const isOpt = s.anni === 25;
      return `<div class="opt-row${isOpt ? ' opt-row--best' : ''}">
        <span class="opt-anni">${s.anni} anni${isOpt ? ' ★' : ''}</span>
        <span class="opt-importo">${fmt(s.importo)}</span>
        <span class="opt-anticipo">${fmt(s.anticipo)}</span>
        <span class="opt-tempo">${s.anni_anticipo !== null ? s.anni_anticipo + ' anni risparmio' : '—'}</span>
      </div>`;
    }).join('');

    const container = document.getElementById('mortgageOptimalSection');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="opt-header">
        <h3>📊 La tua situazione vs la media italiana</h3>
        <span class="opt-source">Fonte: Banca d'Italia 2023</span>
      </div>

      <div class="opt-comparisons">
        ${comparisons.map(c => `
          <div class="opt-cmp-card">
            <div class="opt-cmp-label">${c.label}</div>
            <div class="opt-cmp-row">
              <span class="opt-cmp-tag opt-cmp-tag--you">Tu</span>
              <div class="opt-bar-bg"><div class="opt-bar-fill" style="width:${c.user_pct}%;background:${c.user_col}"></div></div>
              <span class="opt-cmp-val" style="color:${c.user_col}">${c.user_val}</span>
            </div>
            <div class="opt-cmp-row">
              <span class="opt-cmp-tag opt-cmp-tag--avg">Media IT</span>
              <div class="opt-bar-bg"><div class="opt-bar-fill" style="width:${c.avg_pct}%;background:var(--muted)"></div></div>
              <span class="opt-cmp-val" style="color:var(--muted)">${c.avg_val}</span>
            </div>
            <p class="opt-cmp-note">${c.note}</p>
          </div>`).join('')}
      </div>

      <div class="opt-table-wrap">
        <div class="opt-table-title">🎯 Scenari ottimali per te — rata ${fmt(Math.round(rataOttimale))}/mese</div>
        <div class="opt-table-head">
          <span>Durata</span><span>Importo max</span><span>Anticipo (25%)</span><span>Anni per anticipo</span>
        </div>
        ${tabHtml}
        <p class="opt-table-note">★ Scenario consigliato — durata in linea con la media italiana (${IT_MORTGAGE_AVG.durata} anni). Anticipo calcolato al ${IT_MORTGAGE_AVG.anticipo_pct}% del valore immobile.</p>
      </div>`;
  }

  function updateMortgageSim() {
    const amount   = parseFloat(document.getElementById('simAmount').value);
    const duration = parseFloat(document.getElementById('simDuration').value);
    const rate     = parseFloat(document.getElementById('simRate').value);

    document.getElementById('simAmountLabel').textContent = fmt(amount);
    document.getElementById('simDurationLabel').textContent = duration + ' anni';
    document.getElementById('simRateLabel').textContent = rate.toFixed(1) + '%';

    const rata = calcolaRata(amount, rate, duration);
    const totale = rata * duration * 12;
    const interessi = totale - amount;
    const rataVsReddito = state.income > 0 ? (rata / state.income * 100).toFixed(1) : null;
    const sostenibile = state.income > 0 && rata <= state.income * 0.30;

    // Stress test: rata se il tasso sale di +1% e +2%
    const rataStress1 = calcolaRata(amount, rate + 1, duration);
    const rataStress2 = calcolaRata(amount, rate + 2, duration);
    const stress1Pct = state.income > 0 ? (rataStress1 / state.income * 100).toFixed(1) : null;
    const stress2Pct = state.income > 0 ? (rataStress2 / state.income * 100).toFixed(1) : null;
    const stressBlock = rate < 8 ? `
      <div class="stress-test">
        <div class="stress-title">📊 Stress test tasso</div>
        <div class="stress-row">
          <span>Tasso attuale <strong>${rate.toFixed(1)}%</strong></span>
          <span style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${fmt(rata)}/mese${rataVsReddito ? ' · ' + rataVsReddito + '% reddito' : ''}</span>
        </div>
        ${rate + 1 <= 8 ? `<div class="stress-row">
          <span>Se sale a <strong>${(rate + 1).toFixed(1)}%</strong></span>
          <span style="color:${stress1Pct && stress1Pct < 30 ? 'var(--warning)' : 'var(--danger)'}">${fmt(rataStress1)}/mese${stress1Pct ? ' · +' + fmt(rataStress1 - rata) : ''}</span>
        </div>` : ''}
        ${rate + 2 <= 8 ? `<div class="stress-row">
          <span>Se sale a <strong>${(rate + 2).toFixed(1)}%</strong></span>
          <span style="color:var(--danger)">${fmt(rataStress2)}/mese${stress2Pct ? ' · +' + fmt(rataStress2 - rata) : ''}</span>
        </div>` : ''}
      </div>` : '';

    document.getElementById('simResult').innerHTML = `
      <div class="sim-metrics">
        <div class="sim-metric"><span class="sm-label">Rata mensile</span><span class="sm-val" style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${fmt(rata)}</span></div>
        <div class="sim-metric"><span class="sm-label">% del tuo reddito</span><span class="sm-val" style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${rataVsReddito ? rataVsReddito + '%' : '—'}</span></div>
        <div class="sim-metric"><span class="sm-label">Totale restituito</span><span class="sm-val">${fmt(totale)}</span></div>
        <div class="sim-metric"><span class="sm-label">Di cui interessi</span><span class="sm-val" style="color:var(--warning)">${fmt(interessi)}</span></div>
      </div>
      <div style="background:${sostenibile ? 'var(--success-dim)' : 'var(--danger-dim)'}; border-left:3px solid ${sostenibile ? 'var(--success)' : 'var(--danger)'}; padding:12px 16px; margin-top:12px; font-size:0.88rem; color:var(--text)">
        ${sostenibile ? '✅ Questa rata è sostenibile (< 30% del reddito)' : '⚠️ Questa rata supera il 30% del reddito — rischio elevato'}
      </div>
      ${MARKET_RATES.live ? `<p style="font-size:0.78rem;color:var(--muted);margin-top:8px">📡 Tasso di riferimento aggiornato da BCE${MARKET_RATES.dateRef ? ' · ' + MARKET_RATES.dateRef : ''}</p>` : ''}
      ${stressBlock}`;
  }

  // ── Valutazione Preventivo ──
  function goToEvaluator() {
    // Subtitle adattivo al livello
    const evalSubtitles = {
      principiante: "Hai già un'offerta dalla banca? Incolla i numeri qui — ti spieghiamo cosa significano, se il tasso è buono e cosa puoi chiedere di cambiare.",
      intermedio:   "Analizza l'offerta ricevuta: confrontiamo tasso, LTV e sostenibilità con i dati di mercato per dirti se conviene o dove negoziare.",
      esperto:      "Inserisci i parametri del preventivo per un'analisi LTV/DSC, delta rata calcolata vs dichiarata, stress test e benchmark vs tasso BCE.",
    };
    const subEl = document.getElementById('evalSubtitle');
    if (subEl) subEl.textContent = evalSubtitles[state.level] || evalSubtitles.principiante;

    // Se l'utente ha un mutuo in corso, pre-compila la rata dall'expense field
    const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
    const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
    const hasMortgage = housing === 1;
    const currentRata = hasMortgage ? (state.expenses.affitto || 0) : 0;

    const evalRata = document.getElementById('evalRata');
    if (evalRata && currentRata > 0 && !evalRata.value) {
      evalRata.value = currentRata;
    }

    // Pre-fill dall'ultimo valore del simulatore, se disponibile e non già compilato
    const simAmount   = document.getElementById('simAmount');
    const simDuration = document.getElementById('simDuration');
    const simRate     = document.getElementById('simRate');
    if (simAmount && parseFloat(simAmount.value) > 0) {
      const evalAmount   = document.getElementById('evalAmount');
      const evalDuration = document.getElementById('evalDuration');
      const evalRate     = document.getElementById('evalRate');
      if (evalAmount && !evalAmount.value)     evalAmount.value   = simAmount.value;
      if (evalDuration && !evalDuration.value) evalDuration.value = simDuration.value;
      if (evalRate && !evalRate.value)         evalRate.value     = parseFloat(simRate.value).toFixed(2);
    }

    // Se abbiamo abbastanza dati, calcola subito
    const evalAmount = document.getElementById('evalAmount');
    const evalDuration = document.getElementById('evalDuration');
    const evalRateEl = document.getElementById('evalRate');
    if (evalAmount?.value && evalDuration?.value && evalRateEl?.value) runEvaluation();

    showStep('evaluator');
  }

  function runEvaluation() {
    const amount    = parseFloat(document.getElementById('evalAmount').value) || 0;
    const propValue = parseFloat(document.getElementById('evalPropertyValue').value) || 0;
    const duration  = parseFloat(document.getElementById('evalDuration').value) || 0;
    const rate      = parseFloat(document.getElementById('evalRate').value) || 0;
    const taeg      = parseFloat(document.getElementById('evalTAEG').value) || 0;
    const rata      = parseFloat(document.getElementById('evalRata').value) || 0;
    const fees      = parseFloat(document.getElementById('evalFees').value) || 0;
    const rateType  = document.getElementById('evalRateType').value;

    if (!amount || !duration || !rate) return;

    const ltv = propValue > 0 ? (amount / propValue * 100).toFixed(1) : null;
    const rataVsReddito = state.income > 0 && rata > 0 ? (rata / state.income * 100).toFixed(1) : null;

    const statusColor = { ok: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', neutral: '#555' };

    const indicators = [
      {
        label: 'Sostenibilità rata',
        value: rataVsReddito ? rataVsReddito + '% del reddito' : 'Completa il quiz con il tuo reddito',
        status: !rataVsReddito ? 'neutral' : rataVsReddito < 30 ? 'ok' : rataVsReddito < 40 ? 'warning' : 'danger',
        detail: !rataVsReddito ? 'Inserisci il reddito nel quiz per vedere questo indicatore' : rataVsReddito < 30 ? 'Ottimo: sotto la soglia del 30%' : rataVsReddito < 40 ? 'Attenzione: tra 30% e 40%, gestibile ma limitante' : 'Pericoloso: supera il 40% del reddito'
      },
      {
        label: 'LTV (Loan To Value)',
        value: ltv ? ltv + '%' : 'Inserisci il valore dell\'immobile',
        status: !ltv ? 'neutral' : ltv < 80 ? 'ok' : ltv < 90 ? 'warning' : 'danger',
        detail: !ltv ? 'Inserisci il valore dell\'immobile per calcolare l\'LTV' : ltv < 80 ? 'Buono: LTV sotto l\'80%, condizioni più favorevoli' : ltv < 90 ? 'Nella media: alcune banche richiedono assicurazione' : 'Alto: difficoltà di approvazione, tassi più alti'
      },
      {
        label: 'Competitività tasso vs mercato',
        value: rate.toFixed(2) + '% (benchmark' + (MARKET_RATES.live ? ' live' : '') + ': ' + MARKET_RATES.fisso + '%)',
        status: rate <= MARKET_RATES.fisso ? 'ok' : rate <= MARKET_RATES.fisso + 0.5 ? 'warning' : 'danger',
        detail: (rate <= MARKET_RATES.fisso ? 'Ottimo: in linea o sotto la media di mercato' : rate <= MARKET_RATES.fisso + 0.5 ? 'Leggermente sopra la media — prova a negoziare' : 'Sopra la media di mercato — confronta altri istituti') + (MARKET_RATES.live ? ` (dati BCE${MARKET_RATES.dateRef ? ' · ' + MARKET_RATES.dateRef : ''})` : ' (dati stimati)')
      }
    ];

    const overallStatus = indicators.some(i => i.status === 'danger') ? 'danger' :
                          indicators.some(i => i.status === 'warning') ? 'warning' : 'ok';
    const overallLabel = { ok: '✅ Preventivo complessivamente buono', warning: '⚠️ Preventivo accettabile con riserve', danger: '❌ Preventivo da rivedere o negoziare' };

    // Costo totale del mutuo
    const rataCalcolata = rata > 0 ? rata : calcolaRata(amount, rate, duration);
    const costoTotale = rataCalcolata * 12 * duration;
    const totaleInteressi = costoTotale - amount;
    const costoBlock = `
      <div class="eval-costo-totale">
        <div class="ect-title">💸 Quanto ti costa davvero questo mutuo</div>
        <div class="ect-metrics">
          <div class="ect-metric">
            <span class="ect-label">Importo finanziato</span>
            <span class="ect-val">${fmt(amount)}</span>
          </div>
          <div class="ect-metric">
            <span class="ect-label">Interessi totali pagati</span>
            <span class="ect-val" style="color:var(--warning)">${fmt(totaleInteressi)}</span>
          </div>
          <div class="ect-metric ect-total">
            <span class="ect-label">Totale restituito in ${duration} anni</span>
            <span class="ect-val" style="color:var(--danger)">${fmt(costoTotale)}</span>
          </div>
        </div>
        <p class="ect-note">Paghi <strong>${fmt(totaleInteressi)}</strong> di interessi — cioè il <strong>${(totaleInteressi / amount * 100).toFixed(0)}%</strong> in più rispetto a quanto hai ricevuto.</p>
      </div>`;

    // Punteggio offerta (0-100)
    const scoreMap = { ok: 100, warning: 55, danger: 20, neutral: 50 };
    const score = Math.round(indicators.reduce((s, i) => s + scoreMap[i.status], 0) / indicators.length);
    const scoreColor = score >= 75 ? 'var(--success)' : score >= 45 ? 'var(--warning)' : 'var(--danger)';
    const scoreEmoji = score >= 75 ? '🟢' : score >= 45 ? '🟡' : '🔴';

    // Rata calcolata vs dichiarata
    const rataCalc = calcolaRata(amount, rate, duration);
    const rataDiff = rata > 0 ? (rata - rataCalc) : null;
    const rataDiffText = rataDiff !== null
      ? (Math.abs(rataDiff) < 5 ? '≈ coincide con la dichiarata' : rataDiff > 0 ? `+${fmt(rataDiff)} rispetto al calcolato — verifica` : `${fmt(rataDiff)} rispetto al calcolato — ok`)
      : '';

    document.getElementById('evalResult').style.display = 'block';
    document.getElementById('evalResult').innerHTML = `
      <!-- Score card -->
      <div class="eval-score-card" style="border-color:${scoreColor}">
        <div class="esc-left">
          <div class="esc-score" style="color:${scoreColor}">${scoreEmoji} ${score}<span style="font-size:1rem;color:var(--muted)">/100</span></div>
          <div class="esc-label">${overallLabel[overallStatus]}</div>
        </div>
        <div class="esc-right">
          <div class="esc-tag">Tipo: <b>${rateType}</b></div>
          <div class="esc-tag">Durata: <b>${duration} anni</b></div>
          <div class="esc-tag">TAEG: <b>${taeg ? taeg + '%' : '—'}</b></div>
          ${rataDiffText ? `<div class="esc-tag" style="color:var(--muted);font-size:0.78rem">Rata calcolata: ${fmt(rataCalc)} — ${rataDiffText}</div>` : ''}
        </div>
      </div>

      <!-- Indicatori con barre -->
      <div class="eval-indicators-grid">
        ${indicators.map(ind => {
          const barPct = { ok: 85, warning: 50, danger: 20, neutral: 50 }[ind.status];
          return `<div class="eval-indicator-card" style="border-top:3px solid ${statusColor[ind.status]}">
            <div class="eic-header">
              <span class="eic-label">${ind.label}</span>
              <span class="eic-value" style="color:${statusColor[ind.status]}">${ind.value}</span>
            </div>
            <div class="eic-bar-bg"><div class="eic-bar-fill" style="width:${barPct}%;background:${statusColor[ind.status]}"></div></div>
            <p class="eic-detail">${ind.detail}</p>
          </div>`;
        }).join('')}
      </div>

      ${costoBlock}`;

    document.getElementById('evalAiBanner').style.display = 'flex';
    state.evalData = { amount, propValue, duration, rate, taeg, rata, fees, rateType, ltv, rataVsReddito, overallStatus };
  }

  async function requestEvalAI() {
    if (!state.evalData) return;

    const btn = document.querySelector('#evalAiBanner .btn-ai');
    btn.textContent = '⏳ Analisi in corso…';
    btn.disabled = true;

    const d = state.evalData;

    try {
      const res = await fetch(`${SERVER}/mortgage-offer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level:             state.level,
          income:            state.income,
          monthly_savings:   monthlySavings(),
          amount:            d.amount,
          property_value:    d.propValue ?? 0,
          duration_years:    d.duration,
          rate:              d.rate,
          taeg:              d.taeg ?? 0,
          declared_payment:  d.rata ?? 0,
          fees:              d.fees ?? 0,
          rate_type:         d.rateType ?? 'fisso',
          market_rates:      MARKET_RATES.live ? { fisso: MARKET_RATES.fisso, variabile: MARKET_RATES.variabile } : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      document.getElementById('evalAiResultBody').textContent = data.analysis;
      document.getElementById('evalAiResult').style.display = 'block';
      document.getElementById('evalAiBanner').style.display = 'none';
    } catch (err) {
      const isNetwork = err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError');
      if (isNetwork) {
        alert('Server non raggiungibile.\n\nAvvia il server dal terminale di Claude Code:\n  cd app/server\n  npm install\n  npm start');
      } else {
        alert('Errore AI: ' + err.message);
      }
      btn.textContent = 'Analizza con AI';
      btn.disabled = false;
    }
  }

  // ── Reset ──
  function restart() {
    state.quizStep = 0;
    state.answers = new Array(8).fill(null);
    state.knowledgeScore = 0;
    state.lifestyleScore = 0;
    state.mortgageContext = {};
    state.evalData = null;
    state.level = 'principiante';
    state.income = 0;
    state.expenses = {};
    if (state.chart) { state.chart.destroy(); state.chart = null; }
    document.getElementById('aiResult').style.display = 'none';
    document.getElementById('aiBanner').style.display = 'flex';
    document.getElementById('evalResult').style.display = 'none';
    document.getElementById('evalAiBanner').style.display = 'none';
    document.getElementById('evalAiResult').style.display = 'none';
    showStep('landing');
  }

  // ── Public API ──
  return { startQuiz, prevQuestion, nextQuestion, backToQuiz, goToExpenses, goToProfile, goToSimulation, updateSavings, fillAverageValues, showStep, requestAIAnalysis, restart, goToMortgage, updateMortgageSim, runEvaluation, requestEvalAI, requestExpenseAI, goToEvaluator };

})();
