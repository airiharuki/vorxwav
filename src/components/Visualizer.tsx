import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  className?: string;
}

export function Visualizer({ analyser, className = '' }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteTimeDomainData(dataArray);
      
      // Update dimensions to match display size
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      
      const width = canvas.width;
      const height = canvas.height;

      // Transparent background so we can see the glass-panel behind it
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00f2ff'; // cyan
      ctx.beginPath();

      const sliceWidth = width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  return (
    <div className={`flex-1 glass-panel rounded-3xl relative overflow-hidden group min-h-[120px] ${className}`}>
      <div className="absolute top-4 left-6 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-100">Real-time FFT Analysis</span>
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0"
      />
      
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="w-[80%] h-px bg-white"></div>
      </div>
      
      <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none"></div>
    </div>
  );
}

