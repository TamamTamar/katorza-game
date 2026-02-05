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
        const now = this.ctx.currentTime;
        this.init();

        const playTone = (freq, startOffset, duration, type = 'triangle') => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + startOffset);

            // ווליום שמתחיל חזק ודועך
            gain.gain.setValueAtTime(0.2, now + startOffset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + startOffset + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + startOffset);
            osc.stop(now + startOffset + duration);
        };

        // סדרה מהירה של תווים שעולים גבוה (אפקט נצנוץ)
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            playTone(freq, i * 0.06, 0.3, 'triangle');
        });

        // תו אחד ארוך וגבוה בסוף שנותן את ה"פיניש"
        playTone(1567.98, 0.3, 0.6, 'sine');
        // תו נמוך ועמוק שנותן "גוף" לצליל ההצלחה
        playTone(130.81, 0, 0.5, 'triangle');
    },

    // צליל "אווווו" של אכזבה (תדר יורד בהדרגה)
    timeout() {
        const now = this.ctx.currentTime;
        const duration = 0.8; // משך הצליל

        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // שימוש בגל 'triangle' נותן תחושה אנושית ורכה יותר מ-'sawtooth'
        osc.type = 'triangle';

        // התחלה בתדר בינוני (למשל 300Hz) וירידה חלקה לתדר נמוך (150Hz)
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + duration);

        // ווליום שמתחיל חזק ודועך לאט
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + duration);
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