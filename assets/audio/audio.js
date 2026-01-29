/**
 * NISHA GO! - Audio System
 * Simple sound effects using Web Audio API
 */

const Audio = {
  ctx: null,
  enabled: true,
  volume: 0.3,

  init() {
    // Create audio context on first user interaction
    const initContext = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio initialized');
      }
      document.removeEventListener('click', initContext);
      document.removeEventListener('keydown', initContext);
    };

    document.addEventListener('click', initContext);
    document.addEventListener('keydown', initContext);
  },

  // Play a tone with given frequency and duration
  playTone(freq, duration = 0.1, type = 'square', volumeMult = 1) {
    if (!this.ctx || !this.enabled) return;

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(this.volume * volumeMult, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    oscillator.start(this.ctx.currentTime);
    oscillator.stop(this.ctx.currentTime + duration);
  },

  // Sound effects
  collect() {
    // Ascending arpeggio for pickup
    this.playTone(440, 0.08, 'square', 0.5);
    setTimeout(() => this.playTone(554, 0.08, 'square', 0.5), 50);
    setTimeout(() => this.playTone(659, 0.12, 'square', 0.5), 100);
  },

  move() {
    // Quick blip for lane change
    this.playTone(220, 0.05, 'square', 0.3);
  },

  hit() {
    // Harsh noise burst for collision
    if (!this.ctx || !this.enabled) return;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noise = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();

    noise.buffer = buffer;
    noise.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    gainNode.gain.setValueAtTime(this.volume * 0.8, this.ctx.currentTime);

    noise.start();
  },

  gameOver() {
    // Descending tones
    this.playTone(440, 0.15, 'square', 0.6);
    setTimeout(() => this.playTone(349, 0.15, 'square', 0.6), 150);
    setTimeout(() => this.playTone(294, 0.2, 'square', 0.6), 300);
    setTimeout(() => this.playTone(220, 0.4, 'sawtooth', 0.4), 500);
  },

  start() {
    // Quick ascending tone
    this.playTone(330, 0.1, 'square', 0.4);
    setTimeout(() => this.playTone(440, 0.1, 'square', 0.4), 80);
    setTimeout(() => this.playTone(550, 0.15, 'square', 0.4), 160);
  },

  momentumLow() {
    // Warning beep
    this.playTone(180, 0.1, 'sawtooth', 0.4);
  },

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
};

// Auto-init
Audio.init();
