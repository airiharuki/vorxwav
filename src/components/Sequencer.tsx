import React from 'react';
import { BassPattern, BAR_NAMES } from '../lib/audioEngine';

interface SequencerProps {
  currentBar: number;
  isPlaying: boolean;
  bassPatterns: BassPattern[];
}

export function Sequencer({ currentBar, isPlaying, bassPatterns }: SequencerProps) {
  // If we haven't generated anything yet, we can show empty steps
  const showEmpty = bassPatterns.length === 0;

  return (
    <div className="grid grid-cols-[repeat(16,1fr)] gap-1 md:gap-2">
      {BAR_NAMES.map((name, i) => {
        const pattern = bassPatterns[i];
        const isPopulated = !showEmpty && pattern !== null;
        const isCurrentlyPlaying = isPlaying && currentBar === i;

        let activeClass = '';
        if (isPopulated) activeClass = 'step-active border-cyan-500/40';
        else activeClass = 'opacity-30';
        
        let label = name.substring(0, 3);
        
        if (isPopulated) {
          if (i === 3 || i === 10) activeClass = 'border-pink-500/40 opacity-70';
          if (i === 7) activeClass = 'step-active border-yellow-500/40';
          
          if (pattern && pattern.style) {
            label = pattern.style.substring(0, 3).toUpperCase();
          }
        }

        return (
          <div 
            key={i} 
            className={`h-12 sm:h-16 rounded-lg glass-panel flex flex-col items-center justify-end p-1 sm:p-2 transition-all duration-150 ${activeClass} ${isCurrentlyPlaying ? 'step-playing' : ''}`}
            style={isPopulated && i === 7 ? { background: '#fbff00' } : {}}
          >
            <span className={`text-[7px] sm:text-[9px] font-bold ${isPopulated ? 'text-black opacity-60' : 'text-white/40 opacity-100'} truncate w-full text-center max-w-[20px] sm:max-w-none`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
