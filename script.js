const $ = (id) => document.getElementById(id);

// --- 1. מערכת סאונד מלאה ---
const AudioFX = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(freq, type, duration, vol = 0.1) {
        this.init(); const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    },

    // 1. צליל תקתוק גלגל (נעים ומהיר)
    spinClick() { this.play(400, 'sine', 0.05, 0.02); },

    // 2. צליל "מתח" רגע לפני שהגלגל נעצר (דרמטי)
    suspense() { this.play(200, 'triangle', 0.5, 0.05); },

    // 3. צליל הצלחה (מנגינה עולה)
    correct() {
        this.play(523.25, 'triangle', 0.2, 0.1); // דו
        setTimeout(() => this.play(659.25, 'triangle', 0.2, 0.1), 100); // מי
        setTimeout(() => this.play(783.99, 'triangle', 0.4, 0.1), 200); // סול
    },

    // 4. צליל "אוי לא" כשנגמר הזמן (יורד)
    timeout() {
        this.play(300, 'sawtooth', 0.2, 0.1);
        setTimeout(() => this.play(200, 'sawtooth', 0.2, 0.1), 200);
        setTimeout(() => this.play(150, 'sawtooth', 0.6, 0.1), 400);
    },

    // 5. צליל כניסה למצב Frenzy (סירנה מהירה)
    frenzyAlert() {
        let count = 0;
        let alarm = setInterval(() => {
            this.play(count % 2 === 0 ? 800 : 1000, 'square', 0.1, 0.03);
            if (++count > 6) clearInterval(alarm);
        }, 150);
    },

    // 6. צליל חגיגת ניצחון סופי (ארפג'יו)
    // 6. חגיגת ניצחון סופית עם מנגינה ומחיאות כפיים ארוכות
    celebrate() {
        // מנגינת ניצחון
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((n, i) => setTimeout(() => this.play(n, 'sine', 0.6, 0.1), i * 150));

        // הפעלת מחיאות כפיים
        this.applause(3000); // 3 שניות של כפיים

        confetti({ particleCount: 250, spread: 100, origin: { y: 0.5 } });
    },

    // פונקציה ליצירת סאונד של מחיאות כפיים
    applause(duration) {
        this.init();
        const bufferSize = this.ctx.sampleRate * (duration / 1000);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // יצירת רעש בסיסי
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // פילטר שגורם לרעש להישמע כמו מחיאות כפיים (פחות צורם)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        // דעיכה הדרגתית של הכפיים בסוף
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (duration / 1000));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    },

    // תקתוק טיימר
    tick(fast) { this.play(fast ? 800 : 600, 'sine', 0.05, 0.05); }
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
    btnRestart: $("btnRestart"),
    mainCard: $("screenGame"), // וודאי שה-ID תואם ל-HTML
    wheel: $("wheel")
};

const PRESET_FAMILIES = ["מאמי שמחה", "דוד וחני", "אהרון ונחמה", "דוד ודבורה", "בנימין וחיה", "ישראל ויעל", "ברוך ואודליה", "מענדל ודבורי", "שלום בער ודבורה לאה", "אליהו ודבורה לאה"];
const ITEMS = ["כיסא", "שולחן", "ארון", "מגירה", "מדף", "מפתח", "שעון", "כוס", "צלחת", "סיר", "קומקום", "מגבת", "שמיכה", "ספר", "עט", "תיק", "טלפון", "מטריה", "תמונה", "מראה", "נעל", "כובע", "וילון", "בקבוק"];

const ROUNDS = [
    { prompt: (i) => `ספרו סיפור מצחיק שקרה עם <strong>פאפי חי</strong> ו-<strong>${i}</strong>.` },
    { prompt: (i) => `איזו תכונה טובה של <strong>פאפי</strong> מזכיר לכם החפץ <strong>${i}</strong>?` },
    { prompt: (i) => `מה <strong>פאפי</strong> היה לומד מ-<strong>${i}</strong>?` }
];

let state = { families: [], pool: [], roundIndex: 0, remaining: 60, running: false, intervalId: null, locked: false, currentFam: null, mode: 'normal', globalCooldown: 0, currentRotation: 0 };

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
            e.stopPropagation(); f.score++; AudioFX.correct(); renderScores();
        };
        d.querySelector(".score-minus").onclick = (e) => {
            e.stopPropagation(); f.score = Math.max(0, f.score - 1); renderScores();
        };
        els.scores.appendChild(d);
    });
}

function startTimer(duration = 60) {
    if (state.intervalId) clearInterval(state.intervalId);
    state.remaining = duration;
    state.running = true;

    const updateUI = () => {
        els.timer.textContent = state.remaining;
        els.barFill.style.width = `${(state.remaining / duration) * 100}%`;

        if (state.remaining <= 10) {
            els.timer.classList.add("low-time");
            els.barFill.classList.add("danger");
            document.body.classList.add("screen-danger");
        } else {
            els.timer.classList.remove("low-time");
            els.barFill.classList.remove("danger");
            document.body.classList.remove("screen-danger");
        }
    };

    updateUI();
    state.intervalId = setInterval(() => {
        state.remaining--;
        updateUI();

        if (state.remaining <= 10 && state.remaining > 0) {
            AudioFX.tick(true);
        }

        if (state.remaining <= 0) {
            clearInterval(state.intervalId);
            document.body.classList.remove("screen-danger");
            if (typeof AudioFX.timeout === "function") AudioFX.timeout();
            onTimeout();
        }
    }, 1000);
}

function onTimeout() {
    state.running = false;
    if (state.mode === 'normal') {
        state.mode = 'frenzy';
        els.mainCard.classList.add("frenzy");
        els.rouletteName.textContent = "גניבה לכולם! ⚡";
        els.btnCorrect.disabled = true;
        AudioFX.frenzyAlert();
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

async function showEndScreen() {
    els.screenGame.classList.add("hidden");
    els.screenEnd.classList.remove("hidden");
    document.body.classList.remove("screen-danger");

    const sorted = [...state.families].sort((a, b) => b.score - a.score);

    // ניקוי הפודיום לפני שמתחילים
    ["p1", "p2", "p3"].forEach(id => {
        $(id + "-name").textContent = "";
        $(id + "-score").textContent = "";
        document.querySelector(`.place-${id.slice(1)}`).style.opacity = "0";
    });

    const reveal = (index, placeId, delay) => {
        return new Promise(resolve => {
            setTimeout(() => {
                const nameEl = $(placeId + "-name");
                const scoreEl = $(placeId + "-score");
                const parent = document.querySelector(`.place-${placeId.slice(1)}`);

                if (sorted[index] && nameEl) {
                    nameEl.textContent = sorted[index].name;
                    scoreEl.textContent = sorted[index].score;
                    parent.style.opacity = "1";
                    parent.classList.add("grow-anim"); // הפעלת האנימציה
                    AudioFX.tick(); // צליל קטן לכל חשיפה
                }
                resolve();
            }, delay);
        });
    };

    // חשיפה לפי הסדר: מקום 3, אז 2, ובסוף המנצח!
    await reveal(2, "p3", 1000);
    await reveal(1, "p2", 1500);

    // רגע לפני המקום הראשון - שקט קטן למתח
    setTimeout(async () => {
        await reveal(0, "p1", 500);
        AudioFX.celebrate(); // כאן יופעלו הכפיים והקונפטי
    }, 1000);
}

els.btnSpin.addEventListener("click", () => {
    AudioFX.init();
    if (state.locked || state.pool.length === 0) return;

    // צליל תקתוק גלגל
    let spinTicks = setInterval(() => {
        AudioFX.spinClick();
    }, 150);
    setTimeout(() => {
        clearInterval(spinTicks);
        AudioFX.suspense(); // צליל מתח רגע לפני העצירה
    }, 3500);

    state.locked = true;
    els.btnSpin.disabled = true;

    state.globalCooldown++;
    let isGlobal = (Math.random() < 0.3) || (state.globalCooldown >= 5);

    state.currentRotation += (1800 + Math.floor(Math.random() * 360));
    els.wheel.style.transform = `rotate(${state.currentRotation}deg)`;

    let c = 0;
    const inv = setInterval(() => {
        els.rouletteName.textContent = isGlobal && c > 25 ? "????" : state.families[Math.floor(Math.random() * state.families.length)].name;
        if (++c > 35) {
            clearInterval(inv);
        }
    }, 100);

    setTimeout(() => {
        if (isGlobal) {
            state.globalCooldown = 0;
            state.mode = 'frenzy';
            els.mainCard.classList.add("frenzy");
            els.rouletteName.textContent = "משימה לכולם! ⚡";
            AudioFX.frenzyAlert();
            toast("בונוס לכולם!");
            const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
            els.currentItem.textContent = item;
            els.taskText.innerHTML = ROUNDS[state.roundIndex].prompt(item);
            els.btnCorrect.disabled = true;
            startTimer(30);
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
                startTimer(60);
            }, 500);
        }
    }, 4000);
});

els.btnCorrect.addEventListener("click", () => {
    if (!state.running || state.mode !== 'normal') return;
    clearInterval(state.intervalId);
    state.running = false;
    AudioFX.correct();

    const isFast = state.remaining > 45;
    if (isFast) AudioFX.celebrate();

    state.currentFam.score += (isFast ? 2 : 1);
    toast(isFast ? "בונוס מהירות! +2" : "כל הכבוד! +1");
    renderScores();
    setTimeout(() => nextTurn(), 1200);
});

els.btnRestart.addEventListener("click", () => {
    location.reload();
});

// אתחול
state.families = PRESET_FAMILIES.map(n => ({ name: n, score: 0 }));
state.pool = [...state.families];
renderScores();

document.getElementById("debugWin").onclick = () => {
    const scorePills = document.querySelectorAll('.scorePill');
    scorePills.forEach(pill => {
        const name = pill.querySelector('span').textContent;
        const scoreValue = parseInt(pill.querySelector('.score-number').textContent);
        const family = state.families.find(f => f.name === name);
        if (family) family.score = scoreValue;
    });
    showEndScreen();
};