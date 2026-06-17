import type { TreatmentType, TreatmentColor } from '../../types';

export interface SelectedTool {
  treatment_type: TreatmentType;
  color: TreatmentColor;
}

interface TreatmentConfig {
  type: TreatmentType;
  label: string;
  colors: TreatmentColor[];
  isFaceBased: boolean;
}

export const TREATMENTS: TreatmentConfig[] = [
  { type: 'CARIES',             label: 'Caries',               colors: ['BLUE'],                  isFaceBased: true  },
  { type: 'FILLING',            label: 'Obturación',            colors: ['RED', 'GREEN'],           isFaceBased: true  },
  { type: 'EXTRACTION_PENDING', label: 'Extracción a realizar', colors: ['BLUE'],                  isFaceBased: false },
  { type: 'EXTRACTED',          label: 'Extraído',              colors: ['RED', 'GREEN'],           isFaceBased: false },
  { type: 'ABSENT',             label: 'Ausente',               colors: ['RED'],                   isFaceBased: false },
  { type: 'CROWN',              label: 'Corona',                colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'RX',                 label: 'RX',                    colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'IMPLANT',            label: 'Implante',              colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'PERNO',              label: 'Perno',                 colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'ENDODONCIA',         label: 'Endodoncia',            colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'PROTESIS',           label: 'Prótesis Completa',     colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'PROTESIS_PARCIAL',   label: 'Prótesis Parcial',      colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
  { type: 'PUENTE',             label: 'Puente',                colors: ['BLUE', 'RED', 'GREEN'],   isFaceBased: false },
];

const COLOR_HEX: Record<TreatmentColor, string> = {
  BLUE:  '#3b82f6',
  RED:   '#ef4444',
  GREEN: '#22c55e',
};

const COLOR_LABEL: Record<TreatmentColor, string> = {
  BLUE:  'A realizar',
  RED:   'Realizado',
  GREEN: 'Por profesional',
};

interface TreatmentPanelProps {
  selected: SelectedTool;
  onChange: (tool: SelectedTool) => void;
}

export function TreatmentPanel({ selected, onChange }: TreatmentPanelProps) {
  const currentConfig = TREATMENTS.find(t => t.type === selected.treatment_type);

  const selectTreatment = (cfg: TreatmentConfig) => {
    const keepColor = cfg.colors.includes(selected.color) ? selected.color : cfg.colors[0];
    onChange({ treatment_type: cfg.type, color: keepColor });
  };

  const selectColor = (c: TreatmentColor) => onChange({ ...selected, color: c });

  const availableColors = currentConfig?.colors ?? (['BLUE', 'RED', 'GREEN'] as TreatmentColor[]);

  return (
    <div className="flex flex-col bg-card border border-border/60 rounded-2xl shadow-sm w-44 shrink-0 overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/60 bg-muted/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Herramienta</p>
      </div>

      {/* Color selector */}
      <div className="px-3 py-3 border-b border-border/60 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Color</p>
        <div className="flex gap-2">
          {availableColors.map(c => (
            <button
              key={c}
              title={COLOR_LABEL[c]}
              onClick={() => selectColor(c)}
              className="relative w-7 h-7 rounded-full transition-all focus:outline-none"
              style={{ backgroundColor: COLOR_HEX[c] }}
            >
              {selected.color === c && (
                <span className="absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 0 2px white, 0 0 0 4px ${COLOR_HEX[c]}` }} />
              )}
            </button>
          ))}
        </div>
        {currentConfig && (
          <p className="text-[10px] text-muted-foreground leading-tight">{COLOR_LABEL[selected.color]}</p>
        )}
      </div>

      {/* Treatment list */}
      <div className="flex flex-col py-1.5 flex-1">
        {TREATMENTS.map((cfg, i) => {
          const isActive = selected.treatment_type === cfg.type;
          const showDivider = i === 10;
          return (
            <div key={cfg.type}>
              {showDivider && <div className="mx-3 my-1 border-t border-border/40" />}
              <button
                onClick={() => selectTreatment(cfg)}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-all relative ${
                  isActive
                    ? 'text-primary font-semibold bg-primary/8'
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
                )}
                {cfg.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Eraser */}
      <div className="border-t border-border/60">
        <button
          onClick={() => onChange({ treatment_type: 'NONE', color: 'BLUE' })}
          className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-all flex items-center gap-2 ${
            selected.treatment_type === 'NONE'
              ? 'bg-muted text-foreground font-semibold'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <span className="text-base leading-none">🧹</span> Borrador
        </button>
      </div>
    </div>
  );
}
