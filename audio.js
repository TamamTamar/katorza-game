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

    spinClick() { this.play(400, 'sine', 0.05, 0.02); },
    suspense() { this.play(200, 'triangle', 0.5, 0.05); },

    correct() {
        this.play(523.25, 'triangle', 0.2, 0.1);
        setTimeout(() => this.play(659.25, 'triangle', 0.2, 0.1), 100);
        setTimeout(() => this.play(783.99, 'triangle', 0.4, 0.1), 200);
    },

    timeout() {
        this.play(300, 'sawtooth', 0.2, 0.1);
        setTimeout(() => this.play(200, 'sawtooth', 0.2, 0.1), 200);
        setTimeout(() => this.play(150, 'sawtooth', 0.6, 0.1), 400);
    },

    frenzyAlert() {
        let count = 0;
        let alarm = setInterval(() => {
            this.play(count % 2 === 0 ? 800 : 1000, 'square', 0.1, 0.03);
            if (++count > 6) clearInterval(alarm);
        }, 150);
    },

    // חגיגת ניצחון - רק מחיאות כפיים וקונפטי (בלי מנגינה)
    celebrate() {
        // מפעיל מחיאות כפיים ל-5 שניות
        this.applause(5000);
        // יריית קונפטי חגיגית
        confetti({ particleCount: 300, spread: 120, origin: { y: 0.4 } });
    },

    applause(duration) {
        this.init();
        const bufferSize = this.ctx.sampleRate * (duration / 1000);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime); // ווליום מעט חזק יותר
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (duration / 1000));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    },

    tick(fast) { this.play(fast ? 800 : 600, 'sine', 0.05, 0.05); }
};