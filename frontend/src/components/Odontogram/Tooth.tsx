import type { DentalPiece, ToothFace, TreatmentType } from '../../types';

const COLOR_HEX: Record<string, string> = {
  BLUE: '#3b82f6',
  RED: '#ef4444',
  GREEN: '#22c55e',
};


const FACE_PATHS: { face: ToothFace; points: string }[] = [
  { face: 'top',    points: '0,0 100,0 75,25 25,25' },
  { face: 'bottom', points: '25,75 75,75 100,100 0,100' },
  { face: 'left',   points: '0,0 25,25 25,75 0,100' },
  { face: 'right',  points: '100,0 100,100 75,75 75,25' },
  { face: 'center', points: '25,25 75,25 75,75 25,75' },
];

interface TreatmentOverlay {
  treatment_type: TreatmentType;
  color: string | null;
  faces: string[];
}

interface ToothProps {
  piece: DentalPiece;
  onFaceClick: (toothNumber: number, face: ToothFace) => void;
  onErase: (toothNumber: number) => void;
  isRangeStart?: boolean;
  puenteRole?: 'abutment' | 'pontic';
  overlays?: TreatmentOverlay[];
}

function renderOverlaySvg(type: TreatmentType, color: string | null, faces: string[], puenteRole?: 'abutment' | 'pontic') {
  const c = color ? COLOR_HEX[color] ?? color : '#000';
  switch (type) {
    case 'CROWN':
      return <rect x="3" y="3" width="94" height="94" fill="none" stroke={c} strokeWidth="9" />;
    case 'EXTRACTION_PENDING':
      return <><line x1="12" y1="35" x2="88" y2="35" stroke={c} strokeWidth="10" strokeLinecap="round" /><line x1="12" y1="65" x2="88" y2="65" stroke={c} strokeWidth="10" strokeLinecap="round" /></>;
    case 'EXTRACTED':
    case 'PROTESIS':
    case 'PROTESIS_PARCIAL':
      return <><line x1="12" y1="12" x2="88" y2="88" stroke={c} strokeWidth="10" strokeLinecap="round" /><line x1="88" y1="12" x2="12" y2="88" stroke={c} strokeWidth="10" strokeLinecap="round" /></>;
    case 'IMPLANT':
      return <rect x="25" y="25" width="50" height="50" fill="none" stroke={c} strokeWidth="8" />;
    case 'PERNO':
      return <line x1="50" y1="8" x2="50" y2="92" stroke={c} strokeWidth="9" strokeLinecap="round" />;
    case 'ABSENT':
      return <text x="50" y="75" textAnchor="middle" fill={c} fontSize="72" fontWeight="900" fontFamily="Arial, sans-serif" style={{ pointerEvents: 'none' }}>A</text>;
    case 'RX':
    case 'ENDODONCIA':
      return null; // se renderizan como label debajo del diente
    case 'PUENTE':
      if (puenteRole === 'abutment') return <rect x="3" y="3" width="94" height="94" fill="none" stroke={c} strokeWidth="9" />;
      return <><rect x="3" y="3" width="94" height="94" fill="none" stroke={c} strokeWidth="9" /><line x1="12" y1="12" x2="88" y2="88" stroke={c} strokeWidth="10" strokeLinecap="round" /><line x1="88" y1="12" x2="12" y2="88" stroke={c} strokeWidth="10" strokeLinecap="round" /></>;
    case 'CARIES':
    case 'FILLING':
      return <>
        {FACE_PATHS.filter(fp => faces.includes(fp.face)).map(fp => (
          <polygon key={fp.face} points={fp.points} fill={c} opacity={0.7} />
        ))}
      </>;
    default:
      return null;
  }
}

export default function Tooth({ piece, onFaceClick, onErase, isRangeStart = false, puenteRole, overlays = [] }: ToothProps) {
  const { tooth_number, treatment_type, color, faces } = piece;
  const overlayColor = color ? COLOR_HEX[color] : '#000';
  const getFaceColor = (face: ToothFace): string => {
    if (faces.includes(face) && color) return COLOR_HEX[color];
    return '#ffffff';
  };

  return (
    <div
      className={`flex flex-col items-center select-none rounded-sm transition-all ${isRangeStart ? 'ring-2 ring-offset-1 ring-yellow-400 ring-offset-background' : ''}`}
    >
      <span className="text-xs font-semibold mb-1 text-muted-foreground leading-none">{tooth_number}</span>
      <div
        className="relative w-16 h-16 cursor-pointer"
        onContextMenu={e => { e.preventDefault(); onErase(tooth_number); }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{ stroke: '#9ca3af', strokeWidth: 2 }}
        >
          {/* 5 faces */}
          {FACE_PATHS.map(({ face, points }) => (
            <polygon
              key={face}
              points={points}
              fill={getFaceColor(face)}
              className="cursor-pointer transition-opacity hover:opacity-75"
              onClick={() => onFaceClick(tooth_number, face)}
              onContextMenu={e => { e.preventDefault(); onErase(tooth_number); }}
            />
          ))}

          {/* CROWN — colored border outline */}
          {treatment_type === 'CROWN' && (
            <rect
              x="3" y="3" width="94" height="94"
              fill="none"
              stroke={overlayColor}
              strokeWidth="9"
              onClick={() => onFaceClick(tooth_number, 'center')}
              className="cursor-pointer"
            />
          )}

          {/* EXTRACTION_PENDING — two horizontal blue lines */}
          {treatment_type === 'EXTRACTION_PENDING' && (
            <>
              <line x1="12" y1="35" x2="88" y2="35" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
              <line x1="12" y1="65" x2="88" y2="65" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
            </>
          )}

          {/* EXTRACTED — X cross */}
          {treatment_type === 'EXTRACTED' && (
            <>
              <line x1="12" y1="12" x2="88" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
              <line x1="88" y1="12" x2="12" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
            </>
          )}

          {/* ABSENT — A letter */}
          {treatment_type === 'ABSENT' && (
            <text x="50" y="75" textAnchor="middle" fill={overlayColor}
              fontSize="72" fontWeight="900" fontFamily="Arial, sans-serif"
              className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')}
              style={{ pointerEvents: 'all' }}>A</text>
          )}

          {/* PUENTE — pilar: contorno. Póntico: X en color */}
          {treatment_type === 'PUENTE' && puenteRole === 'abutment' && (
            <rect x="3" y="3" width="94" height="94" fill="none"
              stroke={overlayColor} strokeWidth="9"
              className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
          )}
          {treatment_type === 'PUENTE' && puenteRole === 'pontic' && (
            <>
              <rect x="3" y="3" width="94" height="94" fill="none"
                stroke={overlayColor} strokeWidth="9"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
              <line x1="12" y1="12" x2="88" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
              <line x1="88" y1="12" x2="12" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
            </>
          )}

          {/* PROTESIS_PARCIAL — X en color seleccionado */}
          {treatment_type === 'PROTESIS_PARCIAL' && (
            <>
              <line x1="12" y1="12" x2="88" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
              <line x1="88" y1="12" x2="12" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
            </>
          )}

          {/* PROTESIS — X en color seleccionado */}
          {treatment_type === 'PROTESIS' && (
            <>
              <line x1="12" y1="12" x2="88" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
              <line x1="88" y1="12" x2="12" y2="88" stroke={overlayColor} strokeWidth="10" strokeLinecap="round"
                className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
            </>
          )}

          {/* IMPLANT — outline of center square only */}
          {treatment_type === 'IMPLANT' && (
            <rect x="25" y="25" width="50" height="50"
              fill="none" stroke={overlayColor} strokeWidth="8"
              className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
          )}

          {/* PERNO — vertical line through center */}
          {treatment_type === 'PERNO' && (
            <line x1="50" y1="8" x2="50" y2="92"
              stroke={overlayColor} strokeWidth="9" strokeLinecap="round"
              className="cursor-pointer" onClick={() => onFaceClick(tooth_number, 'center')} />
          )}


          {/* Overlays: additional treatments stored in treatments table */}
          {overlays.map((ov, i) => (
            <g key={i} style={{ pointerEvents: 'none' }}>
              {renderOverlaySvg(ov.treatment_type, ov.color, ov.faces, puenteRole)}
            </g>
          ))}
        </svg>
      </div>

      {/* Labels debajo del diente: primario + overlays RX/TC */}
      <div className="h-5 flex items-center justify-center gap-1 mt-1">
        {treatment_type === 'RX' && (
          <span className="text-sm font-black leading-none cursor-pointer"
            style={{ color: overlayColor }}
            onClick={() => onFaceClick(tooth_number, 'center')}>RX</span>
        )}
        {treatment_type === 'ENDODONCIA' && (
          <span className="text-sm font-black leading-none cursor-pointer"
            style={{ color: overlayColor }}
            onClick={() => onFaceClick(tooth_number, 'center')}>TC</span>
        )}
        {overlays.filter(ov => ov.treatment_type === 'RX' || ov.treatment_type === 'ENDODONCIA').map((ov, i) => {
          const c = ov.color ? COLOR_HEX[ov.color] ?? ov.color : '#000';
          return (
            <span key={i} className="text-sm font-black leading-none" style={{ color: c }}>
              {ov.treatment_type === 'RX' ? 'RX' : 'TC'}
            </span>
          );
        })}
      </div>
    </div>
  );
}
