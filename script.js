const $ = (id) => document.getElementById(id);

// --- 1. מערכת סאונד מלאה ---
const AudioFX = {
    ctx: null,
    init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { console.error("סאונד לא נתמך"); }
        }
    },
    play(freq, type, duration, vol = 0.1) {
        this.init();
        if (!this.ctx) return;
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
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#2563eb', '#fbbf24', '#ffffff'] });
        }
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
    mainCard: $("mainCard"),
    wheel: $("wheel")
};

const PRESET_FAMILIES = ["מאמי שמחה", "דוד וחני", "אהרון ונחמה", "דוד ודבורה", "בנימין וחיה", "ישראל ויעל", "ברוך ואודליה", "מענדל ודבורי", "שלום בער ודבורה לאה", "אליהו ודבורה לאה"];
const ITEMS = ["כיסא", "שולחן", "ארון", "מגירה", "מדף", "מפתח", "שעון", "כוס", "צלחת", "סיר", "קומקום", "מגבת", "שמיכה", "ספר", "עט", "תיק", "טלפון", "מטריה", "תמונה", "מראה", "נעל", "כובע", "וילון", "בקבוק"];

const ROUNDS = [
    { prompt: (i) => `ספרו סיפור מצחיק שקרה עם <strong>פאפי חי</strong> ו-<strong>${i}</strong>.` },
    { prompt: (i) => `איזו תכונה טובה של <strong>פאפי</strong> מזכיר לכם החפץ <strong>${i}</strong>?` },
    { prompt: (i) => `מה <strong>פאפי</strong> היה לומד מ-<strong>${i}</strong>?` }
];
let state = { families: [], pool: [], roundIndex: 0, remaining: 90, running: false, intervalId: null, locked: false, currentFam: null, mode: 'normal', globalCooldown: 0, currentRotation: 0 };

function toast(msg) {
    if (!msg) return;
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    setTimeout(() => { els.toast.classList.remove("show"); }, 2000);
}

function renderScores() {
    els.scores.innerHTML = "";
    const maxScore = Math.max(...state.families.map(f => f.score));
    state.families.forEach(f => {
        const d = document.createElement("div");
        const isLeader = f.score === maxScore && maxScore > 0;
        d.className = `scorePill ${isLeader ? 'leader' : ''}`;
        d.innerHTML = `<span>${f.name}</span><div class="score-controls"><div class="score-minus">−</div><div class="score-number">${f.score}</div></div>`;
        d.querySelector(".score-number").onclick = (e) => {
            e.stopPropagation(); f.score++; AudioFX.celebrate(); AudioFX.correct(); renderScores();
            if (state.running) { toast(`נקודה ל${f.name}!`); clearInterval(state.intervalId); setTimeout(() => nextTurn(), 1200); }
        };
        d.querySelector(".score-minus").onclick = (e) => {
            e.stopPropagation(); f.score = Math.max(0, f.score - 1); renderScores();
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

        if (state.remaining <= 10 && state.remaining > 0) {
            AudioFX.tick(true);
        } else if (state.remaining % 2 === 0 && state.remaining > 0) {
            AudioFX.tick(false);
        }

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
    els.taskText.textContent = "סובבו את הגלגל!";
    els.timer.textContent = "—";
    els.barFill.style.width = "0%";
}

function showEndScreen() {
    // 1. מעבר מסך
    els.screenGame.classList.add("hidden");
    els.screenEnd.classList.remove("hidden");
    AudioFX.celebrate();

    // 2. מיון נתונים
    const sorted = [...state.families].sort((a, b) => b.score - a.score);
    console.log("Ranking:", sorted); // לבדיקה ב-Console

    // 3. שיבוץ נתונים בפודיום
    if (sorted[0]) {
        document.getElementById("p1-name").textContent = sorted[0].name;
        document.getElementById("p1-score").textContent = sorted[0].score;
    }
    if (sorted[1]) {
        document.getElementById("p2-name").textContent = sorted[1].name;
        document.getElementById("p2-score").textContent = sorted[1].score;
    }
    if (sorted[2]) {
        document.getElementById("p3-name").textContent = sorted[2].name;
        document.getElementById("p3-score").textContent = sorted[2].score;
    }
}

els.btnSpin.addEventListener("click", () => {
    AudioFX.init();
    if (state.locked || state.pool.length === 0) return;

    state.locked = true;
    els.btnSpin.disabled = true;

    state.globalCooldown++;
    let isGlobal = (Math.random() < 0.3) || (state.globalCooldown >= 5);

    state.currentRotation += (1800 + Math.floor(Math.random() * 360));
    els.wheel.style.transform = `rotate(${state.currentRotation}deg)`;

    let c = 0;
    const inv = setInterval(() => {
        els.rouletteName.textContent = isGlobal && c > 25 ? "????" : state.families[Math.floor(Math.random() * state.families.length)].name;
        if (++c > 35) clearInterval(inv);
    }, 100);

    setTimeout(() => {
        if (isGlobal) {
            state.globalCooldown = 0;
            state.mode = 'frenzy';
            els.mainCard.classList.add("frenzy");
            els.rouletteName.textContent = "משימה לכולם! ⚡";
            toast("בונוס לכולם!");
            const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            els.currentItem.textContent = item;
            els.taskText.innerHTML = ROUNDS[state.roundIndex].prompt(item);
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
            }, 500);
        }
    }, 4000);
});

els.btnCorrect.addEventListener("click", () => {
    if (!state.running || state.mode !== 'normal') return;

    clearInterval(state.intervalId);
    state.running = false;
    AudioFX.correct();

    const isFast = state.remaining > 60;
    if (isFast) AudioFX.celebrate();

    state.currentFam.score += (isFast ? 2 : 1);
    toast(isFast ? "בונוס מהירות! +2" : "כל הכבוד! +1");
    renderScores();

    setTimeout(() => nextTurn(), 1200);
});

els.btnRestart.addEventListener("click", () => {
    location.reload();
});

// אתחול משחק
state.families = PRESET_FAMILIES.map(n => ({ name: n, score: 0 }));
state.pool = [...state.families];
renderScores();

// כפתור בדיקה זמני למסך המנצחים
// כפתור בדיקה זמני למסך המנצחים - מתוקן לפודיום
document.getElementById("debugWin").onclick = () => {
    // 1. נותנים נקודות אקראיות כדי שנראה תוצאות שונות בכל לחיצה
    state.families.forEach(f => f.score = Math.floor(Math.random() * 20));

    // 2. קוראים לפונקציה המרכזית שמעדכנת את הפודיום
    showEndScreen();
};