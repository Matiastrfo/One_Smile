import React from 'react';
import type { DentalPieceCondition } from '../../types';

interface ToothProps {
  number: number;
  condition: DentalPieceCondition;
  onClick: (number: number) => void;
}

const Tooth: React.FC<ToothProps> = ({ number, condition, onClick }) => {
  // Determine fill color based on condition
  const getFillColor = () => {
    switch (condition) {
      case 'CARIES': return 'fill-red-500';
      case 'FILLED': return 'fill-blue-500';
      case 'CROWN': return 'fill-amber-400';
      case 'IMPLANT': return 'fill-purple-500';
      case 'HEALTHY':
      default:
        return 'fill-white dark:fill-slate-800';
    }
  };

  const isExtracted = condition === 'EXTRACTED';
  const fillColor = getFillColor();
  const strokeColor = 'stroke-slate-400 dark:stroke-slate-600';

  return (
    <div 
      className="flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform"
      onClick={() => onClick(number)}
    >
      <span className="text-xs font-semibold mb-1 text-muted-foreground group-hover:text-foreground">{number}</span>
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 100 100" className={`w-full h-full ${strokeColor} stroke-2`}>
          {/* Top (Vestibular for upper, Lingual/Palatal for lower depending on quadrant, but conceptually Top polygon) */}
          <polygon points="0,0 100,0 75,25 25,25" className={`${fillColor} hover:brightness-90 transition-all`} />
          {/* Bottom */}
          <polygon points="25,75 75,75 100,100 0,100" className={`${fillColor} hover:brightness-90 transition-all`} />
          {/* Left */}
          <polygon points="0,0 25,25 25,75 0,100" className={`${fillColor} hover:brightness-90 transition-all`} />
          {/* Right */}
          <polygon points="100,0 100,100 75,75 75,25" className={`${fillColor} hover:brightness-90 transition-all`} />
          {/* Center (Oclusal) */}
          <polygon points="25,25 75,25 75,75 25,75" className={`${fillColor} hover:brightness-90 transition-all`} />
        </svg>

        {isExtracted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full stroke-red-600 stroke-[8]">
              <line x1="10" y1="10" x2="90" y2="90" />
              <line x1="90" y1="10" x2="10" y2="90" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tooth;
