import React, { useState, useEffect } from 'react';
import { Play, Square, Zap, RefreshCw, Power, Download, Library, Check, AlertCircle } from 'lucide-react';
import { audioEngine } from './lib/audioEngine';
import { Sequencer } from './components/Sequencer';
import { Visualizer } from './components/Visualizer';
import { Knob } from './components/Knob';

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function transposeChordName(name: string, semitones: number): string {
  if (semitones === 0 || !name) return name;
  const match = name.match(/^([A-G]#?|Bb|Eb|Ab|Db|Gb)/);
  if (!match) return name;
  const root = match[1];
  let pc = NOTE_NAMES.indexOf(root);
  if (pc === -1) {
    if (root === "Bb") pc = 10;
    else if (root === "Eb") pc = 3;
    else if (root === "Ab") pc = 8;
    else if (root === "Db") pc = 1;
    else if (root === "Gb") pc = 6;
    else return name;
  }
  const newPc = (pc + semitones + 120) % 12;
  const newRoot = NOTE_NAMES[newPc];
  return newRoot + name.slice(root.length);
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(0);
  const [hasSequence, setHasSequence] = useState(false);
  const [status, setStatus] = useState('READY_FOR_DROP');
  const [swing, setSwing] = useState(0);
  const [bpm, setBpm] = useState(140);
  const [masterVolume, setMasterVolume] = useState(0.75);
  
  // Real-time parameter knob states
  const [wobble, setWobble] = useState(0.5);
  const [bitcrush, setBitcrush] = useState(0.5);
  const [subDepth, setSubDepth] = useState(0.5);
  const [resonance, setResonance] = useState(0.5);
  
  const [bassPatterns, setBassPatterns] = useState<any[]>([]);

  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleProgress, setSampleProgress] = useState('');
  const [useSamples, setUseSamples] = useState(false);
  const [loadedSamplesCount, setLoadedSamplesCount] = useState(0);
  const [sampleError, setSampleError] = useState<string | null>(null);

  // Dynamic chord states
  const [chordStyle, setChordStyle] = useState<'rhodes' | 'twinkle' | 'pluck' | 'off'>('rhodes');
  const [chordVolume, setChordVolume] = useState(0.4);
  const [chordProgressionName, setChordProgressionName] = useState('Nebula Drift');
  const [ambientOnly, setAmbientOnly] = useState(false);
  const [ambientSubActive, setAmbientSubActive] = useState(false);
  const [scaleLocked, setScaleLocked] = useState(false);
  const [adsrEnabled, setAdsrEnabled] = useState(false);
  const [chordLengthMult, setChordLengthMult] = useState(1.0);
  const [chordAttack, setChordAttack] = useState(0.15);
  const [chordDecay, setChordDecay] = useState(0.6);
  const [chordSustain, setChordSustain] = useState(0.4);
  const [chordRelease, setChordRelease] = useState(1.5);
  const [keyTranspose, setKeyTranspose] = useState(0);

  // Chord Drift and Mutation States
  const [chordDriftEnabled, setChordDriftEnabled] = useState(false);
  const [chordDriftAmount, setChordDriftAmount] = useState(0.35);
  const [chordDriftSpeed, setChordDriftSpeed] = useState(0.4);
  const [harmonicMutationActive, setHarmonicMutationActive] = useState(false);
  const [mutationRate, setMutationRate] = useState(0.25);
  const [chordGlideEnabled, setChordGlideEnabled] = useState(true);
  const [chordGlideTime, setChordGlideTime] = useState(0.35);
  const [dubstepMode, setDubstepMode] = useState(false);
  const [unisonWidth, setUnisonWidth] = useState(0.6);
  const [currentKey, setCurrentKey] = useState('C');
  const [currentScaleType, setCurrentScaleType] = useState('minor');
 
  useEffect(() => {
    audioEngine.onTick((bar) => {
      setCurrentBar(bar);
    });
    // Sync initial values
    setChordStyle(audioEngine.chordStyle);
    setChordVolume(audioEngine.chordVolume);
    setChordProgressionName(audioEngine.chordProgressionPathName);
    setAmbientOnly(audioEngine.ambientOnly);
    setAmbientSubActive(audioEngine.ambientSubActive);
    setScaleLocked(audioEngine.scaleLocked);
    setAdsrEnabled(audioEngine.adsrEnabled);
    setChordLengthMult((audioEngine.chordLengthMult - 0.2) / 3.8);
    setChordAttack((audioEngine.chordAttack - 0.005) / 2.995);
    setChordDecay((audioEngine.chordDecay - 0.01) / 2.99);
    setChordSustain(audioEngine.chordSustain);
    setChordRelease((audioEngine.chordRelease - 0.01) / 4.99);
    setKeyTranspose(audioEngine.keyTranspose);
    setChordDriftEnabled(audioEngine.chordDriftEnabled);
    setChordDriftAmount(audioEngine.chordDriftAmount);
    setChordDriftSpeed(audioEngine.chordDriftSpeed);
    setHarmonicMutationActive(audioEngine.harmonicMutationActive);
    setMutationRate(audioEngine.mutationRate);
    setChordGlideEnabled(audioEngine.chordGlideEnabled);
    setChordGlideTime((audioEngine.chordGlideTime - 0.05) / 1.15); // scaled 0.05 - 1.2s range to percentage
    setDubstepMode(audioEngine.dubstepMode);
    setUnisonWidth(audioEngine.unisonWidth);
    setCurrentKey(audioEngine.currentKey);
    setCurrentScaleType(audioEngine.currentScaleType);
  }, []);

  const handleInit = async () => {
    try {
      await audioEngine.init();
      setIsReady(true);
      setStatus('ENGINE_READY');
    } catch (e: any) {
      setStatus('ERROR: ' + e.message);
    }
  };

  const handleLoadDropboxSamples = async () => {
    let readyFlag = isReady;
    if (!readyFlag) {
      try {
        await audioEngine.init();
        setIsReady(true);
        readyFlag = true;
      } catch (e: any) {
        setStatus('ERROR Init: ' + e.message);
        return;
      }
    }
    setLoadingSamples(true);
    setSampleError(null);
    setSampleProgress('Connecting to Dropbox storage...');
    
    await audioEngine.loadDropboxSamples((msg) => {
      setSampleProgress(msg);
    });

    setLoadingSamples(audioEngine.loadingSamples);
    setUseSamples(audioEngine.useSamples);
    setLoadedSamplesCount(audioEngine.loadedSamplesCount);
    setSampleError(audioEngine.loadError);
    if (audioEngine.useSamples) {
      setStatus('SAMPLES_ACTIVE');
    } else if (audioEngine.loadError) {
      setStatus('SAMPLE_LOAD_FAILED');
    }
  };

  const handleToggleSamples = (enable: boolean) => {
    audioEngine.useSamples = enable;
    setUseSamples(enable);
    setStatus(enable ? 'USING_DROPBOX_SAMPLES' : 'USING_SYNTH_DRUMS');
  };

  const handleSwingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSwing(val);
    audioEngine.swingAmount = val;
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setBpm(val);
    audioEngine.setBpm(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVolume(val);
    audioEngine.setMasterVolume(val);
  };

  const handleWobbleChange = (val: number) => {
    setWobble(val);
    audioEngine.wobbleRatio = val;
  };

  const handleBitcrushChange = (val: number) => {
    setBitcrush(val);
    audioEngine.bitcrushRatio = val;
  };

  const handleSubDepthChange = (val: number) => {
    setSubDepth(val);
    audioEngine.subDepthRatio = val;
  };

  const handleResonanceChange = (val: number) => {
    setResonance(val);
    audioEngine.resonanceRatio = val;
  };

  const handleChordStyleChange = (style: 'rhodes' | 'twinkle' | 'pluck' | 'off') => {
    setChordStyle(style);
    audioEngine.chordStyle = style;
  };

  const handleChordVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setChordVolume(val);
    audioEngine.chordVolume = val;
  };

  const handlePlayModeChange = (mode: 'solo' | 'groove' | 'dubstep') => {
    let changed = false;
    if (mode === 'solo') {
      setAmbientOnly(true);
      audioEngine.ambientOnly = true;
      setDubstepMode(false);
      audioEngine.dubstepMode = false;
      changed = true;
    } else if (mode === 'groove') {
      setAmbientOnly(false);
      audioEngine.ambientOnly = false;
      setDubstepMode(false);
      audioEngine.dubstepMode = false;
      changed = true;
    } else if (mode === 'dubstep') {
      setAmbientOnly(false);
      audioEngine.ambientOnly = false;
      setDubstepMode(true);
      audioEngine.dubstepMode = true;
      setAmbientSubActive(true);
      audioEngine.ambientSubActive = true;
      setBpm(142);
      audioEngine.setBpm(142);
      changed = true;
    }

    if (changed && isReady) {
      audioEngine.generateLoop();
      setBassPatterns([...audioEngine.bassPatterns]);
      setChordProgressionName(audioEngine.chordProgressionPathName);
      setHasSequence(true);
    }
  };

  const handleAmbientSubActiveChange = (val: boolean) => {
    setAmbientSubActive(val);
    audioEngine.ambientSubActive = val;
  };

  const handleAdsrEnabledChange = (val: boolean) => {
    setAdsrEnabled(val);
    audioEngine.adsrEnabled = val;
  };

  const handleChordLengthMultChange = (val: number) => {
    setChordLengthMult(val);
    audioEngine.chordLengthMult = 0.2 + val * 3.8;
  };

  const handleChordAttackChange = (val: number) => {
    setChordAttack(val);
    audioEngine.chordAttack = 0.005 + val * 2.995;
  };

  const handleChordDecayChange = (val: number) => {
    setChordDecay(val);
    audioEngine.chordDecay = 0.01 + val * 2.99;
  };

  const handleChordSustainChange = (val: number) => {
    setChordSustain(val);
    audioEngine.chordSustain = val;
  };

  const handleChordReleaseChange = (val: number) => {
    setChordRelease(val);
    audioEngine.chordRelease = 0.01 + val * 4.99;
  };

  const handleKeyTransposeChange = (val: number) => {
    setKeyTranspose(val);
    audioEngine.keyTranspose = val;
  };

  const handleScaleLockedChange = (val: boolean) => {
    setScaleLocked(val);
    audioEngine.scaleLocked = val;
    if (val) {
      audioEngine.generateProgressionFromScale();
      setChordProgressionName(audioEngine.chordProgressionPathName);
    }
  };

  const handleCurrentKeyChange = (key: string) => {
    setCurrentKey(key);
    audioEngine.currentKey = key;
    if (scaleLocked) {
      audioEngine.generateProgressionFromScale();
      setChordProgressionName(audioEngine.chordProgressionPathName);
    }
  };

  const handleCurrentScaleTypeChange = (type: string) => {
    setCurrentScaleType(type);
    audioEngine.currentScaleType = type;
    if (scaleLocked) {
      audioEngine.generateProgressionFromScale();
      setChordProgressionName(audioEngine.chordProgressionPathName);
    }
  };

  const handleUnisonWidthChange = (val: number) => {
    setUnisonWidth(val);
    audioEngine.unisonWidth = val;
  };

  const handleScalePresetChange = (name: string) => {
    // If presets are clicked, unlock scale lock to allow the user to explore preset progressions freely
    setScaleLocked(false);
    audioEngine.scaleLocked = false;
    audioEngine.changeScalePreset(name);
    setChordProgressionName(audioEngine.chordProgressionPathName);
  };

  const handleChordDriftEnabledChange = (val: boolean) => {
    setChordDriftEnabled(val);
    audioEngine.chordDriftEnabled = val;
  };

  const handleChordDriftAmountChange = (val: number) => {
    setChordDriftAmount(val);
    audioEngine.chordDriftAmount = val;
  };

  const handleChordDriftSpeedChange = (val: number) => {
    setChordDriftSpeed(val);
    audioEngine.chordDriftSpeed = val;
  };

  const handleHarmonicMutationActiveChange = (val: boolean) => {
    setHarmonicMutationActive(val);
    audioEngine.harmonicMutationActive = val;
  };

  const handleMutationRateChange = (val: number) => {
    setMutationRate(val);
    audioEngine.mutationRate = val;
  };

  const handleChordGlideEnabledChange = (val: boolean) => {
    setChordGlideEnabled(val);
    audioEngine.chordGlideEnabled = val;
  };

  const handleChordGlideTimeChange = (val: number) => {
    setChordGlideTime(val);
    audioEngine.chordGlideTime = 0.05 + val * 1.15; // scales 0 to 1 back to 0.05 - 1.2s range
  };

  const handleDubstepModeChange = (val: boolean) => {
    handlePlayModeChange(val ? 'dubstep' : 'groove');
  };

  const handleGenLoop = () => {
    if (!isReady) return;
    audioEngine.generateLoop();
    setBassPatterns([...audioEngine.bassPatterns]);
    setChordProgressionName(audioEngine.chordProgressionPathName);
    setHasSequence(true);
    setStatus('PATTERN_LOADED');
  };

  const handlePlay = async () => {
    if (!isReady) return;
    await audioEngine.play();
    setIsPlaying(true);
    setStatus('PLAYING');
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentBar(0);
    setStatus('STOPPED');
  };

  const handleOneShot = async () => {
    if (!isReady) return;
    await audioEngine.oneShot();
    setStatus('ONE_SHOT_TRIG');
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full lg:overflow-hidden font-sans text-slate-100 theme-bg">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/5 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center rotate-45 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <div className="w-4 h-4 bg-white rounded-sm -rotate-45"></div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter italic uppercase">Vortex <span className="text-white/40">//</span> Waveform</h1>
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-cyan-400 opacity-80">Neuro-Bass Synthesizer Engine v2.4</p>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Master Vol</p>
            <p className="text-base sm:text-lg font-mono accent-cyan">{masterVolume === 0 ? '-∞' : (20 * Math.log10(masterVolume)).toFixed(1)} dB</p>
          </div>
          <div className="w-12 h-10 px-2 sm:w-16 sm:h-12 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col items-center justify-center leading-none">
            <span className="text-[8px] text-cyan-400 font-extrabold tracking-widest uppercase mb-0.5">BPM</span>
            <span className="font-mono text-xs sm:text-sm text-slate-100">{bpm}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-full lg:w-64 flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-col gap-4 flex-shrink-0">
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <button 
              onClick={handleInit}
              disabled={isReady}
              className={`w-full py-4 rounded-xl ${!isReady ? 'bg-cyan-500 hover:brightness-110 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : 'bg-cyan-900 opacity-70'} text-black font-black uppercase tracking-wider text-[11px] transition-all`}
            >
              {isReady ? 'Engine Active' : 'Initialize Engine'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleOneShot}
                disabled={!isReady}
                className="neo-button py-3 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50"
              >
                One-Shot
              </button>
              <button 
                disabled={!isReady}
                className="neo-button py-3 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50"
              >
                Resample
              </button>
            </div>
          </div>

          {/* Dropbox Sample Pack Panel */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50 flex items-center justify-between">
              <span>Sample Engine</span>
              {loadedSamplesCount > 0 && <span className="text-cyan-400 font-mono text-[9px]">{loadedSamplesCount} WAVS</span>}
            </h3>

            {loadedSamplesCount === 0 ? (
              <button
                onClick={handleLoadDropboxSamples}
                disabled={loadingSamples}
                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-[10px] text-black ${
                  loadingSamples 
                    ? 'bg-slate-700 animate-pulse text-white' 
                    : 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                } transition-all`}
              >
                <Download size={12} className={loadingSamples ? "animate-spin text-white" : "text-black"} />
                {loadingSamples ? 'Downloading...' : 'Load Dropbox Pack'}
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Active selection pills */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/30 rounded-lg">
                  <button
                    onClick={() => handleToggleSamples(false)}
                    className={`py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                      !useSamples 
                        ? 'bg-white/10 text-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Synth Drums
                  </button>
                  <button
                    onClick={() => handleToggleSamples(true)}
                    className={`py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                      useSamples 
                        ? 'bg-white/10 text-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Dropbox Wavs
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-[9px] text-emerald-400/80 bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                  <Check size={11} className="text-emerald-400" />
                  <span className="truncate">Sample pack loaded!</span>
                </div>
              </div>
            )}

            {/* Loading Progress State */}
            {loadingSamples && (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-[9px] text-cyan-300/80 font-mono animate-pulse truncate leading-relaxed">
                  {sampleProgress}
                </p>
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                  <div className="bg-cyan-400 h-1 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Error messaging */}
            {sampleError && (
              <div className="flex gap-2 items-start text-[9px] text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-lg p-2.5 mt-1">
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="flex flex-col gap-1 leading-normal">
                  <span className="font-bold">Connection status:</span>
                  <p className="text-slate-300 font-medium">{sampleError}</p>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50">Groove Info</h3>
            
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Swing Amount</span>
                <span className="accent-cyan text-[11px]">{Math.round(swing * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="0.6" 
                step="0.01"
                value={swing}
                onChange={handleSwingChange}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Tempo (BPM)</span>
                <span className="accent-cyan text-[11px]">{bpm} BPM</span>
              </div>
              <input 
                type="range" 
                min="90" 
                max="180" 
                step="1"
                value={bpm}
                onChange={handleBpmChange}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Master Volume</span>
                <span className="accent-pink text-[11px]">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={masterVolume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(236,72,153,0.8)]"
              />
            </div>
            
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50 pt-2 border-t border-white/5 flex justify-between items-center">
              <span>Parameters</span>
              <span className="text-[8px] text-white/30 lowercase italic">Drag up/down</span>
            </h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-6">
              <Knob 
                label="Wobble" 
                value={wobble} 
                onChange={handleWobbleChange} 
                accentColor="cyan"
              />
              <Knob 
                label="Bitcrush" 
                value={bitcrush} 
                onChange={handleBitcrushChange} 
                accentColor="cyan"
              />
              <Knob 
                label="Sub Depth" 
                value={subDepth} 
                onChange={handleSubDepthChange} 
                accentColor="pink"
              />
              <Knob 
                label="Reverb" 
                value={resonance} 
                onChange={handleResonanceChange} 
                accentColor="cyan"
              />
            </div>
          </div>

          {/* Ambient Chord Engine Panel */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Ambient Chords</h3>
              <span className="text-[10px] font-mono text-white/50">{chordProgressionName}</span>
            </div>

            {/* Scale selection & Locking options - requested by user */}
            <div className="flex flex-col gap-3.5 p-3.5 bg-black/45 rounded-xl border border-white/[0.04] shadow-inner">
              
              {/* Scale Lock Header */}
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-100 tracking-wider">
                <span>Scale Lock Engine</span>
                <button
                  type="button"
                  onClick={() => handleScaleLockedChange(!scaleLocked)}
                  className={`px-2.5 py-1 rounded text-[8px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                    scaleLocked
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-zinc-800 text-zinc-400 border border-transparent'
                  }`}
                >
                  <span>{scaleLocked ? "🔒 LOCKED" : "🔓 UNLOCKED"}</span>
                </button>
              </div>

              {/* Piano Roll Key Select Grid */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Root Key</span>
                <div className="grid grid-cols-6 gap-1 p-1 bg-black/30 rounded-lg border border-white/5">
                  {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleCurrentKeyChange(k)}
                      className={`text-[9px] font-mono py-1 rounded-md transition-all font-bold ${
                        currentKey === k
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 shadow-[0_0_6px_rgba(6,182,212,0.15)] scale-[1.03]'
                          : k.includes('#') || k === 'Eb' || k === 'Ab' || k === 'Bb'
                          ? 'bg-black/40 text-white/35 hover:text-white/70'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale type selectors */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Scale Mode</span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-lg border border-white/5">
                  {[
                    { id: 'minor', label: 'Nat Minor' },
                    { id: 'major', label: 'Major' },
                    { id: 'phrygian', label: 'Phrygian' },
                    { id: 'dorian', label: 'Dorian' },
                    { id: 'lharmonic', label: 'Harmonic Min' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleCurrentScaleTypeChange(s.id)}
                      className={`text-[8px] uppercase tracking-wider py-1 px-1 rounded transition-all font-bold truncate ${
                        currentScaleType === s.id && scaleLocked
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/35 shadow-[0_0_6px_rgba(236,72,153,0.15)]'
                          : 'bg-white/5 text-white/45 hover:text-white/85'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleScalePresetChange('Nebula Drift')}
                    className="text-[8px] uppercase tracking-wider py-1 px-1 rounded transition-all font-bold bg-white/[0.02] border border-dashed border-white/10 text-white/45 hover:text-white/80 hover:bg-white/5 truncate"
                    title="Unlock and reset to Nebula Drift original chord preset list"
                  >
                    Preset Mode 🎚️
                  </button>
                </div>
              </div>

              {/* VITAL STEREO WIDE UNISON ADJUSTMENT - "a vital type adjustment wide" */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-300">
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="animate-pulse">💎</span> Vital Wide Unison
                  </span>
                  <span className="text-amber-400 font-mono text-[10px]">{Math.round(unisonWidth * 100)}%</span>
                </div>
                <div className="flex items-center gap-3.5 bg-black/20 p-2 rounded-lg border border-white/[0.03]">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={unisonWidth}
                    onChange={(e) => handleUnisonWidthChange(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(251,191,36,0.8)] outline-none"
                    title="Controls the stereo spread and voice detuning of synth oscillators for that signature ultra-wide Vital synthesizer sound!"
                  />
                  <span className="text-[7.5px] uppercase font-black tracking-widest font-mono text-white/40">Width</span>
                </div>
              </div>
            </div>

            {/* Selection buttons for Chord Styles */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/30 rounded-lg">
              <button
                onClick={() => handleChordStyleChange('rhodes')}
                className={`py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                  chordStyle === 'rhodes'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                Rhodes
              </button>
              <button
                onClick={() => handleChordStyleChange('twinkle')}
                className={`py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                  chordStyle === 'twinkle'
                    ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                Twinkle ✨
              </button>
              <button
                onClick={() => handleChordStyleChange('pluck')}
                className={`py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                  chordStyle === 'pluck'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                Dreamy
              </button>
              <button
                onClick={() => handleChordStyleChange('off')}
                className={`py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                  chordStyle === 'off'
                    ? 'bg-white/10 text-white/95 border border-white/20'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                Mute
              </button>
            </div>

            {/* Chord Volume Slider */}
            {chordStyle !== 'off' && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                  <span>Chord Blend</span>
                  <span className="text-cyan-400 font-mono text-[11px]">{Math.round(chordVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={chordVolume}
                  onChange={handleChordVolumeChange}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                />
              </div>
            )}

            {/* Active Chord Realtime Tracker */}
            {chordStyle !== 'off' && (
              <div className="flex items-center justify-between gap-2 bg-black/40 border border-cyan-500/10 rounded-xl p-3">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">Active bar chord</span>
                  <span className="text-xs font-black font-mono text-cyan-300">
                    {audioEngine.chordProgression[currentBar]
                      ? transposeChordName(audioEngine.chordProgression[currentBar].name, keyTranspose)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 h-6">
                  {audioEngine.chordProgression[currentBar]?.notes.map((note, idx) => (
                    <span 
                      key={idx}
                      className={`w-1 font-mono rounded bg-cyan-400 transition-all duration-300`}
                      style={{ 
                        height: `${Math.max(4, (note - 32) * 0.4)}px`,
                        opacity: isPlaying ? 0.9 : 0.3
                      }}
                    ></span>
                  ))}
                </div>
              </div>
            )}

            {/* Playmode Option: Solo / Groove / Dubstep */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Play Mode</span>
                <span className={
                  dubstepMode 
                    ? "text-amber-400 font-mono text-[11px]" 
                    : ambientOnly 
                    ? "text-pink-400 font-mono text-[11px]" 
                    : "text-cyan-400 font-mono text-[11px]"
                }>
                  {dubstepMode ? "Nuclear Dubstep ☢️" : ambientOnly ? "Ambient Solo ✨" : "Ambient Groove 🌌"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/25 rounded-lg">
                <button
                  type="button"
                  onClick={() => handlePlayModeChange('solo')}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all whitespace-nowrap px-1 ${
                    ambientOnly && !dubstepMode
                      ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-[0_0_6px_rgba(236,72,153,0.15)]'
                      : 'text-white/45 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Solo
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayModeChange('groove')}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all whitespace-nowrap px-1 ${
                    !ambientOnly && !dubstepMode
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_6px_rgba(6,182,212,0.15)]'
                      : 'text-white/45 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Groove
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayModeChange('dubstep')}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all whitespace-nowrap px-1 ${
                    dubstepMode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                      : 'text-white/45 hover:text-white/70 border border-transparent'
                  }`}
                >
                  ☢️ Dubstep
                </button>
              </div>
            </div>

            {/* Ambient Sub Bass Toggle */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Ambient Sub Bass</span>
                <span className={ambientSubActive ? "text-yellow-400 font-mono text-[11px]" : "text-white/40 font-mono text-[11px]"}>
                  {ambientSubActive ? "Deep Sub 🔊" : "Off"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/25 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleAmbientSubActiveChange(false)}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                    !ambientSubActive
                      ? 'bg-white/10 text-white/95 border border-white/20'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  No Sub
                </button>
                <button
                  type="button"
                  onClick={() => handleAmbientSubActiveChange(true)}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                    ambientSubActive
                      ? 'bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.2)]'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Deep Sub
                </button>
              </div>
            </div>

            {/* Chord Duration & Custom envelope controls */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Chord Envelope</span>
                <span className={adsrEnabled ? "text-cyan-400 font-mono text-[11px]" : "text-white/45 font-mono text-[11px]"}>
                  {adsrEnabled ? "Custom ADSR" : "Standard ADSR"}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/25 rounded-lg mb-1">
                <button
                  type="button"
                  onClick={() => handleAdsrEnabledChange(false)}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                    !adsrEnabled
                      ? 'bg-white/10 text-white/95 border border-white/20'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleAdsrEnabledChange(true)}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                    adsrEnabled
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Custom
                </button>
              </div>

              {adsrEnabled && (
                <div className="grid grid-cols-4 gap-y-3 gap-x-1 py-1.5 bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <Knob 
                    label="Att" 
                    value={chordAttack} 
                    onChange={handleChordAttackChange} 
                    accentColor="cyan"
                    defaultValue={0.048}
                  />
                  <Knob 
                    label="Dec" 
                    value={chordDecay} 
                    onChange={handleChordDecayChange} 
                    accentColor="cyan"
                    defaultValue={0.197}
                  />
                  <Knob 
                    label="Sus" 
                    value={chordSustain} 
                    onChange={handleChordSustainChange} 
                    accentColor="pink"
                    defaultValue={0.4}
                  />
                  <Knob 
                    label="Rel" 
                    value={chordRelease} 
                    onChange={handleChordReleaseChange} 
                    accentColor="cyan"
                    defaultValue={0.298}
                  />
                </div>
              )}

              {/* Chord length / Duration slider */}
              <div className="flex flex-col gap-1.5 mt-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-300">
                  <span>Chord Gate (Length)</span>
                  <span className="text-pink-400 font-mono text-[11px]">
                    {Math.round((0.2 + chordLengthMult * 3.8) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={chordLengthMult}
                  onChange={(e) => handleChordLengthMultChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                />
              </div>

              {/* Pitch Transpose & Key Control */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                  <span>Pitch Key Shift</span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    {keyTranspose === 0 ? "Original Key" : keyTranspose > 0 ? `+${keyTranspose} Semitones` : `${keyTranspose} Semitones`}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 bg-black/35 rounded-xl p-2.5 border border-white/5">
                  <div className="flex-1 flex flex-col gap-1.5 justify-center">
                    <span className="text-[8px] uppercase font-bold text-white/30 tracking-wider">Quick Select</span>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => handleKeyTransposeChange(-12)}
                        className={`py-1 text-[8px] font-bold font-mono rounded ${
                          keyTranspose === -12 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.15)]" : "bg-black/30 text-white/50 hover:text-white"
                        }`}
                        title="Transpose down 1 Octave"
                      >
                        -12st
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeyTransposeChange(-5)}
                        className={`py-1 text-[8px] font-bold font-mono rounded ${
                          keyTranspose === -5 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.15)]" : "bg-black/30 text-white/50 hover:text-white"
                        }`}
                        title="Transpose down a Perfect 4th"
                      >
                        -5st
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeyTransposeChange(0)}
                        className={`py-1 text-[8px] font-bold font-mono rounded ${
                          keyTranspose === 0 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.15)]" : "bg-black/30 text-white/50 hover:text-white"
                        }`}
                        title="Reset to Original"
                      >
                        0st
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeyTransposeChange(7)}
                        className={`py-1 text-[8px] font-bold font-mono rounded ${
                          keyTranspose === 7 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.15)]" : "bg-black/30 text-white/50 hover:text-white"
                        }`}
                        title="Transpose up a Perfect 5th"
                      >
                        +7st
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleKeyTransposeChange(Math.max(-12, keyTranspose - 1))}
                        className="py-1 text-[8px] font-bold uppercase rounded bg-black/25 text-white/60 hover:text-cyan-400/90 transition-colors"
                      >
                        ◄ Semitone
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeyTransposeChange(Math.min(12, keyTranspose + 1))}
                        className="py-1 text-[8px] font-bold uppercase rounded bg-black/25 text-white/60 hover:text-cyan-400/90 transition-colors"
                      >
                        Semitone ►
                      </button>
                    </div>
                  </div>

                  <div className="flex shrink-0 justify-center">
                    <Knob
                      label="Key Tune"
                      value={(keyTranspose + 12) / 24}
                      onChange={(pct) => handleKeyTransposeChange(Math.round((pct * 24) - 12))}
                      accentColor="cyan"
                      defaultValue={0.5}
                      displayValue={keyTranspose === 0 ? "0 st" : keyTranspose > 0 ? `+${keyTranspose} st` : `${keyTranspose} st`}
                    />
                  </div>
                </div>
              </div>

              {/* Chord Drift & Mutation Engine */}
              <div className="flex flex-col gap-2 pt-2.5 border-t border-white/5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                  <span>Chord Drift & Evolution</span>
                  <span className={chordDriftEnabled || harmonicMutationActive ? "text-cyan-400 font-mono text-[10px]" : "text-white/45 font-mono text-[10px]"}>
                    {chordDriftEnabled && harmonicMutationActive ? "Full Drift" : chordDriftEnabled ? "Pitch Drift" : harmonicMutationActive ? "Voice Drift" : "Static"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded-xl border border-white/[0.03]">
                  {/* Left Column: Pitch Wobble Drift */}
                  <div className="flex flex-col gap-2 p-1.5 bg-black/25 rounded-lg border border-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => handleChordDriftEnabledChange(!chordDriftEnabled)}
                      className={`w-full py-1 rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                        chordDriftEnabled
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/35 shadow-[0_0_6px_rgba(6,182,212,0.15)]'
                          : 'bg-white/[0.02] text-white/40 border border-transparent hover:text-white/70'
                      }`}
                    >
                      <span>Pitch Drift</span>
                      <span>{chordDriftEnabled ? "⬤" : "◯"}</span>
                    </button>
                    {chordDriftEnabled && (
                      <div className="flex justify-around items-center gap-1 pt-1">
                        <Knob
                          label="Wobble"
                          value={chordDriftAmount}
                          onChange={handleChordDriftAmountChange}
                          accentColor="cyan"
                          defaultValue={0.35}
                        />
                        <Knob
                          label="Speed"
                          value={chordDriftSpeed}
                          onChange={handleChordDriftSpeedChange}
                          accentColor="cyan"
                          defaultValue={0.4}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Harmonic / Voice Drift */}
                  <div className="flex flex-col gap-2 p-1.5 bg-black/25 rounded-lg border border-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => handleHarmonicMutationActiveChange(!harmonicMutationActive)}
                      className={`w-full py-1 rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                        harmonicMutationActive
                          ? 'bg-pink-500/15 text-pink-400 border border-pink-500/35 shadow-[0_0_6px_rgba(236,72,153,0.15)]'
                          : 'bg-white/[0.02] text-white/40 border border-transparent hover:text-white/70'
                      }`}
                    >
                      <span>Harmonic</span>
                      <span>{harmonicMutationActive ? "⬤" : "◯"}</span>
                    </button>
                    {harmonicMutationActive && (
                      <div className="flex justify-center items-center gap-1 pt-1">
                        <Knob
                          label="Rate"
                          value={mutationRate}
                          onChange={handleMutationRateChange}
                          accentColor="pink"
                          defaultValue={0.25}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Glide / Legato Slides Control */}
                <div className="flex items-center justify-between gap-4 p-2 bg-black/25 rounded-xl border border-white/[0.03]">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[8px] uppercase font-bold text-slate-300 tracking-wider">Smooth Chord Glide</span>
                    <p className="text-[8px] text-white/30 leading-tight">Glides note pitches smoothly on chord changes for a cohesive soundscape.</p>
                    <button
                      type="button"
                      onClick={() => handleChordGlideEnabledChange(!chordGlideEnabled)}
                      className={`py-1 rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 border mt-1.5 ${
                        chordGlideEnabled
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_6px_rgba(6,182,212,0.15)]'
                          : 'bg-black/35 text-white/30 border-transparent hover:text-white'
                      }`}
                    >
                      <span>{chordGlideEnabled ? "Glide Active" : "Glide Inactive"}</span>
                      <span className="text-[9px]">{chordGlideEnabled ? "●" : "◯"}</span>
                    </button>
                  </div>
                  {chordGlideEnabled && (
                    <div className="flex shrink-0 pr-1">
                      <Knob
                        label="Glide Rate"
                        value={chordGlideTime}
                        onChange={handleChordGlideTimeChange}
                        accentColor="cyan"
                        defaultValue={0.26}
                        displayValue={`${Math.round((0.05 + chordGlideTime * 1.15) * 1000)}ms`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-1 md:mt-2 lg:mt-0 flex-1 flex items-end">
            <div className="w-full p-4 glass-panel rounded-xl text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-tighter">Engine Status</p>
              <p className="text-xs font-mono text-cyan-200 mt-1">{status}</p>
            </div>
          </div>
        </aside>

        {/* Central Engine Workspace */}
        <section className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Oscilloscope / Visualizer */}
          <Visualizer analyser={audioEngine.analyser} />

          {/* Sequencer Section */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-6 sm:gap-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-center px-1 sm:px-2 gap-4">
              <div className="flex gap-4 sm:gap-6">
                <button 
                  onClick={handlePlay}
                  disabled={!hasSequence || isPlaying}
                  className={`text-xs font-black uppercase flex items-center gap-2 ${isPlaying ? 'accent-cyan text-cyan-400' : 'text-slate-100 hover:text-cyan-400 transition-colors'} ${!hasSequence ? 'opacity-30' : ''}`}
                >
                  <Play size={14} className={isPlaying ? 'fill-cyan-400 text-cyan-400' : 'fill-slate-100'} /> Play
                </button>
                <button 
                  onClick={handleStop}
                  disabled={!isPlaying}
                  className={`text-xs font-black uppercase flex items-center gap-2 ${isPlaying ? 'text-slate-100 hover:text-pink-400 transition-colors' : 'text-white/40'}`}
                >
                  <Square size={14} className={isPlaying ? 'fill-slate-100' : 'fill-transparent'} /> Stop
                </button>
              </div>
              <div className="flex items-center justify-center sm:justify-end">
                {dubstepMode ? (
                  <button 
                    onClick={handleGenLoop}
                    className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 whitespace-nowrap bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse hover:bg-amber-500/35 hover:scale-[1.02] active:scale-100 transition-all"
                    title="Generate a brand new hard-hitting Nuclear Dubstep loop pattern!"
                  >
                    <span>☢️ GENERATE DUBSTEP DROP</span>
                  </button>
                ) : (
                  <button 
                    onClick={handleGenLoop}
                    className="neo-button px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 flex items-center justify-center whitespace-nowrap hover:bg-white/10 hover:scale-[1.02] active:scale-100 transition-all"
                    title="Generate a brand new peaceful chord progression and rhythm pattern!"
                  >
                    Generate New Pattern
                  </button>
                )}
              </div>
            </div>

            <div className="w-full overflow-x-auto pb-2 -mx-2 px-2 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
              <div className="min-w-[500px] sm:min-w-0">
                <Sequencer 
                  currentBar={currentBar} 
                  isPlaying={isPlaying} 
                  bassPatterns={bassPatterns} 
                />
              </div>
            </div>

            <div className="flex justify-center gap-4 sm:gap-8 mt-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{background: '#00f2ff'}}></div>
                <span className="text-[9px] uppercase font-bold text-white/40">Deep Sub/Bass</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{background: '#ff00e5'}}></div>
                <span className="text-[9px] uppercase font-bold text-white/40">Aggressive Drums</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{background: '#fbff00'}}></div>
                <span className="text-[9px] uppercase font-bold text-white/40">Noise Build-up</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-8 py-4 bg-black/40 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-2 text-[8px] sm:text-[10px] font-bold tracking-widest text-white/20 flex-shrink-0">
        <p>LATENCY: 12ms // BUFFER: 512</p>
        <p>DESIGNED FOR WEB AUDIO API v3</p>
        <p>GLITCHCORE SYSTEM ACTIVE</p>
      </footer>
    </div>
  );
}


