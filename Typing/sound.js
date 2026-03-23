/**
 * sound.js - サウンドエフェクト管理
 *
 * Web Audio APIを使ってタイピング音を生成する（外部ファイル不要）
 * 音の種類: click / mechanical / soft / pop / piano / retro / off
 */

const SOUND_TYPES = [
  { id: "click",      label: "クリック",    icon: "🖱️"  },
  { id: "mechanical", label: "メカニカル",  icon: "⌨️"  },
  { id: "soft",       label: "ソフト",      icon: "🔉"  },
  { id: "pop",        label: "ポップ",      icon: "💧"  },
  { id: "piano",      label: "ピアノ",      icon: "🎹"  },
  { id: "retro",      label: "レトロ",      icon: "🕹️"  },
  { id: "off",        label: "消音",        icon: "🔕"  },
];

class SoundManager {
  constructor() {
    this.soundType = localStorage.getItem("typing-sound-type") || "click";
    this.enabled   = this.soundType !== "off";
    this.audioCtx  = null;
  }

  _getContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioCtx;
  }

  /** 音の種類を設定して localStorage に保存 */
  setType(type) {
    this.soundType = type;
    this.enabled   = type !== "off";
    localStorage.setItem("typing-sound-type", type);
  }

  /** 順番に次の音種類へ切り替え（タイピング中ボタン用） */
  cycleType() {
    const idx  = SOUND_TYPES.findIndex(t => t.id === this.soundType);
    const next = SOUND_TYPES[(idx + 1) % SOUND_TYPES.length];
    this.setType(next.id);
    return next;
  }

  /** 後方互換: トグル（消音⇔前回の種類） */
  toggle() {
    if (this.enabled) {
      this.setType("off");
    } else {
      const prev = localStorage.getItem("typing-sound-type-prev") || "click";
      this.setType(prev);
    }
    return this.enabled;
  }

  // ── 正解音 ──────────────────────────────
  playCorrect() {
    if (!this.enabled) return;
    switch (this.soundType) {
      case "click":      this._clickCorrect();      break;
      case "mechanical": this._mechanicalCorrect(); break;
      case "soft":       this._softCorrect();       break;
      case "pop":        this._popCorrect();        break;
      case "piano":      this._pianoCorrect();      break;
      case "retro":      this._retroCorrect();      break;
    }
  }

  // ── ミス音 ──────────────────────────────
  playMiss() {
    if (!this.enabled) return;
    switch (this.soundType) {
      case "click":      this._clickMiss();      break;
      case "mechanical": this._mechanicalMiss(); break;
      case "soft":       this._softMiss();       break;
      case "pop":        this._popMiss();        break;
      case "piano":      this._pianoMiss();      break;
      case "retro":      this._retroMiss();      break;
    }
  }

  // ── 完了音（共通） ──────────────────────────────
  playComplete() {
    if (!this.enabled) return;
    const ctx    = this._getContext();
    const freqs  = this.soundType === "retro"
      ? [523, 659, 784]  // C5 E5 G5
      : [523, 659, 784];
    const waveType = (this.soundType === "retro") ? "square" : "sine";

    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = waveType;
      const t = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // ════════════════════════════════════════
  // クリック
  // ════════════════════════════════════════
  _clickCorrect() {
    const ctx = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
  }
  _clickMiss() {
    const ctx = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  }

  // ════════════════════════════════════════
  // メカニカルキーボード（ノイズバースト＋低音クリック）
  // ════════════════════════════════════════
  _noise(duration, filterFreq, gainLevel) {
    const ctx    = this._getContext();
    const sr     = ctx.sampleRate;
    const frames = Math.ceil(sr * duration);
    const buf    = ctx.createBuffer(1, frames, sr);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const hpf    = ctx.createBiquadFilter();
    hpf.type     = "highpass";
    hpf.frequency.value = filterFreq;
    const gain   = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(hpf); hpf.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + duration);
  }
  _mechanicalCorrect() {
    this._noise(0.03, 3000, 0.25);
    // 低音クリック感
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.04);
  }
  _mechanicalMiss() {
    this._noise(0.05, 800, 0.2);
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  }

  // ════════════════════════════════════════
  // ソフト（やさしい低めの音）
  // ════════════════════════════════════════
  _softCorrect() {
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  }
  _softMiss() {
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  }

  // ════════════════════════════════════════
  // ポップ（周波数スイープで泡がはじける感じ）
  // ════════════════════════════════════════
  _popCorrect() {
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.07);
  }
  _popMiss() {
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  }

  // ════════════════════════════════════════
  // ピアノ（倍音付きの鍵盤音）
  // ════════════════════════════════════════
  _pianoNote(freq, duration) {
    const ctx  = this._getContext();
    [1, 2, 3].forEach((harmonic, idx) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq * harmonic, ctx.currentTime);
      const vol = 0.14 / harmonic;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration);
    });
  }
  _pianoCorrect() { this._pianoNote(880, 0.25); }
  _pianoMiss()    { this._pianoNote(220, 0.3);  }

  // ════════════════════════════════════════
  // レトロ（8bit チップチューン風）
  // ════════════════════════════════════════
  _retroCorrect() {
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(523, ctx.currentTime);          // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.04);   // E5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }
  _retroMiss() {
    const ctx  = this._getContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.setValueAtTime(120, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  }
}
