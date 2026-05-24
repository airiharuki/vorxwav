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
  public scaleLocked = false;
  public keyTranspose = 0; // Transposable key shift in semitones (-12 to +12)
  public dubstepMode = false; // Savage half-time wobble drop engine!
  
  // Dynamic scale locking and wide unison parameters
  public unisonWidth = 0.6; // Stereo width spread (0 to 1) for Vital wide unison
  public currentKey = 'C'; // Selected musical root key
  public currentScaleType = 'minor'; // Selected musical scale type (minor, major, phrygian, dorian, lharmonic)
  public customWaveform: number[] | null = null; 
  public fxOrder: string[] = ['distortion', 'chorus', 'phaser', 'eq', 'reverb', 'delay', 'compressor'];

  // Routing custom multi-voice 3-osc patches directly into loop triggers
  public usePatchInLoop = false;
  public labPatch = {
    osc_1_voices: 4,
    osc_1_detune: 0.16,
    osc_1_volume: 0.75,
    osc_2_voices: 8,
    osc_2_detune: 0.25,
    osc_2_volume: 0.45,
    osc_3_voices: 6,
    osc_3_detune: 0.20,
    osc_3_volume: 0.60,
    sub_volume: 0.85,
    filter_cutoff: 0.45,
    filter_resonance: 0.35,
    lfo_1_rate: 3.5,
    lfo_1_amount: 0.65,

    // Studio effects defaults
    fx_distortion_drive: 0.15,
    fx_distortion_mix: 0.10,
    fx_delay_time: 0.35,
    fx_delay_feedback: 0.40,
    fx_delay_mix: 0.15,
    fx_reverb_size: 0.45,
    fx_reverb_decay: 0.50,
    fx_reverb_mix: 0.20,
    fx_chorus_rate: 0.35,
    fx_chorus_mix: 0.10,
    fx_eq_low: 0.50,
    fx_eq_mid: 0.52,
    fx_eq_high: 0.50,
    fx_phaser_rate: 0.25,
    fx_phaser_depth: 0.40,
    fx_phaser_mix: 0.05,
    fx_compressor_threshold: 0.20,
    fx_compressor_ratio: 0.30,
    fx_compressor_mix: 0.10
  };

  public osc1Waveform: number[] = [];
  public osc2Waveform: number[] = [];
  public osc3Waveform: number[] = [];

  // Media Recording & Export of Loops
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;

  // Custom Chord Drift & Mutation controls
  public chordDriftEnabled = false;
  public chordDriftAmount = 0.35; // 0.0 to 1.0 (detuning depth)
  public chordDriftSpeed = 0.4;  // 0.0 to 1.0 (LFO speed of detuning)
  public harmonicMutationActive = false; // Chords morph their notes on their own
  public mutationRate = 0.25; // Probability/strength of note variations
  public chordGlideEnabled = true; // Slide pitches on chord changes
  public chordGlideTime = 0.35; // Glide duration in seconds (0.05 to 1.2s)
  private lastPlayedFreqs: number[] = [];
  private lastSubMidi?: number;
  
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
    // Set up default single-cycle waveforms for the 3 custom lab oscillators
    const wave1: number[] = [];
    const wave2: number[] = [];
    const wave3: number[] = [];
    for (let i = 0; i < 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      wave1.push(Math.sin(a) * 0.75 + Math.sin(a * 3) * 0.15);
      wave2.push(Math.sin(a) * 0.5 + Math.sin(a * 2) * 0.4 - Math.sin(a * 4) * 0.2);
      wave3.push(Math.sin(a) * 0.45 + Math.sin(a * 5) * 0.3);
    }
    this.osc1Waveform = wave1;
    this.osc2Waveform = wave2;
    this.osc3Waveform = wave3;

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
      if (this.dubstepMode) {
        o.type = 'triangle';
        o.frequency.setValueAtTime(200, t); 
        o.frequency.exponentialRampToValueAtTime(32, t + 0.18);
        g.gain.setValueAtTime(1.4, t); 
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      } else {
        o.frequency.setValueAtTime(150, t); 
        o.frequency.exponentialRampToValueAtTime(35, t + 0.15);
        g.gain.setValueAtTime(1, t); 
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      }
      o.connect(g); 
      g.connect(dest); 
      o.start(t); 
      o.stop(t + 0.5);
    } else if (type === 'snare') {
      const o = this.audioCtx.createOscillator();
      const g1 = this.audioCtx.createGain();
      if (this.dubstepMode) {
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(260, t); 
        o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
        g1.gain.setValueAtTime(0.7, t); 
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      } else {
        o.type = 'triangle'; 
        o.frequency.setValueAtTime(220, t); 
        o.frequency.exponentialRampToValueAtTime(110, t + 0.06);
        g1.gain.setValueAtTime(0.5, t); 
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      }
      o.connect(g1); 
      g1.connect(dest); 
      o.start(t); 
      o.stop(t + 0.2);
      
      const noiseDuration = this.dubstepMode ? 0.35 : 0.12;
      const noiseBuffer = this.getNoise(noiseDuration);
      if (noiseBuffer) {
        const s = this.audioCtx.createBufferSource();
        const f = this.audioCtx.createBiquadFilter();
        const g2 = this.audioCtx.createGain();
        s.buffer = noiseBuffer; 
        f.type = 'bandpass'; 
        if (this.dubstepMode) {
          f.frequency.value = 1800; 
          f.Q.value = 1.6;
          g2.gain.setValueAtTime(1.1, t); 
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        } else {
          f.frequency.value = 3500; 
          f.Q.value = 1.2;
          g2.gain.setValueAtTime(0.6, t); 
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        }
        s.connect(f); 
        f.connect(g2); 
        g2.connect(dest); 
        s.start(t); 
        s.stop(t + noiseDuration + 0.05);
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
    if (this.usePatchInLoop) {
      this.playCustomPatchSynth(t, dur, p);
      return;
    }
    const transFactor = Math.pow(2, this.keyTranspose / 12);

    // Calculate base frequencies: if scaleLock is enabled, align to the active chords root; else use generated values
    let subFreq = p.sf * transFactor;
    let midFreq = p.mf * transFactor;

    if (this.scaleLocked && this.chordProgression && this.chordProgression[this.currentBar]) {
      const activeChord = this.chordProgression[this.currentBar];
      if (activeChord.notes && activeChord.notes.length > 0) {
        let activeChordMidi = activeChord.notes[0];
        let subMidi = activeChordMidi;
        
        // Lock to deep fundamental sub-bass range (MIDI 28-43, i.e. ~37Hz - 98Hz)
        while (subMidi > 43) {
          subMidi -= 12;
        }
        while (subMidi < 28) {
          subMidi += 12;
        }
        
        subFreq = 440 * Math.pow(2, (subMidi - 69) / 12);
        midFreq = 440 * Math.pow(2, ((subMidi + 12) - 69) / 12);
      }
    }

    const sub = this.audioCtx.createOscillator();
    sub.type = 'sine'; 
    sub.frequency.value = subFreq; 
    sub.detune.value = p.dt;

    // Standard modern synth unison uses multiple oscillators detuned and spread wide across the stereo field
    const midType = p.style === 'reese' ? 'sawtooth' : (p.style === 'growl' ? 'square' : 'sawtooth');

    const midL = this.audioCtx.createOscillator();
    const midR = this.audioCtx.createOscillator();

    if (this.customWaveform && this.customWaveform.length > 0) {
      try {
        const real = new Float32Array(this.customWaveform.length + 1);
        const imag = new Float32Array(this.customWaveform.length + 1);
        for (let i = 0; i < this.customWaveform.length; i++) {
          real[i + 1] = this.customWaveform[i];
        }
        const pWave = this.audioCtx.createPeriodicWave(real, imag);
        midL.setPeriodicWave(pWave);
        midR.setPeriodicWave(pWave);
      } catch (err) {
        midL.type = midType;
        midR.type = midType;
      }
    } else {
      midL.type = midType;
      midR.type = midType;
    }

    midL.frequency.value = midFreq; 
    midL.detune.value = (p.dt * 1.2) - (25 * this.unisonWidth);
 
    midR.frequency.value = midFreq; 
    midR.detune.value = (p.dt * 1.2) + (25 * this.unisonWidth);
    
    let mid2L: OscillatorNode | null = null;
    let mid2R: OscillatorNode | null = null;
    if (p.style === 'reese') {
      mid2L = this.audioCtx.createOscillator();
      mid2L.type = 'sawtooth';
      mid2L.frequency.value = midFreq;
      mid2L.detune.value = midL.detune.value - 12 - (15 * this.unisonWidth);

      mid2R = this.audioCtx.createOscillator();
      mid2R.type = 'sawtooth';
      mid2R.frequency.value = midFreq;
      mid2R.detune.value = midR.detune.value - 12 + (15 * this.unisonWidth);
    }

    const f = this.audioCtx.createBiquadFilter();
    f.type = p.style === 'growl' ? 'bandpass' : 'lowpass'; 
    f.frequency.value = p.fc; 
    
    // Resonance/Reverb Ratio: adjusts filter resonance for wet squelchy sweep
    const finalFq = (p.style === 'growl' ? p.fq * 2 : p.fq) * (this.resonanceRatio * 3.0);
    f.Q.value = finalFq;

    // Stereo Panning for the mid-bass oscillators to create the "Vital" type Wide Unison effect
    let panL: StereoPannerNode | null = null;
    let panR: StereoPannerNode | null = null;
    if (this.audioCtx.createStereoPanner) {
      panL = this.audioCtx.createStereoPanner();
      panL.pan.setValueAtTime(-Math.max(0.01, this.unisonWidth), t);
      panR = this.audioCtx.createStereoPanner();
      panR.pan.setValueAtTime(Math.max(0.01, this.unisonWidth), t);
    }

    if (panL && panR) {
      midL.connect(panL);
      panL.connect(f);
      midR.connect(panR);
      panR.connect(f);

      if (mid2L) {
        mid2L.connect(panL);
      }
      if (mid2R) {
        mid2R.connect(panR);
      }
    } else {
      midL.connect(f);
      midR.connect(f);
      if (mid2L) mid2L.connect(f);
      if (mid2R) mid2R.connect(f);
    }

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
    
    f.connect(w); 
    w.connect(g); 
    sub.connect(g); 
    g.connect(this.masterGain);
    
    const end = t + dur + 0.15; 
    sub.start(t); sub.stop(end); 
    midL.start(t); midL.stop(end); 
    midR.start(t); midR.stop(end); 
    if (mid2L) { mid2L.start(t); mid2L.stop(end); }
    if (mid2R) { mid2R.start(t); mid2R.stop(end); }
    lfo.start(t); lfo.stop(end);
  }

  private playCustomPatchSynth(t: number, dur: number, p: BassParams) {
    if (!this.audioCtx || !this.masterGain) return;
    const transFactor = Math.pow(2, this.keyTranspose / 12);

    let baseFreq = p.sf * transFactor;

    if (this.scaleLocked && this.chordProgression && this.chordProgression[this.currentBar]) {
      const activeChord = this.chordProgression[this.currentBar];
      if (activeChord.notes && activeChord.notes.length > 0) {
        let activeChordMidi = activeChord.notes[0];
        let subMidi = activeChordMidi;
        while (subMidi > 43) { subMidi -= 12; }
        while (subMidi < 28) { subMidi += 12; }
        baseFreq = 440 * Math.pow(2, (subMidi - 69) / 12);
      }
    }

    const now = t;
    const oscNode1 = this.audioCtx.createOscillator();
    const oscNode2 = this.audioCtx.createOscillator();
    const oscNode3 = this.audioCtx.createOscillator();
    const subNode = this.audioCtx.createOscillator();
    const filterNode = this.audioCtx.createBiquadFilter();

    try {
      if (this.osc1Waveform && this.osc1Waveform.length > 0) {
        const real = new Float32Array(this.osc1Waveform.length + 1);
        const imag = new Float32Array(this.osc1Waveform.length + 1);
        for (let i = 0; i < this.osc1Waveform.length; i++) real[i + 1] = this.osc1Waveform[i];
        const pWave = this.audioCtx.createPeriodicWave(real, imag);
        oscNode1.setPeriodicWave(pWave);
      } else {
        oscNode1.type = 'sawtooth';
      }

      if (this.osc2Waveform && this.osc2Waveform.length > 0) {
        const real = new Float32Array(this.osc2Waveform.length + 1);
        const imag = new Float32Array(this.osc2Waveform.length + 1);
        for (let i = 0; i < this.osc2Waveform.length; i++) real[i + 1] = this.osc2Waveform[i];
        const pWave = this.audioCtx.createPeriodicWave(real, imag);
        oscNode2.setPeriodicWave(pWave);
      } else {
        oscNode2.type = 'square';
      }

      if (this.osc3Waveform && this.osc3Waveform.length > 0) {
        const real = new Float32Array(this.osc3Waveform.length + 1);
        const imag = new Float32Array(this.osc3Waveform.length + 1);
        for (let i = 0; i < this.osc3Waveform.length; i++) real[i + 1] = this.osc3Waveform[i];
        const pWave = this.audioCtx.createPeriodicWave(real, imag);
        oscNode3.setPeriodicWave(pWave);
      } else {
        oscNode3.type = 'sawtooth';
      }
    } catch (err) {
      oscNode1.type = 'sawtooth';
      oscNode2.type = 'square';
      oscNode3.type = 'sawtooth';
    }

    subNode.type = 'sine';

    const midFreq = baseFreq * 2;
    oscNode1.frequency.setValueAtTime(midFreq, now);
    oscNode2.frequency.setValueAtTime(midFreq * (1 + (this.labPatch.osc_2_detune * 0.05)), now);
    oscNode3.frequency.setValueAtTime(midFreq * (1 - (this.labPatch.osc_3_detune * 0.05)), now);
    subNode.frequency.setValueAtTime(baseFreq, now);

    filterNode.type = 'lowpass';
    const cutoffHz = 80 + this.labPatch.filter_cutoff * 3000;
    filterNode.frequency.setValueAtTime(cutoffHz, now);
    filterNode.Q.setValueAtTime(1 + this.labPatch.filter_resonance * 15, now);

    const lfoNode = this.audioCtx.createOscillator();
    const lfoGainNode = this.audioCtx.createGain();
    const finalLr = Math.max(0.1, this.labPatch.lfo_1_rate * (this.wobbleRatio * 1.5));
    lfoNode.frequency.setValueAtTime(finalLr, now);
    lfoGainNode.gain.setValueAtTime(this.labPatch.lfo_1_amount * (cutoffHz * 0.85), now);

    lfoNode.connect(lfoGainNode);
    lfoGainNode.connect(filterNode.frequency);

    const gain1 = this.audioCtx.createGain();
    const gain2 = this.audioCtx.createGain();
    const gain3 = this.audioCtx.createGain();
    const gainSub = this.audioCtx.createGain();
    const mainGainNode = this.audioCtx.createGain();

    gain1.gain.setValueAtTime(this.labPatch.osc_1_volume * 0.3 * p.vol, now);
    gain2.gain.setValueAtTime(this.labPatch.osc_2_volume * 0.22 * p.vol, now);
    gain3.gain.setValueAtTime(this.labPatch.osc_3_volume * 0.22 * p.vol, now);
    gainSub.gain.setValueAtTime(this.labPatch.sub_volume * 0.45 * p.vol, now);

    oscNode1.connect(gain1).connect(filterNode);
    oscNode2.connect(gain2).connect(filterNode);
    oscNode3.connect(gain3).connect(filterNode);
    subNode.connect(gainSub).connect(filterNode);

    const distFactor = this.bitcrushRatio * 2.5;
    const distAmount = p.dist * 100 * distFactor;
    
    // Connect to intermediate mainGainNode first
    filterNode.connect(mainGainNode);

    // Dynamic user-defined FX chain processing
    let lastNode: AudioNode = mainGainNode;

    this.fxOrder.forEach((fxKey) => {
      if (fxKey === 'distortion' && this.labPatch.fx_distortion_mix > 0) {
        try {
          const shaper = this.audioCtx!.createWaveShaper();
          const drive = this.labPatch.fx_distortion_drive;
          const mix = this.labPatch.fx_distortion_mix;
          const k = drive * 100 + distAmount + 1;
          const n = 44100;
          const c = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            const x = i * 2 / n - 1;
            c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
          }
          shaper.curve = c;
          shaper.oversample = '4x';

          const dryGain = this.audioCtx!.createGain();
          const wetGain = this.audioCtx!.createGain();
          dryGain.gain.setValueAtTime(1 - mix, now);
          wetGain.gain.setValueAtTime(mix, now);

          const splitter = this.audioCtx!.createGain();
          const merger = this.audioCtx!.createGain();

          lastNode.connect(splitter);
          splitter.connect(dryGain).connect(merger);
          splitter.connect(shaper).connect(wetGain).connect(merger);
          lastNode = merger;
        } catch (e) {}
      }

      if (fxKey === 'eq') {
        try {
          const low = this.audioCtx!.createBiquadFilter();
          low.type = 'lowshelf'; low.frequency.value = 220; low.gain.value = (this.labPatch.fx_eq_low - 0.5) * 24;
          const mid = this.audioCtx!.createBiquadFilter();
          mid.type = 'peaking'; mid.frequency.value = 1000; mid.gain.value = (this.labPatch.fx_eq_mid - 0.5) * 24;
          const high = this.audioCtx!.createBiquadFilter();
          high.type = 'highshelf'; high.frequency.value = 4500; high.gain.value = (this.labPatch.fx_eq_high - 0.5) * 24;
          lastNode.connect(low).connect(mid).connect(high);
          lastNode = high;
        } catch (e) {}
      }

      if (fxKey === 'chorus' && this.labPatch.fx_chorus_mix > 0) {
        try {
          const mix = this.labPatch.fx_chorus_mix;
          const splitter = this.audioCtx!.createGain();
          const merger = this.audioCtx!.createGain();
          const dry = this.audioCtx!.createGain();
          const wet = this.audioCtx!.createGain();
          dry.gain.value = 1 - mix; wet.gain.value = mix;
          lastNode.connect(splitter);
          splitter.connect(dry).connect(merger);
          const dL = this.audioCtx!.createDelay(); dL.delayTime.value = 0.02;
          const dR = this.audioCtx!.createDelay(); dR.delayTime.value = 0.03;
          splitter.connect(dL).connect(wet).connect(merger);
          splitter.connect(dR).connect(wet).connect(merger);
          lastNode = merger;
        } catch (e) {}
      }

      if (fxKey === 'phaser' && this.labPatch.fx_phaser_mix > 0) {
        try {
          const phaser = this.audioCtx!.createBiquadFilter();
          phaser.type = 'allpass'; phaser.frequency.value = 1000 + (this.labPatch.fx_phaser_rate * 2000);
          const mix = this.labPatch.fx_phaser_mix;
          const dry = this.audioCtx!.createGain(); dry.gain.value = 1 - mix;
          const wet = this.audioCtx!.createGain(); wet.gain.value = mix;
          const m = this.audioCtx!.createGain();
          lastNode.connect(dry).connect(m);
          lastNode.connect(phaser).connect(wet).connect(m);
          lastNode = m;
        } catch (e) {}
      }

      if (fxKey === 'delay' && this.labPatch.fx_delay_mix > 0) {
        try {
          const delay = this.audioCtx!.createDelay(); delay.delayTime.value = 0.3 * this.labPatch.fx_delay_time + 0.1;
          const feedback = this.audioCtx!.createGain(); feedback.gain.value = this.labPatch.fx_delay_feedback * 0.6;
          const mix = this.labPatch.fx_delay_mix;
          const dry = this.audioCtx!.createGain(); dry.gain.value = 1 - mix;
          const wet = this.audioCtx!.createGain(); wet.gain.value = mix;
          const m = this.audioCtx!.createGain();
          lastNode.connect(dry).connect(m);
          lastNode.connect(delay).connect(wet).connect(m);
          delay.connect(feedback).connect(delay);
          lastNode = m;
        } catch (e) {}
      }

      if (fxKey === 'reverb' && this.labPatch.fx_reverb_mix > 0) {
        try {
          const rev = this.audioCtx!.createConvolver(); // Simplified for engine Loop
          // Just use a simple delay feedback for reverb approximation in the fast engine
          const d1 = this.audioCtx!.createDelay(); d1.delayTime.value = 0.05 * this.labPatch.fx_reverb_size + 0.01;
          const f1 = this.audioCtx!.createGain(); f1.gain.value = 0.4 * this.labPatch.fx_reverb_decay;
          const mix = this.labPatch.fx_reverb_mix;
          const m = this.audioCtx!.createGain();
          lastNode.connect(m);
          lastNode.connect(d1).connect(f1).connect(d1);
          d1.connect(this.audioCtx!.createGain()).connect(m);
          m.gain.value = 1.0; 
          // (Wait, this is very simplified, but better than nothing for the background engine)
          lastNode = m;
        } catch (e) {}
      }

      if (fxKey === 'compressor' && this.labPatch.fx_compressor_mix > 0) {
        try {
          const comp = this.audioCtx!.createDynamicsCompressor();
          comp.threshold.value = -30 * this.labPatch.fx_compressor_threshold;
          comp.ratio.value = 1 + this.labPatch.fx_compressor_ratio * 12;
          lastNode.connect(comp);
          lastNode = comp;
        } catch (e) {}
      }
    });

    lastNode.connect(this.masterGain!);

    mainGainNode.gain.setValueAtTime(0, now);
    mainGainNode.gain.linearRampToValueAtTime(0.7, now + 0.05);
    mainGainNode.gain.setValueAtTime(0.7, now + dur - 0.05);
    mainGainNode.gain.exponentialRampToValueAtTime(0.001, now + dur);

    const playEnd = now + dur + 0.1;
    lfoNode.start(now); lfoNode.stop(playEnd);
    oscNode1.start(now); oscNode1.stop(playEnd);
    oscNode2.start(now); oscNode2.stop(playEnd);
    oscNode3.start(now); oscNode3.stop(playEnd);
    subNode.start(now); subNode.stop(playEnd);
  }

  // Live recording options
  public startRecording() {
    if (!this.audioCtx || !this.masterGain) {
      console.warn("Synthesis engine must be initialized to record!");
      return;
    }
    try {
      this.recordedChunks = [];
      const dest = this.audioCtx.createMediaStreamDestination();
      this.masterGain.connect(dest);

      // WebM audio with Opus codec is natively supported by modern browsers
      this.mediaRecorder = new MediaRecorder(dest.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log("Recording started successfully...");
    } catch (err) {
      console.error("Failed to start MediaRecorder recording stream:", err);
    }
  }

  public stopRecordingAndDownload() {
    if (!this.mediaRecorder || !this.isRecording) return;
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vortex_synth_loop_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    this.mediaRecorder.stop();
    this.isRecording = false;
  }

  private playRhodesVoice(t: number, freq: number, dur: number, vol: number, fromFreq?: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    
    if (fromFreq !== undefined && fromFreq !== freq && this.chordGlideEnabled) {
      carrier.frequency.setValueAtTime(fromFreq, t);
      carrier.frequency.exponentialRampToValueAtTime(freq, t + this.chordGlideTime);
    } else {
      carrier.frequency.setValueAtTime(freq, t);
    }

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
    
    if (fromFreq !== undefined && fromFreq !== freq && this.chordGlideEnabled) {
      modulator.frequency.setValueAtTime(fromFreq * 3.5, t);
      modulator.frequency.exponentialRampToValueAtTime(freq * 3.5, t + this.chordGlideTime);
    } else {
      modulator.frequency.setValueAtTime(freq * 3.5, t);
    }

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

  private playTwinkleVoice(t: number, freq: number, dur: number, vol: number, fromFreq?: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    let twinkleFreq = freq;
    while (twinkleFreq < 450) {
      twinkleFreq *= 2;
    }

    let fromTwinkleFreq = fromFreq;
    if (fromTwinkleFreq !== undefined) {
      while (fromTwinkleFreq < 450) {
        fromTwinkleFreq *= 2;
      }
    }

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';

    if (fromTwinkleFreq !== undefined && fromTwinkleFreq !== twinkleFreq && this.chordGlideEnabled) {
      osc1.frequency.setValueAtTime(fromTwinkleFreq, t);
      osc1.frequency.exponentialRampToValueAtTime(twinkleFreq, t + this.chordGlideTime);
      
      osc2.frequency.setValueAtTime(fromTwinkleFreq * 2.01, t);
      osc2.frequency.exponentialRampToValueAtTime(twinkleFreq * 2.01, t + this.chordGlideTime);
    } else {
      osc1.frequency.setValueAtTime(twinkleFreq, t);
      osc2.frequency.setValueAtTime(twinkleFreq * 2.01, t);
    }

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

  private playPluckVoice(t: number, freq: number, dur: number, vol: number, fromFreq?: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    
    if (fromFreq !== undefined && fromFreq !== freq && this.chordGlideEnabled) {
      osc.frequency.setValueAtTime(fromFreq, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + this.chordGlideTime);
    } else {
      osc.frequency.setValueAtTime(freq, t);
    }

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

  private playAmbientSubVoice(t: number, midiNote: number, dur: number, fromMidiNote?: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const freq = 440 * Math.pow(2, ((midiNote + this.keyTranspose) - 69) / 12);
    let fromFreq: number | undefined;
    if (fromMidiNote !== undefined) {
      fromFreq = 440 * Math.pow(2, ((fromMidiNote + this.keyTranspose) - 69) / 12);
    }

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';

    // Subtle 2nd harmonic for small speaker audibility
    const satOsc = ctx.createOscillator();
    satOsc.type = 'triangle';

    if (fromFreq !== undefined && fromFreq !== freq && this.chordGlideEnabled) {
      subOsc.frequency.setValueAtTime(fromFreq, t);
      subOsc.frequency.exponentialRampToValueAtTime(freq, t + this.chordGlideTime);

      satOsc.frequency.setValueAtTime(fromFreq * 2, t);
      satOsc.frequency.exponentialRampToValueAtTime(freq * 2, t + this.chordGlideTime);
    } else {
      subOsc.frequency.setValueAtTime(freq, t);
      satOsc.frequency.setValueAtTime(freq * 2, t);
    }

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
    let subMidi: number | undefined;
    if (this.ambientSubActive && chord.notes.length > 0) {
      const rootMidi = Math.min(...chord.notes);
      subMidi = rootMidi;
      while (subMidi > 45) {
        subMidi -= 12;
      }
      while (subMidi < 28) {
        subMidi += 12;
      }
      this.playAmbientSubVoice(t, subMidi, dur, this.lastSubMidi);
    }
    this.lastSubMidi = subMidi;

    const nextLastPlayedFreqs: number[] = [];
    const oldFreqsPool = [...this.lastPlayedFreqs];

    chord.notes.forEach((midi, idx) => {
      // Calculate microtonal LFO pitch drift for rich tape/VCO vibe on each note voice separately
      let driftSemitones = 0;
      if (this.chordDriftEnabled) {
        const lfoSpeed = 0.05 + this.chordDriftSpeed * 1.8; // slow drift oscillation (0.05Hz - 1.85Hz)
        const lfoPhase = t * lfoSpeed + (idx * 2.39); // staggered phase offset per voice
        const driftDepth = this.chordDriftAmount * 0.45; // up to 45 cents detuning range
        driftSemitones = Math.sin(lfoPhase) * driftDepth;
        // Introduce tape-flutter micro-jitter
        driftSemitones += (Math.cos(t * 8.2 + idx * 4.7) * 0.04 * this.chordDriftAmount);
      }

      const freq = 440 * Math.pow(2, ((midi + this.keyTranspose + driftSemitones) - 69) / 12);
      nextLastPlayedFreqs.push(freq);

      let fromFreq: number | undefined;
      if (oldFreqsPool.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let j = 0; j < oldFreqsPool.length; j++) {
          const dist = Math.abs(oldFreqsPool[j] - freq);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = j;
          }
        }
        fromFreq = oldFreqsPool[nearestIdx];
        oldFreqsPool.splice(nearestIdx, 1);
      }

      if (style === 'rhodes') {
        const humanizedT = t + Math.random() * 0.015;
        this.playRhodesVoice(humanizedT, freq, dur, vol * 0.16, fromFreq);
      } else if (style === 'twinkle') {
        const staggeredT = t + idx * 0.06;
        this.playTwinkleVoice(staggeredT, freq, dur * 0.5, vol * 0.12, fromFreq);
      } else if (style === 'pluck') {
        const humanizedT = t + Math.random() * 0.008;
        this.playPluckVoice(humanizedT, freq, dur * 0.4, vol * 0.14, fromFreq);
      }
    });

    this.lastPlayedFreqs = nextLastPlayedFreqs;
  }

  private getMutatedChord(chord: Chord): Chord {
    if (!chord.notes || chord.notes.length <= 1) return chord;
    const mutatedNotes = [...chord.notes];
    
    // Pick a random upper voice (index >= 1) to drift
    const voiceIdx = 1 + Math.floor(Math.random() * (mutatedNotes.length - 1));
    const r = Math.random();
    
    if (r < 0.35) {
      // Octave transposition drift
      const direction = Math.random() < 0.5 ? -12 : 12;
      const targetNote = mutatedNotes[voiceIdx] + direction;
      if (targetNote >= 43 && targetNote <= 84) {
        mutatedNotes[voiceIdx] = targetNote;
      }
    } else if (r < 0.70) {
      // Scale-adjacent step drift (tensions/extensions)
      const shift = Math.random() < 0.5 ? -1 : 1;
      const targetNote = mutatedNotes[voiceIdx] + shift;
      if (targetNote >= 48 && targetNote <= 76) {
        mutatedNotes[voiceIdx] = targetNote;
      }
    } else {
      // Perfect 5th/4th voice-leading shifts
      const shift = Math.random() < 0.5 ? 7 : -5;
      const targetNote = mutatedNotes[voiceIdx] + shift;
      if (targetNote >= 45 && targetNote <= 80) {
        mutatedNotes[voiceIdx] = targetNote;
      }
    }

    const root = mutatedNotes[0];
    const upperVoices = mutatedNotes.slice(1).sort((a, b) => a - b);

    // Keep active note name formatted elegantly with a Drift indicator symbol "≎"
    let mutatedName = chord.name;
    if (!mutatedName.endsWith(" ≎")) {
      mutatedName += " ≎";
    }

    return {
      name: mutatedName,
      notes: [root, ...upperVoices]
    };
  }

  private generateBassParams(style?: BassStyle): BassParams {
    const defaultStyles: BassStyle[] = ['wobble', 'reese', 'growl'];
    let chosenStyle = style || defaultStyles[Math.floor(Math.random() * defaultStyles.length)];
    if (this.dubstepMode && chosenStyle === 'reese') {
      chosenStyle = Math.random() < 0.5 ? 'wobble' : 'growl';
    }

    let lr = 4 + Math.random() * 12;
    let sf = 40 + Math.random() * 20;
    let mf = 60 + Math.random() * 40;
    let fc = 300 + Math.random() * 1100;
    let fq = 3 + Math.random() * 10;
    let ld = 250 + Math.random() * 850;
    let dist = 15 + Math.random() * 75;
    let vol = 0.45 + Math.random() * 0.45;
    let dur = 0.8 + Math.random() * 1.6;
    let dt = (Math.random() - 0.5) * 40;

    if (this.dubstepMode) {
      sf = 32 + Math.random() * 12; // deep, fundamental floor-shaking sub
      mf = 55 + Math.random() * 20;
      fc = 180 + Math.random() * 420;
      fq = 14 + Math.random() * 14; // screaming vocal formant style
      
      const bps = this.bpm / 60; // Beats per second (e.g. 2.33 Hz)
      const divisions = [0.5, 1, 2, 3, 4, 6, 8];
      const chosenDiv = divisions[Math.floor(Math.random() * divisions.length)];
      lr = bps * chosenDiv; // Quantized tempo-subdivided LFO rate

      ld = 1100 + Math.random() * 1000; // massive filter sweep depth
      dist = 90 + Math.random() * 80;   // saturated overdrive waveshaping
      vol = 0.85 + Math.random() * 0.15; // raw max volume
      dur = this.barDur * 0.72 + Math.random() * this.barDur * 0.2; // chops slightly before the snare hits
      dt = 35 + Math.random() * 50;     // wide unison detuning
    }

    return { 
      style: chosenStyle,
      sf, 
      mf, 
      fc, 
      fq, 
      lr, 
      ld, 
      dist, 
      vol, 
      dur, 
      dt 
    };
  }

  public generateLoop() {
    this.bassPatterns = []; 
    this.drumArrangement = [];
    
    const styles: BassStyle[] = ['wobble', 'reese', 'growl'];
    
    if (this.dubstepMode) {
      // Establish an epic 16-bar Dubstep arrangement:
      // Bars 0-3: Chill Dubstep Beat (Warmup/Intro)
      // Bars 4-7: Accelerated Snare/Kick Build-Up
      // Bars 8-15: SAVAGE DUBSTEP DROP!
      for (let i = 0; i < 16; i++) {
        const d: DrumEvent[] = [];
        const isDropBar = i >= 8;
        const isBuildBar = i === 7;
        const isPreBuild = i >= 4 && i < 7;
        const isBreak = i === 3 || i === 15;

        // Bass Generation
        if (isBuildBar) {
          // Silent bass or rapid risers during build
          this.bassPatterns.push(null);
        } else {
          // Heavy wobble during drop; slightly lighter growl otherwise
          const bStyle = Math.random() < 0.6 ? 'wobble' : 'growl';
          const p = this.generateBassParams(bStyle);
          if (!isDropBar) {
            p.vol *= 0.7; // quieter intro bass
            p.dist *= 0.6;
          }
          this.bassPatterns.push(p);
        }

        // Drum Arrangement
        if (isBuildBar) {
          // Accelerating Snare Roll Build-up
          d.push({ beat: 0, type: 'kick' });
          for (let r = 0; r < 12; r++) {
            d.push({ beat: 1 + r * 0.16, type: 'snare' });
          }
          // Big crash at start of build
          d.push({ beat: 0, type: 'crash' });
        } else {
          // Half-time Dubstep Kick & Snare fundamentals
          d.push({ beat: 0, type: 'kick' });
          d.push({ beat: 2, type: 'snare' });

          // Syncopated Kicks
          if (isDropBar) {
            // Drop swing kicks: Kick on 0, and on 1.5 or 3.25
            if (i % 2 === 0) {
              d.push({ beat: 1.5, type: 'kick' });
            } else {
              d.push({ beat: 1.25, type: 'kick' });
              d.push({ beat: 3.25, type: 'kick' });
            }
          } else if (isPreBuild) {
            if (i % 2 === 1) {
              d.push({ beat: 1.5, type: 'kick' });
            }
          }

          // Hi-hats and Cymbals
          if (isDropBar) {
            d.push({ beat: 0, type: 'crash' }); // huge crash on drop bars
            // Rapid double-time hi-hats
            for (let h = 0; h < 16; h++) {
              const hBeat = (h / 16) * 4;
              const isAccent = h % 4 === 0;
              d.push({ beat: hBeat, type: isAccent ? 'ride' : 'hihat' });
            }
          } else {
            // Standard pacing hi-hats
            for (let h = 0; h < 8; h++) {
              d.push({ beat: (h / 8) * 4, type: 'hihat' });
            }
          }

          // Shaker/Snap elements for groove friction
          if (!isDropBar) {
            d.push({ beat: 1, type: 'snap' });
            d.push({ beat: 3, type: 'snap' });
          }

          // Fills & Breaks
          if (isBreak) {
            // Cut standard snares and add a custom fill
            const snareIndex = d.findIndex(x => x.beat === 2 && x.type === 'snare');
            if (snareIndex !== -1) d.splice(snareIndex, 1);

            d.push({ beat: 2, type: 'clap' });
            d.push({ beat: 3, type: 'snare' });
            d.push({ beat: 3.5, type: 'snare' });
          }
        }

        this.drumArrangement.push(d);
      }
    } else {
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
    }

    // Generate Chord progression
    if (this.scaleLocked) {
      this.generateProgressionFromScale();
    } else {
      let selectedPreset = CHORD_PRESETS[Math.floor(Math.random() * CHORD_PRESETS.length)];
      this.chordProgressionPathName = selectedPreset.name;
      this.chordProgression = [];
      for (let i = 0; i < 16; i++) {
        const chordIdx = Math.floor(i / 2) % 8;
        this.chordProgression.push(selectedPreset.chords[chordIdx]);
      }
    }
  }

  public generateProgressionFromScale() {
    const keyOffsetMap: Record<string, number> = {
      'C': 48, 'C#': 49, 'D': 50, 'D#': 51, 'Eb': 51, 'E': 40, 'F': 41, 'F#': 42, 'G': 43, 'G#': 44, 'Ab': 44, 'A': 45, 'A#': 46, 'Bb': 46, 'B': 47
    };
    const scales: Record<string, { intervals: number[], degrees: number[], names: string[] }> = {
      minor: {
        intervals: [0, 2, 3, 5, 7, 8, 10],
        degrees: [0, 5, 2, 6, 3, 4, 5, 4],
        names: ['i', 'VI', 'III', 'VII', 'iv', 'v', 'VI', 'v']
      },
      major: {
        intervals: [0, 2, 4, 5, 7, 9, 11],
        degrees: [0, 3, 4, 1, 5, 3, 4, 0],
        names: ['I', 'IV', 'V', 'ii', 'vi', 'IV', 'V', 'I']
      },
      phrygian: {
        intervals: [0, 1, 3, 5, 7, 8, 10],
        degrees: [0, 1, 3, 6, 0, 1, 4, 1],
        names: ['i', 'bII', 'iv', 'bVII', 'i', 'bII', 'v', 'bII']
      },
      dorian: {
        intervals: [0, 2, 3, 5, 7, 9, 10],
        degrees: [0, 3, 6, 4, 0, 3, 1, 3],
        names: ['i', 'IV', 'bVII', 'v', 'i', 'IV', 'ii', 'IV']
      },
      lharmonic: {
        intervals: [0, 2, 3, 5, 7, 8, 11],
        degrees: [0, 3, 4, 0, 5, 1, 4, 0],
        names: ['i', 'iv', 'V', 'i', 'VI', 'bII', 'V', 'i']
      }
    };

    const rootMidi = keyOffsetMap[this.currentKey] || 48;
    const s = scales[this.currentScaleType] || scales.minor;
    
    const scaleNameFull = this.currentScaleType === 'lharmonic' 
      ? 'Harmonic Minor' 
      : this.currentScaleType.charAt(0).toUpperCase() + this.currentScaleType.slice(1);
    this.chordProgressionPathName = `${this.currentKey} ${scaleNameFull}`;
    
    const computedProgression: Chord[] = [];

    for (let c = 0; c < 8; c++) {
      const d = s.degrees[c];
      const chordsNotes: number[] = [];
      
      const voiceSteps = [0, 2, 4, 6, 8, 10];
      voiceSteps.forEach(step => {
        const stepIndex = d + step;
        const scaleIndex = stepIndex % 7;
        const octaveShift = Math.floor(stepIndex / 7);
        const note = rootMidi + s.intervals[scaleIndex] + (octaveShift * 12);
        
        if (note >= 36 && note <= 92) {
          chordsNotes.push(note);
        }
      });

      const rootName = s.names[c];
      computedProgression.push({
        name: `${this.currentKey} ${rootName}`,
        notes: chordsNotes
      });
    }

    // Duplicate chords to stretch over 16 bars (like standard)
    const stretched: Chord[] = [];
    for (let i = 0; i < 16; i++) {
      stretched.push(computedProgression[Math.floor(i / 2) % 8]);
    }
    this.chordProgression = stretched;
  }

  public changeScalePreset(presetName: string) {
    const found = CHORD_PRESETS.find(p => p.name === presetName);
    if (found) {
      this.chordProgressionPathName = found.name;
      this.chordProgression = [];
      for (let i = 0; i < 16; i++) {
        const chordIdx = Math.floor(i / 2) % 8;
        this.chordProgression.push(found.chords[chordIdx]);
      }
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
      let activeChord = this.chordProgression[this.currentBar];
      if (activeChord) {
        if (this.harmonicMutationActive && Math.random() < this.mutationRate) {
          const mutated = this.getMutatedChord(activeChord);
          // Mutate the stored chord so that it evolves and updates visually
          this.chordProgression[this.currentBar] = mutated;
          this.playChord(this.nextNoteTime, mutated);
        } else {
          this.playChord(this.nextNoteTime, activeChord);
        }
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
