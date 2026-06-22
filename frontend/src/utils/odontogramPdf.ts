import jsPDF from 'jspdf';
import type { DentalPiece, TreatmentType, Treatment, Budget } from '../types';

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

export function downloadTreatmentsPdf(patientName: string, treatments: { date_time: string; professional_email?: string; description: string; price: number }[], returnBase64 = false): string | void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];

  // Header
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
  doc.text('HISTORIAL DE TRATAMIENTOS', W / 2, 30, { align: 'center' });

  // Paciente y fecha
  doc.setTextColor(...darkBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(patientName, 14, 48);
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text(dateStr, W - 14, 48, { align: 'right' });
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 52, W - 14, 52);

  if (treatments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 140);
    doc.text('Sin tratamientos registrados.', W / 2, 80, { align: 'center' });
  } else {
    const colX = [14, 42, 95, 162];
    const headers = ['Fecha', 'Descripción', 'Profesional', 'Costo'];
    let y = 62;

    doc.setFillColor(240, 245, 255);
    doc.rect(14, y - 6, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...blue);
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let total = 0;

    treatments.forEach((t, idx) => {
      if (y > H - 30) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(14, y - 5, W - 28, 9, 'F');
      }
      doc.setTextColor(...darkBlue);
      doc.text(t.date_time, colX[0], y);
      const descLines = doc.splitTextToSize(t.description, 50);
      doc.text(descLines, colX[1], y);
      doc.setTextColor(100, 100, 120);
      doc.text(t.professional_email ?? '—', colX[2], y);
      doc.setTextColor(...darkBlue);
      doc.text(`$${t.price.toFixed(2)}`, colX[3], y);
      const lineH = Math.max(descLines.length * 5, 9);
      y += lineH;
      total += t.price;
    });

    doc.setDrawColor(...blue);
    doc.setLineWidth(0.3);
    doc.line(14, y + 2, W - 14, y + 2);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text(`Total: $${total.toFixed(2)}`, W - 14, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`${treatments.length} tratamiento${treatments.length !== 1 ? 's' : ''} registrado${treatments.length !== 1 ? 's' : ''}`, 14, y);
  }

  // Footer
  doc.setFillColor(...darkBlue);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });

  if (returnBase64) return doc.output('datauristring').split(',')[1];
  doc.save(`tratamientos_${patientName.replace(/\s+/g, '_')}.pdf`);
}

export function downloadMedicalHistoryPdf(patient: any) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];

  // Header
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
  doc.text('FICHA MÉDICA DEL PACIENTE', W / 2, 30, { align: 'center' });

  // Nombre completo y fecha
  const fullName = [patient.name, patient.last_name].filter(Boolean).join(' ');
  doc.setTextColor(...darkBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(fullName, 14, 48);
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text(dateStr, W - 14, 48, { align: 'right' });
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 52, W - 14, 52);

  let y = 62;

  const sectionTitle = (title: string) => {
    if (y > H - 40) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 245, 255);
    doc.rect(14, y - 5, W - 28, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...blue);
    doc.text(title.toUpperCase(), 16, y);
    y += 12;
  };

  const field = (label: string, value: string | undefined | null) => {
    if (!value?.trim()) return;
    if (y > H - 30) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...darkBlue);
    doc.text(`${label}:`, 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    const lines = doc.splitTextToSize(value, W - 65);
    doc.text(lines, 58, y);
    y += lines.length * 6 + 2;
  };

  const emptyNote = (msg: string) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 170);
    doc.text(msg, 16, y);
    y += 8;
  };

  // ── Datos filiatorios ──────────────────────────────────────────────────
  sectionTitle('Datos Filiatorios');
  field('DNI', patient.dni);
  field('Fecha de nac.', patient.birth_date);
  field('Teléfono', patient.phone);
  field('Email', patient.email);
  field('Obra social', patient.social_security);
  field('N° obra social', patient.social_security_number);
  field('Dirección', patient.address);
  field('Localidad', patient.city);
  field('Provincia', patient.province);
  y += 4;

  // ── Datos médicos ──────────────────────────────────────────────────────
  sectionTitle('Datos Médicos');
  field('Grupo sanguíneo', patient.blood_type);
  y += 2;

  sectionTitle('Alergias');
  patient.allergies?.trim() ? field('', patient.allergies) : emptyNote('Sin alergias registradas');
  y += 2;

  sectionTitle('Enfermedades / Antecedentes');
  patient.diseases?.trim() ? field('', patient.diseases) : emptyNote('Sin antecedentes registrados');
  y += 2;

  sectionTitle('Medicamentos actuales');
  patient.medications?.trim() ? field('', patient.medications) : emptyNote('Sin medicamentos registrados');
  y += 2;

  sectionTitle('Observaciones generales');
  patient.observations?.trim() ? field('', patient.observations) : emptyNote('Sin observaciones');

  // Footer
  doc.setFillColor(...darkBlue);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });

  doc.save(`ficha_medica_${fullName.replace(/\s+/g, '_')}.pdf`);
}

export function downloadFullHistoryPdf(patient: any, pieces: DentalPiece[], treatments: Treatment[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];
  const fullName = [patient.name, patient.last_name].filter(Boolean).join(' ');

  const addHeader = (subtitle: string) => {
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
    doc.text(subtitle, W / 2, 30, { align: 'center' });
    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(fullName, 14, 48);
    const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(dateStr, W - 14, 48, { align: 'right' });
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.4);
    doc.line(14, 52, W - 14, 52);
  };

  const addFooter = () => {
    doc.setFillColor(...darkBlue);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(160, 195, 240);
    doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });
  };

  const sectionTitle = (doc: jsPDF, title: string, y: number): number => {
    doc.setFillColor(240, 245, 255);
    doc.rect(14, y - 5, W - 28, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...blue);
    doc.text(title.toUpperCase(), 16, y);
    return y + 12;
  };

  const field = (doc: jsPDF, label: string, value: string | undefined | null, y: number): number => {
    if (!value?.trim()) return y;
    if (y > H - 30) { doc.addPage(); addFooter(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...darkBlue);
    doc.text(`${label}:`, 16, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 80);
    const lines = doc.splitTextToSize(value, W - 65);
    doc.text(lines, 58, y);
    return y + lines.length * 6 + 2;
  };

  // ── Página 1: Datos filiatorios + ficha médica ───────────────────────
  addHeader('HISTORIA CLÍNICA COMPLETA');
  let y = 62;

  y = sectionTitle(doc, 'Datos Filiatorios', y);
  y = field(doc, 'DNI', patient.dni, y);
  y = field(doc, 'Fecha de nac.', patient.birth_date, y);
  y = field(doc, 'Teléfono', patient.phone, y);
  y = field(doc, 'Email', patient.email, y);
  y = field(doc, 'Obra social', patient.social_security, y);
  y = field(doc, 'N° obra social', patient.social_security_number, y);
  y = field(doc, 'Dirección', patient.address, y);
  y = field(doc, 'Localidad / Provincia', [patient.city, patient.province].filter(Boolean).join(', '), y);
  y += 4;

  y = sectionTitle(doc, 'Datos Médicos', y);
  y = field(doc, 'Grupo sanguíneo', patient.blood_type, y);
  y += 2;
  y = sectionTitle(doc, 'Alergias', y);
  if (patient.allergies?.trim()) { y = field(doc, '', patient.allergies, y); } else { doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(150,150,170); doc.text('Sin alergias', 16, y); y += 8; }
  y += 2;
  y = sectionTitle(doc, 'Enfermedades / Antecedentes', y);
  if (patient.diseases?.trim()) { y = field(doc, '', patient.diseases, y); } else { doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(150,150,170); doc.text('Sin antecedentes', 16, y); y += 8; }
  y += 2;
  y = sectionTitle(doc, 'Medicamentos', y);
  if (patient.medications?.trim()) { y = field(doc, '', patient.medications, y); } else { doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(150,150,170); doc.text('Sin medicamentos', 16, y); y += 8; }
  y += 2;
  y = sectionTitle(doc, 'Observaciones', y);
  if (patient.observations?.trim()) { y = field(doc, '', patient.observations, y); } else { doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(150,150,170); doc.text('Sin observaciones', 16, y); }
  addFooter();

  // ── Página 2: Odontograma ────────────────────────────────────────────
  doc.addPage();
  addHeader('ODONTOGRAMA');
  y = 62;
  const treated = pieces.filter(p => p.treatment_type !== 'NONE');
  if (treated.length === 0) {
    doc.setFont('helvetica','italic'); doc.setFontSize(11); doc.setTextColor(120,120,140);
    doc.text('Sin tratamientos registrados.', W / 2, 80, { align: 'center' });
  } else {
    const colX = [14, 36, 90, 145];
    doc.setFillColor(240, 245, 255); doc.rect(14, y - 6, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...blue);
    ['Pieza', 'Tratamiento', 'Estado', 'Arcada'].forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;
    const upperSet = new Set(UPPER);
    for (const piece of [...treated].sort((a, b) => a.tooth_number - b.tooth_number)) {
      if (y > H - 30) { doc.addPage(); addFooter(); y = 20; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.setTextColor(...darkBlue);
      doc.text(String(piece.tooth_number), colX[0], y);
      doc.text(TREATMENT_LABELS[piece.treatment_type] ?? piece.treatment_type, colX[1], y);
      doc.text(piece.color ? COLOR_LABELS[piece.color] : '—', colX[2], y);
      doc.text(upperSet.has(piece.tooth_number) ? 'Superior' : 'Inferior', colX[3], y);
      y += 9;
    }
  }
  addFooter();

  // ── Página 3: Tratamientos ───────────────────────────────────────────
  doc.addPage();
  addHeader('HISTORIAL DE TRATAMIENTOS');
  y = 62;
  const visibleTreatments = treatments.filter(t => (t.price ?? 0) > 0 || !t.odontogram_type);
  if (visibleTreatments.length === 0) {
    doc.setFont('helvetica','italic'); doc.setFontSize(11); doc.setTextColor(120,120,140);
    doc.text('Sin tratamientos registrados.', W / 2, 80, { align: 'center' });
  } else {
    const colX = [14, 42, 110, 162];
    doc.setFillColor(240, 245, 255); doc.rect(14, y - 6, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...blue);
    ['Fecha', 'Descripción', 'Profesional', 'Costo'].forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;
    let total = 0;
    visibleTreatments.forEach((t, idx) => {
      if (y > H - 30) { doc.addPage(); addFooter(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(250, 252, 255); doc.rect(14, y - 5, W - 28, 9, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...darkBlue);
      doc.text(t.date_time?.slice(0, 10) ?? '', colX[0], y);
      const lines = doc.splitTextToSize(t.description, 65);
      doc.text(lines, colX[1], y);
      doc.setTextColor(100, 100, 120);
      doc.text(t.professional_email ?? '—', colX[2], y);
      doc.setTextColor(...darkBlue);
      doc.text(`$${(t.price ?? 0).toFixed(0)}`, colX[3], y);
      y += Math.max(lines.length * 5, 9);
      total += t.price ?? 0;
    });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...darkBlue);
    doc.text(`Total: $${total.toFixed(0)}`, W - 14, y + 8, { align: 'right' });
  }
  addFooter();

  doc.save(`historia_completa_${fullName.replace(/\s+/g, '_')}.pdf`);
}

export function getBudgetPdfBase64(patientName: string, budget: Budget, professionalName: string): string {
  return downloadBudgetPdf(patientName, budget, professionalName, true) as string;
}

export function getTreatmentsPdfBase64(patientName: string, treatments: { date_time: string; professional_email?: string; description: string; price: number }[]): string {
  return downloadTreatmentsPdf(patientName, treatments, true) as string;
}

export function getConsentPdfBase64(patientName: string, patientDni: string, professionalName: string, consentType: ConsentType, toothNumber?: string): string {
  return downloadConsentPdf(patientName, patientDni, professionalName, consentType, toothNumber, true) as string;
}


export function downloadBudgetPdf(patientName: string, budget: Budget, professionalName: string, returnBase64 = false): string | void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];

  // Header
  doc.setFillColor(...darkBlue); doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(...blue); doc.rect(0, 33, W, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('ONE Smile', W / 2, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('ODONTOLOGÍA TRIFIRO', W / 2, 22, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(200, 225, 255);
  doc.text('PRESUPUESTO', W / 2, 30, { align: 'center' });

  // Info paciente y fecha
  doc.setTextColor(...darkBlue); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(patientName, 14, 48);
  const dateStr = new Date(budget.created_at ?? Date.now()).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 120);
  doc.text(dateStr, W - 14, 48, { align: 'right' });
  doc.setDrawColor(...blue); doc.setLineWidth(0.4);
  doc.line(14, 52, W - 14, 52);

  // Profesional
  if (professionalName) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 100);
    doc.text(`Profesional: ${professionalName}`, 14, 59);
  }

  // Tabla de ítems
  let y = 68;
  const colX = [14, 90, 130, 162];
  doc.setFillColor(240, 245, 255); doc.rect(14, y - 6, W - 28, 10, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...blue);
  ['Descripción', 'Cant.', 'Precio unit.', 'Subtotal'].forEach((h, i) => doc.text(h, colX[i], y));
  y += 8;

  let total = 0;
  budget.items.forEach((item, idx) => {
    if (y > H - 40) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) { doc.setFillColor(250, 252, 255); doc.rect(14, y - 5, W - 28, 9, 'F'); }
    const subtotal = item.quantity * item.unit_price;
    total += subtotal;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...darkBlue);
    const lines = doc.splitTextToSize(item.description, 72);
    doc.text(lines, colX[0], y);
    doc.text(String(item.quantity), colX[1], y);
    doc.text(`$${item.unit_price.toLocaleString('es-AR')}`, colX[2], y);
    doc.text(`$${subtotal.toLocaleString('es-AR')}`, colX[3], y);
    y += Math.max(lines.length * 6, 9);
  });

  // Total
  doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.line(14, y + 2, W - 14, y + 2);
  y += 10;
  doc.setFillColor(...darkBlue); doc.rect(130, y - 6, W - 144, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL: $${total.toLocaleString('es-AR')}`, W - 16, y + 1, { align: 'right' });

  // Notas
  if (budget.notes) {
    y += 18;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(100, 100, 120);
    doc.text(`Observaciones: ${budget.notes}`, 14, y);
  }

  // Validez
  y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 170);
  doc.text('Este presupuesto tiene una validez de 30 días desde la fecha de emisión.', 14, y);

  // Firma
  y += 20;
  doc.setDrawColor(150, 150, 170); doc.setLineWidth(0.3);
  doc.line(14, y, 80, y);
  doc.setFontSize(8); doc.setTextColor(100, 100, 120);
  doc.text('Firma del profesional', 14, y + 5);

  // Footer
  doc.setFillColor(...darkBlue); doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 195, 240);
  doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });

  if (returnBase64) return doc.output('datauristring').split(',')[1];
  doc.save(`presupuesto_${patientName.replace(/\s+/g, '_')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENTIMIENTO INFORMADO
// ─────────────────────────────────────────────────────────────────────────────

export type ConsentType = 'extraccion' | 'endodoncia' | 'implante' | 'protesis' | 'periodoncia' | 'blanqueamiento';

const CONSENT_DATA: Record<ConsentType, { title: string; description: string; risks: string[]; postcare: string[] }> = {
  extraccion: {
    title: 'Extracción Dental',
    description:
      'La extracción dental es el procedimiento mediante el cual se retira una pieza dentaria de su alvéolo óseo. ' +
      'Se realiza bajo anestesia local y puede ser simple (diente erupcionado) o quirúrgica (diente incluido o impactado). ' +
      'El profesional ha evaluado que este procedimiento es la alternativa más conveniente para la salud bucal del paciente.',
    risks: [
      'Dolor e inflamación postoperatoria (normal durante los primeros 3-5 días).',
      'Sangrado leve durante las primeras horas.',
      'Alveolitis (infección del alvéolo) en casos poco frecuentes.',
      'Parestesia transitoria (entumecimiento) de labio, lengua o mentón.',
      'Daño a dientes adyacentes o restauraciones existentes.',
      'Fractura de raíz o hueso alveolar (manejable durante el mismo acto).',
      'Comunicación oroantral (en extracciones superiores posteriores), de manejo inmediato.',
      'Necesidad de intervención adicional en caso de complicaciones.',
    ],
    postcare: [
      'Morder el apósito de gasa durante 30-45 minutos sin retirarlo.',
      'Aplicar hielo en forma intermitente (20 min sí / 20 min no) durante las primeras 24 hs.',
      'No enjuagarse ni escupir con fuerza durante las primeras 24 hs.',
      'Dieta blanda y fría el día del procedimiento.',
      'No fumar ni consumir alcohol durante al menos 48 hs.',
      'Tomar la medicación indicada según prescripción.',
      'Concurrir a control en caso de sangrado excesivo, fiebre o dolor intenso.',
    ],
  },
  endodoncia: {
    title: 'Tratamiento de Conductos (Endodoncia)',
    description:
      'La endodoncia es el procedimiento que permite conservar una pieza dentaria mediante la eliminación del tejido pulpar ' +
      '(nervio y vasos sanguíneos) del interior de los conductos radiculares, su limpieza, conformación y sellado. ' +
      'Se realiza bajo anestesia local y puede requerir una o más sesiones según la complejidad del caso.',
    risks: [
      'Dolor e inflamación postoperatoria durante los primeros días.',
      'Fractura de instrumento dentro del conducto (infrecuente, manejable).',
      'Perforación radicular o de furca (requiere manejo inmediato).',
      'Falla del tratamiento que puede requerir retratamiento o cirugía apical.',
      'Reabsorción radicular en casos predisponentes.',
      'Necesidad de restauración coronal (corona o reconstrucción) posterior al tratamiento.',
      'En casos de infección activa, puede requerirse antibioticoterapia complementaria.',
    ],
    postcare: [
      'Evitar masticar del lado tratado hasta colocar la restauración definitiva.',
      'Tomar analgésicos según prescripción ante molestias postoperatorias.',
      'Concurrir a las sesiones indicadas sin interrumpir el tratamiento.',
      'Realizar la restauración definitiva dentro del plazo recomendado.',
      'Controles radiográficos periódicos para evaluar la cicatrización apical.',
    ],
  },
  implante: {
    title: 'Colocación de Implante Dental',
    description:
      'El implante dental es una raíz artificial de titanio que se coloca quirúrgicamente en el hueso maxilar o mandibular ' +
      'para reemplazar una pieza dentaria ausente. Sobre él se confecciona una corona, puente o prótesis. ' +
      'El procedimiento se realiza bajo anestesia local y requiere un período de osteointegración (fusión con el hueso) ' +
      'de aproximadamente 3 a 6 meses antes de colocar la restauración definitiva.',
    risks: [
      'Dolor, inflamación y hematoma postoperatorio.',
      'Infección del sitio quirúrgico (periimplantitis).',
      'Fracaso de la osteointegración (el implante no se fija al hueso).',
      'Daño a estructuras anatómicas vecinas (nervio dentario inferior, seno maxilar).',
      'Fractura del implante en situaciones de sobrecarga.',
      'Necesidad de injerto óseo previo o simultáneo si el volumen óseo es insuficiente.',
      'Resultados estéticos condicionados por la anatomía individual del paciente.',
    ],
    postcare: [
      'Aplicar hielo las primeras 24 hs para reducir la inflamación.',
      'Dieta blanda durante al menos 2 semanas.',
      'Higiene oral cuidadosa sin cepillar directamente la zona operada los primeros días.',
      'No fumar durante todo el período de osteointegración.',
      'Tomar antibióticos y analgésicos según prescripción.',
      'Concurrir a todos los controles postoperatorios indicados.',
      'Evitar esfuerzos físicos intensos durante los primeros 3 días.',
    ],
  },
  protesis: {
    title: 'Confección de Prótesis Dental',
    description:
      'La prótesis dental es un dispositivo que reemplaza una o más piezas dentarias ausentes, ' +
      'ya sea de forma fija (corona, puente) o removible (prótesis parcial o completa). ' +
      'Su confección requiere múltiples sesiones de toma de impresiones, pruebas y ajustes para lograr ' +
      'una correcta oclusión, fonética y estética.',
    risks: [
      'Período de adaptación que puede durar varias semanas.',
      'Molestias o rozaduras iniciales que requieren ajustes.',
      'Cambios en la fonética durante el período de adaptación.',
      'Desgaste o fractura de la prótesis por uso o hábitos parafuncionales (bruxismo).',
      'En prótesis fijas: sensibilidad dentaria en los dientes pilares.',
      'Necesidad de rebase o reconstrucción con el tiempo por cambios en los tejidos de soporte.',
      'En prótesis completas: reabsorción ósea progresiva del reborde alveolar.',
    ],
    postcare: [
      'Retirar y limpiar la prótesis removible después de cada comida.',
      'Mantenerla en agua o solución limpiadora durante la noche.',
      'No doblar ni forzar los ganchos de la prótesis.',
      'Concurrir a controles periódicos para evaluar ajuste y estado de la prótesis.',
      'Ante fracturas o desprendimientos, no intentar repararlos con pegamentos comunes.',
      'Informar al profesional ante cambios en la estabilidad o comodidad.',
    ],
  },
  periodoncia: {
    title: 'Tratamiento Periodontal (Cirugía de Encías)',
    description:
      'El tratamiento periodontal comprende los procedimientos destinados a tratar las enfermedades de los tejidos ' +
      'de soporte del diente (encías y hueso). Puede incluir raspaje y alisado radicular, curetajes, ' +
      'cirugías de acceso, injertos gingivales u óseos, según la severidad de la enfermedad periodontal. ' +
      'Se realiza bajo anestesia local.',
    risks: [
      'Dolor e inflamación postoperatoria.',
      'Sangrado durante y después del procedimiento.',
      'Sensibilidad dentaria por exposición radicular.',
      'Recesión gingival con mayor exposición de las raíces.',
      'Movilidad dentaria transitoria.',
      'Recidiva de la enfermedad periodontal sin adecuado mantenimiento.',
      'En cirugías con injertos: fracaso del injerto (poco frecuente).',
    ],
    postcare: [
      'Enjuagues con clorhexidina según indicación del profesional.',
      'No cepillar la zona operada durante los primeros días.',
      'Dieta blanda y fría las primeras 48 hs.',
      'No fumar durante el período de cicatrización.',
      'Tomar medicación según prescripción.',
      'Mantener controles de mantenimiento periodontal cada 3-4 meses.',
      'Higiene oral estricta como pilar fundamental del éxito del tratamiento.',
    ],
  },
  blanqueamiento: {
    title: 'Blanqueamiento Dental',
    description:
      'El blanqueamiento dental es un procedimiento estético que utiliza agentes químicos (peróxido de hidrógeno ' +
      'o peróxido de carbamida) para aclarar el color de los dientes. Puede realizarse en el consultorio ' +
      '(con luz de activación) o con cubetas individualizadas para el hogar, o mediante la combinación de ambos. ' +
      'Los resultados varían según el tipo de mancha y la tonalidad natural de cada paciente.',
    risks: [
      'Sensibilidad dentaria transitoria durante y después del tratamiento.',
      'Irritación gingival por contacto con el agente blanqueador.',
      'Resultados variables según el tipo y origen de las manchas.',
      'No actúa sobre restauraciones (coronas, carillas, obturaciones).',
      'Posible recidiva del color con el tiempo, especialmente con café, té, vino o tabaco.',
      'En dientes con fisuras o caries activas, puede producir hipersensibilidad intensa.',
    ],
    postcare: [
      'Evitar alimentos y bebidas con pigmentos (café, té, vino, gaseosas) durante 48 hs.',
      'No fumar durante al menos 48 hs posteriores al tratamiento.',
      'Usar pasta dental para dientes sensibles si hay hipersensibilidad.',
      'Usar los protectores con el gel según indicación del profesional.',
      'Concurrir al control postratamiento para evaluar resultados.',
      'Realizar retoques de mantenimiento según recomendación profesional.',
    ],
  },
};

export function downloadConsentPdf(
  patientName: string,
  patientDni: string,
  professionalName: string,
  consentType: ConsentType,
  toothNumber?: string,
  returnBase64 = false,
): string | void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];
  const data = CONSENT_DATA[consentType];

  // ── Header ───────────────────────────────────────────────────────────
  doc.setFillColor(...darkBlue); doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(...blue); doc.rect(0, 33, W, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('ONE Smile', W / 2, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('ODONTOLOGÍA TRIFIRO', W / 2, 22, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(200, 225, 255);
  doc.text('CONSENTIMIENTO INFORMADO', W / 2, 30, { align: 'center' });

  // ── Título del procedimiento ─────────────────────────────────────────
  doc.setTextColor(...darkBlue); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(data.title.toUpperCase(), W / 2, 48, { align: 'center' });
  doc.setDrawColor(...blue); doc.setLineWidth(0.5);
  doc.line(14, 52, W - 14, 52);

  // ── Datos del paciente ────────────────────────────────────────────────
  let y = 60;
  doc.setFillColor(245, 248, 255); doc.rect(14, y - 4, W - 28, 22, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...darkBlue);
  doc.text('Paciente:', 18, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(patientName, 42, y + 2);
  doc.setFont('helvetica', 'bold');
  doc.text('DNI:', 18, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(patientDni || '—', 42, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.text('Profesional:', 110, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(professionalName || '—', 135, y + 2);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', 110, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }), 125, y + 9);
  if (toothNumber) {
    doc.setFont('helvetica', 'bold'); doc.text('Pieza/s:', 18, y + 16);
    doc.setFont('helvetica', 'normal'); doc.text(toothNumber, 42, y + 16);
  }
  y += 28;

  const writeBlock = (title: string, content: string | string[], bullet = false) => {
    if (y > H - 50) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 245, 255); doc.rect(14, y - 4, W - 28, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...blue);
    doc.text(title.toUpperCase(), 16, y + 1);
    y += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60);
    if (Array.isArray(content)) {
      content.forEach(item => {
        if (y > H - 30) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`${bullet ? '• ' : ''}${item}`, W - 34);
        doc.text(lines, 18, y);
        y += lines.length * 5.5;
      });
    } else {
      const lines = doc.splitTextToSize(content, W - 32);
      doc.text(lines, 16, y);
      y += lines.length * 5.5;
    }
    y += 4;
  };

  writeBlock('Descripción del Procedimiento', data.description);
  writeBlock('Riesgos y Posibles Complicaciones', data.risks, true);
  writeBlock('Cuidados Postoperatorios', data.postcare, true);

  // ── Declaración ───────────────────────────────────────────────────────
  if (y > H - 70) { doc.addPage(); y = 20; }
  y += 4;
  doc.setFillColor(255, 252, 240); doc.rect(14, y - 4, W - 28, 28, 'F');
  doc.setDrawColor(200, 180, 0); doc.setLineWidth(0.4);
  doc.rect(14, y - 4, W - 28, 28);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...darkBlue);
  doc.text('DECLARACIÓN DEL PACIENTE', 16, y + 2);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 60);
  const declaracion = doc.splitTextToSize(
    `Yo, ${patientName}, DNI ${patientDni || '____________________'}, declaro que he sido informado/a por el profesional ` +
    `${professionalName || '____________________'} sobre el procedimiento de ${data.title.toLowerCase()}, sus ` +
    `objetivos, riesgos, alternativas de tratamiento y cuidados postoperatorios. He comprendido la información ` +
    `recibida y he podido formular las preguntas que consideré necesarias, obteniendo respuestas satisfactorias. ` +
    `En consecuencia, otorgo mi consentimiento libre y voluntario para la realización del procedimiento.`,
    W - 36
  );
  doc.text(declaracion, 16, y + 9);
  y += 34;

  // ── Firmas ────────────────────────────────────────────────────────────
  if (y > H - 40) { doc.addPage(); y = 20; }
  y += 8;
  doc.setDrawColor(100, 100, 120); doc.setLineWidth(0.3);
  doc.line(14, y, 85, y);
  doc.line(115, y, W - 14, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 100);
  doc.text('Firma del Paciente', 14, y + 5);
  doc.text('Firma y Sello del Profesional', 115, y + 5);
  doc.text(`Aclaración: ${patientName}`, 14, y + 11);
  doc.text(`Aclaración: ${professionalName || '____________________'}`, 115, y + 11);

  // ── Footer ────────────────────────────────────────────────────────────
  doc.setFillColor(...darkBlue); doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 195, 240);
  doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });

  if (returnBase64) return doc.output('datauristring').split(',')[1];
  doc.save(`consentimiento_${consentType}_${patientName.replace(/\s+/g, '_')}.pdf`);
}
