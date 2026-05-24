import React, { useRef, useEffect } from 'react';

interface CompressorGraphProps {
  threshold: number; // 0 to 1 (mapped to -60 to 0dB)
  ratio: number; // 0 to 1 (mapped to 1:1 to 20:1)
  onChange: (threshold: number, ratio: number) => void;
}

export const CompressorGraph: React.FC<CompressorGraphProps> = ({ threshold, ratio, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * w;
      const y = (i / 4) * h;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Transfer curve
    const threshX = threshold * w;
    const threshY = h - threshold * h;
    
    // Knee and compressed slope
    // ratio = 0 -> 1:1, ratio = 1 -> 20:1
    const actualRatio = 1 + ratio * 19;
    
    ctx.beginPath();
    ctx.strokeStyle = '#22d3ee'; // cyan-400
    ctx.lineWidth = 2;
    ctx.moveTo(0, h);
    ctx.lineTo(threshX, threshY);
    
    // Compressed segment
    const endX = w;
    const endY = threshY - (w - threshX) / actualRatio;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Handle
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(threshX, threshY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  };

  useEffect(() => {
    draw();
  }, [threshold, ratio]);

  const handlePointer = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    // Simple mapping: X is threshold. 
    // For ratio, we look at the vertical relative offset from the linear line or just use Y.
    // The user suggested: Left/Right = Threshold, Up/Down = Ratio.
    // So if user drags vertically, we change ratio.
    
    onChange(x, 1 - y); // Simple mapping
  };

  return (
    <div className="relative group">
      <canvas 
        ref={canvasRef} 
        width={140} 
        height={100} 
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        className="bg-black/60 rounded border border-white/10 cursor-crosshair touch-none"
      />
      <div className="absolute top-1 left-2 text-[6px] font-mono text-cyan-400 transition-opacity group-hover:opacity-100 opacity-60">COMPRESSION CURVE</div>
    </div>
  );
};

interface DistortionGraphProps {
  drive: number;
  type: string;
  onChangeDrive: (drive: number) => void;
}

export const DistortionGraph: React.FC<DistortionGraphProps> = ({ drive, type, onChangeDrive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Center lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    const points = 100;
    ctx.beginPath();
    ctx.strokeStyle = '#fb923c'; // orange-400
    ctx.lineWidth = 2;

    const intensity = 1 + drive * 10;

    for (let i = 0; i < points; i++) {
      const xNorm = (i / (points - 1)) * 2 - 1; // -1 to 1
      let yNorm = xNorm * intensity;

      if (type === 'soft' || type === 'tube') {
        yNorm = Math.tanh(xNorm * intensity);
      } else if (type === 'hard' || type === 'diode') {
        yNorm = Math.max(-1, Math.min(1, xNorm * intensity));
      } else if (type === 'fold') {
        // Simple triangle fold
        const val = xNorm * intensity;
        yNorm = Math.abs((val + 1) % 4 - 2) - 1;
      }

      const px = (xNorm + 1) * 0.5 * w;
      const py = (1 - (yNorm + 1) * 0.5) * h;
      
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  useEffect(() => {
    draw();
  }, [drive, type]);

  const handlePointer = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    onChangeDrive(y);
  };

  return (
    <div className="relative group">
      <canvas 
        ref={canvasRef} 
        width={140} 
        height={100} 
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        className="bg-black/60 rounded border border-white/10 cursor-ns-resize touch-none"
      />
      <div className="absolute top-1 left-2 text-[6px] font-mono text-orange-400 transition-opacity group-hover:opacity-100 opacity-60 uppercase">{type} TRANSFER</div>
    </div>
  );
};

interface EqGraphProps {
  low: number;
  mid: number;
  high: number;
  onChange: (low: number, mid: number, high: number) => void;
}

export const EqGraph: React.FC<EqGraphProps> = ({ low, mid, high, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle Frequency Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [20, 100, 1000, 5000, 20000].forEach(f => {
      const x = (Math.log10(f / 20) / Math.log10(1000)) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

    // Mock Live Spectrum Analyzer (Serum 2 Style)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 2) {
      const bh = Math.random() * 15 * (Math.sin(i * 0.1 + Date.now() * 0.002) + 1);
      ctx.moveTo(i, h);
      ctx.lineTo(i, h - bh);
    }
    ctx.stroke();

    // The Curve
    // We map 0.5 to center h/2. Range is +/- 12dB or so.
    const getY = (gain: number) => h - (gain * h);
    
    const points = [
      { x: 0, y: getY(low) },
      { x: w * 0.15, y: getY(low) },
      { x: w * 0.5, y: getY(mid) },
      { x: w * 0.85, y: getY(high) },
      { x: w, y: getY(high) }
    ];

    // Generate curve points for filling
    const curvePoints: {x: number, y: number}[] = [];
    const steps = 50;
    curvePoints.push({ x: 0, y: getY(low) });
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * w;
      
      // Basic interpolation for visualizing the curve
      let y;
      if (t < 0.3) {
        y = getY(low);
      } else if (t < 0.7) {
        const localT = (t - 0.3) / 0.4;
        // Cosine interpolation for smoothness
        const cosT = (1 - Math.cos(localT * Math.PI)) / 2;
        y = getY(low) * (1 - cosT) + getY(mid) * cosT;
      } else {
        const localT = (t - 0.7) / 0.3;
        const cosT = (1 - Math.cos(localT * Math.PI)) / 2;
        y = getY(mid) * (1 - cosT) + getY(high) * cosT;
      }
      curvePoints.push({ x, y });
    }

    // Fill under the curve
    ctx.beginPath();
    ctx.moveTo(0, h/2);
    curvePoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(w, h/2);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, h);
    fillGradient.addColorStop(0.2, 'rgba(234, 179, 8, 0.2)');
    fillGradient.addColorStop(0.5, 'rgba(234, 179, 8, 0.05)');
    fillGradient.addColorStop(0.8, 'rgba(234, 179, 8, 0.2)');
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // The Stroke
    ctx.beginPath();
    curvePoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(234, 179, 8, 0.8)';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Handles
    [
      { x: w * 0.1, y: getY(low) },
      { x: w * 0.5, y: getY(mid) },
      { x: w * 0.9, y: getY(high) }
    ].forEach((p) => {
      ctx.fillStyle = '#111';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };

  useEffect(() => {
    draw();
  }, [low, mid, high]);

  const handlePointer = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left) / rect.width;
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    if (x < 0.33) onChange(y, mid, high);
    else if (x < 0.66) onChange(low, y, high);
    else onChange(low, mid, y);
  };

  return (
    <div className="relative group">
      <canvas 
        ref={canvasRef} 
        width={140} 
        height={80} 
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        className="bg-black/60 rounded border border-white/10 cursor-crosshair touch-none"
      />
      <div className="absolute top-1 left-2 text-[6px] font-mono text-yellow-500 transition-opacity group-hover:opacity-100 opacity-60 uppercase">Spectrum Responder</div>
    </div>
  );
};
