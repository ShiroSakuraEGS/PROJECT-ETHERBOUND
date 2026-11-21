/**
 * 音效合成管理器 (SoundEffects)
 * 透過 Web Audio API 程序化合成劍擊、破空、彈刀與受擊音效
 * 無需任何外部音檔資產，確保在任何網頁環境皆能零延遲播放
 */
export class SoundEffects {
  private ctx: AudioContext | null = null;

  constructor() {
    // 延遲至玩家點擊畫面後初始化 AudioContext (符合瀏覽器自動播放政策)
  }

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
   * @param isHeavy 是否為重斬 (更低沉呼嘯)
   */
  public playWhoosh(isHeavy: boolean = false) {
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // 白噪音
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
   * 播放劍擊斬切命中聲 (Slash Impact)
   */
  public playHitImpact() {
    this.initCtx();
    if (!this.ctx) return;

    // 衝擊低音
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

    // 金屬刮擦高頻
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
   * 播放完美格擋彈刀聲 (Perfect Parry - 清脆的高頻金屬共鳴)
   */
  public playParry() {
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [1200, 1850, 2400]; // 雙金屬泛音

    freqs.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6); // 長餘音

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

  /**
   * 播放敵人蓄力攻擊預警音 (Telegraph Windup)
   */
  public playTelegraph() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }
}
