import React, { useRef, useState, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  accentColor?: 'cyan' | 'pink';
  defaultValue?: number;
}

export function Knob({ label, value, onChange, accentColor = 'cyan', defaultValue = 0.5 }: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to disable text selection/scrolling during manipulation
    e.preventDefault();
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startValRef.current = value;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = startYRef.current - clientY; // Dragging up increases the value
      
      // Define drag range resolution (200px from min to max)
      const dragRange = 180; 
      const newValue = Math.max(0, Math.min(1, startValRef.current + deltaY / dragRange));
      onChange(newValue);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, onChange]);

  // Convert normalized 0..1 to rotation angle for a classic analog synthesizer feel (-135deg to +135deg)
  const angle = -135 + value * 270;

  const isPink = accentColor === 'pink';
  const indicatorColor = isPink ? 'bg-pink-500' : 'bg-cyan-400';
  const glowShadow = isPink 
    ? 'shadow-[0_0_8px_4px_rgba(236,72,153,0.3)]' 
    : 'shadow-[0_0_8px_4px_rgba(34,211,238,0.3)]';
  const feedbackBorder = isPink ? 'border-pink-500/20' : 'border-cyan-500/20';

  return (
    <div className="flex flex-col items-center gap-2 select-none group">
      {/* Interactive knob body */}
      <div
        ref={knobRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onDoubleClick={() => onChange(defaultValue)}
        className="relative w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center cursor-ns-resize shadow-lg hover:border-white/20 transition-all duration-150 active:scale-95"
        style={{ touchAction: 'none' }}
        title="Drag UP/DOWN to tweak. Double click to reset."
      >
        {/* Rotation pointer container */}
        <div 
          className="absolute inset-[3px] rounded-full bg-linear-to-b from-slate-850 to-slate-900 flex items-center justify-center transition-transform duration-75"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Knob notch indicator */}
          <div className={`absolute top-0 w-[2.5px] h-3.5 rounded-full ${indicatorColor} ${isDragging ? glowShadow : ''}`} />
        </div>
        
        {/* Radial color ring overlay */}
        <div className={`absolute inset-1 rounded-full border ${feedbackBorder} pointer-events-none opacity-50`} />
      </div>
      
      {/* Parameter Info */}
      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] uppercase font-extrabold text-slate-300 tracking-wider group-hover:text-cyan-400 transition-colors duration-150">
          {label}
        </span>
        <span className="text-[9px] font-mono mt-1 text-white/50 tracking-tighter">
          {Math.round(value * 100)}%
        </span>
      </div>
    </div>
  );
}
