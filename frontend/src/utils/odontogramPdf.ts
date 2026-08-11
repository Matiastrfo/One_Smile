import jsPDF from 'jspdf';
import type { DentalPiece, TreatmentType, Treatment, Budget, AccountEntryItem } from '../types';

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
  field('País', patient.country);
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
  y = field(doc, 'Localidad / Provincia / País', [patient.city, patient.province, patient.country].filter(Boolean).join(', '), y);
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

export function getConsentPdfBase64(patientName: string, patientDni: string, professionalName: string, consentType: ConsentType, toothNumber?: string, procedureDetail?: string): string {
  return downloadConsentPdf(patientName, patientDni, professionalName, consentType, toothNumber, true, procedureDetail) as string;
}

export function getAdmisionPdfBase64(patientName: string): string {
  return downloadAdmisionPdf(patientName, true) as string;
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
// Contenido transcripto de los formularios reales del Círculo Odontológico de
// Mendoza. Los campos que en el original se completan a mano (fechas de
// próximo control, materiales convenidos, riesgos personalizados, etc.) se
// representan como líneas en blanco para completar en el papel/PDF impreso.
// ─────────────────────────────────────────────────────────────────────────────

export type ConsentType =
  | 'extraccion' | 'endodoncia' | 'implante'
  | 'protesis_fija' | 'protesis_removible'
  | 'periodoncia' | 'cosmeticos' | 'biopsia'
  | 'odontopediatria' | 'ortodoncia';

interface ConsentSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  blankLines?: number;
}

interface ConsentDoc {
  title: string;
  sections: ConsentSection[];
  signature: 'standard' | 'odontopediatria' | 'ortodoncia';
}

const CONSENT_DATA: Record<ConsentType, ConsentDoc> = {
  extraccion: {
    title: 'Consentimiento Informado Extracción',
    signature: 'standard',
    sections: [
      {
        paragraphs: [
          'Usted tiene derecho a conocer el procedimiento al que va a ser sometido y las complicaciones más frecuentes que ocurren. Este documento intenta explicarle todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que, por imperativo legal, tendrá que firmar, usted o su representante legal, el consentimiento informado para que pueda realizarle el procedimiento descripto a continuación.',
          'A propósito, declaro haber sido informado y haber comprendido acabadamente la conveniencia y el objetivo de la/s extracción del/los elemento/s {{tooth}} y las consecuencias de no llevar a cabo dicho tratamiento, devolviendo la salud bucal al paciente.',
        ],
      },
      { heading: 'Tratamientos Alternativos (Riesgos, Beneficios y Perjuicios)', blankLines: 3 },
      {
        paragraphs: [
          'Declaro que mi odontólogo ha examinado mi boca debidamente. Que se me ha explicado otras alternativas a este tratamiento, que se han estudiado y considerado estos métodos que se me informaron, siendo mi voluntad que se me realice el tratamiento objeto del presente consentimiento.',
        ],
      },
      {
        heading: 'Riesgos, Molestias y Efectos Adversos Previsibles',
        bullets: [
          'Molestias postoperatorias que puedan durar desde unas horas hasta varios días y para lo cual se administrará medicación en caso de ser necesario.',
          'Tumefacción (hinchazón) post-operatoria del área gingival en la vecindad del diente extraído o tumefacción facial, las cuales pueden persistir durante varios días.',
          'Infección y dolor.',
          'Trismus (limitación de la apertura de la boca), que usualmente dura algunos días, pero puede persistir durante un período más prolongado.',
          'Posibilidad de producirse comunicación bucosinusal (comunicación entre la cavidad bucal y el seno maxilar, que integra parte de las vías respiratorias).',
          'Parestesia (pérdida de la sensibilidad).',
          'Alveolitis (infección y dolor del sitio vacío dejado posterior a la extracción, para lo cual deberá regresar a la consulta y realizar el tratamiento correspondiente).',
          'Fractura del elemento y/o del hueso.',
          'Hemorragia (sangrado abundante).',
        ],
      },
      { heading: 'Riesgos Personalizados', paragraphs: ['Además de los riesgos antes descriptos, por mis circunstancias especiales hay que esperar los siguientes riesgos:'], blankLines: 2 },
      {
        heading: 'Indicaciones',
        bullets: [
          'La gasa protectora de la herida colocada por el profesional en el consultorio, retirarla al cabo de 1 hora de finalizada la intervención.',
          'Si le sangra en horas durante las cuales no pudiera concurrir al consultorio, haga un bollo de gasa esterilizada del tamaño de una nuez y aplíquela sobre la herida apretando fuertemente sobre los dientes opuestos. Consérvela en su sitio hasta que vuelva al consultorio, que ha de ser lo antes posible.',
          'Cuando llegue a su casa, después de la operación conviene guardar reposo por algunas horas; en caso de recostarse, hacerlo con la cabeza en alto sobre la región operada. Puede colocar de manera intermitente frío durante quince minutos y quince minutos de descanso, no repita esta indicación más de dos o tres veces. Con este método se logra combatir el edema post-operatorio.',
          'No fumar.',
          'No ingerir alimentos calientes, solo fríos o tibios (flan, yogurt, helado, gelatina, compota, entre otros).',
          'No realizar succión (no tomar mate, no usar sorbete): puede disolver el coágulo sanguíneo y producir hemorragias o infecciones.',
          'No realizar enjuagatorios ni buches.',
          'No realizar esfuerzo físico, ni permanecer expuesto a fuentes de calor (sol, estufas, hornos, plancha).',
          'No ingerir alimentos con semillas pequeñas (tomate, kiwi, uva), ya que pueden introducirse en el interior de la herida.',
          'No masticar del lado en donde se realizó la extracción.',
          'No tocarse la zona con la mano.',
          'No realizar movimientos que impliquen el descenso brusco de la cabeza.',
        ],
      },
      { heading: 'Medicación Indicada — Pre quirúrgico', blankLines: 2 },
      { heading: 'Medicación Indicada — Post quirúrgico', blankLines: 2 },
      {
        heading: 'Consecuencias de la No Realización del Procedimiento Propuesto',
        paragraphs: ['Usted puede padecer focos infecciosos, infección de otros órganos (corazón, riñón), quistes, tumores, pérdida de hueso, afección de elementos dentarios vecinos, sinusitis odontógenas, problemas masticatorios, fonéticos y estéticos, pérdida del cabello, secuestros óseos.'],
        blankLines: 2,
      },
      {
        paragraphs: [
          'Todas mis dudas han sido aclaradas y estoy completamente de acuerdo con lo consignado en esta fórmula de consentimiento. Si al momento de la intervención surgiera una situación anátomo patológica distinta y más grave a la prevista, doy mi consentimiento para que se actúe del modo más conocido, según la ciencia y conciencia respecto a lo programado, por el exclusivo interés de mi salud. Asimismo, doy consentimiento para la administración de anestesia local que se aplicará para la realización de dicho tratamiento, delegando al odontólogo el tipo de anestesia y me comprometo a regresar a la próxima consulta el día ____/____/____ Hora ____.',
          'El/la que suscribe {{patientName}}, DNI N° {{patientDni}}, con domicilio en calle ____________________, otorgo mi consentimiento para que se me realice la/las extracción/es del/los elemento/s {{tooth}} propuesto por el Dr/a {{professionalName}}.',
        ],
      },
    ],
  },

  endodoncia: {
    title: 'Consentimiento Informado Endodoncia',
    signature: 'standard',
    sections: [
      { heading: 'Diagnóstico', blankLines: 2 },
      {
        paragraphs: [
          'Usted tiene derecho a conocer el procedimiento al que va a ser sometido y las complicaciones más frecuentes que ocurren. Este documento intenta explicarle todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que por imperativo legal, tendrá que firmar usted o su representante legal, el consentimiento informado para que pueda realizarle el procedimiento descripto a continuación.',
          'A propósito declaro haber sido informado y haber comprendido acabadamente que el objeto del tratamiento de conductos (endodoncia) es la apertura del diente, eliminación de los tejidos que se encuentren en el interior, limpieza, desinfección y relleno del interior del mismo. El mismo puede ser realizado en una o más sesiones de larga duración dependiendo de la complejidad y el compromiso infeccioso del diente, entre una sesión y otra se deja una obturación provisoria para proteger el diente en tratamiento, la finalidad del mismo es mantener el elemento dentario en boca.',
          'Una vez finalizado el tratamiento el diente requerirá una nueva obturación o nueva corona, y su costo es independiente del tratamiento endodóntico, la misma es de mi exclusiva responsabilidad y es fundamental que sea realizada dentro del menor tiempo posible con el fin de sellar el tratamiento.',
        ],
      },
      { heading: 'Técnica y Materiales Convenidos', blankLines: 2 },
      { heading: 'Tratamiento Alternativo (Riesgo, Beneficios y Perjuicios)', blankLines: 2 },
      {
        paragraphs: ['Aclaro que mi odontólogo ha examinado mi boca debidamente, que se me ha explicado otras alternativas a este tratamiento y que se ha estudiado y considerado estos métodos que se me informaron, siendo mi voluntad que se me realice el tratamiento objeto del presente consentimiento.'],
      },
      {
        heading: 'Riesgos Típicos',
        paragraphs: [
          'Después de la atención entre una sesión y otra, pueden aparecer o aumentar síntomas del proceso infeccioso (aumento del dolor, hinchazón de la cara), que generalmente se alivian con analgésicos, antiinflamatorios, antibióticos.',
          'Hay posibilidades de que los dientes sufran accidentes como fracturas de instrumentos, paso de material obturación o sustancias de irrigación más allá de la raíz, perforaciones dentarias, fisuras o fracturas dentarias u otras lo que puede modificar el costo del tratamiento, el pronóstico del diente, y la planificación inicial pudiendo ser necesaria la extracción dentaria; esto puede ser producido por variaciones anatómicas, compromiso infeccioso del hueso, calcificación de conductos, destrucción dentaria u otras situaciones anatómicas complejas.',
          'Ocasionalmente el diente puede requerir tratamientos adicionales, como procedimiento de cirugía bucal, que significan un costo y riesgo anexos, sin embargo siempre tendré la oportunidad de decidir la continuidad del tratamiento.',
          'Después de terminado el tratamiento puede producirse un cambio de coloración en el diente, lo cual puede demandar un tratamiento estético anexo.',
          'Entiendo que mantener mi boca abierta durante el tratamiento, puede hacer que mi mandíbula quede endurecida y adolorida temporalmente, y tal vez me sea difícil abrir bien la boca durante varios días.',
        ],
      },
      { heading: 'Riesgos Personalizados', paragraphs: ['Además de los riesgos antes descriptos, por mis circunstancias especiales hay que esperar los siguientes riesgos:'], blankLines: 2 },
      {
        heading: 'Indicaciones',
        bullets: [
          'Hasta que la anestesia haya desaparecido, debo ser cuidadoso para así evitar un posible daño inadvertido a mi labio, lengua o mejilla, que estarán insensibles por un par de horas.',
          'Evitar aplicar fuerzas desmedidas a la pieza en tratamiento.',
          'Evitar masticar alimentos excesivamente duros, pegajosos, o hábitos como comerse las uñas, morder lápices, hielo, entre otros.',
          'Si mi tratamiento ha requerido algún medicamento (antiinflamatorios y/o antibióticos), debo seguir exactamente las indicaciones de la prescripción en cuanto a dosis, frecuencia y días de ingesta, incluso si todos los síntomas han desaparecido. De lo contrario la infección podría reagudizar o bien crear una resistencia bacteriana al antibiótico.',
        ],
      },
      { heading: 'Medicación Indicada — Pre-tratamiento', blankLines: 1 },
      { heading: 'Medicación Indicada — Durante el tratamiento', blankLines: 1 },
      { heading: 'Medicación Indicada — Post-tratamiento', blankLines: 1 },
      {
        heading: 'Consecuencias de la No Realización del Procedimiento Propuesto',
        paragraphs: [
          'Usted puede padecer focos infecciosos, infección de otros órganos (corazón, riñón), quistes, tumores, pérdida de hueso, afección de elementos dentarios vecinos, sinusitis odontógenas, problemas masticatorios, fonéticos y estéticos. La no realización del tratamiento conllevará a que la sintomatología persista, se agrave e incluso llegar a la extracción de la pieza afectada.',
        ],
        blankLines: 2,
      },
      {
        paragraphs: [
          'Todas mis dudas han sido aclaradas y estoy completamente de acuerdo con lo consignado en esta fórmula de consentimiento. Si al momento de la intervención surgiera una situación anátomo patológica distinta y más grave a la prevista, doy mi consentimiento para que se actúe del modo más conocido, según la ciencia y conciencia respecto a lo programado, por el exclusivo interés de mi salud. Asimismo, doy consentimiento para la administración de anestesia local que se aplicará para la realización de dicho tratamiento, delegando al odontólogo el tipo de anestesia y me comprometo a regresar a la próxima consulta el ____/____/____ Hora ____.',
          'El/la que suscribe {{patientName}}, DNI N° {{patientDni}}, con domicilio en calle ____________________, otorgo mi consentimiento para que se me realice el/los tratamientos de conductos, del/de los elemento/s {{tooth}} propuesta por el Dr/a {{professionalName}}.',
        ],
      },
    ],
  },

  implante: {
    title: 'Consentimiento Informado Implantes',
    signature: 'standard',
    sections: [
      {
        paragraphs: [
          'Por la presente se hace saber a Usted que tiene derecho a conocer el procedimiento al que va a ser sometido y las complicaciones más frecuentes que ocurren. Este documento explica todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que por imperativo legal, tendrá que firmar el consentimiento informado para que pueda realizarse dicho procedimiento. A propósito, declaro haber sido informado y haber comprendido acabadamente el objetivo del tratamiento a realizar.',
          'Yo, {{patientName}}, DNI {{patientDni}}, he sido informado/a por el Dr./Dra. {{professionalName}} de los procedimientos propios clínicos. Declaro que he sido debidamente informado y comprendo el objetivo y la naturaleza de la cirugía con implantes. Se me ha explicado y consiento en emplear un procedimiento quirúrgico para colocar los implantes por debajo de la encía y dentro del hueso, con el objetivo de reponer dientes con estabilidad similar o incluso superior a la de los naturales perdidos, obtener un anclaje para las prótesis dentales móviles, conseguir que el hueso de los maxilares mantenga su función y no pierda volumen por reabsorción, siendo de mi absoluta responsabilidad obedecer, cumpliendo los controles indicados por el profesional.',
          'Declaro que mi odontólogo ha examinado mi boca debidamente. Que se me ha explicado otras alternativas a este tratamiento, con prótesis convencionales (fijas y removibles), incluso de menor costo, y que se ha estudiado y considerado estos métodos que se me informaron, siendo mi voluntad que me coloquen implantes para reemplazar las piezas que he perdido o deseo sustituir.',
          'Declaro, además, que he sido informado de los riesgos y complicaciones posibles involucradas con el procedimiento quirúrgico, medicación y anestesia. Tales complicaciones incluyen: dolor, inflamación, infección y decoloraciones. Que puedo sufrir una insensibilidad de labios, lengua, barbilla, mejillas y dientes. Que no existe tiempo exacto que durará esta sensación en caso de complicación, que no puede ser determinado y quizás sea irreversible según los casos y seriedad del problema. Que puede surgir también inflamación o daño del tejido de la zona (diente, hueso, mucosa), fractura ósea, penetración en el seno maxilar y piso de fosas nasales, cicatrización retardada, reacciones alérgicas a medicación, drogas o materiales empleados en la técnica quirúrgica, falla en la óseo-integración del implante que obligará a un re-tratamiento. Comprendo y entiendo que, si no se me realiza un tratamiento odontológico, podría sufrir cualquiera de los siguientes problemas: enfermedad ósea, inflamación de las encías, infección, sensibilidad, movilidad de los dientes seguida por la necesidad de realizar la extracción. También es posible que pueda sufrir problemas de la unión témporomandibular (mandíbula), dolores de cabeza, dolores en la parte posterior del cuello y músculos faciales y cansancio de los músculos al masticar.',
        ],
      },
      {
        paragraphs: [
          'Declaro que se me ha explicado que no existe un método que pueda predecir con certeza la capacidad de cicatrización del hueso, de las encías, y que es diferente en cada paciente, tras la colocación de implantes. Declaro que se me ha explicado que en algunos casos los implantes pueden fallar y deben ser retirados. Que se me ha informado y entiendo, que las prácticas odontológicas no son una ciencia exacta: por lo tanto, no se puede ofrecer garantías o seguridades sobre el resultado final del tratamiento o cirugía.',
          'Declaro que se me ha informado de la inconveniencia de fumar, de beber alcohol o tomar demasiada azúcar, para la cicatrización de las encías y tales hábitos ponen en compromiso el éxito del implante. Estoy plenamente de acuerdo con las instrucciones que me ha dado el odontólogo sobre el cuidado que debo realizar yo personalmente, en relación a la higiene de mi boca y he comprendido la manera de hacerlo. Me comprometo a acudir a la consulta de mi odontólogo con el fin de ser examinado e instruido, tal como él me lo indique.',
          'Estoy de acuerdo con ser sometido a anestesia local, sabiendo los riesgos que ello implica, delegando al odontólogo la elección del tipo de anestesia. Entiendo perfectamente que, durante y a continuación del procedimiento previsto, cirugía o tratamiento, pueden surgir condiciones que, según el criterio del profesional, requieran un plan de tratamiento complementario/alternativo, relacionado directamente con el éxito del tratamiento. También apruebo cualquier modificación en diseño, materiales o mantenimiento, si se considera que es para mi beneficio.',
        ],
      },
      { heading: 'Especificación de Tratamiento Alternativo (Riesgos, Beneficios y Perjuicios)', blankLines: 3 },
      {
        paragraphs: [
          'Declaro que he sido informado que las complicaciones de oseointegración referidas a la colocación de implantes y de los riesgos de someterlos a movilidad posterior a su inserción y que se deberán respetar los controles odontológicos posteriores, extremándose en caso de existir prótesis.',
          'Me comprometo a tomar todos los cuidados y recaudos necesarios; a cumplir con la medicación estipulada, sin incorporar modificación alguna; asistir a los controles estipulados y a informar de inmediato al odontólogo responsable cualquier sintomatología que aparezca, a fin de tratarla precozmente.',
          'Confirmo que he leído y comprendido todo el escrito precedente y que el facultativo y su equipo me han explicado todo el acto quirúrgico y me han permitido realizar todas las preguntas necesarias, dándome respuestas a mis inquietudes, en un lenguaje claro y sencillo.',
        ],
      },
    ],
  },

  protesis_fija: {
    title: 'Consentimiento Informado Prótesis Fija',
    signature: 'standard',
    sections: [
      {
        paragraphs: [
          'Usted tiene derecho a conocer el procedimiento al que va a ser sometido y las complicaciones más frecuentes que ocurren. Este documento intenta explicarle todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que, por imperativo legal, tendrá que firmar, usted o su representante legal, el consentimiento informado para que pueda realizarle el procedimiento descripto a continuación.',
          'A propósito, declaro haber sido informado y haber comprendido acabadamente que el objeto del tratamiento es devolver la función, estética y fonética de la cavidad bucal a través de coronas (fundas) de diferentes materiales, pudiendo o no necesitar colocar algunos aditamentos, como ser pernos (que se coloca en el interior del conducto del diente el cual previamente recibió el tratamiento de conducto correspondiente), o implantes (reemplazo de las raíces naturales), etc. cuyo destino es darle retención a la prótesis fija formada por las coronas.',
          'La prótesis fija proporciona una masticación similar a la natural y un habla adecuada, aunque no permite cerrar los espacios que pudieran haberse creado entre los dientes cuando han menguado las encías, y al hablar se puede escapar saliva o aire. Con el tiempo, el proceso de atrofia natural de los huesos maxilares y de las encías deja a la vista las uniones entre dientes y fundas, por lo que estéticamente puede necesitar reemplazo. Otras causas de sustitución pueden ser: lesiones irrecuperables (caries, fracturas, filtraciones marginales, cambios en los maxilares y en la posición de los dientes naturales), procesos inexorables del paso del tiempo (envejecimiento) y que se ven agravados por descuidos y falta de higiene por parte del portador.',
          'Para realizar un tratamiento de prótesis dental se me ha explicado la necesidad de tallar los dientes pilares de la prótesis fija, lo que puede conllevar la posibilidad de aproximación excesiva a la cámara pulpar (nervio) que nos obligaría a realizar un tratamiento de endodoncia (o llamado de conducto) y en algunos casos, si el muñón (remanente de la corona) queda frágil, se necesitará realizar un perno de fibra o colado (metálico). También se me ha explicado la necesidad de mantener una higiene escrupulosa y diaria para evitar el desarrollo de gingivitis y secundariamente enfermedad periodontal (que se manifiestan con inflamación de las encías, sangrado y a veces dolor).',
          'Se me ha aclarado que existe la posibilidad de fractura de cualquier componente de la prótesis, que implique la reparación, cambio total de la misma e incluso la pérdida de la pieza dentaria pilar (donde asienta la prótesis fija).',
        ],
      },
      { heading: 'Tratamiento Alternativo (Riesgo, Beneficios y Perjuicios)', blankLines: 3 },
      { heading: 'Material Convenido', blankLines: 2 },
      {
        heading: 'Riesgos',
        bullets: [
          'Sensación de que los dientes artificiales son demasiado grandes o con diferencia en tamaño, forma y color con los naturales.',
          'La pronunciación de ciertos sonidos puede resultar un poco alterada.',
          'Es probable que se muerda fácilmente las mejillas y la lengua.',
          'Si se le ha cementado la prótesis provisionalmente: se le puede desprender o puede notar ligeras molestias en los dientes que sirven de sujeción, al consumir o ingerir bebidas o alimentos fríos, calientes y dulces.',
        ],
      },
      { heading: 'Riesgos Personalizados', paragraphs: ['Además de los riesgos antes descriptos, por mis circunstancias especiales hay que esperar los siguientes riesgos:'], blankLines: 2 },
      {
        heading: 'Indicaciones',
        bullets: [
          'Los primeros días, procure cerrar la boca y masticar con cuidado para no morderse.',
          'Evite comer alimentos duros como frutos secos con cáscara, huesos, etc.',
          'Evite comer alimentos extremadamente pegajosos como chicles, caramelos masticables, etc.',
          'Si se le ha cementado la prótesis provisionalmente, es recomendable masticar del otro lado, hacer una dieta semi blanda, prestar atención a la retención de alimentos entre la prótesis y los dientes de al lado o la encía, y advertir al dentista antes de cementarla definitivamente.',
        ],
      },
      {
        paragraphs: [
          'Es importante mantener una correcta higiene oral en el resto de los dientes, independientemente de la prótesis. Se debe realizar revisión cada seis meses para comprobar y corregir la aparición de caries, inflamación de encías, movilidades dentarias y el estado y ajuste de la prótesis. Acudir a una consulta inmediata siempre que aparezcan ulceraciones, alguna anormalidad o movilidad de la prótesis.',
          'He leído las instrucciones de manejo, cuidado y mantenimiento que me ha entregado el Dr/a. {{professionalName}} y he comprendido todas las explicaciones que se me han facilitado en el lenguaje claro y sencillo, he podido realizar todas las observaciones y se me han aclarado todas las dudas; por lo que estoy completamente de acuerdo con lo consignado en esta fórmula de consentimiento.',
          'Asimismo, entiendo que la colocación de la prótesis no constituye el acto final del tratamiento, sino que es necesario un proceso de adaptación que puede exigir retoques, por lo que me comprometo a regresar a la próxima consulta el día ____/____/____ hora ____.',
          'El/la que suscribe {{patientName}}, DNI N° {{patientDni}}, con domicilio en calle ____________________, otorgo mi consentimiento a la colocación de una prótesis fija en el/los elemento/s {{tooth}} propuesta por el/la Dr/a {{professionalName}}.',
        ],
      },
    ],
  },

  protesis_removible: {
    title: 'Consentimiento Informado Prótesis Parcial Removible',
    signature: 'standard',
    sections: [
      {
        paragraphs: [
          'Usted tiene derecho a conocer el procedimiento al que va a ser sometido y las complicaciones más frecuentes que ocurren. Este documento intenta explicarle todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que, por imperativo legal, tendrá que firmar usted o su representante legal, el consentimiento informado para que pueda realizarle el procedimiento descripto a continuación.',
          'A propósito, declaro haber sido informado y haber comprendido acabadamente que el objeto del tratamiento es reponer dientes ausentes a través de aparatos portadores de dientes artificiales que se sujetan a los naturales mediante dispositivos no rígidos (ganchos) y a veces se asientan sobre el hueso cubierto de mucosa.',
        ],
      },
      { heading: 'Material Convenido', blankLines: 2 },
      { heading: 'Tratamiento Alternativo (Riesgo, Beneficios, Perjuicios)', blankLines: 2 },
      {
        paragraphs: ['Aclaro que mi odontólogo ha examinado mi boca debidamente. Que se me ha explicado otras alternativas a este tratamiento y que se ha estudiado y considerado estos métodos que se me informaron, siendo mi voluntad que se me realice el tratamiento objeto del presente consentimiento.'],
      },
      {
        heading: 'Limitaciones',
        paragraphs: [
          'Al carecer de fijación mecánica al hueso, estos aparatos experimentan una cierta movilidad, más evidente al comer, sobre todo el inferior. Otra limitación es de carácter estético, debido a que según las indicaciones técnicas y mecánicas derivadas de la confección de prótesis removible, en muchas ocasiones no será posible la reproducción de la posición de los dientes naturales.',
          'La duración de la prótesis removible es limitada, por lo que deberá renovarse periódicamente.',
        ],
      },
      {
        heading: 'Riesgos Típicos',
        bullets: [
          'Sensación extraña de ocupación.',
          'Más producción de saliva de lo normal.',
          'Disminución del sentido del gusto.',
          'Dificultades de pronunciación de ciertos sonidos.',
          'Es probable que se muerda fácilmente en las mejillas o lengua.',
          'Algunas molestias (dolor, inflación, ulceración) en las zonas donde apoyan las prótesis.',
          'Probablemente se muevan al comer, al menos inicialmente, por lo que deberá masticar de los dos lados.',
          'De no mantener una conducta de higiene y limpieza, es probable que cambie de color.',
        ],
      },
      {
        heading: 'Consecuencia de la No Realización del Tratamiento',
        bullets: [
          'Reabsorción ósea (pérdida del volumen del hueso de ambos maxilares).',
          'Problemas en la articulación de la mandíbula.',
          'Problemas en la digestión.',
          'Alteración en la pronunciación de las palabras y estética.',
          'Cambios en la mordida normal.',
          'Mayor movilidad de los dientes. Problemas de encía.',
          'Pérdida de los dientes presentes en boca.',
        ],
      },
      { heading: 'Riesgos Personalizados y Especificaciones de la No Realización del Tratamiento', blankLines: 2 },
      {
        heading: 'Recomendaciones',
        bullets: [
          'Los primeros días procure cerrar la boca y masticar con cuidado para no morderse y sobrecargar las encías.',
          'Inicialmente, mastique suavemente alimentos blandos y no pegajosos, pasando poco a poco a comer productos más consistentes.',
          'Para tratar heridas de mordeduras puede utilizar cicatrizantes.',
        ],
      },
      {
        heading: 'Indicaciones',
        bullets: [
          'Lavar la prótesis y la boca después de cada comida, para evitar la formación de sarro.',
          'Limpie las partes metálicas con un hisopo embebido en alcohol, hasta que la superficie quede brillante.',
          'Quitarse la prótesis para dormir, para que los tejidos descansen.',
          'Mientras la prótesis esté fuera de la boca conviene conservarla en agua para evitar golpes y deformaciones.',
          'Es aconsejable que se dé masajes en las encías para mejorar la circulación y prevenir en lo posible su reabsorción.',
          'Se debe realizar revisión cada seis meses para observar el estado de los dientes y mucosas, realizar adaptaciones para corregir desajustes provocados por el cambio de forma de los maxilares y posición de los dientes que siempre ocurren con el paso del tiempo.',
          'Acudir a una consulta inmediata siempre que aparezcan heridas, llagas, dolor o inestabilidad de la prótesis.',
        ],
      },
      {
        paragraphs: [
          'He leído las instrucciones de manejo, cuidado y mantenimiento que me ha entregado el Dr/a. {{professionalName}} y he comprendido todas las explicaciones que se me han facilitado en el lenguaje claro y sencillo, he podido realizar todas las observaciones y se me han aclarado todas las dudas; por lo que estoy completamente de acuerdo con lo consignado en esta fórmula de consentimiento.',
          'Asimismo, entiendo que la colocación de la prótesis no constituye el acto final del tratamiento, sino que es necesario un proceso de adaptación que puede exigir retoques, por lo que me comprometo a regresar a la próxima consulta el día ____/____/____ hora ____.',
          'El/la que suscribe {{patientName}}, DNI N° {{patientDni}}, con domicilio en calle ____________________, otorgo mi consentimiento a la colocación de una prótesis dental parcial removible en el/los maxilar/es {{tooth}} propuesta por el/la Dr/a {{professionalName}}.',
        ],
      },
    ],
  },

  periodoncia: {
    title: 'Consentimiento Informado de Periodoncia',
    signature: 'standard',
    sections: [
      { heading: 'Diagnóstico', blankLines: 2 },
      {
        paragraphs: [
          'Usted tiene derecho a conocer el procedimiento al que va a ser sometido, y las complicaciones más frecuentes que ocurren. Este documento intenta explicarle todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que por imperativo legal, tendrá que firmar, usted o su representante legal, el consentimiento informado para que pueda realizarle dicho procedimiento.',
          'A propósito declaro haber sido informado y haber comprendido acabadamente el objeto del tratamiento, que es la eliminación de los factores irritativos e infecciosos presentes en los tejidos que rodean al diente y/o implante (encía, hueso alveolar, ligamento periodontal, cemento radicular, superficie del implante), para conseguir el mantenimiento de los mismos en el tiempo, función y estética, evitando movilidad, pérdida de hueso y caída de los mismos.',
          'El tratamiento propuesto consiste en la eliminación de placa y cálculo (sarro) con curetas o ultrasonido (instrumentos afilados para el raspaje), en la cantidad de sesiones necesarias según el caso clínico y de ser necesario la cirugía de encía a colgajo para eliminar las bolsas infecciosas, agregado o reducción de tejido blando (injerto o gingivectomía), o aumentar el volumen de encía y tratar los defectos óseos. Estos procedimientos persiguen detener el avance de la enfermedad y limitar los daños generados, debiendo con control periódico y supervisión profesional mantener los resultados obtenidos en el tiempo.',
          'Estoy de acuerdo con ser sometido a anestesia local, sabiendo los riesgos que ello implica, delegando al odontólogo la elección del tipo de anestesia. Entiendo perfectamente que, durante y a continuación del procedimiento previsto, cirugía o tratamiento, pueden surgir condiciones que, según el criterio del profesional, requiera un plan de tratamiento complementario/alternativo, relacionado directamente con el éxito del tratamiento. También apruebo cualquier modificación en diseño, materiales o mantenimiento, si se considera que es para mi beneficio. En caso de ser necesario se podrá utilizar biomateriales como complemento al tratamiento.',
          'El beneficio al realizar el tratamiento periodontal es desarrollar un medio ambiente limpio en el cual las encías puedan cicatrizar; reducen las probabilidades de sufrir irritaciones e infecciones adicionales; le facilitan la limpieza de sus dientes; y disminuyen el costo de reemplazar los dientes perdidos a causa de la enfermedad periodontal, aumentar la posibilidad de retener sus dientes y su función; este plan de tratamiento ayudará a mejorar su estado de salud bucal y general (evitar el parto prematuro, evitar complicaciones en enfermedades sistémicas como diabetes, cardiopatías, entre otras) y evitar que la enfermedad se extienda.',
        ],
      },
      {
        heading: 'Riesgos, Molestias y Efectos Adversos',
        paragraphs: [
          'Entiendo que mis encías pueden sangrar, inflamarse, o infectarse localmente, experimentar una molestia posterior al tratamiento. Si los problemas perduran durante más de unos pocos días me comunicaré con el odontólogo.',
          'Entiendo que mantener mi boca abierta durante el tratamiento puede hacer que mi mandíbula quede endurecida y adolorida temporalmente, y tal vez me sea difícil abrir bien la boca durante varios días.',
          'A medida que cicatriza el tejido de mi encía, el mismo puede encogerse un poco y dejar expuesta parte de la superficie de la raíz. Esto puede hacer que mis dientes se vuelvan más sensibles al calor o al frío o afectar el aspecto estético con la aparición de espacios entre los dientes, lo cual puede generar atrapamiento de comida, aumentar la movilidad de los dientes y generar un aspecto de diente largo.',
          'Entiendo que dependiendo de mi condición dental actual, problemas de salud existentes, medicamentos que pueda estar tomando, predisposición genética o factores irritantes locales (tabaco, ortodoncia, prótesis mal adaptadas), estos métodos por sí solos tal vez no reviertan por completo los efectos de la enfermedad periodontal o prevengan problemas futuros.',
          'Entiendo que todos los medicamentos son potencialmente peligrosos, y pueden tener efectos secundarios y contraindicaciones con otras drogas. Por lo tanto, es fundamental que le informe a mi odontólogo todos los medicamentos que estoy tomando en la actualidad.',
        ],
      },
      { heading: 'Medicamentos que Estoy Tomando en la Actualidad', blankLines: 3 },
      {
        paragraphs: [
          'Como tratamiento alternativo a la periodoncia se puede considerar la exodoncia de la o las piezas afectadas, eliminando así los factores causales de la enfermedad, necesitando posteriormente la reposición de las piezas perdidas con prótesis fijas, removibles, implantes.',
        ],
      },
      { heading: 'Tratamiento Alternativo Elegido / Observaciones', blankLines: 2 },
      {
        paragraphs: [
          'Entiendo que si no se aplica ningún tratamiento, o el tratamiento comenzado es interrumpido o discontinuado, mi enfermedad periodontal puede continuar y probablemente empeorar. Esto puede causar una mayor inflamación e infección del tejido de la encía, caries por encima y por debajo del borde de la encía, deterioro del hueso que rodea el diente y, finalmente, la pérdida de ciertos dientes, como así también afectar el estado de salud general.',
          'Entiendo que se harán todos los esfuerzos razonables para asegurar que mi afección sea tratada apropiadamente, pero no es posible garantizar resultados perfectos. Mediante mi firma más abajo, doy fe de que he recibido información adecuada sobre el tratamiento propuesto, de que entiendo dicha información, y de que todas mis preguntas han sido contestadas satisfactoriamente.',
          'El resultado del tratamiento depende en parte de que usted se comprometa a cepillarse los dientes y usar el hilo dental después de cada comida, a recibir limpiezas según le sean indicadas, a seguir una dieta saludable, a evitar el tabaco y a cumplir con el plan de cuidado en el hogar que se le enseñará en este consultorio.',
        ],
      },
      { heading: 'Indicaciones Específicas', blankLines: 2 },
      { heading: 'Medicación — Pre tratamiento', blankLines: 1 },
      { heading: 'Medicación — Durante el tratamiento', blankLines: 1 },
      { heading: 'Medicación — Post tratamiento', blankLines: 1 },
      {
        paragraphs: [
          'El/la que suscribe {{patientName}}, DNI N° {{patientDni}}, con domicilio en calle ____________________, otorgo mi consentimiento a la realización del tratamiento periodontal propuesto por el/la Dr./a {{professionalName}}.',
        ],
      },
    ],
  },

  cosmeticos: {
    title: 'Consentimiento para Procedimientos Cosméticos',
    signature: 'standard',
    sections: [
      {
        paragraphs: [
          'Dejo constancia de que el doctor {{professionalName}} ha analizado conmigo el procedimiento que mi estado de salud requiere.',
          'Que este análisis ha sido realizado con la finalidad de asegurar que he tenido la oportunidad de recibir la información que me permita otorgar un consentimiento razonado respecto a las prácticas que se llevarán a cabo.',
          'Que he recibido una pormenorizada explicación, expresada en términos que he comprendido, acerca de: a) el estado clínico de mi piel, b) su probable evolución, c) el tratamiento que recibiré, d) los distintos riesgos propios del tratamiento.',
          'Que estoy consciente de que en la práctica de la medicina pueden presentarse complicaciones imprevistas que requieran tratamientos adicionales.',
          'Que no se me han efectuado promesas o dado garantías respecto a los resultados que puedan obtenerse; en consecuencia, consiento que el profesional asuma una obligación de medios poniendo toda su ciencia y diligencia para llevar a cabo la intervención, sin asegurarme su resultado.',
          'Que sé que este procedimiento es cosmético y que el pago no está cubierto por los seguros médicos, obras sociales, etc.',
          'Que autorizo a tomar fotografías clínicas de control, que pueden ser usadas con fines médicos de investigación científica, o educativos, siempre y cuando no se revele mi identidad a través de las imágenes ni de los textos descriptivos que las acompañen.',
          'Que he recibido satisfactoria respuesta a todas las preguntas que he formulado durante las consultas previas, habiendo entendido los términos técnicos empleados.',
          'Que he leído y comprendido los párrafos precedentes. En consecuencia, autorizo al profesional mencionado a llevar a cabo la siguiente práctica: {{procedureDetail}}',
        ],
      },
    ],
  },

  biopsia: {
    title: 'Consentimiento Informado Biopsia',
    signature: 'standard',
    sections: [
      {
        paragraphs: [
          'Usted tiene derecho a conocer el procedimiento al que va a ser sometido y las complicaciones más frecuentes que ocurren. Este documento intenta explicarle todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que por imperativo legal, tendrá que firmar, usted o su representante legal, el consentimiento informado para que pueda realizarle el procedimiento descripto a continuación.',
          'A propósito declaro haber sido informado y haber comprendido acabadamente la conveniencia y el objetivo de la biopsia {{tooth}} y las consecuencias de no llevar a cabo dicho procedimiento quirúrgico, que consiste en realizar una toma de material, para obtener muestras de un tejido vivo por punción o escisión de los tejidos involucrados para analizarla posteriormente. La muestra será analizada por un patólogo especialista, lo cual brindará un diagnóstico de certeza.',
          'Este procedimiento está indicado para lesiones que no pueden ser diagnosticadas por otros métodos, como ayuda en evolución diagnóstica de enfermedades infecciosas, micóticas y bacterianas, para determinar el tipo de tumor, en lesiones con sospecha de cáncer, cualquier lesión de aspecto clínico compatible con úlcera, ulceración, erosión, ampolla, y que no muestre evidencia de curación en 5 a 10 días, nódulos de crecimiento rápido, lesiones negras, lesiones blancas, lesiones rojas, cualquier tejido eliminado quirúrgicamente o eliminado espontáneamente.',
        ],
      },
      { heading: 'Tratamientos Alternativos (Riesgos, Beneficios y Perjuicios)', blankLines: 2 },
      {
        paragraphs: ['Declaro que mi odontólogo ha examinado mi boca debidamente. Que se me ha explicado otras alternativas a este procedimiento, que se han estudiado y considerado estos métodos que se me informaron, siendo mi voluntad que se me realice el procedimiento objeto del presente consentimiento.'],
      },
      {
        heading: 'Riesgos, Molestias y Efectos Adversos Previsibles',
        bullets: [
          'Molestias postoperatorias que puedan durar desde unas horas hasta varios días y para lo cual se administrará medicación en caso de ser necesario.',
          'Tumefacción (hinchazón) post-operatoria del área.',
          'Infección y dolor.',
          'Trismus (limitación de la apertura de la boca), que usualmente dura algunos días, pero puede persistir durante un período más prolongado.',
          'Parestesia (pérdida de la sensibilidad).',
          'Hemorragia (sangrado abundante).',
        ],
      },
      { heading: 'Riesgos Personalizados', paragraphs: ['Además de los riesgos antes descriptos, por mis circunstancias especiales hay que esperar los siguientes riesgos:'], blankLines: 2 },
      { heading: 'Medicación Indicada — Pre quirúrgico', blankLines: 2 },
      { heading: 'Medicación Indicada — Post quirúrgico', blankLines: 2 },
      {
        heading: 'Consecuencias de la No Realización del Procedimiento Propuesto',
        paragraphs: ['La no realización de la toma de material implica no poder brindar un diagnóstico de certeza sobre la patología que usted padece, impidiendo, como consecuencia, brindar un tratamiento adecuado al caso.'],
        blankLines: 1,
      },
      {
        paragraphs: [
          'Todas mis dudas han sido aclaradas y estoy completamente de acuerdo con lo consignado en esta fórmula de consentimiento. Si al momento de la intervención surgiera una situación anátomo patológica distinta y más grave a la prevista, doy mi consentimiento para que se actúe del modo más conocido, según la ciencia y conciencia respecto a lo programado, por el exclusivo interés de mi salud. Asimismo, doy consentimiento para la administración de anestesia local que se aplicará para la realización de dicho tratamiento, delegando al odontólogo el tipo de anestesia y me comprometo a regresar a la próxima consulta el día ____/____/____ Hora ____.',
          'El/la que suscribe {{patientName}}, DNI N° {{patientDni}}, con domicilio en calle ____________________, otorgo mi consentimiento para que se me realice la biopsia {{tooth}} propuesto por el Dr/a {{professionalName}}.',
        ],
      },
    ],
  },

  odontopediatria: {
    title: 'Consentimiento Informado Odontopediatría',
    signature: 'odontopediatria',
    sections: [
      {
        paragraphs: [
          'Por la presente se hace saber a Usted que tiene derecho a conocer el procedimiento al que va a ser sometido el menor de edad y las complicaciones más frecuentes que ocurren. Este documento explica todas estas cuestiones, léalo atentamente y consulte todas las dudas que se le planteen. Le recordamos que, por imperativo legal, tendrá que firmar el representante legal, el consentimiento informado para que pueda realizarse dicho procedimiento. A propósito, declaro haber sido informado y haber comprendido acabadamente el objetivo del tratamiento a realizar.',
          'Yo, ____________________, de ____ años de edad, DNI ____________________, domiciliado en ____________________, como representante legal de {{patientName}}, DNI {{patientDni}}, he sido informado/a por el Dr./Dra. {{professionalName}} de los procedimientos propios clínicos en odontopediatría, que constan en el plan de tratamiento, otorgando mi consentimiento para realizar las prácticas necesarias al caso clínico.',
          'Estoy de acuerdo a que el niño sea sometido a anestesia local en caso que fuera necesario, sabiendo los riesgos que ello implica, delegando al odontólogo la elección del tipo de anestesia.',
          'Se me ha explicado el diagnóstico, la naturaleza de la enfermedad que padece mi representado y su evolución natural, objetivos del tratamiento propuesto, así como las alternativas del tratamiento que pueden ser practicadas, descripción de las consecuencias derivadas del tratamiento o intervención, beneficios y complicaciones comunes que se pueden desencadenar durante o después del mismo, riesgos personales, y entendiendo que ante alguna manifestación de complicaciones deberé acudir nuevamente al profesional tratante de mi representado.',
        ],
      },
      { heading: 'Diagnóstico', blankLines: 3 },
      { heading: 'Tratamiento al que va a ser Sometido el Menor de Edad', blankLines: 3 },
      { heading: 'Tratamientos Alternativos', blankLines: 3 },
      {
        heading: 'Riesgos y Complicaciones Esperados',
        bullets: [
          'Dolor.',
          'Inflamación.',
          'Infección.',
          'Fractura del elemento dentario por deterioro.',
          'Pulpitis (inflamación del nervio): determina que se le realice al paciente un tratamiento del nervio.',
          'Hematomas y hemorragias (sangrado - moretones).',
        ],
      },
      { heading: 'Beneficios Esperados del Tratamiento', blankLines: 3 },
      {
        paragraphs: [
          'Comprendo y entiendo que, si no se realiza el tratamiento odontológico, podría sufrir cualquiera de los siguientes problemas: enfermedad ósea, inflamación de las encías, infección, sensibilidad, movilidad de los dientes seguida por la necesidad de realizar la extracción.',
        ],
      },
      { heading: 'Consecuencias de la No Realización del Tratamiento', blankLines: 2 },
      { heading: 'Observaciones', blankLines: 2 },
      {
        paragraphs: [
          'Comprendo que la Odontopediatría es el área de la odontología que se encarga de restablecer la salud bucal integral de niños y adolescentes.',
          'Comprendo que la odontología no es una ciencia exacta y por lo que los resultados están sujetos a múltiples factores. He tenido información clara y suficiente, la oportunidad de preguntar y he obtenido respuestas satisfactorias, me siento libre para decidir de acuerdo a mis valores e intereses y me declaro competente para tomar la decisión que corresponda. Asimismo, doy fe que mi representado fue oído y/o dio su asentimiento a realizar el tratamiento.',
          'Por lo antes expuesto doy el consentimiento al Dr/Dra: {{professionalName}} a realizar el tratamiento antes expuesto al menor de edad {{patientName}}, DNI {{patientDni}}, según lo antes expuesto.',
        ],
      },
    ],
  },

  ortodoncia: {
    title: 'Acta de Consentimiento Informado — Ortodoncia',
    signature: 'ortodoncia',
    sections: [
      {
        paragraphs: [
          'Quien suscribe, {{patientName}}, con documento tipo ____ N° {{patientDni}}, y con domicilio en ____________________, en su carácter de PACIENTE / PADRE / MADRE o TUTOR, autoriza al Dr. {{professionalName}} a efectuar el tratamiento de ortodoncia / ortopedia. Autoriza también a realizar cualquier procedimiento diagnóstico o terapéutico que el profesional estime necesario.',
          'Hace constar que: a) se le informó acerca del tratamiento, habiéndosele explicado los objetivos perseguidos (sin prometerse un resultado), los beneficios esperados, riesgos, molestias y efectos previsibles adversos, y las consecuencias previsibles de la no realización del procedimiento propuesto o de los alternativos, y pudo aclarar todas sus dudas al respecto; b) que ha comprendido el sentido de todo lo informado; c) que especialmente se le explicó e informó sobre:',
        ],
      },
      {
        bullets: [
          'El grado de riesgo que el tratamiento presenta en relación al momento y estado físico hallado.',
          'Que no se pueden asegurar resultados.',
          'Que la evolución y pronóstico dependen, entre otras cosas, del organismo del paciente y su reacción frente al tratamiento.',
          'Que puede ser necesaria una repetición del tratamiento para mejorar la evolución del mismo.',
          'Los diferentes factores coadyuvantes que pueden incidir en el tratamiento y que se toma conocimiento de ellos.',
          'Quien suscribe toma conocimiento de que en raras ocasiones durante el tratamiento de ortodoncia puede registrarse remodelación o reabsorción de las raíces de las piezas dentarias. Ha comprendido que esta circunstancia es de incidencia muy baja y se debe a causas múltiples y que, de ocurrir, puede derivar en movilidad o riesgo de pérdida de alguna de estas piezas.',
        ],
      },
      {
        paragraphs: [
          'Hace constar que acepta cumplir las indicaciones del odontólogo y efectuar los cuidados necesarios que se estipulen. Acepta también las normas de la Institución, que se refieren a la iniciación y desarrollo del tratamiento, y al cumplimiento de las obligaciones a cargo del paciente.',
          'Por la presente, da su permiso para el uso de registros de ortodoncia, que incluyen fotografías, radiografías, estudios cefalométricos, modelos, etc., tomados en el proceso de exámenes, tratamiento y retención, para el propósito de consultas profesionales, investigación, educación o publicación en revistas científicas. Declara que se le informó que en caso de publicación la identidad del paciente se mantendrá en forma confidencial. Sin perjuicio de lo expresado precedentemente, en la medida en que el estudio exceda la mera utilización de los registros antedichos, le será informado si, como paciente, resultase convocado a participar en estudios de diagnóstico e investigación específicos u otros, y que en tal caso podrá o no prestar su consentimiento al efecto para cada caso particular.',
        ],
      },
      { heading: 'Observaciones e Indicaciones Especiales', blankLines: 2 },
      { heading: 'Beneficios Esperados, Riesgos, Molestias y Efectos Previsibles y Tratamientos Alternativos y sus Riesgos', blankLines: 3 },
      {
        paragraphs: [
          'Manifiesta expresamente que ha leído y comprendido el texto precedente y se compromete a su cumplimiento en lo pertinente, no teniendo duda de lo expresado en el presente ya que le fue explicado en términos sencillos, accesibles y mostrado gráficamente. Ha podido preguntar y le han respondido sobre todas sus dudas.',
          'En consecuencia, el suscripto acepta la realización del tratamiento de ortodoncia y asume los riesgos que implica. También la necesidad de extraer dientes definitivos para lograr la corrección del problema, si el odontólogo lo indicare. Se compromete a cumplir con las indicaciones. Ha comprendido que es posible que existan otros problemas que ocurren con menor frecuencia que los que se mencionan en este formulario y que el estado final de mi boca sea diferente al previsto en función de ellos.',
        ],
      },
    ],
  },
};

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '____________________');
}

export function downloadConsentPdf(
  patientName: string,
  patientDni: string,
  professionalName: string,
  consentType: ConsentType,
  toothNumber?: string,
  returnBase64 = false,
  procedureDetail?: string,
): string | void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];
  const data = CONSENT_DATA[consentType];
  const vars = {
    patientName: patientName || '',
    patientDni: patientDni || '',
    professionalName: professionalName || '',
    tooth: toothNumber || '____________________',
    procedureDetail: procedureDetail || '____________________',
  };

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
  doc.setTextColor(...darkBlue); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), W - 28);
  doc.text(titleLines, W / 2, 46, { align: 'center' });
  let y = 46 + titleLines.length * 6 + 4;
  doc.setDrawColor(...blue); doc.setLineWidth(0.5);
  doc.line(14, y, W - 14, y);
  y += 8;

  // ── Datos del paciente ────────────────────────────────────────────────
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

  const ensureSpace = (needed: number) => { if (y > H - needed) { doc.addPage(); y = 20; } };

  data.sections.forEach(section => {
    if (section.heading) {
      ensureSpace(24);
      doc.setFillColor(240, 245, 255); doc.rect(14, y - 4, W - 28, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...blue);
      const hLines = doc.splitTextToSize(section.heading.toUpperCase(), W - 32);
      doc.text(hLines, 16, y + 1);
      y += 6 + (hLines.length - 1) * 5;
      y += 4;
    }
    if (section.paragraphs) {
      section.paragraphs.forEach(p => {
        ensureSpace(30);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60);
        const lines = doc.splitTextToSize(fillTemplate(p, vars), W - 32);
        if (y + lines.length * 5.2 > H - 20 && y > 40) { doc.addPage(); y = 20; }
        doc.text(lines, 16, y);
        y += lines.length * 5.2 + 3;
      });
    }
    if (section.bullets) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60);
      section.bullets.forEach(item => {
        ensureSpace(20);
        const lines = doc.splitTextToSize(`•  ${fillTemplate(item, vars)}`, W - 34);
        doc.text(lines, 18, y);
        y += lines.length * 5.2 + 1.5;
      });
      y += 2;
    }
    if (section.blankLines) {
      ensureSpace(20);
      doc.setDrawColor(180, 180, 190); doc.setLineWidth(0.2);
      for (let i = 0; i < section.blankLines; i++) {
        doc.line(16, y, W - 16, y);
        y += 6;
      }
    }
    y += 3;
  });

  // ── Firmas ────────────────────────────────────────────────────────────
  ensureSpace(45);
  y += 6;
  doc.setDrawColor(100, 100, 120); doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 100);

  if (data.signature === 'odontopediatria') {
    doc.line(14, y, 85, y);
    doc.line(115, y, W - 14, y);
    doc.text('Firma del Representante Legal', 14, y + 5);
    doc.text('Firma y Sello del Profesional', 115, y + 5);
    doc.text(`Aclaración: ${professionalName || '____________________'}`, 115, y + 11);
  } else if (data.signature === 'ortodoncia') {
    doc.line(14, y, 85, y);
    doc.line(115, y, W - 14, y);
    doc.text('Firma de Padre, Madre o Tutor (Menor de edad)', 14, y + 5);
    doc.text('Firma del Paciente (Mayor de 16 años)', 115, y + 5);
    doc.text(`Aclaración: ${patientName}`, 115, y + 11);
  } else {
    doc.line(14, y, 85, y);
    doc.line(115, y, W - 14, y);
    doc.text('Firma del Paciente o Representante', 14, y + 5);
    doc.text('Firma y Sello del Profesional', 115, y + 5);
    doc.text(`Aclaración: ${patientName}`, 14, y + 11);
    doc.text(`Aclaración: ${professionalName || '____________________'}`, 115, y + 11);
  }

  // ── Footer en todas las páginas ──────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...darkBlue); doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 195, 240);
    doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });
  }

  if (returnBase64) return doc.output('datauristring').split(',')[1];
  doc.save(`consentimiento_${consentType}_${patientName.replace(/\s+/g, '_')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FICHA DE ADMISIÓN DE PACIENTE
// Cuestionario de admisión/historia clínica en blanco para completar a mano.
// ─────────────────────────────────────────────────────────────────────────────

export function downloadAdmisionPdf(patientName: string, returnBase64 = false): string | void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];
  let y = 0;

  const header = (subtitle: string) => {
    doc.setFillColor(...darkBlue); doc.rect(0, 0, W, 36, 'F');
    doc.setFillColor(...blue); doc.rect(0, 33, W, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('ONE Smile', W / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(160, 195, 240);
    doc.text('ODONTOLOGÍA TRIFIRO', W / 2, 22, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(200, 225, 255);
    doc.text(subtitle, W / 2, 30, { align: 'center' });
    y = 44;
  };

  const checkboxLine = (label: string, options: string[]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60);
    let x = 16;
    doc.text(label, x, y);
    x += doc.getTextWidth(label) + 3;
    options.forEach(opt => {
      doc.rect(x, y - 3, 3, 3);
      doc.text(opt, x + 4.5, y);
      x += doc.getTextWidth(opt) + 12;
    });
    y += 6.5;
  };

  const blankLine = (label: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60);
    doc.text(label, 16, y);
    doc.setDrawColor(180, 180, 190); doc.setLineWidth(0.2);
    doc.line(16 + doc.getTextWidth(label) + 2, y + 0.5, W - 16, y + 0.5);
    y += 6.5;
  };

  header('ADMISIÓN DE PACIENTES');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...darkBlue);
  doc.text(`Nombre y Apellido: ${patientName}`, 16, y); y += 7;
  blankLine('Domicilio:'); blankLine('Teléfono:'); y += 2;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...blue);
  doc.text('PARA SER COMPLETADAS POR EL PACIENTE', 16, y); y += 7;

  blankLine('1) Edad:                              Fecha de nacimiento:');
  checkboxLine('2) Sexo:', ['F', 'M']);
  checkboxLine('3) Dónde vive:', ['Cap. Fed.', 'Pcia. Bs. As.', 'Otra']);
  checkboxLine('4) Ocupación:', ['Estudiante', 'Autónomo', 'Empleado', 'Otra']);
  checkboxLine('5) Aceptación del tratamiento:', ['Sí', 'No']);
  checkboxLine('6) Sugerido por:', ['Padres', 'Profesional', 'Laboral', 'Otros', 'Voluntad propia']);
  blankLine('7) Motivo de la consulta:');
  checkboxLine('8) ¿Recibió tratamiento ortodóncico u ortopédico maxilar anteriormente?', ['Sí', 'No']);
  checkboxLine('9) ¿Recibe tratamiento médico actualmente?', ['Sí', 'No']);
  checkboxLine('10) ¿Padece actualmente alguna enfermedad?', ['Sí', 'No']);
  blankLine('      ¿Cuál?');
  checkboxLine('11) ¿Recibe o recibió tratamiento médico-psiquiátrico?', ['Sí', 'No']);
  checkboxLine('12) ¿Recibe o recibió tratamiento psicológico?', ['Sí', 'No']);
  checkboxLine('13) Intervenciones quirúrgicas:', ['Amígdalas', 'Adenoides', 'Otras']);
  checkboxLine('14) Problemas de hemorragias:', ['Sí', 'No']);
  checkboxLine('15) Alergias:', ['Sí', 'No']);
  blankLine('      ¿A qué?');
  checkboxLine('16) ¿Está embarazada actualmente?', ['Sí', 'No']);
  checkboxLine('17) ¿Recibe medicación actualmente?', ['Sí', 'No']);
  blankLine('      ¿Cuál?');
  blankLine('18) Vacunas recibidas:');
  y += 4;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(40, 40, 60);
  const dj = doc.splitTextToSize('Manifiesto en carácter de declaración jurada, que los datos informados son veraces, responsabilizándome por cualquier falsedad u omisión.', W - 32);
  doc.text(dj, 16, y); y += dj.length * 4.5 + 10;

  doc.setDrawColor(100, 100, 120); doc.setLineWidth(0.3);
  doc.line(14, y, 85, y); doc.line(115, y, W - 14, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 100);
  doc.text('Firma de padre, madre o tutor (menor de edad)', 14, y + 5, { maxWidth: 68 });
  doc.text('Firma del paciente (mayor de edad)', 115, y + 5, { maxWidth: 68 });
  y += 16;
  blankLine('Aclaración:'); blankLine('Tipo y N° de documento:');

  // ── Página 2: para completar por el profesional ──────────────────────
  doc.addPage(); header('ADMISIÓN DE PACIENTES — DATOS CLÍNICOS');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...blue);
  doc.text('PARA SER COMPLETADAS POR EL PROFESIONAL', 16, y); y += 7;

  checkboxLine('19) Dentición:', ['Temporaria', 'Mixta', 'Permanente joven', 'Permanente adulta']);
  checkboxLine('     Mordida anterior:', ['Normal', 'Abierta', 'Borde a borde', 'Cubierta', 'Invertida']);
  checkboxLine('20) Mordida invertida posterior:', ['No', 'Derecha', 'Izquierda']);
  checkboxLine('21) Clase molar:', ['I', 'II', 'III', 'No puede establecerse']);
  checkboxLine('22) Clase canina:', ['I', 'II', 'III', 'No puede establecerse']);
  checkboxLine('23) Overjet:', ['Normal', 'Aumentado', 'Invertido', 'Sin']);
  checkboxLine('24) Latero desviación de mentón:', ['No', 'Derecho', 'Izquierdo']);
  checkboxLine('25) Estrechez:', ['No', 'Superior', 'Inferior', 'Superior e inferior']);
  checkboxLine('26) Apiñamientos:', ['No', 'Superior', 'Inferior', 'Superior e inferior']);
  checkboxLine('27) Diastemas:', ['No', 'Superior', 'Inferior', 'Superior e inferior']);
  checkboxLine('28) Ausencia de piezas dentarias:', ['Sí', 'No']);
  checkboxLine('29) Caries:', ['Sí', 'No']);
  checkboxLine('30) Problemas funcionales:', ['Sí', 'No']);
  checkboxLine('31) Problemas periodontales:', ['Sí', 'No']);
  checkboxLine('32) Problemas en relación ATM:', ['Sí', 'No']);
  checkboxLine('33) Necesidad de rehabilitación protésica:', ['Sí', 'No']);
  checkboxLine('34) Posibilidad de cirugía:', ['Sí', 'No']);
  checkboxLine('35) Higiene bucal:', ['Buena', 'Regular', 'Mala']);
  y += 2;
  blankLine('Observaciones:'); blankLine(''); blankLine('');
  y += 10;
  doc.setDrawColor(100, 100, 120); doc.setLineWidth(0.3);
  doc.line(14, y, 90, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 100);
  doc.text('Firma y aclaración del profesional', 14, y + 5);

  const pageCount2 = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount2; p++) {
    doc.setPage(p);
    doc.setFillColor(...darkBlue); doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 195, 240);
    doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });
  }

  if (returnBase64) return doc.output('datauristring').split(',')[1];
  doc.save(`admision_${patientName.replace(/\s+/g, '_')}.pdf`);
}

export function downloadAccountStatementPdf(patientName: string, entries: AccountEntryItem[]): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  const drawHeader = () => {
    doc.setFillColor(...darkBlue); doc.rect(0, 0, W, 36, 'F');
    doc.setFillColor(...blue); doc.rect(0, 33, W, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('ONE Smile', W / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(160, 195, 240);
    doc.text('ODONTOLOGÍA TRIFIRO', W / 2, 22, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(200, 225, 255);
    doc.text('CUENTA CORRIENTE', W / 2, 30, { align: 'center' });
  };
  drawHeader();

  doc.setTextColor(...darkBlue); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(patientName, 14, 48);
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 120);
  doc.text(`Emitido el ${dateStr}`, W - 14, 48, { align: 'right' });
  doc.setDrawColor(...blue); doc.setLineWidth(0.4);
  doc.line(14, 52, W - 14, 52);

  let y = 65;
  const colX = [14, 90, 130, 162];
  const drawTableHeader = () => {
    doc.setFillColor(240, 245, 255); doc.rect(14, y - 6, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...blue);
    ['Detalle', 'Debe', 'Haber', 'Saldo'].forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;
  };
  drawTableHeader();

  let saldo = 0;
  let totalDebe = 0;
  let totalHaber = 0;
  entries.forEach((entry, idx) => {
    if (y > H - 40) {
      doc.addPage();
      y = 20;
      drawTableHeader();
    }
    saldo += entry.debe - entry.haber;
    totalDebe += entry.debe;
    totalHaber += entry.haber;
    if (idx % 2 === 0) { doc.setFillColor(250, 252, 255); doc.rect(14, y - 5, W - 28, 9, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...darkBlue);
    const lines = doc.splitTextToSize(`${entry.date}  —  ${entry.detail}`, 72);
    doc.text(lines, colX[0], y);
    doc.text(entry.debe > 0 ? `$${entry.debe.toLocaleString('es-AR')}` : '—', colX[1], y);
    doc.text(entry.haber > 0 ? `$${entry.haber.toLocaleString('es-AR')}` : '—', colX[2], y);
    doc.setTextColor(saldo > 0 ? 200 : 0, saldo > 0 ? 40 : 130, saldo > 0 ? 40 : 60);
    doc.text(`$${Math.abs(saldo).toLocaleString('es-AR')}${saldo < 0 ? ' ↑' : ''}`, colX[3], y);
    y += Math.max(lines.length * 6, 9);
  });

  if (y > H - 40) { doc.addPage(); y = 20; }
  y += 6;
  doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.line(14, y, W - 14, y);
  y += 10;
  doc.setFillColor(...darkBlue); doc.rect(100, y - 6, W - 114, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  const balance = totalDebe - totalHaber;
  doc.text(`SALDO ${balance > 0 ? 'DEUDOR' : balance < 0 ? 'A FAVOR' : ''}: ${fmt(Math.abs(balance))}`, W - 16, y + 1, { align: 'right' });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...darkBlue); doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 195, 240);
    doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });
  }

  doc.save(`cuenta_corriente_${patientName.replace(/\s+/g, '_')}.pdf`);
}
