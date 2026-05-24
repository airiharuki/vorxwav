import React, { useRef, useEffect, useState } from 'react';
import { Layers, Activity, RotateCw } from 'lucide-react';

interface WavetableVisualizerProps {
  waves: number[][]; // Multiple wave cycles to render in pseudo-3D
  title?: string;
  className?: string;
}

export function WavetableVisualizer({ waves, title = '3D Wavetable Morph Render', className = '' }: WavetableVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState<number>(35); // rotation angle
  const [depth, setDepth] = useState<number>(60); // 3D depth expansion offset
  const [useWaterfall, setUseWaterfall] = useState<boolean>(true);

  useEffect(() => {
    draw3D();
  }, [waves, rotation, depth, useWaterfall]);

  const draw3D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (waves.length === 0) {
      // Draw standard loading or placeholder frames if empty
      ctx.fillStyle = 'white';
      ctx.font = '24px monospace';
      ctx.fillText('Loading wavetable frames...', 20, 40);
      return;
    }

    // Number of frames to project
    const frameCount = waves.length;
    
    // Set line parameters
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rotRad = (rotation * Math.PI) / 180;
    const skewX = Math.cos(rotRad) * depth;
    const skewY = Math.sin(rotRad) * (depth * 0.4);

    // Render from back-to-front for proper visual occlusion overlap
    for (let f = frameCount - 1; f >= 0; f--) {
      const activeWave = waves[f];
      if (!activeWave) continue;

      // Spacing ratio (from 0 back to 1 front)
      const ratio = f / (frameCount - 1);
      
      // Calculate depth translation offset for this specific layer
      // Back frames translated up and right
      const dx = (1 - ratio) * skewX;
      const dy = (1 - ratio) * skewY;

      // Center the render region
      const startX = w * 0.15 + dx;
      const startY = h * 0.5 - dy;
      const drawWidth = w * 0.65;

      // Color coding: back frames dimmer cyan/purple, front frames brighter rose/yellow
      const hue = 180 + (1 - ratio) * 120; // slide from cyan through purple to hot pink
      const opacity = 0.25 + ratio * 0.75; // fade into the distance

      ctx.strokeStyle = `hsla(${hue}, 90%, 55%, ${opacity})`;
      ctx.fillStyle = `rgba(10, 10, 18, ${useWaterfall ? 0.85 : 0})`; // opaque background for occlusion

      ctx.beginPath();
      const pointsLength = activeWave.length;
      
      // Setup the base path or start coordinate
      const pX0 = startX;
      const pY0 = startY - activeWave[0] * (h * 0.14);
      ctx.moveTo(pX0, pY0);

      for (let i = 0; i < pointsLength; i++) {
        const xProgress = i / (pointsLength - 1);
        const rx = startX + xProgress * drawWidth;
        const ry = startY - activeWave[i] * (h * 0.14);
        ctx.lineTo(rx, ry);
      }

      // If we use Waterfall occlusion, we complete the path to the horizontal zero line to fill it with solid black
      if (useWaterfall) {
        ctx.lineTo(startX + drawWidth, startY);
        ctx.lineTo(startX, startY);
        ctx.closePath();
        ctx.fill(); // occlusion fill
      }
      ctx.stroke(); // stroke the outline
    }
  };

  return (
    <div className={`glass-panel p-4.5 rounded-2xl flex flex-col gap-4 bg-black/35 border border-white/5 ${className}`}>
      
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan-400 animate-pulse" />
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-100">{title}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setUseWaterfall(!useWaterfall)}
            className={`py-1 px-2 rounded text-[7.5px] font-black uppercase transition-all tracking-widest ${
              useWaterfall
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Occlusion Fill
          </button>
        </div>
      </div>

      {/* Visualizer Display Area */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/[0.05] flex items-center justify-center">
        
        {/* Waterfall Perspective lines */}
        <canvas
          ref={canvasRef}
          className="w-full h-full absolute inset-0"
        />

        {/* Floating tech graphics */}
        <div className="absolute top-2.5 right-3 text-[7.5px] font-mono text-cyan-400 p-1.5 bg-black/50 border border-white/5 rounded opacity-60 flex flex-col gap-1 leading-none select-none">
          <span className="flex items-center gap-1">
            <Activity size={8} /> ROT: {rotation}°
          </span>
          <span>DEPTH: {depth}px</span>
          <span>FRAMES: {waves.length}</span>
        </div>
      </div>

      {/* Adjustments Panel */}
      <div className="grid grid-cols-2 gap-3.5 bg-black/20 p-2.5 rounded-lg border border-white/5">
        
        {/* Rotation Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase">
            <span>Y-Skew Angle</span>
            <span className="text-cyan-400 font-mono">{rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full outline-none"
          />
        </div>

        {/* Spacing Offset Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase">
            <span>3D Depth Spacing</span>
            <span className="text-rose-400 font-mono">{depth}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="180"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:rounded-full outline-none"
          />
        </div>

      </div>
    </div>
  );
}
