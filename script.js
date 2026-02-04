const $ = (id) => document.getElementById(id);

const AudioFX = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(freq, type, duration, vol = 0.1) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    },
    tick() { this.play(600, 'sine', 0.05, 0.05); },
    correct() { this.play(880, 'triangle', 0.3); setTimeout(() => this.play(1100, 'triangle', 0.4), 100); },
    timeout() { this.play(150, 'sawtooth', 0.6, 0.2); }
};

const els = {
    screenGame: $("screenGame"), screenEnd: $("screenEnd"),
    rouletteName: $("rouletteName"), btnSpin: $("btnSpin"),
    currentItem: $("currentItem"), taskText: $("taskText"),
    timer: $("timer"), barFill: $("barFill"),
    btnCorrect: $("btnCorrect"), toast: $("toast"),
    scores: $("scores"), winners: $("winners"), btnRestart: $("btnRestart")
};

const PRESET_FAMILIES = ["דוד וחני", "אהרון ונחמה", "דוד ודבורה", "בנימין וחיה", "ישראל ויעל", "ברוך ואודליה", "מענדל ודבורי", "שלום בער ודבורה לאה", "אליהו ודבורה לאה"];
const ITEMS = ["כיסא", "שולחן", "ארון", "מגירה", "מדף", "מפתח", "שעון", "כוס", "צלחת", "סיר", "קומקום", "מגבת", "שמיכה", "ספר", "עט", "תיק", "טלפון", "מטריה", "תמונה", "מראה", "נעל", "כובע", "וילון", "בקבוק"];
const ROUNDS = [
    { prompt: (i) => `ספרו סיפור מצחיק שהמילה ${i} מזכירה לכם.` },
    { prompt: (i) => `איזו תכונה טובה החפץ ${i} מזכיר לכם?` },
    { prompt: (i) => `מה אפשר ללמוד בעבודת ה' מהחפץ ${i}?` }
];

let state = { families: [], roundIndex: 0, playedInRound: 0, remaining: 90, running: false };

function renderScores() {
    els.scores.innerHTML = "";
    [...state.families].sort((a, b) => b.score - a.score).forEach(f => {
        const d = document.createElement("div");
        d.className = "scorePill";
        d.innerHTML = `<span>${f.name}</span><span class="score-number">${f.score}</span>`;
        els.scores.appendChild(d);
    });
}

function startTimer() {
    state.remaining = 90; state.running = true;
    if (state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(() => {
        state.remaining--;
        els.timer.textContent = state.remaining;
        els.barFill.style.width = `${(state.remaining / 90) * 100}%`;
        if (state.remaining <= 10 && state.remaining > 0) { AudioFX.tick(); els.timer.classList.add("low-time"); els.barFill.classList.add("danger"); }
        if (state.remaining <= 0) { clearInterval(state.intervalId); onTimeout(); }
    }, 1000);
}

function onTimeout() { AudioFX.timeout(); nextTurn(); }

function nextTurn() {
    state.playedInRound++;
    if (state.playedInRound >= state.families.length) { state.roundIndex++; state.playedInRound = 0; }
    if (state.roundIndex >= ROUNDS.length) {
        els.screenGame.classList.add("hidden");
        els.screenEnd.classList.remove("hidden");
        els.winners.innerHTML = els.scores.innerHTML;
    } else {
        els.btnSpin.disabled = false; els.btnCorrect.disabled = true;
        els.timer.classList.remove("low-time"); els.barFill.classList.remove("danger");
    }
}

els.btnSpin.addEventListener("click", () => {
    AudioFX.init();
    els.btnSpin.disabled = true;
    let c = 0;
    const inv = setInterval(() => {
        els.rouletteName.textContent = state.families[Math.floor(Math.random() * state.families.length)].name;
        if (++c > 12) {
            clearInterval(inv);
            const f = state.families[state.playedInRound];
            els.rouletteName.textContent = f.name;
            state.currentFam = f;
            els.currentItem.textContent = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            els.taskText.textContent = ROUNDS[state.roundIndex].prompt(els.currentItem.textContent);
            els.btnCorrect.disabled = false; startTimer();
        }
    }, 80);
});

els.btnCorrect.addEventListener("click", () => {
    clearInterval(state.intervalId); AudioFX.correct();
    state.currentFam.score += (state.remaining > 70 ? 2 : 1);
    renderScores(); nextTurn();
});

els.btnRestart.addEventListener("click", () => location.reload());

state.families = PRESET_FAMILIES.map(n => ({ name: n, score: 0 })).sort(() => Math.random() - 0.5);
renderScores();