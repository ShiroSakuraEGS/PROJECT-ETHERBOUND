/**
 * 音效合成管理器 (SoundEffects)
 * 透過 Web Audio API 程序化合成劍擊、破空、彈刀、受擊與以太魔法劍氣音效
 */
export class SoundEffects {
  private ctx: AudioContext | null = null;

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 播放劍刃破空聲 (Whoosh)
   */
  public playWhoosh(isHeavy: boolean = false) {
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isHeavy ? 350 : 600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(isHeavy ? 150 : 250, this.ctx.currentTime + 0.22);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  /**
   * 播放以太劍氣波施法音效 (Ether Wave Magic Slash)
   */
  public playEtherWave() {
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.4);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(t + 0.46);
  }

  /**
   * 播放劍擊斬切命中聲 (Slash Impact)
   */
  public playHitImpact() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);

    const metal = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metal.type = 'sawtooth';
    metal.frequency.setValueAtTime(800, this.ctx.currentTime);
    metal.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.12);

    metalGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    metalGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    metal.connect(metalGain);
    metalGain.connect(this.ctx.destination);
    metal.start();
    metal.stop(this.ctx.currentTime + 0.13);
  }

  /**
   * 播放完美格擋彈刀聲 (Perfect Parry)
   */
  public playParry() {
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [1200, 1850, 2400];

    freqs.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(t + 0.65);
    });
  }

  /**
   * 播放普通防禦格擋聲 (Block)
   */
  public playBlock() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.11);
  }
}
