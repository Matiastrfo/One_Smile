import React from 'react';
import Tooth from './Tooth';
import type { DentalPiece } from '../../types';

interface OdontogramProps {
  pieces: DentalPiece[];
  onToothClick: (toothNumber: number) => void;
}

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const Odontogram: React.FC<OdontogramProps> = ({ pieces, onToothClick }) => {
  const getPiece = (num: number) => pieces.find(p => p.tooth_number === num) || {
    id: 0,
    patient_id: 0,
    tooth_number: num,
    condition: 'HEALTHY'
  };

  const renderQuadrant = (numbers: number[]) => (
    <div className="flex gap-2">
      {numbers.map(num => {
        const piece = getPiece(num);
        return (
          <Tooth 
            key={num} 
            number={num} 
            condition={piece.condition} 
            onClick={onToothClick} 
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-12 p-6 bg-card rounded-xl border shadow-sm overflow-x-auto">
      {/* Upper Arch */}
      <div className="flex flex-col items-center gap-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Arcada Superior</h4>
        <div className="flex gap-8 border-b-2 border-slate-200 dark:border-slate-800 pb-4 px-4">
          {renderQuadrant(UPPER_RIGHT)}
          <div className="w-px bg-slate-300 dark:bg-slate-700 h-16"></div>
          {renderQuadrant(UPPER_LEFT)}
        </div>
      </div>

      {/* Lower Arch */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-8 border-t-2 border-slate-200 dark:border-slate-800 pt-4 px-4">
          {renderQuadrant(LOWER_RIGHT)}
          <div className="w-px bg-slate-300 dark:bg-slate-700 h-16"></div>
          {renderQuadrant(LOWER_LEFT)}
        </div>
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Arcada Inferior</h4>
      </div>
      
      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-muted-foreground bg-muted/30 px-6 py-3 rounded-full">
        <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-white dark:bg-slate-800 border"></span> Sano</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-red-500"></span> Caries</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-blue-500"></span> Arreglado (Empaste)</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-amber-400"></span> Corona</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-purple-500"></span> Implante</div>
        <div className="flex items-center gap-1 relative"><span className="w-3 h-3 block border"></span><span className="absolute text-red-500 font-bold" style={{left:'1px', top:'-1px'}}>X</span> Extraído</div>
      </div>
    </div>
  );
};

export default Odontogram;
