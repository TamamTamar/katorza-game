const $ = (id) => document.getElementById(id);

// --- 1. מערכת סאונד ---
const AudioFX = {
    ctx: null,
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
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
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    tick(isFast = false) { this.play(isFast ? 800 : 600, 'sine', 0.05, 0.05); },
    correct() {
        this.play(880, 'triangle', 0.3);
        setTimeout(() => this.play(1100, 'triangle', 0.4), 100);
    },
    timeout() { this.play(150, 'sawtooth', 0.6, 0.2); },
    celebrate() {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#fbbf24', '#ffffff']
        });
    }
};

const els = {
    screenGame: $("screenGame"),
    screenEnd: $("screenEnd"),
    rouletteName: $("rouletteName"),
    btnSpin: $("btnSpin"),
    currentItem: $("currentItem"),
    taskText: $("taskText"),
    timer: $("timer"),
    barFill: $("barFill"),
    btnCorrect: $("btnCorrect"),
    toast: $("toast"),
    scores: $("scores"),
    winners: $("winners"),
    btnRestart: $("btnRestart"),
    mainCard: $("mainCard")
};

// רשימת משפחות (כולל מאמי שמחה)
const PRESET_FAMILIES = ["מאמי שמחה", "דוד וחני", "אהרון ונחמה", "דוד ודבורה", "בנימין וחיה", "ישראל ויעל", "ברוך ואודליה", "מענדל ודבורי", "שלום בער ודבורה לאה", "אליהו ודבורה לאה"];

const ITEMS = ["כיסא", "שולחן", "ארון", "מגירה", "מדף", "מפתח", "שעון", "כוס", "צלחת", "סיר", "קומקום", "מגבת", "שמיכה", "ספר", "עט", "תיק", "טלפון", "מטריה", "תמונה", "מראה", "נעל", "כובע", "וילון", "בקבוק"];

const ROUNDS = [
    { prompt: (i) => `ספרו סיפור מצחיק שהמילה <strong>${i}</strong> מזכירה לכם.` },
    { prompt: (i) => `איזו תכונה טובה החפץ <strong>${i}</strong> מזכיר לכם?` },
    { prompt: (i) => `מה אפשר ללמוד בעבודת ה' מהחפץ <strong>${i}</strong>?` }
];

let state = {
    families: [],
    pool: [],
    roundIndex: 0,
    remaining: 90,
    running: false,
    intervalId: null,
    locked: false,
    currentFam: null,
    mode: 'normal',
    globalCooldown: 0
};

function toast(msg) {
    els.toast.textContent = msg;
    setTimeout(() => { if (els.toast.textContent === msg) els.toast.textContent = ""; }, 2500);
}

function renderScores() {
    els.scores.innerHTML = "";
    const maxScore = Math.max(...state.families.map(f => f.score));
    state.families.forEach(f => {
        const d = document.createElement("div");
        const isLeader = f.score === maxScore && maxScore > 0;
        d.className = `scorePill ${isLeader ? 'leader' : ''}`;
        d.innerHTML = `
            <span>${f.name}</span>
            <div class="score-controls">
                <div class="score-minus" title="הורד נקודה">−</div>
                <div class="score-number" title="הוסף נקודה">${f.score}</div>
            </div>
        `;

        d.querySelector(".score-number").onclick = (e) => {
            e.stopPropagation();
            f.score++;
            AudioFX.celebrate();
            AudioFX.correct();
            renderScores();

            if (state.running) {
                toast(`נקודה ל${f.name}!`);
                clearInterval(state.intervalId);
                setTimeout(() => nextTurn(), 1200);
            }
        };

        d.querySelector(".score-minus").onclick = (e) => {
            e.stopPropagation();
            f.score = Math.max(0, f.score - 1);
            renderScores();
        };

        els.scores.appendChild(d);
    });
}

function startTimer(duration = 90) {
    if (state.intervalId) clearInterval(state.intervalId);
    state.remaining = duration;
    state.running = true;

    const updateUI = () => {
        els.timer.textContent = state.remaining;
        const pct = (state.remaining / duration) * 100;
        els.barFill.style.width = `${pct}%`;

        if (state.remaining <= 10) {
            els.timer.classList.add("low-time");
            els.barFill.classList.add("danger");
        } else {
            els.timer.classList.remove("low-time");
            els.barFill.classList.remove("danger");
        }
    };

    updateUI();

    state.intervalId = setInterval(() => {
        state.remaining--;
        updateUI();

        if (state.remaining <= 10 && state.remaining > 0) AudioFX.tick(true);
        if (state.remaining <= 0) {
            clearInterval(state.intervalId);
            onTimeout();
        }
    }, 1000);
}

function onTimeout() {
    state.running = false;
    AudioFX.timeout();

    if (state.mode === 'normal') {
        state.mode = 'frenzy';
        els.mainCard.classList.add("frenzy");
        els.rouletteName.textContent = "גניבה לכולם! ⚡";
        els.btnCorrect.disabled = true;
        toast("הזמן נגמר! מי חוטף?");
        startTimer(30);
    } else {
        toast("המשימה הסתיימה");
        setTimeout(() => nextTurn(), 1500);
    }
}

function nextTurn() {
    state.running = false;
    state.mode = 'normal';
    els.mainCard.classList.remove("frenzy");

    if (state.pool.length === 0) {
        state.roundIndex++;
        state.pool = [...state.families];
    }

    if (state.roundIndex >= ROUNDS.length) {
        showEndScreen();
    } else {
        resetTurnUI();
    }
}

function resetTurnUI() {
    state.locked = false;
    els.btnSpin.disabled = false;
    els.btnCorrect.disabled = true;
    els.rouletteName.textContent = "מי הבא בתור?";
    els.currentItem.textContent = "—";
    els.taskText.textContent = "הגרל משפחה למשימה...";
    els.timer.textContent = "—";
    els.barFill.style.width = "0%";
}

function showEndScreen() {
    els.screenGame.classList.add("hidden");
    els.screenEnd.classList.remove("hidden");
    AudioFX.celebrate();

    els.winners.innerHTML = "";
    const sorted = [...state.families].sort((a, b) => b.score - a.score);

    sorted.forEach(f => {
        const d = document.createElement("div");
        d.className = `scorePill`;
        d.style.margin = "10px auto";
        d.style.width = "100%";
        d.style.maxWidth = "400px";
        d.innerHTML = `<span>${f.name}</span><span class="score-number">${f.score}</span>`;
        els.winners.appendChild(d);
    });
}

els.btnSpin.addEventListener("click", () => {
    AudioFX.init();
    if (state.locked || state.pool.length === 0) return;

    state.locked = true;
    els.btnSpin.disabled = true;

    state.globalCooldown++;
    // הגרלה: 30% סיכוי לשאלה כללית, או חובה כל 5 תורות
    let isGlobal = (Math.random() < 0.3) || (state.globalCooldown >= 5);
    let counter = 0;

    const interval = setInterval(() => {
        els.rouletteName.textContent = isGlobal && counter > 15 ? "????" : state.families[Math.floor(Math.random() * state.families.length)].name;
        counter++;

        if (counter > 20) {
            clearInterval(interval);

            if (isGlobal) {
                state.globalCooldown = 0;
                state.mode = 'frenzy';
                els.mainCard.classList.add("frenzy");
                els.rouletteName.textContent = "שאלה לכולם! ⚡";
                const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                els.currentItem.textContent = item;
                els.taskText.innerHTML = `<strong>בונוס לכולם:</strong> ` + ROUNDS[state.roundIndex].prompt(item);
                els.btnCorrect.disabled = true;
                startTimer(45);
            } else {
                const idx = Math.floor(Math.random() * state.pool.length);
                const chosen = state.pool.splice(idx, 1)[0];
                state.currentFam = state.families.find(f => f.name === chosen.name);
                els.rouletteName.textContent = state.currentFam.name;

                setTimeout(() => {
                    const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                    els.currentItem.textContent = item;
                    els.taskText.innerHTML = ROUNDS[state.roundIndex].prompt(item);
                    els.btnCorrect.disabled = false;
                    startTimer(90);
                }, 600);
            }
        }
    }, 60);
});

els.btnCorrect.addEventListener("click", () => {
    if (!state.running || state.mode !== 'normal') return;

    clearInterval(state.intervalId);
    state.running = false;
    AudioFX.correct();

    const isFast = state.remaining > 60;
    if (isFast) AudioFX.celebrate();

    state.currentFam.score += (isFast ? 2 : 1);
    renderScores();
    setTimeout(() => nextTurn(), 1200);
});

els.btnRestart.addEventListener("click", () => {
    location.reload();
});

// אתחול משחק חדש בכל רענון
state.families = PRESET_FAMILIES.map(n => ({ name: n, score: 0 }));
state.pool = [...state.families];
renderScores();