/* ============================================================
   FinanzaFacile — App Logic
   ============================================================ */

const MARKET_RATES = { fisso: 3.5, variabile: 2.8, taeg_medio: 4.2 };
const MORTGAGE_DURATIONS = [10, 15, 20, 25, 30];

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
    answers: new Array(8).fill(null),
    knowledgeScore: 0,
    lifestyleScore: 0,
    mortgageContext: {},
    level: 'principiante',
    income: 0,
    expenses: {},
    evalData: null,
    chart: null
  };

  // ── Quiz data ──
  const QUIZ = [
    // Conoscenza finanziaria (3 domande, risposta corretta = indice 0)
    {
      type: 'knowledge',
      category: 'Conoscenza Finanziaria',
      text: 'Cosa significa TAEG?',
      options: [
        'È il costo totale del credito in percentuale annua: include interessi, commissioni e spese obbligatorie',
        'È un tipo di conto corrente bancario ad alto rendimento',
        'È la percentuale mensile che devi risparmiare per andare in pensione'
      ],
      correct: 0
    },
    {
      type: 'knowledge',
      category: 'Conoscenza Finanziaria',
      text: "Cosa significa 'inflazione'?",
      options: [
        "L'aumento generale dei prezzi nel tempo: con la stessa somma, compri meno cose",
        "L'aumento automatico del tuo stipendio legato all'anzianità lavorativa",
        "Una riduzione delle tasse applicata dallo Stato ogni anno"
      ],
      correct: 0
    },
    {
      type: 'knowledge',
      category: 'Conoscenza Finanziaria',
      text: 'Hai 1.000€ in un conto al 5% di interesse annuo composto. Dopo 2 anni avrai circa:',
      options: [
        '1.102,50€',
        '1.100€ esatti',
        '1.050€'
      ],
      correct: 0
    },
    // Stile di vita (3 domande, nessuna risposta corretta — scoring su punteggio)
    {
      type: 'lifestyle',
      category: 'Il tuo stile di vita',
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
      category: 'Il tuo stile di vita',
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
      category: 'Il tuo stile di vita',
      text: 'Con quale frequenza monitori le tue spese?',
      options: [
        'Mai, preferisco non pensarci troppo',
        'Ogni tanto, solo quando mi sembra di spendere troppo',
        'Regolarmente: ho un budget e so dove vanno i miei soldi'
      ],
      scores: [0, 1, 2]
    },
    // Contesto mutuo (2 domande, non scorinate)
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
      range: [0, 4]
    },
    {
      id: 'intermedio',
      icon: '📊',
      title: 'Risparmiatore Consapevole',
      desc: "Hai già buone basi e prendi decisioni ragionate. Ora puoi concentrarti sull'ottimizzare le tue scelte e far lavorare meglio i tuoi risparmi.",
      range: [5, 7]
    },
    {
      id: 'esperto',
      icon: '🏆',
      title: 'Investitore Strategico',
      desc: "Hai una solida comprensione delle finanze personali. Sei in posizione ottima per costruire ricchezza nel lungo periodo con strategie di investimento consapevoli.",
      range: [8, 9]
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
  const FLOW_ORDER = ['quiz', 'profile', 'expenses', 'simulation', 'mortgage'];

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
    state.answers = new Array(6).fill(null);
    showStep('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = QUIZ[state.quizStep];
    document.getElementById('quizBadge').textContent = `Domanda ${state.quizStep + 1} di ${QUIZ.length}`;
    document.getElementById('questionTitle').textContent = q.category;
    document.getElementById('questionText').textContent = q.text;

    const list = document.getElementById('optionsList');
    list.innerHTML = '';

    const saved = state.answers[state.quizStep];

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-item';
      btn.textContent = opt;

      if (saved !== null) {
        btn.disabled = true;
        if (q.type === 'knowledge') {
          if (i === q.correct) btn.classList.add('correct');
          else if (i === saved) btn.classList.add('wrong');
        } else {
          if (i === saved) btn.classList.add('selected');
        }
      } else {
        btn.onclick = () => selectAnswer(i);
      }
      list.appendChild(btn);
    });

    document.getElementById('btnNextQ').disabled = saved === null;
    document.getElementById('btnNextQ').textContent =
      state.quizStep === QUIZ.length - 1 ? 'Vedi il mio profilo →' : 'Avanti →';
    const prevBtn = document.getElementById('btnPrevQ');
    prevBtn.textContent = state.quizStep === 0 ? '← Home' : '← Indietro';
  }

  function selectAnswer(idx) {
    const q = QUIZ[state.quizStep];
    state.answers[state.quizStep] = idx;

    document.querySelectorAll('.option-item').forEach((btn, i) => {
      btn.disabled = true;
      if (q.type === 'knowledge') {
        if (i === q.correct) btn.classList.add('correct');
        else if (i === idx) btn.classList.add('wrong');
      } else {
        if (i === idx) btn.classList.add('selected');
      }
    });

    document.getElementById('btnNextQ').disabled = false;
  }

  function nextQuestion() {
    if (state.quizStep < QUIZ.length - 1) {
      state.quizStep++;
      renderQuestion();
    } else {
      computeScores();
      renderProfile();
      showStep('profile');
    }
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
    QUIZ.forEach((q, i) => {
      const ans = state.answers[i];
      if (ans === null) return;
      if (q.type === 'knowledge' && ans === q.correct) state.knowledgeScore++;
      if (q.type === 'lifestyle') state.lifestyleScore += q.scores[ans];
      if (q.type === 'mortgage_context') state.mortgageContext[i] = ans;
    });
    state.level = getProfile().id;
  }

  // ── Profilo ──
  function renderProfile() {
    const p = getProfile();
    document.getElementById('profileIcon').textContent = p.icon;
    document.getElementById('profileTitle').textContent = p.title;
    document.getElementById('profileDesc').textContent = p.desc;

    const kPct = (state.knowledgeScore / 3 * 100).toFixed(0);
    const lPct = (state.lifestyleScore / 6 * 100).toFixed(0);

    setTimeout(() => {
      document.getElementById('knowledgeBar').style.width = kPct + '%';
      document.getElementById('lifestyleBar').style.width = lPct + '%';
    }, 120);

    const kLabels = ['In crescita', 'Discreto', 'Buono', 'Ottimo'];
    const lLabels = ['Da migliorare', 'Base', 'Discreto', 'Buono', 'Ottimo', 'Eccellente', 'Top'];
    document.getElementById('knowledgeLabel').textContent = kLabels[state.knowledgeScore] || '';
    document.getElementById('lifestyleLabel').textContent = lLabels[state.lifestyleScore] || '';
  }

  // ── Spese ──
  function goToExpenses() {
    renderExpenseForm();
    showStep('expenses');
  }

  function renderExpenseForm() {
    const grid = document.getElementById('expenseGrid');
    grid.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'expense-card';
      card.innerHTML = `
        <div class="expense-card-header">
          <span class="expense-card-icon">${cat.icon}</span>
          <span class="expense-card-label">${cat.label}</span>
        </div>
        <div class="expense-input-wrap">
          <span class="expense-prefix">€</span>
          <input type="number" min="0" placeholder="${cat.hint}" data-cat="${cat.id}" oninput="app.updateSavings()">
        </div>`;
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
  }

  // ── Simulazione ──
  function goToSimulation() {
    renderSimulation();
    showStep('simulation');
  }

  function renderSimulation() {
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

    // Legenda testuale
    document.getElementById('chartLegendDesc').innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:#94A3B8"></div>Risparmio puro: soldi sul conto, senza interessi</div>
      <div class="legend-item"><div class="legend-dot" style="background:#2563EB"></div>Conto deposito al 2% annuo: rendimento basso ma sicuro</div>
      <div class="legend-item"><div class="legend-dot" style="background:#16A34A"></div>Investimento moderato al 5% annuo: rendimento storico tipico dei fondi bilanciati</div>
      <div class="legend-item"><div class="legend-dot" style="background:#DC2626"></div>Potere d'acquisto reale: quanto valgono i risparmi dopo l'inflazione al 2%</div>`;

    renderTips();
    renderActions(savings);
  }

  function renderTips() {
    const level = state.level || 'principiante';
    const introText = {
      principiante: "Ecco i 5 concetti fondamentali della finanza personale, spiegati in parole semplici. Capirli ti aiuterà a prendere decisioni migliori con i tuoi soldi.",
      intermedio: "I concetti chiave con qualche dettaglio in più — le sfumature che ti aiutano a ottimizzare le tue scelte finanziarie.",
      esperto: "Una sintesi tecnica con focus sulle implicazioni pratiche per la tua strategia finanziaria."
    };
    document.getElementById('tipsIntro').textContent = introText[level];

    const grid = document.getElementById('tipsGrid');
    grid.innerHTML = '';
    Object.values(TIPS).forEach(tip => {
      const content = tip[level];
      const card = document.createElement('div');
      card.className = 'tip-card';
      card.style.borderLeftColor = tip.color;
      card.innerHTML = `
        <div class="tip-header">
          <div class="tip-title">${tip.icon} ${tip.title}</div>
          <span class="tip-tag" style="background:${tip.color}20;color:${tip.color}">${level}</span>
        </div>
        <p class="tip-simple">${content.simple}</p>
        <div class="tip-example">${content.example}</div>`;
      grid.appendChild(card);
    });
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

  // ── Analisi AI (Claude API) ──
  async function requestAIAnalysis() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
      alert('Inserisci una Claude API key per usare l\'analisi AI.');
      return;
    }

    const btn = document.querySelector('.btn-ai');
    btn.textContent = '⏳ Analisi in corso…';
    btn.disabled = true;

    const profile = getProfile();
    const savings = monthlySavings();
    const expenses = state.expenses;

    const prompt = `Sei un consulente finanziario che parla in modo semplice e diretto con persone comuni.

L'utente ha completato un questionario sulla sua situazione finanziaria. Ecco i dati:

PROFILO: ${profile.title} (livello: ${state.level})
- Conoscenza finanziaria: ${state.knowledgeScore}/3
- Gestione denaro: ${state.lifestyleScore}/6

SITUAZIONE ECONOMICA MENSILE:
- Entrate nette: ${fmt(state.income)}
- Uscite totali: ${fmt(totalExpenses())}
- Risparmio mensile: ${fmt(savings)}

DETTAGLIO SPESE:
${Object.entries(expenses).filter(([,v]) => v > 0).map(([k, v]) => `- ${k}: ${fmt(v)}`).join('\n')}

Fornisci un'analisi personalizzata di massimo 200 parole che:
1. Valuti brevemente la situazione dell'utente (tono positivo e incoraggiante)
2. Evidenzi 1-2 punti di forza
3. Suggerisca 1-2 aree concrete di miglioramento con numeri specifici
4. Concluda con un messaggio motivante

Usa un linguaggio semplice, adatto al livello "${state.level}". Niente gergo tecnico eccessivo. Sii diretto e pratico.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Errore API');
      }

      const data = await response.json();
      const text = data.content[0].text;

      document.getElementById('aiResultBody').textContent = text;
      document.getElementById('aiResult').style.display = 'block';
      document.getElementById('aiBanner').style.display = 'none';

    } catch (err) {
      alert('Errore durante l\'analisi AI: ' + err.message);
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
    const surplus = monthlySavings();
    const rataMax30 = state.income * 0.30;
    const rataMaxReale = Math.max(0, surplus * 0.50);
    const rataPct = state.income > 0 ? (rataMaxReale / state.income * 100) : 0;
    const status = rataPct >= 20 ? 'ok' : rataPct >= 10 ? 'warning' : 'danger';
    const statusLabel = { ok: '✅ Situazione favorevole per un mutuo', warning: '⚠️ Margine limitato — valuta con attenzione', danger: '❌ Da rafforzare prima di accendere un mutuo' };

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
      <p class="mt-note">* Calcolato con tasso fisso ${MARKET_RATES.fisso}% (riferimento mercato ${new Date().getFullYear()}). Il TAEG effettivo varia per banca.</p>`;

    updateMortgageSim();
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

    document.getElementById('simResult').innerHTML = `
      <div class="sim-metrics">
        <div class="sim-metric"><span class="sm-label">Rata mensile</span><span class="sm-val" style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${fmt(rata)}</span></div>
        <div class="sim-metric"><span class="sm-label">% del tuo reddito</span><span class="sm-val" style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${rataVsReddito ? rataVsReddito + '%' : '—'}</span></div>
        <div class="sim-metric"><span class="sm-label">Totale restituito</span><span class="sm-val">${fmt(totale)}</span></div>
        <div class="sim-metric"><span class="sm-label">Di cui interessi</span><span class="sm-val" style="color:var(--warning)">${fmt(interessi)}</span></div>
      </div>
      <div style="background:${sostenibile ? 'var(--success-dim)' : 'var(--danger-dim)'}; border-left:3px solid ${sostenibile ? 'var(--success)' : 'var(--danger)'}; padding:12px 16px; margin-top:12px; font-size:0.88rem; color:var(--text)">
        ${sostenibile ? '✅ Questa rata è sostenibile (< 30% del reddito)' : '⚠️ Questa rata supera il 30% del reddito — rischio elevato'}
      </div>`;
  }

  // ── Valutazione Preventivo ──
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
        value: rate.toFixed(2) + '% (benchmark: ' + MARKET_RATES.fisso + '%)',
        status: rate <= MARKET_RATES.fisso ? 'ok' : rate <= MARKET_RATES.fisso + 0.5 ? 'warning' : 'danger',
        detail: rate <= MARKET_RATES.fisso ? 'Ottimo: in linea o sotto la media di mercato' : rate <= MARKET_RATES.fisso + 0.5 ? 'Leggermente sopra la media — prova a negoziare' : 'Sopra la media di mercato — confronta altri istituti'
      }
    ];

    const overallStatus = indicators.some(i => i.status === 'danger') ? 'danger' :
                          indicators.some(i => i.status === 'warning') ? 'warning' : 'ok';
    const overallLabel = { ok: '✅ Preventivo complessivamente buono', warning: '⚠️ Preventivo accettabile con riserve', danger: '❌ Preventivo da rivedere o negoziare' };

    document.getElementById('evalResult').style.display = 'block';
    document.getElementById('evalResult').innerHTML = `
      <div style="border-left:3px solid ${statusColor[overallStatus]}; background:var(--bg-card); border:1px solid var(--border); padding:16px 20px; margin-bottom:12px">
        <strong style="font-size:1rem; display:block; margin-bottom:4px">${overallLabel[overallStatus]}</strong>
        <span style="color:var(--muted); font-size:0.82rem">Tipo: ${rateType} | Durata: ${duration} anni | TAEG dichiarato: ${taeg || '—'}%</span>
      </div>
      ${indicators.map(ind => `
        <div class="eval-indicator" style="border-left:3px solid ${statusColor[ind.status]}">
          <div class="ei-header">
            <span class="ei-label">${ind.label}</span>
            <span class="ei-value" style="color:${statusColor[ind.status]}">${ind.value}</span>
          </div>
          <p class="ei-detail">${ind.detail}</p>
        </div>`).join('')}`;

    document.getElementById('evalAiBanner').style.display = 'flex';
    state.evalData = { amount, propValue, duration, rate, taeg, rata, fees, rateType, ltv, rataVsReddito, overallStatus };
  }

  async function requestEvalAI() {
    const apiKey = document.getElementById('evalApiKeyInput').value.trim();
    if (!apiKey || !state.evalData) return;

    const btn = document.querySelector('#evalAiBanner .btn-ai');
    btn.textContent = '⏳ Analisi in corso…';
    btn.disabled = true;

    const d = state.evalData;
    const prompt = `Sei un consulente finanziario esperto in mutui italiani.
Analizza questo preventivo bancario e dai un parere onesto e pratico.

PROFILO UTENTE:
- Livello finanziario: ${state.level}
- Reddito mensile: ${fmt(state.income)}
- Surplus mensile dopo spese: ${fmt(monthlySavings())}

PREVENTIVO:
- Importo: ${fmt(d.amount)} | Valore immobile: ${d.propValue ? fmt(d.propValue) : 'non indicato'}
- Durata: ${d.duration} anni | Tipo tasso: ${d.rateType}
- Tasso nominale: ${d.rate}% | TAEG dichiarato: ${d.taeg || 'non indicato'}%
- Rata mensile: ${d.rata ? fmt(d.rata) : 'non indicata'} | Spese iniziali: ${fmt(d.fees)}
- LTV: ${d.ltv || '—'}% | Rata/reddito: ${d.rataVsReddito || '—'}%
- Valutazione automatica: ${d.overallStatus === 'ok' ? 'positiva' : d.overallStatus === 'warning' ? 'con riserve' : 'negativa'}

Fornisci un'analisi di massimo 200 parole con:
1. Giudizio complessivo sintetico
2. Cosa è positivo in questa offerta
3. Cosa potrebbe essere negoziato o migliorato
4. Un consiglio specifico prima di firmare

Adatta il linguaggio al livello "${state.level}". Sii diretto e pratico.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      document.getElementById('evalAiResultBody').textContent = data.content[0].text;
      document.getElementById('evalAiResult').style.display = 'block';
      document.getElementById('evalAiBanner').style.display = 'none';
    } catch (err) {
      alert('Errore AI: ' + err.message);
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
    document.getElementById('apiKeyInput').value = '';
    document.getElementById('evalResult').style.display = 'none';
    document.getElementById('evalAiBanner').style.display = 'none';
    document.getElementById('evalAiResult').style.display = 'none';
    showStep('landing');
  }

  // ── Public API ──
  return { startQuiz, prevQuestion, nextQuestion, backToQuiz, goToExpenses, goToSimulation, updateSavings, showStep, requestAIAnalysis, restart, goToMortgage, updateMortgageSim, runEvaluation, requestEvalAI };

})();
