const $ = (id) => document.getElementById(id);

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
    mainCard: $("screenGame"),
    wheel: $("wheel")
};

function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    setTimeout(() => els.toast.classList.remove("show"), 2000);
}

function renderScores() {
    els.scores.innerHTML = "";
    const maxScore = Math.max(...state.families.map(f => f.score));
    state.families.forEach(f => {
        const d = document.createElement("div");
        const isLeader = f.score === maxScore && maxScore > 0;
        d.className = `scorePill ${isLeader ? 'leader' : ''}`;
        d.innerHTML = `<span>${f.name}</span><div class="score-controls"><div class="score-minus">−</div><div class="score-number">${f.score}</div></div>`;

        d.querySelector(".score-number").onclick = () => {
            f.score++;
            AudioFX.correct();
            renderScores();
            if (state.mode === 'frenzy' && state.running) {
                clearInterval(state.intervalId);
                state.running = false;
                toast("נקודה נחטפה!");
                setTimeout(() => nextTurn(), 1200);
            }
        };
        d.querySelector(".score-minus").onclick = () => {
            f.score = Math.max(0, f.score - 1);
            renderScores();
        };
        els.scores.appendChild(d);
    });
}

async function showEndScreen() {
    els.screenGame.classList.add("hidden");
    els.screenEnd.classList.remove("hidden");
    const sorted = [...state.families].sort((a, b) => b.score - a.score);

    const reveal = (index, placeId, delay) => {
        return new Promise(resolve => {
            setTimeout(() => {
                const parent = document.querySelector(`.place-${placeId.slice(1)}`);
                if (sorted[index]) {
                    $(placeId + "-name").textContent = sorted[index].name;
                    $(placeId + "-score").textContent = sorted[index].score;
                    parent.classList.add("grow-anim");
                    // AudioFX.tick(); <-- השורה הזו נמחקה כדי שלא יהיה תקתוק
                }
                resolve();
            }, delay);
        });
    };

    // חשיפה מדורגת
    await reveal(2, "p3", 800);  // מקום 3
    await reveal(1, "p2", 1500); // מקום 2
    await reveal(0, "p1", 2000); // מקום 1

    // רק כאן יתחילו מחיאות הכפיים (בלי שום צליל לפני)
    setTimeout(() => AudioFX.celebrate(), 500);
}