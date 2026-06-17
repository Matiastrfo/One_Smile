import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import Tooth from './Tooth';
import { TreatmentPanel, TREATMENTS } from './TreatmentPanel';
import type { SelectedTool } from './TreatmentPanel';
import type { DentalPiece, TreatmentType, TreatmentColor, ToothFace } from '../../types';
import { downloadOdontogramPdf } from '../../utils/odontogramPdf';

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];

const UPPER_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_TEETH = [...LOWER_RIGHT, ...LOWER_LEFT];

// Orden visual de izquierda a derecha en pantalla
const UPPER_ORDER = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_ORDER = [...LOWER_RIGHT, ...LOWER_LEFT];

type ToothUpdatePayload = { treatment_type: TreatmentType; color: TreatmentColor | null; faces: ToothFace[] };

interface OdontogramProps {
  pieces: DentalPiece[];
  patientName: string;
  onToothUpdate: (toothNumber: number, update: ToothUpdatePayload) => void;
  onArchUpdate: (toothNumbers: number[], update: ToothUpdatePayload) => void;
}

const DEFAULT_TOOL: SelectedTool = { treatment_type: 'CARIES', color: 'BLUE' };

const COLOR_HEX: Record<string, string> = {
  BLUE: '#3b82f6', RED: '#ef4444', GREEN: '#22c55e',
};

function getTeethRange(start: number, end: number, order: number[]): number[] {
  const i = order.indexOf(start);
  const j = order.indexOf(end);
  if (i === -1 || j === -1) return [start];
  const [from, to] = i <= j ? [i, j] : [j, i];
  return order.slice(from, to + 1);
}

const Odontogram: React.FC<OdontogramProps> = ({ pieces, patientName, onToothUpdate, onArchUpdate }) => {
  const [selectedTool, setSelectedTool] = useState<SelectedTool>(DEFAULT_TOOL);
  const [partialStart, setPartialStart] = useState<number | null>(null);

  const getPiece = (num: number): DentalPiece => (
    pieces.find(p => p.tooth_number === num) ?? {
      id: 0, patient_id: 0, tooth_number: num,
      treatment_type: 'NONE', color: null, faces: [],
    }
  );

  const archHasProtesis = (archTeeth: number[], type: TreatmentType) =>
    archTeeth.some(n => getPiece(n).treatment_type === type);

  const archProtesisColor = (archTeeth: number[], type: TreatmentType): string => {
    const piece = pieces.find(p => archTeeth.includes(p.tooth_number) && p.treatment_type === type);
    return COLOR_HEX[piece?.color ?? 'GREEN'];
  };

  const handleFaceClick = (toothNumber: number, face: ToothFace) => {
    const piece = getPiece(toothNumber);
    const { treatment_type: tool, color } = selectedTool;

    if (tool === 'NONE') {
      onToothUpdate(toothNumber, { treatment_type: 'NONE', color: null, faces: [] });
      return;
    }

    // PROTESIS COMPLETA
    if (tool === 'PROTESIS') {
      if (piece.treatment_type === 'PROTESIS') {
        // Diente ya tiene prótesis → cambiar/quitar solo ese diente
        onToothUpdate(toothNumber, piece.color === color
          ? { treatment_type: 'NONE', color: null, faces: [] }
          : { treatment_type: 'PROTESIS', color, faces: [] }
        );
      } else {
        // Diente sin prótesis → aplicar a toda la arcada
        const archTeeth = UPPER_TEETH.includes(toothNumber) ? UPPER_TEETH : LOWER_TEETH;
        onArchUpdate(archTeeth, { treatment_type: 'PROTESIS', color, faces: [] });
      }
      return;
    }

    // PROTESIS PARCIAL y PUENTE — selección de rango
    if (tool === 'PROTESIS_PARCIAL' || tool === 'PUENTE') {
      if (partialStart === null) {
        setPartialStart(toothNumber);
        return;
      }
      if (partialStart === toothNumber) {
        setPartialStart(null);
        return;
      }
      const startArch = UPPER_TEETH.includes(partialStart) ? 'upper' : 'lower';
      const clickArch = UPPER_TEETH.includes(toothNumber) ? 'upper' : 'lower';
      if (startArch !== clickArch) {
        // diente de otra arcada → reiniciar selección
        setPartialStart(toothNumber);
        return;
      }
      const order = startArch === 'upper' ? UPPER_ORDER : LOWER_ORDER;
      const range = getTeethRange(partialStart, toothNumber, order);
      onArchUpdate(range, { treatment_type: tool, color, faces: [] });
      setPartialStart(null);
      return;
    }

    // Tratamientos normales
    const cfg = TREATMENTS.find(t => t.type === (tool as any));
    const isFaceBased = cfg?.isFaceBased ?? false;

    if (isFaceBased) {
      const sameToolAndColor = piece.treatment_type === tool && piece.color === color;
      const currentFaces: ToothFace[] = sameToolAndColor ? piece.faces : [];
      const newFaces = currentFaces.includes(face)
        ? currentFaces.filter(f => f !== face)
        : [...currentFaces, face];
      onToothUpdate(toothNumber, newFaces.length === 0
        ? { treatment_type: 'NONE', color: null, faces: [] }
        : { treatment_type: tool, color, faces: newFaces }
      );
    } else {
      onToothUpdate(toothNumber,
        piece.treatment_type === tool && piece.color === color
          ? { treatment_type: 'NONE', color: null, faces: [] }
          : { treatment_type: tool, color, faces: [] }
      );
    }
  };

  const handleErase = (toothNumber: number) => {
    onToothUpdate(toothNumber, { treatment_type: 'NONE', color: null, faces: [] });
  };

  // Cambiar herramienta cancela selección parcial en curso
  const handleToolChange = (tool: SelectedTool) => {
    setPartialStart(null);
    setSelectedTool(tool);
  };

  const upperProtesis = archHasProtesis(UPPER_TEETH, 'PROTESIS');
  const lowerProtesis = archHasProtesis(LOWER_TEETH, 'PROTESIS');
  const upperParcial = archHasProtesis(UPPER_TEETH, 'PROTESIS_PARCIAL');
  const lowerParcial = archHasProtesis(LOWER_TEETH, 'PROTESIS_PARCIAL');
  const upperPuente  = archHasProtesis(UPPER_TEETH, 'PUENTE');
  const lowerPuente  = archHasProtesis(LOWER_TEETH, 'PUENTE');

  const RANGE_TREATMENTS: TreatmentType[] = ['PROTESIS_PARCIAL', 'PUENTE'];

  // Agrupa dientes contiguos del mismo tratamiento de rango en un único div con visual propio.
  // Los demás usan display:contents para no romper el flex.
  const renderArch = (rightQ: number[], leftQ: number[]) => {
    const allTeeth = [...rightQ, ...leftQ];
    const separatorAt = rightQ.length;

    interface Segment {
      startIdx: number;
      teeth: number[];
      type: TreatmentType | 'NORMAL';
      color: string;
    }
    const segments: Segment[] = [];

    allTeeth.forEach((num, idx) => {
      const piece = getPiece(num);
      const isRange = RANGE_TREATMENTS.includes(piece.treatment_type);
      const segType: TreatmentType | 'NORMAL' = isRange ? piece.treatment_type : 'NORMAL';
      const color = isRange ? (COLOR_HEX[piece.color ?? 'BLUE']) : '';
      const last = segments[segments.length - 1];
      if (!last || last.type !== segType || last.color !== color) {
        segments.push({ startIdx: idx, teeth: [num], type: segType, color });
      } else {
        last.teeth.push(num);
      }
    });

    return (
      <div className="flex gap-1 items-end">
        {segments.map((seg, si) => {
          const inner = seg.type !== 'PUENTE' ? seg.teeth.map((num, ti) => (
            <React.Fragment key={num}>
              {seg.startIdx + ti === separatorAt && (
                <div className="w-px self-stretch bg-slate-300 dark:bg-slate-600 mx-1" />
              )}
              <Tooth piece={getPiece(num)} onFaceClick={handleFaceClick} onErase={handleErase} isRangeStart={partialStart === num} />
            </React.Fragment>
          )) : null;

          if (seg.type === 'PROTESIS_PARCIAL') {
            return (
              <div key={si} className="flex gap-1"
                style={{ outline: `3px solid ${seg.color}`, borderRadius: '4px', outlineOffset: '3px' }}>
                {inner!}
              </div>
            );
          }

          if (seg.type === 'PUENTE') {
            const last = seg.teeth.length - 1;
            const puenteInner = seg.teeth.map((num, ti) => {
              const role: 'abutment' | 'pontic' =
                (ti === 0 || ti === last) ? 'abutment' : 'pontic';
              return (
                <React.Fragment key={num}>
                  {seg.startIdx + ti === separatorAt && (
                    <div className="w-px self-stretch bg-slate-300 dark:bg-slate-600 mx-1" />
                  )}
                  <Tooth
                    piece={getPiece(num)}
                    onFaceClick={handleFaceClick}
                    onErase={handleErase}
                    isRangeStart={partialStart === num}
                    puenteRole={role}
                  />
                </React.Fragment>
              );
            });

            return (
              <div key={si} className="flex gap-1"
                style={{
                  borderLeft:   `3px solid ${seg.color}`,
                  borderBottom: `3px solid ${seg.color}`,
                  borderRight:  `3px solid ${seg.color}`,
                  borderRadius: '0 0 6px 6px',
                  paddingLeft:  '2px',
                  paddingRight: '2px',
                  paddingBottom: '4px',
                }}>
                {puenteInner}
              </div>
            );
          }

          return <div key={si} style={{ display: 'contents' }}>{inner!}</div>;
        })}
      </div>
    );
  };

  const showClearButtons =
    (selectedTool.treatment_type === 'PROTESIS'         && (upperProtesis || lowerProtesis)) ||
    (selectedTool.treatment_type === 'PROTESIS_PARCIAL' && (upperParcial  || lowerParcial))  ||
    (selectedTool.treatment_type === 'PUENTE'           && (upperPuente   || lowerPuente));

  return (
    <div className="flex gap-4 items-start w-full">
      {/* Panel izquierdo */}
      <TreatmentPanel selected={selectedTool} onChange={handleToolChange} />

      {/* Odontograma */}
      <div className="flex-1 flex flex-col items-center gap-10 py-6 px-4 bg-card rounded-2xl border border-border/60 shadow-sm relative">

        {/* Botón PDF */}
        <button
          onClick={() => downloadOdontogramPdf(patientName, pieces)}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-foreground"
          title="Generar informe PDF"
        >
          <FileText className="h-3.5 w-3.5" />
          Informe PDF
        </button>

        {/* Indicador de selección parcial en curso */}
        {(selectedTool.treatment_type === 'PROTESIS_PARCIAL' || selectedTool.treatment_type === 'PUENTE') && (
          <div className={`text-xs font-bold px-4 py-2 rounded-xl border-2 transition-all ${
            partialStart
              ? 'bg-yellow-100 border-yellow-500 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-400 dark:text-yellow-200'
              : 'bg-muted border-border text-foreground'
          }`}>
            {partialStart
              ? `Diente ${partialStart} seleccionado — hacé clic en el diente final del rango`
              : 'Hacé clic en el diente inicial del rango'}
          </div>
        )}

        {/* Arcada superior */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arcada Superior</span>
          <div
            className="border-b-2 border-slate-200 dark:border-slate-700 pb-5 rounded-lg transition-all"
            style={upperProtesis ? { outline: `3px solid ${archProtesisColor(UPPER_TEETH, 'PROTESIS')}`, outlineOffset: '6px' } : {}}
          >
            {renderArch(UPPER_RIGHT, UPPER_LEFT)}
          </div>
        </div>

        {/* Arcada inferior */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="border-t-2 border-slate-200 dark:border-slate-700 pt-5 rounded-lg transition-all"
            style={lowerProtesis ? { outline: `3px solid ${archProtesisColor(LOWER_TEETH, 'PROTESIS')}`, outlineOffset: '6px' } : {}}
          >
            {renderArch(LOWER_RIGHT, LOWER_LEFT)}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arcada Inferior</span>
        </div>

        {/* Botones limpiar */}
        {showClearButtons && (
          <div className="flex gap-3 self-end flex-wrap justify-end">
            {(upperProtesis || upperParcial || upperPuente) && (
              <button
                onClick={() => {
                  const type = selectedTool.treatment_type as TreatmentType;
                  const teeth = pieces.filter(p => UPPER_TEETH.includes(p.tooth_number) && p.treatment_type === type).map(p => p.tooth_number);
                  onArchUpdate(teeth, { treatment_type: 'NONE', color: null, faces: [] });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/60 bg-muted/40 hover:bg-muted transition-colors"
              >
                ↩ Limpiar arcada superior
              </button>
            )}
            {(lowerProtesis || lowerParcial || lowerPuente) && (
              <button
                onClick={() => {
                  const type = selectedTool.treatment_type as TreatmentType;
                  const teeth = pieces.filter(p => LOWER_TEETH.includes(p.tooth_number) && p.treatment_type === type).map(p => p.tooth_number);
                  onArchUpdate(teeth, { treatment_type: 'NONE', color: null, faces: [] });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/60 bg-muted/40 hover:bg-muted transition-colors"
              >
                ↩ Limpiar arcada inferior
              </button>
            )}
          </div>
        )}

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground bg-muted/30 px-5 py-2.5 rounded-full">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 block rounded-sm border bg-white" /> Sano</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 block rounded-sm bg-blue-500" /> A realizar</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 block rounded-sm bg-red-500" /> Realizado</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 block rounded-sm bg-green-500" /> Hecho por profesional</div>
        </div>
      </div>
    </div>
  );
};

export default Odontogram;
