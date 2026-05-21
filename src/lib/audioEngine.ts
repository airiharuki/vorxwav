import JSZip from 'jszip';

export type DrumType = 'kick' | 'snare' | 'hihat' | 'crash' | 'clap' | 'snap' | 'ride';

export type BassStyle = 'wobble' | 'reese' | 'growl';

export interface BassParams {
  style: BassStyle;
  sf: number;
  mf: number;
  fc: number;
  fq: number;
  lr: number;
  ld: number;
  dist: number;
  vol: number;
  dur: number;
  dt: number;
}

export interface DrumEvent {
  beat: number;
  type: DrumType;
}

export interface Chord {
  name: string;
  notes: number[];
}

export const CHORD_PRESETS: { name: string; chords: { name: string; notes: number[] }[] }[] = [
  {
    name: "Nebula Drift",
    chords: [
      { name: "Em9", notes: [40, 52, 55, 59, 62, 66] },
      { name: "Cmaj9", notes: [36, 48, 52, 55, 59, 62] },
      { name: "Gmaj9", notes: [43, 55, 59, 62, 66, 69] },
      { name: "D6/9", notes: [38, 50, 54, 57, 59, 64] },
      { name: "Am9", notes: [45, 57, 60, 64, 67, 71] },
      { name: "Fmaj9", notes: [41, 53, 57, 60, 64, 67] },
      { name: "Cmaj9", notes: [36, 48, 52, 55, 59, 62] },
      { name: "B7alt", notes: [35, 47, 51, 54, 57, 60] }
    ]
  },
  {
    name: "Cyberpunk Sadness",
    chords: [
      { name: "Am9", notes: [45, 57, 60, 64, 67, 71] },
      { name: "G6/9", notes: [43, 55, 59, 62, 64, 69] },
      { name: "Fmaj9", notes: [41, 53, 57, 60, 64, 67] },
      { name: "E7sus4", notes: [40, 52, 57, 59, 62, 68] },
      { name: "Fmaj9", notes: [41, 53, 57, 60, 64, 67] },
      { name: "G11", notes: [43, 55, 60, 62, 65, 71] },
      { name: "Am9", notes: [45, 57, 60, 64, 67, 71] },
      { name: "E7(#9)", notes: [40, 52, 56, 62, 67] }
    ]
  },
  {
    name: "Synthwave Skyline",
    chords: [
      { name: "F#m11", notes: [42, 54, 57, 61, 64, 71] },
      { name: "Dmaj9", notes: [38, 50, 54, 57, 61, 64] },
      { name: "Amaj9", notes: [45, 57, 61, 64, 68, 71] },
      { name: "E6/9", notes: [40, 52, 56, 59, 61, 66] },
      { name: "Bm9", notes: [47, 59, 62, 66, 69, 73] },
      { name: "Gmaj9", notes: [43, 55, 59, 62, 66, 69] },
      { name: "Dmaj9", notes: [38, 50, 54, 57, 61, 64] },
      { name: "C#7alt", notes: [37, 49, 53, 59, 62] }
    ]
  }
];

export type BassPattern = BassParams | null;

export const BAR_NAMES = [
  'DROP 1', 'GROOVE', 'GROOVE', 'FILL', 
  'GROOVE', 'GROOVE', 'GROOVE', 'BUILD', 
  'DROP 2', 'GROOVE', 'FILL', 'GROOVE', 
  'GROOVE', 'BREAK', 'OUTRO', 'SUSTAIN'
];

export class DubstepEngine {
  public audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public masterGain: GainNode | null = null;
  public compressor: DynamicsCompressorNode | null = null;

  public isPlaying = false;
  
  public useSamples = false;
  public loadingSamples = false;
  public loadedSamples: Record<DrumType, AudioBuffer[]> = {
    kick: [],
    snare: [],
    hihat: [],
    crash: [],
    clap: [],
    snap: [],
    ride: []
  };
  public loadError: string | null = null;
  public loadedSamplesCount = 0;
  
  public swingAmount = 0; // 0 to 0.6
  
  public wobbleRatio = 0.5; // 0 to 1
  public bitcrushRatio = 0.5; // 0 to 1
  public subDepthRatio = 0.5; // 0 to 1
  public resonanceRatio = 0.5; // 0 to 1
  
  private nextNoteTime = 0;
  private currentBar = 0;
  private timerID: number | null = null;
  
  public bassPatterns: (BassParams | null)[] = [];
  public drumArrangement: DrumEvent[][] = [];
  
  // Custom Chord Generator properties
  public chordStyle: 'off' | 'rhodes' | 'twinkle' | 'pluck' = 'rhodes';
  public chordVolume = 0.4;
  public chordProgression: Chord[] = [];
  public chordProgressionPathName = "Nebula Drift";
  public ambientOnly = false;
  public ambientSubActive = false;
  
  // Custom ADSR and Chord length scaling values
  public adsrEnabled = false;
  public chordLengthMult = 1.0; // 0.2 to 4.0
  public chordAttack = 0.15; // 0.005s to 3.0s
  public chordDecay = 0.6; // 0.01s to 3.0s
  public chordSustain = 0.4; // 0.0 to 1.0
  public chordRelease = 1.5; // 0.01s to 5s
  
  public bpm = 140;
  public masterVolume = 0.75;

  public get beatDur(): number {
    return 60 / this.bpm;
  }

  public get barDur(): number {
    return (60 / this.bpm) * 4;
  }

  public setBpm(val: number) {
    this.bpm = val;
  }

  public setMasterVolume(val: number) {
    this.masterVolume = val;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(val, this.audioCtx.currentTime);
    }
  }

  private readonly lookAhead = 25;
  private readonly scheduleAhead = 0.15;
  private noiseCache: Record<number, AudioBuffer> = {};

  private onTickCallback: (currentBar: number) => void = () => {};

  constructor() {
    // Set up a default ambient chord progression
    const selectedPreset = CHORD_PRESETS[0];
    this.chordProgressionPathName = selectedPreset.name;
    this.chordProgression = [];
    for (let i = 0; i < 16; i++) {
      const chordIdx = Math.floor(i / 2) % 8;
      this.chordProgression.push(selectedPreset.chords[chordIdx]);
    }
  }

  public onTick(cb: (currentBar: number) => void) {
    this.onTickCallback = cb;
  }

  public async init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.value = -18; 
      this.compressor.knee.value = 12; 
      this.compressor.ratio.value = 6;
      
      this.analyser = this.audioCtx.createAnalyser(); 
      this.analyser.fftSize = 2048;
      
      this.masterGain.connect(this.compressor); 
      this.compressor.connect(this.analyser); 
      this.analyser.connect(this.audioCtx.destination);
    }
    await this.ready();
  }

  public get isReady() {
    return this.audioCtx !== null;
  }

  private async ready() {
    if (!this.audioCtx) return false;
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume().catch(() => {});
    }
    return true;
  }

  private getNoise(sec: number) {
    if (!this.audioCtx) return null;
    const k = Math.floor(sec * 1000);
    if (!this.noiseCache[k]) {
      const len = Math.ceil(this.audioCtx.sampleRate * sec);
      const b = this.audioCtx.createBuffer(1, len, this.audioCtx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseCache[k] = b;
    }
    return this.noiseCache[k];
  }

  private applySwing(t: number): number {
    const sixteenthDur = this.beatDur / 4;
    const sixteenths = t / sixteenthDur;
    const wholeSixteenths = Math.round(sixteenths);
    
    // We only swing if we are on an odd 16th note (1, 3, 5...) relative to a quarter note grid
    if (wholeSixteenths % 2 === 1) {
        return t + (this.swingAmount * sixteenthDur * 0.5);
    }
    return t;
  }

  private drum(t: number, type: DrumType) {
    if (!this.audioCtx || !this.masterGain) return;
    const dest = this.masterGain;

    if (this.useSamples && this.loadedSamples[type] && this.loadedSamples[type].length > 0) {
      try {
        const buffers = this.loadedSamples[type];
        const randomBuffer = buffers[Math.floor(Math.random() * buffers.length)];
        const source = this.audioCtx.createBufferSource();
        source.buffer = randomBuffer;
        
        const gainNode = this.audioCtx.createGain();
        let sampleVol = 0.6;
        if (type === 'hihat') sampleVol = 0.25;
        if (type === 'snap') sampleVol = 0.4;
        if (type === 'crash' || type === 'ride') sampleVol = 0.35;
        gainNode.gain.setValueAtTime(sampleVol, t);
        
        source.connect(gainNode);
        gainNode.connect(dest);
        source.start(t);
        return;
      } catch (err) {
        console.warn("Failed to play loaded sample, falling back to synth", err);
      }
    }

    if (type === 'kick') {
      const o = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      o.frequency.setValueAtTime(150, t); 
      o.frequency.exponentialRampToValueAtTime(35, t + 0.15);
      g.gain.setValueAtTime(1, t); 
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); 
      g.connect(dest); 
      o.start(t); 
      o.stop(t + 0.4);
    } else if (type === 'snare') {
      const o = this.audioCtx.createOscillator();
      const g1 = this.audioCtx.createGain();
      o.type = 'triangle'; 
      o.frequency.setValueAtTime(220, t); 
      o.frequency.exponentialRampToValueAtTime(110, t + 0.06);
      g1.gain.setValueAtTime(0.5, t); 
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g1); 
      g1.connect(dest); 
      o.start(t); 
      o.stop(t + 0.15);
      
      const noiseBuffer = this.getNoise(0.12);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g2 = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'bandpass'; 
        f.frequency.value = 3500; 
        f.Q.value = 1.2;
        g2.gain.setValueAtTime(0.6, t); 
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        s.connect(f); 
        f.connect(g2); 
        g2.connect(dest); 
        s.start(t); 
        s.stop(t + 0.2);
      }
    } else if (type === 'hihat') {
      const noiseBuffer = this.getNoise(0.06);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'highpass'; 
        f.frequency.value = 9000;
        g.gain.setValueAtTime(0.25, t); 
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        s.connect(f); 
        f.connect(g); 
        g.connect(dest); 
        s.start(t); 
        s.stop(t + 0.08);
      }
    } else if (type === 'crash') {
      const noiseBuffer = this.getNoise(1.5);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'bandpass'; 
        f.frequency.value = 4000; 
        f.Q.value = 0.8;
        g.gain.setValueAtTime(0.4, t); 
        g.gain.setValueAtTime(0.4, t + 0.1); 
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        s.connect(f); 
        f.connect(g); 
        g.connect(dest); 
        s.start(t); 
        s.stop(t + 1.3);
      }
    } else if (type === 'clap') {
      const noiseBuffer = this.getNoise(0.3);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'bandpass'; 
        f.frequency.value = 1500; 
        f.Q.value = 1.0;
        g.gain.setValueAtTime(0, t); 
        g.gain.linearRampToValueAtTime(0.6, t + 0.01);
        g.gain.linearRampToValueAtTime(0.1, t + 0.02);
        g.gain.linearRampToValueAtTime(0.5, t + 0.03);
        g.gain.linearRampToValueAtTime(0.1, t + 0.04);
        g.gain.linearRampToValueAtTime(0.8, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        s.connect(f); 
        f.connect(g); 
        g.connect(dest); 
        s.start(t); 
        s.stop(t + 0.35);
      }
    } else if (type === 'snap') {
      const noiseBuffer = this.getNoise(0.1);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'highpass'; 
        f.frequency.value = 4000;
        g.gain.setValueAtTime(0.8, t); 
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        const osc = this.audioCtx.createOscillator();
        const oscG = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(2500, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.02);
        oscG.gain.setValueAtTime(0.3, t);
        oscG.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        osc.connect(oscG); oscG.connect(dest);
        osc.start(t); osc.stop(t + 0.03);
        s.connect(f); f.connect(g); g.connect(dest); 
        s.start(t); s.stop(t + 0.1);
      }
    } else if (type === 'ride') {
      const noiseBuffer = this.getNoise(1.5);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'highpass'; 
        f.frequency.value = 6000;
        g.gain.setValueAtTime(0.3, t); 
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        const osc = this.audioCtx.createOscillator();
        const oscG = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = 450;
        oscG.gain.setValueAtTime(0.1, t);
        oscG.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(oscG); oscG.connect(dest);
        osc.start(t); osc.stop(t + 0.9);
        s.connect(f); f.connect(g); g.connect(dest); 
        s.start(t); s.stop(t + 1.3);
      }
    }
  }

  private playBass(t: number, dur: number, p: BassParams) {
    if (!this.audioCtx || !this.masterGain) return;
    const sub = this.audioCtx.createOscillator();
    sub.type = 'sine'; 
    sub.frequency.value = p.sf; 
    sub.detune.value = p.dt;

    const mid = this.audioCtx.createOscillator();
    mid.type = p.style === 'reese' ? 'sawtooth' : (p.style === 'growl' ? 'square' : 'sawtooth'); 
    mid.frequency.value = p.mf; 
    mid.detune.value = p.dt * 1.5;
    
    let mid2: OscillatorNode | null = null;
    if (p.style === 'reese') {
      mid2 = this.audioCtx.createOscillator();
      mid2.type = 'sawtooth';
      mid2.frequency.value = p.mf;
      // Ensure mid2.detune is set to a negative value relative to mid.detune to create a phasing effect
      mid2.detune.value = mid.detune.value - 24; 
    }

    const f = this.audioCtx.createBiquadFilter();
    f.type = p.style === 'growl' ? 'bandpass' : 'lowpass'; 
    f.frequency.value = p.fc; 
    
    // Resonance/Reverb Ratio: adjusts filter resonance for wet squelchy sweep
    const finalFq = (p.style === 'growl' ? p.fq * 2 : p.fq) * (this.resonanceRatio * 3.0);
    f.Q.value = finalFq;

    const lfo = this.audioCtx.createOscillator();
    const lg = this.audioCtx.createGain();
    
    // Wobble Ratio: controls modulating LFO speed
    const finalLr = Math.max(0.1, p.lr * (this.wobbleRatio * 2.0));
    
    if (p.style === 'wobble') {
      lfo.frequency.value = finalLr; 
      lg.gain.value = p.ld;
    } else if (p.style === 'growl') {
      lfo.frequency.setValueAtTime(finalLr * 2, t);
      lfo.frequency.exponentialRampToValueAtTime(0.5, t + dur);
      lg.gain.value = p.ld * 1.5;
    } else { // reese
      lfo.frequency.value = 0.5;
      lg.gain.value = p.fc * 0.5;
    }

    lfo.connect(lg); 
    lg.connect(f.frequency);
    
    const w = this.audioCtx.createWaveShaper();
    // Bitcrush Ratio: scales core distortion intensity
    const distFactor = this.bitcrushRatio * 2.5;
    const distAmount = (p.style === 'growl' ? p.dist * 150 : (p.style === 'reese' ? p.dist * 130 : p.dist * 100)) * distFactor;
    const k = distAmount;
    const n = 44100;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) { 
      const x = i * 2 / n - 1; 
      c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); 
    }
    w.curve = c; 
    w.oversample = '4x';
    
    const g = this.audioCtx.createGain();
    // Sub Depth Ratio: scales output gain of entire bass
    const subGainFactor = this.subDepthRatio * 2.0;
    const finalVol = (p.style === 'reese' ? p.vol * 1.35 : p.vol) * subGainFactor;
    g.gain.setValueAtTime(0, t); 
    g.gain.linearRampToValueAtTime(finalVol, t + 0.02); 
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    
    mid.connect(f); 
    if (mid2) { mid2.connect(f); }
    f.connect(w); 
    w.connect(g); 
    sub.connect(g); 
    g.connect(this.masterGain);
    
    const end = t + dur + 0.15; 
    sub.start(t); sub.stop(end); 
    mid.start(t); mid.stop(end); 
    if (mid2) { mid2.start(t); mid2.stop(end); }
    lfo.start(t); lfo.stop(end);
  }

  private playRhodesVoice(t: number, freq: number, dur: number, vol: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t);

    // Vibrato
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 4.8;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 2.0;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Modulator (FM chime body)
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 3.5, t);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(freq * 1.5, t);
    modGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);

    let endT = t + dur + 0.1;

    if (this.adsrEnabled) {
      const att = this.chordAttack;
      const dec = this.chordDecay;
      const sus = this.chordSustain;
      const rel = this.chordRelease;

      // Attack phase
      gainNode.gain.linearRampToValueAtTime(vol, t + att);
      // Decay phase to sustain level
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sus), t + att + dec);
      // Sustained level stays until gate finishes, then release phase
      const sustainEnd = t + Math.max(att + dec, dur);
      gainNode.gain.setValueAtTime(Math.max(0.0001, vol * sus), sustainEnd);
      // Release phase
      gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + rel);
      endT = sustainEnd + rel + 0.1;
    } else {
      gainNode.gain.linearRampToValueAtTime(vol, t + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);
    }

    carrier.connect(gainNode);
    gainNode.connect(this.masterGain);

    vibrato.start(t);
    modulator.start(t);
    carrier.start(t);

    vibrato.stop(endT);
    modulator.stop(endT);
    carrier.stop(endT);
  }

  private playTwinkleVoice(t: number, freq: number, dur: number, vol: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    let twinkleFreq = freq;
    while (twinkleFreq < 450) {
      twinkleFreq *= 2;
    }

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(twinkleFreq, t);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(twinkleFreq * 2.01, t);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.3);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0, t);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, t);

    let endT = t + 0.5;

    if (this.adsrEnabled) {
      const att = this.chordAttack;
      const dec = this.chordDecay;
      const sus = this.chordSustain;
      const rel = this.chordRelease;

      // Primary oscillator
      gain1.gain.linearRampToValueAtTime(vol, t + att);
      gain1.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sus), t + att + dec);
      const sustainEnd = t + Math.max(att + dec, dur);
      gain1.gain.setValueAtTime(Math.max(0.0001, vol * sus), sustainEnd);
      gain1.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + rel);

      // Secondary sparkle oscillator
      gain2.gain.linearRampToValueAtTime(vol * 0.3, t + att * 1.5);
      gain2.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.3 * sus), t + att + dec * 0.8);
      gain2.gain.setValueAtTime(Math.max(0.0001, vol * 0.3 * sus), sustainEnd);
      gain2.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + rel * 0.8);

      endT = sustainEnd + rel + 0.1;
    } else {
      gain1.gain.linearRampToValueAtTime(vol, t + 0.004);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      gain2.gain.linearRampToValueAtTime(vol * 0.3, t + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      endT = t + 0.5;
    }

    osc1.connect(gain1);
    osc2.connect(gain2);

    gain1.connect(filter);
    gain2.connect(filter);
    filter.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);

    osc1.stop(endT);
    osc2.stop(endT);
  }

  private playPluckVoice(t: number, freq: number, dur: number, vol: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, t);
    filter.frequency.exponentialRampToValueAtTime(2500, t + 0.05);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    filter.Q.value = 5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);

    let endT = t + dur + 0.1;

    if (this.adsrEnabled) {
      const att = this.chordAttack;
      const dec = this.chordDecay;
      const sus = this.chordSustain;
      const rel = this.chordRelease;

      // Slow sweeping filter sweep if attack is wide
      filter.frequency.setValueAtTime(50, t);
      filter.frequency.exponentialRampToValueAtTime(Math.min(2200, 300 + (3000 * (1.0 - Math.min(0.9, att * 0.25)))), t + Math.max(0.05, att * 0.8));
      filter.frequency.exponentialRampToValueAtTime(400, t + att + dec);

      g.gain.linearRampToValueAtTime(vol, t + att);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sus), t + att + dec);
      const sustainEnd = t + Math.max(att + dec, dur);
      g.gain.setValueAtTime(Math.max(0.0001, vol * sus), sustainEnd);
      g.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + rel);

      endT = sustainEnd + rel + 0.1;
    } else {
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(vol * 0.12, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    }

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);

    osc.start(t);
    osc.stop(endT);
  }

  private playAmbientSubVoice(t: number, midiNote: number, dur: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, t);

    // Subtle 2nd harmonic for small speaker audibility
    const satOsc = ctx.createOscillator();
    satOsc.type = 'triangle';
    satOsc.frequency.setValueAtTime(freq * 2, t);

    const subGain = ctx.createGain();
    const satGain = ctx.createGain();

    const vol = this.chordVolume * 0.45;

    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(vol, t + 0.1); // soft attack
    subGain.gain.exponentialRampToValueAtTime(vol * 0.8, t + dur * 0.5);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    satGain.gain.setValueAtTime(0, t);
    satGain.gain.linearRampToValueAtTime(vol * 0.15, t + 0.1);
    satGain.gain.exponentialRampToValueAtTime(vol * 0.1, t + dur * 0.5);
    satGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, t);

    subOsc.connect(subGain);
    satOsc.connect(satGain);

    subGain.connect(filter);
    satGain.connect(filter);
    filter.connect(this.masterGain);

    subOsc.start(t);
    satOsc.start(t);

    const endT = t + dur + 0.2;
    subOsc.stop(endT);
    satOsc.stop(endT);
  }

  private playChord(t: number, chord: Chord) {
    if (this.chordStyle === 'off') return;

    const style = this.chordStyle;
    const vol = this.chordVolume;
    const dur = this.barDur * 0.92 * this.chordLengthMult;

    // Play optional deep physical sub bass under chords
    if (this.ambientSubActive && chord.notes.length > 0) {
      const rootMidi = Math.min(...chord.notes);
      let subMidi = rootMidi;
      while (subMidi > 45) {
        subMidi -= 12;
      }
      while (subMidi < 28) {
        subMidi += 12;
      }
      this.playAmbientSubVoice(t, subMidi, dur);
    }

    chord.notes.forEach((midi, idx) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);

      if (style === 'rhodes') {
        const humanizedT = t + Math.random() * 0.015;
        this.playRhodesVoice(humanizedT, freq, dur, vol * 0.16);
      } else if (style === 'twinkle') {
        const staggeredT = t + idx * 0.06;
        this.playTwinkleVoice(staggeredT, freq, dur * 0.5, vol * 0.12);
      } else if (style === 'pluck') {
        const humanizedT = t + Math.random() * 0.008;
        this.playPluckVoice(humanizedT, freq, dur * 0.4, vol * 0.14);
      }
    });
  }

  private generateBassParams(style?: BassStyle): BassParams {
    const defaultStyles: BassStyle[] = ['wobble', 'reese', 'growl'];
    const chosenStyle = style || defaultStyles[Math.floor(Math.random() * defaultStyles.length)];
    return { 
      style: chosenStyle,
      sf: 40 + Math.random() * 20, 
      mf: 60 + Math.random() * 40, 
      fc: 300 + Math.random() * 1100, 
      fq: 3 + Math.random() * 10, 
      lr: 4 + Math.random() * 12, 
      ld: 250 + Math.random() * 850, 
      dist: 15 + Math.random() * 75, 
      vol: 0.45 + Math.random() * 0.45, 
      dur: 0.8 + Math.random() * 1.6, 
      dt: (Math.random() - 0.5) * 40 
    };
  }

  public generateLoop() {
    this.bassPatterns = []; 
    this.drumArrangement = [];
    
    const styles: BassStyle[] = ['wobble', 'reese', 'growl'];
    
    for (let i = 0; i < 16; i++) {
      const d: DrumEvent[] = [];
      const drop = i % 4 === 0;
      const fill = i % 4 === 3;
      const build = i === 7;
      const brk = i === 13;
      
      const selectedStyle = styles[Math.floor(Math.random() * styles.length)];
      this.bassPatterns.push(brk || Math.random() < 0.15 ? null : this.generateBassParams(selectedStyle));
      
      d.push({ beat: 0, type: 'kick' }, { beat: 2, type: 'snare' });
      
      if (drop && Math.random() < 0.5) {
        d.push({ beat: 2, type: 'clap' });
      }
      
      const hc = drop ? 16 : fill ? 12 : 8;
      for (let h = 0; h < hc; h++) {
        if (h % 2 || drop) {
          const cymbal = (drop && i % 2 === 1) ? 'ride' : 'hihat';
          d.push({ beat: (h / hc) * 4, type: cymbal });
        }
      }
      
      if (!drop && !build && !fill) {
        d.push({ beat: 1, type: 'snap' });
        d.push({ beat: 3, type: 'snap' });
      }
      
      if (drop) d.push({ beat: 0, type: 'crash' });
      
      if (build) {
        for (let r = 0; r < 8; r++) d.push({ beat: 3 + r * 0.12, type: 'snare' });
        const snareIdx = d.findIndex(x => x.beat === 2 && x.type === 'snare');
        if (snareIdx !== -1) d.splice(snareIdx, 1);
      }
      
      if (fill) {
        for (let f = 0; f < 6; f++) d.push({ beat: 3 + f * 0.15, type: 'snare' });
      }
      
      if (brk) { 
        d.length = 0; 
        d.push({ beat: 0, type: 'hihat' }, { beat: 2, type: 'crash' }); 
      }
      
      this.drumArrangement.push(d);
    }

    // Generate Chord progression
    const selectedPreset = CHORD_PRESETS[Math.floor(Math.random() * CHORD_PRESETS.length)];
    this.chordProgressionPathName = selectedPreset.name;
    this.chordProgression = [];
    for (let i = 0; i < 16; i++) {
      const chordIdx = Math.floor(i / 2) % 8;
      this.chordProgression.push(selectedPreset.chords[chordIdx]);
    }
  }

  private tick = () => {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAhead) {
      const p = this.bassPatterns[this.currentBar];
      if (p && !this.ambientOnly) {
        this.playBass(this.nextNoteTime, p.dur, p);
      }
      
      if (!this.ambientOnly) {
        const drums = this.drumArrangement[this.currentBar] || [];
        drums.forEach(d => {
          const absoluteTime = d.beat * this.beatDur;
          const swungT = this.applySwing(absoluteTime);
          this.drum(this.nextNoteTime + swungT, d.type);
        });
      }

      // Play Ambient Chords
      const activeChord = this.chordProgression[this.currentBar];
      if (activeChord) {
        this.playChord(this.nextNoteTime, activeChord);
      }
      
      this.onTickCallback(this.currentBar);
      
      this.nextNoteTime += this.barDur; 
      this.currentBar = (this.currentBar + 1) % 16;
    }
  }

  public async play() {
    if (this.isPlaying || !this.drumArrangement.length || !this.audioCtx) return;
    await this.ready();
    this.isPlaying = true; 
    this.currentBar = 0; 
    this.nextNoteTime = this.audioCtx.currentTime + 0.1;
    
    if (this.timerID !== null) clearInterval(this.timerID);
    this.timerID = setInterval(this.tick, this.lookAhead) as unknown as number;
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  public async loadDropboxSamples(onProgress?: (msg: string) => void) {
    if (!this.audioCtx) {
      await this.init();
    }
    if (!this.audioCtx) return;

    this.loadingSamples = true;
    this.loadError = null;
    this.loadedSamplesCount = 0;
    if (onProgress) onProgress("Connecting to Dropbox storage...");

    const urls = [
      "https://dl.dropboxusercontent.com/scl/fo/gjnxz1mgopubdxsy51joy/AC3TqtzxmPwf3Pb7IyaVXks?rlkey=6ktzbiwdmbm4je8kqswy3mto2&st=rvxsjdd9&dl=1",
      "https://www.dropbox.com/scl/fo/gjnxz1mgopubdxsy51joy/AC3TqtzxmPwf3Pb7IyaVXks?rlkey=6ktzbiwdmbm4je8kqswy3mto2&st=rvxsjdd9&dl=1"
    ];

    let errorToReport: any = null;
    let arrayBuffer: ArrayBuffer | null = null;

    for (const url of urls) {
      try {
        if (onProgress) onProgress("Downloading sample pack (unzipping in browser)...");
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Dropbox returned status: ${response.status} ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 1000) {
          break; // successfully downloaded!
        }
      } catch (err) {
        errorToReport = err;
        console.warn(`Failed to download from ${url}:`, err);
      }
    }

    if (!arrayBuffer) {
      this.loadingSamples = false;
      this.loadError = "CORS restriction / Download Blocked. Try opening the app in a new tab, or use our premium procedurally synthesized drum sounds!";
      if (onProgress) onProgress("Error loading samples. Falling back to built-in synthesizers.");
      return;
    }

    try {
      if (onProgress) onProgress("Unzipping archive and index-matching .wav structures...");
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      const newSamplesCount: Record<DrumType, number> = {
        kick: 0, snare: 0, hihat: 0, crash: 0, clap: 0, snap: 0, ride: 0
      };
      
      const newSamples: Record<DrumType, AudioBuffer[]> = {
        kick: [], snare: [], hihat: [], crash: [], clap: [], snap: [], ride: []
      };

      const fileNames = Object.keys(zip.files);
      let loadedCount = 0;

      for (const fileName of fileNames) {
        if (zip.files[fileName].dir || fileName.includes('__MACOSX') || fileName.startsWith('.')) {
          continue;
        }

        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.wav') || lowerName.endsWith('.mp3') || lowerName.endsWith('.ogg')) {
          let matchedType: DrumType | null = null;
          
          if (lowerName.includes('kick') || lowerName.includes('k_')) {
            matchedType = 'kick';
          } else if (lowerName.includes('snare') || lowerName.includes('sd_')) {
            matchedType = 'snare';
          } else if (lowerName.includes('clap') || lowerName.includes('cp_')) {
            matchedType = 'clap';
          } else if (lowerName.includes('snap') || lowerName.includes('rim_')) {
            matchedType = 'snap';
          } else if (lowerName.includes('ride') || lowerName.includes('rd_')) {
            matchedType = 'ride';
          } else if (lowerName.includes('hihat') || lowerName.includes('hat') || lowerName.includes('hh_') || lowerName.includes('ch_') || lowerName.includes('oh_')) {
            matchedType = 'hihat';
          } else if (lowerName.includes('crash') || lowerName.includes('cr_') || lowerName.includes('cymbal')) {
            matchedType = 'crash';
          }

          if (matchedType) {
            try {
              const fileData = await zip.files[fileName].async('arraybuffer');
              const decodedBuffer = await this.audioCtx.decodeAudioData(fileData);
              newSamples[matchedType].push(decodedBuffer);
              newSamplesCount[matchedType]++;
              loadedCount++;
              if (onProgress && loadedCount % 5 === 0) {
                onProgress(`Decoding sample files: ${loadedCount} files processed...`);
              }
            } catch (decErr) {
              console.warn(`Error decoding individual sample ${fileName}:`, decErr);
            }
          }
        }
      }

      this.loadedSamples = newSamples;
      this.loadedSamplesCount = loadedCount;
      this.loadingSamples = false;

      if (loadedCount > 0) {
        this.useSamples = true;
        this.loadError = null;
        if (onProgress) {
          onProgress(`Success! Loaded ${loadedCount} dubstep wave samples (Kicks: ${newSamplesCount.kick}, Snares: ${newSamplesCount.snare}, Claps: ${newSamplesCount.clap}, Snaps: ${newSamplesCount.snap}, Hats: ${newSamplesCount.hihat}, Rides/Crashes: ${newSamplesCount.ride + newSamplesCount.crash})`);
        }
      } else {
        this.loadError = "No valid .wav files matched inside the zip file. Standard premium synth remains active!";
        if (onProgress) onProgress("No valid samples mapped. Standard synth is active.");
      }

    } catch (err: any) {
      console.error("Unzip or decoding error:", err);
      this.loadingSamples = false;
      this.loadError = `Failed to process zip pack: ${err.message || err}`;
      if (onProgress) onProgress("Failure reading sample archive.");
    }
  }

  public async oneShot() {
    await this.ready();
    if (this.audioCtx) {
      this.playBass(this.audioCtx.currentTime, 1.2, this.generateBassParams());
    }
  }
}

export const audioEngine = new DubstepEngine();
