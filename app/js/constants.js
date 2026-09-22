/**
 * @module constants
 * Costanti statiche dell'applicazione FinanzaFacile.
 * Nessuna dipendenza esterna — questo modulo è foglia nel grafo delle dipendenze.
 */

/** @type {number[]} Durate standard dei mutui in anni */
export const MORTGAGE_DURATIONS = [10, 15, 20, 25, 30];

/**
 * Domande del quiz divise in sezioni:
 *  - Sezione 1: conoscenza finanziaria (type 'knowledge')
 *  - Section break (type 'section_break')
 *  - Sezione 2: contesto di vita (type 'lifestyle_context')
 *  - Sezione 2: abitudini (type 'lifestyle')
 *  - Contesto mutuo (type 'mortgage_context')
 * @type {Array<Object>}
 */
export const QUIZ = [
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

/**
 * Categorie di spesa mensile con etichette, icone e valori suggeriti.
 * @type {Array<{id: string, label: string, icon: string, hint: number}>}
 */
export const CATEGORIES = [
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

/**
 * Profili utente calcolati in base al punteggio totale (conoscenza + stile di vita).
 * @type {Array<{id: string, icon: string, title: string, desc: string, range: [number, number]}>}
 */
export const PROFILES = [
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

/**
 * Contenuti educativi per ogni concetto finanziario chiave,
 * differenziati per livello utente (principiante / intermedio / esperto).
 * @type {Object.<string, {icon: string, title: string, color: string, principiante: Object, intermedio: Object, esperto: Object}>}
 */
export const TIPS = {
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

/**
 * Azioni consigliate per ogni livello di profilo utente.
 * @type {Object.<string, Array<{title: string, text: string}>>}
 */
export const ACTIONS = {
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

/**
 * Azioni di miglioramento finanziario da mostrare nel tab mutuo
 * quando la situazione è warning o danger.
 * @type {Object.<'warning'|'danger', Array<{title: string, text: string}>>}
 */
export const MORTGAGE_IMPROVEMENT_ACTIONS = {
  danger: [
    { title: '📉 Riduci le spese non essenziali', text: 'Il tuo surplus mensile è troppo basso per sostenere una rata. Punta a liberare almeno il 25-30% del reddito: ristoranti, abbonamenti e shopping sono i fronti più facili.' },
    { title: '💳 Estingui i debiti in corso', text: 'Prestiti e carte rateali riducono la capacità di credito e il cashflow. Estinguerli prima di richiedere un mutuo migliora il profilo creditizio e libera liquidità per la rata.' },
    { title: '🏦 Inizia ad accumulare l\'anticipo', text: 'Le banche richiedono tipicamente il 20-25% del valore dell\'immobile come anticipo. Ogni euro accantonato ora riduce l\'importo del mutuo — e la rata mensile.' },
    { title: '📈 Valuta come aumentare le entrate', text: 'Ogni 100€/mese in più di reddito netto equivale a circa 25.000€ di mutuo accessibile in più. Formazione, cambio ruolo o attività extra possono fare la differenza in 1-2 anni.' },
  ],
  warning: [
    { title: '📊 Ottimizza 2-3 spese fisse', text: 'Sei vicino alla soglia. Rinegoziare utenze, assicurazioni o abbonamenti per 150-200€/mese può spostarti dalla zona "attenzione" a quella "ok" senza stravolgere lo stile di vita.' },
    { title: '💰 Punta a un anticipo più alto', text: 'Aumentare l\'anticipo abbassa l\'importo del mutuo e riduce la rata. Con un LTV sotto l\'80% ottieni anche condizioni di tasso migliori dalle banche.' },
    { title: '⏳ Un piano da 12-18 mesi', text: 'Con piccoli aggiustamenti e un risparmio mirato, in 12-18 mesi la tua situazione può passare da "attenzione" a "favorevole". Calcola un target mensile e automatizza il versamento.' },
    { title: '🔍 Confronta almeno 3 banche', text: 'Mezzo punto di differenza sul tasso vale migliaia di euro in 25 anni. Usa un broker indipendente o chiedi preventivi a più istituti prima di firmare qualsiasi cosa.' },
  ],
};

/**
 * Medie ISTAT approssimate per spese mensili di un single/coppia in Italia (in euro).
 * @type {Object.<string, number>}
 */
export const ISTAT_AVERAGES = {
  affitto: 700, spesa: 280, ristoranti: 130, trasporti: 90,
  bollette: 110, abbonamenti: 45, shopping: 90, salute: 45, svago: 70, altro: 40
};
