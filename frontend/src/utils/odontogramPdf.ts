import jsPDF from 'jspdf';
import type { DentalPiece, TreatmentType } from '../types';

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  NONE:               'Sano',
  CARIES:             'Caries',
  FILLING:            'Obturación',
  EXTRACTION_PENDING: 'Extracción a realizar',
  EXTRACTED:          'Extraído',
  ABSENT:             'Ausente',
  CROWN:              'Corona',
  RX:                 'RX',
  IMPLANT:            'Implante',
  PERNO:              'Perno',
  ENDODONCIA:         'Endodoncia',
  PROTESIS:           'Prótesis Completa',
  PROTESIS_PARCIAL:   'Prótesis Parcial',
  PUENTE:             'Puente',
};

const COLOR_LABELS: Record<string, string> = {
  BLUE:  'A realizar',
  RED:   'Realizado',
  GREEN: 'Por profesional',
};

const COLOR_HEX: Record<string, [number, number, number]> = {
  BLUE:  [59, 130, 246],
  RED:   [239, 68, 68],
  GREEN: [34, 197, 94],
};

const UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

export function downloadOdontogramPdf(patientName: string, pieces: DentalPiece[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];

  // ── Header ──────────────────────────────────────────────────────────
  doc.setFillColor(...darkBlue);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(...blue);
  doc.rect(0, 33, W, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('ONE Smile', W / 2, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('ODONTOLOGÍA TRIFIRO', W / 2, 22, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(200, 225, 255);
  doc.text('INFORME DE ODONTOGRAMA', W / 2, 30, { align: 'center' });

  // ── Paciente y fecha ─────────────────────────────────────────────────
  doc.setTextColor(...darkBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(patientName, 14, 48);

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text(dateStr, W - 14, 48, { align: 'right' });

  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 52, W - 14, 52);

  // ── Tabla de piezas con tratamiento ──────────────────────────────────
  const treated = pieces.filter(p => p.treatment_type !== 'NONE');

  if (treated.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 140);
    doc.text('Sin tratamientos registrados. Dentición en buen estado.', W / 2, 80, { align: 'center' });
  } else {
    // Encabezados de tabla
    const colX = [14, 36, 90, 145];
    const headers = ['Pieza', 'Tratamiento', 'Estado', 'Arcada'];
    let y = 62;

    doc.setFillColor(240, 245, 255);
    doc.rect(14, y - 6, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...blue);
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;

    // Filas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const upperSet = new Set(UPPER);
    const sorted = [...treated].sort((a, b) => {
      const aUp = upperSet.has(a.tooth_number) ? 0 : 1;
      const bUp = upperSet.has(b.tooth_number) ? 0 : 1;
      return aUp !== bUp ? aUp - bUp : a.tooth_number - b.tooth_number;
    });

    for (const piece of sorted) {
      if (y > H - 30) {
        doc.addPage();
        y = 20;
      }

      const isEven = sorted.indexOf(piece) % 2 === 0;
      if (isEven) {
        doc.setFillColor(250, 252, 255);
        doc.rect(14, y - 5, W - 28, 9, 'F');
      }

      const colorRgb = piece.color ? COLOR_HEX[piece.color] : darkBlue;
      doc.setTextColor(...colorRgb);
      doc.setFont('helvetica', 'bold');
      doc.text(String(piece.tooth_number), colX[0], y);

      doc.setTextColor(...darkBlue);
      doc.setFont('helvetica', 'normal');
      doc.text(TREATMENT_LABELS[piece.treatment_type] ?? piece.treatment_type, colX[1], y);
      doc.text(piece.color ? COLOR_LABELS[piece.color] : '—', colX[2], y);
      doc.text(upperSet.has(piece.tooth_number) ? 'Superior' : 'Inferior', colX[3], y);

      y += 9;
    }

    // Línea de cierre
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.3);
    doc.line(14, y + 2, W - 14, y + 2);

    // Totales
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...darkBlue);
    doc.text(`Total de piezas con tratamiento: ${treated.length} de 32`, 14, y);
  }

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setFillColor(...darkBlue);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });

  const fileName = `odontograma_${patientName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
