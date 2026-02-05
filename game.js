let state = {
    families: [],
    pool: [],
    roundIndex: 0,
    remaining: 60,
    running: false,
    intervalId: null,
    locked: false,
    currentFam: null,
    mode: 'normal',
    globalCooldown: 0,
    currentRotation: 0
};

function startTimer(duration = 60) {
    if (state.intervalId) clearInterval(state.intervalId);
    state.remaining = duration;
    state.running = true;

    const updateUI = () => {
        els.timer.textContent = state.remaining;
        els.barFill.style.width = `${(state.remaining / duration) * 100}%`;
        const isLow = state.remaining <= 10;
        els.timer.classList.toggle("low-time", isLow);
        els.barFill.classList.toggle("danger", isLow);
        document.body.classList.toggle("screen-danger", isLow);
    };

    updateUI();
    state.intervalId = setInterval(() => {
        state.remaining--;
        updateUI();
        if (state.remaining <= 10 && state.remaining > 0) AudioFX.tick(true);
        if (state.remaining <= 0) {
            clearInterval(state.intervalId);
            document.body.classList.remove("screen-danger");
            AudioFX.timeout();
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
    state.roundIndex >= ROUNDS.length ? showEndScreen() : resetTurnUI();
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

// אירועים (Events)
els.btnSpin.addEventListener("click", () => {
    AudioFX.init();
    if (state.locked) return;
    state.locked = true;
    els.btnSpin.disabled = true;

    // תקתוקי הגלגל בזמן הסיבוב
    let spinTicks = setInterval(() => AudioFX.spinClick(), 150);

    setTimeout(() => {
        clearInterval(spinTicks);
        // AudioFX.suspense(); <-- מחקתי את השורה הזו כדי שלא יהיה צליל לפני העצירה
    }, 3500);

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
        const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        els.currentItem.textContent = item;
        els.taskText.innerHTML = ROUNDS[state.roundIndex].prompt(item);

        if (isGlobal) {
            state.globalCooldown = 0;
            state.mode = 'frenzy';
            els.mainCard.classList.add("frenzy");
            els.rouletteName.textContent = "משימה לכולם! ⚡";
            AudioFX.frenzyAlert();
            toast("בונוס לכולם!");
            startTimer(30);
        } else {
            const idx = Math.floor(Math.random() * state.pool.length);
            const picked = state.pool.splice(idx, 1)[0];
            state.currentFam = state.families.find(f => f.name === picked.name);
            els.rouletteName.textContent = state.currentFam.name;
            els.btnCorrect.disabled = false;
            startTimer(60);
        }
    }, 4000);
});

els.btnCorrect.addEventListener("click", () => {
    if (!state.running || state.mode !== 'normal') return;
    clearInterval(state.intervalId);
    state.running = false;
    AudioFX.correct();
    const isFast = state.remaining > 45;
    state.currentFam.score += (isFast ? 2 : 1);
    toast(isFast ? "בונוס מהירות! +2" : "כל הכבוד! +1");
    renderScores();
    setTimeout(() => nextTurn(), 1200);
});

els.btnRestart.addEventListener("click", () => location.reload());

// אתחול המשחק
state.families = PRESET_FAMILIES.map(n => ({ name: n, score: 0 }));
state.pool = [...state.families];
renderScores();

// כפתור דיבוג לניצחון מיידי    

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