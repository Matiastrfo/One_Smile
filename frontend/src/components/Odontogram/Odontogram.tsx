import React, { useState, useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';
import Tooth from './Tooth';
import { TreatmentPanel, TREATMENTS } from './TreatmentPanel';
import type { SelectedTool } from './TreatmentPanel';
import type { DentalPiece, TreatmentType, TreatmentColor, ToothFace } from '../../types';

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];

const UPPER_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_TEETH = [...LOWER_RIGHT, ...LOWER_LEFT];

const UPPER_ORDER = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_ORDER = [...LOWER_RIGHT, ...LOWER_LEFT];

type ToothUpdatePayload = { treatment_type: TreatmentType; color: TreatmentColor | null; faces: ToothFace[] };

interface OdontogramProps {
  pieces: DentalPiece[];
  patientName: string;
  treatments?: any[];
  partialStart: number | null;
  onSetPartialStart: (v: number | null) => void;
  onToothUpdate: (toothNumber: number, update: ToothUpdatePayload) => void;
  onArchUpdate: (toothNumbers: number[], update: ToothUpdatePayload) => void;
  onAddOverlay?: (toothNumber: number, update: ToothUpdatePayload) => void;
  onDeleteTreatment?: (treatmentId: number) => void;
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

const RANGE_TREATMENTS: TreatmentType[] = ['PROTESIS_PARCIAL', 'PUENTE'];

const Odontogram: React.FC<OdontogramProps> = ({ pieces, treatments = [], partialStart, onSetPartialStart, onToothUpdate, onArchUpdate, onAddOverlay, onDeleteTreatment }) => {
  const [selectedTool, setSelectedTool] = useState<SelectedTool>(DEFAULT_TOOL);
  const [toothModalNumber, setToothModalNumber] = useState<number | null>(null);
  const NATURAL_WIDTH = 1080;
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.offsetWidth;
      const ratio = w / NATURAL_WIDTH;
      setZoom(ratio < 1 ? Math.max(ratio, 0.6) : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getPiece = (num: number): DentalPiece => (
    pieces.find(p => p.tooth_number === num) ?? {
      id: 0, patient_id: 0, tooth_number: num,
      treatment_type: 'NONE', color: null, faces: [],
    }
  );


  const isInSameSegment = (a: number, b: number, type: TreatmentType): boolean => {
    if (a === b) return true;
    const archA = UPPER_TEETH.includes(a) ? 'upper' : 'lower';
    const archB = UPPER_TEETH.includes(b) ? 'upper' : 'lower';
    if (archA !== archB) return false;
    const order = archA === 'upper' ? UPPER_ORDER : LOWER_ORDER;
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia === -1 || ib === -1) return false;
    const [from, to] = ia < ib ? [ia, ib] : [ib, ia];
    return order.slice(from, to + 1).every(n => getPiece(n).treatment_type === type);
  };

  const toothTreatments = toothModalNumber !== null
    ? treatments.filter((t: any) => {
        if (t.tooth_number === toothModalNumber) return true;
        const archTeeth = t.arch_teeth;
        if (archTeeth && archTeeth.split(',').map(Number).includes(toothModalNumber)) return true;
        // Fallback para registros sin arch_teeth: solo incluir si el tooth_number está en el mismo segmento
        const pieceType = getPiece(toothModalNumber).treatment_type;
        const isArchType = RANGE_TREATMENTS.includes(pieceType) || pieceType === 'PROTESIS';
        if (isArchType && t.odontogram_type === pieceType && isInSameSegment(t.tooth_number, toothModalNumber, pieceType)) return true;
        return false;
      })
    : [];

  const hasTreatment = (num: number) => {
    if (getPiece(num).treatment_type !== 'NONE') return true;
    return treatments.some((t: any) => {
      if (t.tooth_number === num) return true;
      const archTeeth = t.arch_teeth;
      return archTeeth && archTeeth.split(',').map(Number).includes(num);
    });
  };

  const getOverlays = (num: number) => {
    const piece = getPiece(num);
    const activeTreatment = piece.treatment_type;

    return treatments
      .filter((t: any) => {
        if (t.tooth_number !== num) return false;
        if (!t.odontogram_type || t.odontogram_type === 'NONE') return false;
        // No duplicar el tratamiento activo
        if (t.odontogram_type === activeTreatment) return false;
        return true;
      })
      .map((t: any) => ({
        treatment_type: t.odontogram_type as TreatmentType,
        color: t.odontogram_color ?? null,
        faces: (() => { try { return JSON.parse(t.odontogram_faces || '[]'); } catch { return []; } })(),
      }));
  };

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
      onSetPartialStart(null);
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
        onSetPartialStart(toothNumber);
        return;
      }
      if (partialStart === toothNumber) {
        onSetPartialStart(null);
        return;
      }
      const startArch = UPPER_TEETH.includes(partialStart) ? 'upper' : 'lower';
      const clickArch = UPPER_TEETH.includes(toothNumber) ? 'upper' : 'lower';
      if (startArch !== clickArch) {
        // diente de otra arcada → reiniciar selección
        onSetPartialStart(toothNumber);
        return;
      }
      const order = startArch === 'upper' ? UPPER_ORDER : LOWER_ORDER;
      const range = getTeethRange(partialStart, toothNumber, order);
      onArchUpdate(range, { treatment_type: tool, color, faces: [] });
      onSetPartialStart(null);
      return;
    }

    // Tratamientos normales
    const cfg = TREATMENTS.find(t => t.type === (tool as any));
    const isFaceBased = cfg?.isFaceBased ?? false;
    const isArchTreatment = RANGE_TREATMENTS.includes(piece.treatment_type) || piece.treatment_type === 'PROTESIS';

    if (isArchTreatment && onAddOverlay) {
      // Diente con prótesis/puente → siempre overlay, nunca tocar treatment_type
      onAddOverlay(toothNumber, { treatment_type: tool, color, faces: isFaceBased ? [face] : [] });
    } else if (isFaceBased) {
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
    setToothModalNumber(toothNumber);
  };

  const handleToolChange = (tool: SelectedTool) => {
    onSetPartialStart(null);
    setSelectedTool(tool);
  };

  const upperProtesis = archHasProtesis(UPPER_TEETH, 'PROTESIS');
  const lowerProtesis = archHasProtesis(LOWER_TEETH, 'PROTESIS');
  const upperParcial = archHasProtesis(UPPER_TEETH, 'PROTESIS_PARCIAL');
  const lowerParcial = archHasProtesis(LOWER_TEETH, 'PROTESIS_PARCIAL');
  const upperPuente  = archHasProtesis(UPPER_TEETH, 'PUENTE');
  const lowerPuente  = archHasProtesis(LOWER_TEETH, 'PUENTE');

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
              <div key={num} className="flex flex-col items-center">
                <Tooth piece={getPiece(num)} onFaceClick={handleFaceClick} onErase={handleErase} isRangeStart={
  partialStart === num &&
  getPiece(num).treatment_type === 'NONE' &&
  (selectedTool.treatment_type === 'PROTESIS_PARCIAL' || selectedTool.treatment_type === 'PUENTE')
} overlays={getOverlays(num)} />
                <button
                  onClick={() => setToothModalNumber(num)}
                  className={`text-[9px] font-bold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    hasTreatment(num)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title={`Ver tratamientos pieza ${num}`}
                >
                  {num}
                </button>
              </div>
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
                  <div className="flex flex-col items-center">
                    <Tooth
                      piece={getPiece(num)}
                      onFaceClick={handleFaceClick}
                      onErase={handleErase}
                      isRangeStart={
  partialStart === num &&
  getPiece(num).treatment_type === 'NONE' &&
  (selectedTool.treatment_type === 'PROTESIS_PARCIAL' || selectedTool.treatment_type === 'PUENTE')
}
                      puenteRole={role}
                      overlays={getOverlays(num)}
                    />
                    {/* Pata solo en pónticos (dientes del medio), no en pilares */}
                    {ti !== 0 && ti !== last && (
                      <div style={{ width: '4px', height: '24px', background: seg.color, flexShrink: 0, marginTop: '-24px' }} />
                    )}
                    <button
                      onClick={() => setToothModalNumber(num)}
                      style={{ marginTop: '4px' }}
                      className={`text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        hasTreatment(num)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {num}
                    </button>
                  </div>
                </React.Fragment>
              );
            });

            return (
              <div key={si} style={{ position: 'relative', display: 'flex', gap: '4px' }}>
                {puenteInner}
                {/* Barra horizontal — debajo de las patas, encima de los números */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100px', height: '4px', background: seg.color, pointerEvents: 'none' }} />
                {/* Lado izquierdo */}
                <div style={{ position: 'absolute', left: 0, top: '16px', width: '4px', height: '84px', background: seg.color, pointerEvents: 'none' }} />
                {/* Lado derecho */}
                <div style={{ position: 'absolute', right: 0, top: '16px', width: '4px', height: '84px', background: seg.color, pointerEvents: 'none' }} />
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
    <div className="flex gap-4 items-stretch w-full">
      {/* Modal tratamientos del diente */}
      {toothModalNumber !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setToothModalNumber(null)}>
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Pieza {toothModalNumber} — Tratamientos</h3>
              <button onClick={() => setToothModalNumber(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {toothTreatments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No hay tratamientos registrados para esta pieza.</p>
            ) : (
              <div className="space-y-2">
                {toothTreatments.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">
                        {(() => {
                          const pt = toothModalNumber !== null ? getPiece(toothModalNumber).treatment_type : 'NONE';
                          const isArch = RANGE_TREATMENTS.includes(pt) || pt === 'PROTESIS';
                          return isArch && t.odontogram_type === pt
                            ? `${t.description.split(' - ')[0]} - Pieza ${toothModalNumber}`
                            : t.description;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.date_time} · ${t.price?.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => {
                        onDeleteTreatment?.(t.id);
                      }}
                      className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Panel izquierdo */}
      <TreatmentPanel selected={selectedTool} onChange={handleToolChange} />

      {/* Wrapper observado — min-w-0 permite que el flex item se achique */}
      <div ref={containerRef} className="flex-1 min-w-0">
        {/* Contenido con zoom — observer sobre el outer, zoom sobre el inner evita feedback loop */}
        <div
          style={{ zoom }}
          className="flex flex-col items-center gap-10 py-6 px-4 bg-card rounded-2xl border border-border/60 shadow-sm relative"
        >

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
                  onSetPartialStart(null);
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
                  onSetPartialStart(null);
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
    </div>
  );
};

export default Odontogram;
