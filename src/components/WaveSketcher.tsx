import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Trash2, Sliders, Play, Settings2 } from 'lucide-react';

interface WaveSketcherProps {
  onWaveformChange: (values: number[]) => void;
  initialWaveform?: number[];
}

export function WaveSketcher({ onWaveformChange, initialWaveform }: WaveSketcherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<number[]>(() => {
    if (initialWaveform && initialWaveform.length > 0) {
      return [...initialWaveform];
    }
    // Default to a rich warm wave (Sine + 3rd harmonic slightly loaded)
    const defaultWave: number[] = [];
    for (let i = 0; i < 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      defaultWave.push(Math.sin(angle) * 0.7 + Math.sin(angle * 3) * 0.25);
    }
    return defaultWave;
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('custom');

  useEffect(() => {
    onWaveformChange(points);
  }, [points]);

  // Redraw canvas whenever points or size changes
  useEffect(() => {
    drawWave();
  }, [points]);

  const drawWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions for sharp rendering
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw helper grids
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Horiz grid lines
    const gridLinesY = [0.25, 0.5, 0.75];
    gridLinesY.forEach((val) => {
      ctx.beginPath();
      ctx.moveTo(0, h * val);
      ctx.lineTo(w, h * val);
      ctx.stroke();
    });

    // Vertical columns division
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (i / 8), 0);
      ctx.lineTo(w * (i / 8), h);
      ctx.stroke();
    }

    // Horizontal zero-axis marker
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'; // Cyan zero line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw active Waveform curve
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#f43f5e'); // Rose glow top
    gradient.addColorStop(0.5, '#06b6d4'); // Cyan center
    gradient.addColorStop(1, '#8b5cf6'); // Purple base bottom

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const len = points.length;
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      // Map point value (-1.0 to 1.0) to canvas range (h to 0)
      const y = h / 2 - points[i] * (h / 2) * 0.9;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Under-waveform ambient glow filling
    ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h / 2 - points[i] * (h / 2) * 0.9;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h / 2);
    ctx.closePath();
    ctx.fill();

    // Draw control nodes
    ctx.fillStyle = '#06b6d4';
    for (let i = 0; i < len; i += 8) { // Draw nodes every 8 steps to avoid overcrowding
      const x = (i / (len - 1)) * w;
      const y = h / 2 - points[i] * (h / 2) * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  const handlePointerAction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Limit within bounding box
    const xRatio = Math.max(0, Math.min(1, clientX / rect.width));
    const yRatio = Math.max(0, Math.min(1, clientY / rect.height));

    // Convert raw Y coordinate to -1.0 to 1.0 range
    const val = -((yRatio - 0.5) * 2);

    // Find the closest point index to update
    const index = Math.round(xRatio * (points.length - 1));

    setPoints((prev) => {
      const newPoints = [...prev];
      newPoints[index] = val;

      // Add simple visual interpolation (smoothing) between neighboring points
      // so if the user clicks/moves fast, it fills the gap beautifully
      if (index > 0 && Math.abs(newPoints[index] - newPoints[index - 1]) > 0.05) {
        // Smooth backward
        const steps = 4;
        for (let j = 1; j <= steps; j++) {
          const idx = index - j;
          if (idx >= 0) {
            const ratio = j / (steps + 1);
            newPoints[idx] = newPoints[idx] * ratio + val * (1 - ratio);
          }
        }
      }

      return newPoints;
    });
    setActivePreset('custom');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    handlePointerAction(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handlePointerAction(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  // Preset Generation
  const applyPreset = (type: string) => {
    setActivePreset(type);
    const newPoints: number[] = [];
    for (let i = 0; i < 128; i++) {
      const r = i / 128;
      const angle = r * Math.PI * 2;
      switch (type) {
        case 'sine':
          newPoints.push(Math.sin(angle));
          break;
        case 'saw':
          newPoints.push(1.0 - r * 2.0);
          break;
        case 'triangle':
          newPoints.push(r < 0.5 ? -1.0 + r * 4.0 : 3.0 - r * 4.0);
          break;
        case 'square':
          newPoints.push(i < 64 ? 1.0 : -1.0);
          break;
        case 'vital_growl':
          // Famous growl single-cycle form containing sub-octave and sharp formants
          newPoints.push(Math.sin(angle) * 0.5 + Math.sin(angle * 2) * 0.4 - Math.sin(angle * 4) * 0.3);
          break;
        case 'serum_sub':
          // Warm harmonic sub wave style
          newPoints.push(Math.sin(angle) * 0.8 + Math.cos(angle * 3) * 0.15 + Math.sin(angle * 5) * 0.05);
          break;
        default:
          newPoints.push(Math.sin(angle));
      }
    }
    setPoints(newPoints);
  };

  const handleClear = () => {
    // Return to simple flat sine wave
    applyPreset('sine');
  };

  const handleAddNoise = () => {
    setPoints((prev) =>
      prev.map((val) => Math.max(-1, Math.min(1, val + (Math.random() - 0.5) * 0.15)))
    );
    setActivePreset('custom');
  };

  const handleNormalize = () => {
    setPoints((prev) => {
      const maxVal = Math.max(...prev.map((v) => Math.abs(v)));
      if (maxVal === 0) return prev;
      return prev.map((v) => v / maxVal);
    });
  };

  return (
    <div className="flex flex-col gap-4 bg-black/30 p-4 rounded-2xl border border-white/5 shadow-inner">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider">2D Single-Cycle Sketcher</span>
          <span className="text-[8px] text-white/50 uppercase font-mono mt-0.5">Click & Drag to draw customized wavetables</span>
        </div>

        <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
          {['sine', 'saw', 'square', 'vital_growl'].map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => applyPreset(shape)}
              className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded font-black transition-all ${
                activePreset === shape
                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30 shadow-[0_0_8px_rgba(236,72,153,0.15)]'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {shape.replace('vital_', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Drawing Grid Board */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/65 border border-white/[0.06]">
        
        {/* Helper alignment markers */}
        <div className="absolute top-2 left-3 flex select-none text-[8.5px] uppercase font-bold text-slate-100 gap-1 opacity-70">
          <span className="text-cyan-400">⚡</span>
          <span>Adaptive Drawing Resolution: 128 cycles</span>
        </div>
        
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full absolute inset-0 cursor-crosshair touch-none"
        />

        {/* Amplitude coordinates indicators */}
        <div className="absolute top-1/2 right-2 text-[7px] text-zinc-500 -translate-y-1/2 flex flex-col items-end gap-14 pointer-events-none uppercase font-mono leading-none">
          <span>+1.0 v</span>
          <span>0.0 v</span>
          <span>-1.0 v</span>
        </div>
      </div>

      {/* Editing Toolbar */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={handleNormalize}
          className="py-2.5 rounded-lg text-[9px] font-black uppercase bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-slate-300 transition-all flex items-center justify-center gap-1.5"
          title="Scale peaks uniformly to maximum -1.0 to 1.0 volume range"
        >
          <Sliders size={12} className="text-cyan-400" /> Normalize
        </button>

        <button
          type="button"
          onClick={handleAddNoise}
          className="py-2.5 rounded-lg text-[9px] font-black uppercase bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-slate-300 transition-all flex items-center justify-center gap-1.5"
          title="Inject analog white noise harmonics into the draw structure"
        >
          <RefreshCw size={12} className="text-amber-400" /> Harmonic Grime
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="py-2.5 rounded-lg text-[9px] font-black uppercase bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-slate-300 transition-all flex items-center justify-center gap-1.5"
          title="Reset the workspace to a clean sine wave fundamental"
        >
          <Trash2 size={12} className="text-rose-400" /> Reset fundamental
        </button>

        <button
          type="button"
          onClick={() => onWaveformChange(points)}
          className="py-2.5 rounded-lg text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
          title="Bake this custom single-cycle wave directly into active synth oscillators!"
        >
          <Play size={12} /> Bake Waveform
        </button>
      </div>
    </div>
  );
}
