import React, { useState, useEffect } from 'react';
import { Play, Square, Zap, RefreshCw, Power, Download, Library, Check, AlertCircle } from 'lucide-react';
import { audioEngine } from './lib/audioEngine';
import { Sequencer } from './components/Sequencer';
import { Visualizer } from './components/Visualizer';
import { Knob } from './components/Knob';

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
  const [adsrEnabled, setAdsrEnabled] = useState(false);
  const [chordLengthMult, setChordLengthMult] = useState(1.0);
  const [chordAttack, setChordAttack] = useState(0.15);
  const [chordDecay, setChordDecay] = useState(0.6);
  const [chordSustain, setChordSustain] = useState(0.4);
  const [chordRelease, setChordRelease] = useState(1.5);

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
    setAdsrEnabled(audioEngine.adsrEnabled);
    setChordLengthMult((audioEngine.chordLengthMult - 0.2) / 3.8);
    setChordAttack((audioEngine.chordAttack - 0.005) / 2.995);
    setChordDecay((audioEngine.chordDecay - 0.01) / 2.99);
    setChordSustain(audioEngine.chordSustain);
    setChordRelease((audioEngine.chordRelease - 0.01) / 4.99);
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

  const handleAmbientOnlyChange = (val: boolean) => {
    setAmbientOnly(val);
    audioEngine.ambientOnly = val;
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
                    {audioEngine.chordProgression[currentBar]?.name || "N/A"}
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

            {/* Playmode Option: Ambient Only (Mute Drums & Bass) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-100">
                <span>Play Mode</span>
                <span className={ambientOnly ? "text-pink-400 font-mono text-[11px]" : "text-cyan-400 font-mono text-[11px]"}>
                  {ambientOnly ? "Ambient Solo ✨" : "Full Groove"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/25 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleAmbientOnlyChange(false)}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                    !ambientOnly
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Full Groove
                </button>
                <button
                  type="button"
                  onClick={() => handleAmbientOnlyChange(true)}
                  className={`py-1 rounded text-[8px] font-bold uppercase transition-all ${
                    ambientOnly
                      ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  Ambient Solo
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
              <button 
                onClick={handleGenLoop}
                className="neo-button px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5"
              >
                Generate New Pattern
              </button>
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


