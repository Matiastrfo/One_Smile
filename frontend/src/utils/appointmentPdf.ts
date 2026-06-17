import jsPDF from 'jspdf';
import type { Appointment } from '../types';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export async function downloadAppointmentPdf(
  appt: Appointment,
  patientName: string,
  professionalName: string,
  _logoUrl: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });

  const [datePart, timePart] = appt.date_time.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateLabel = `${WEEKDAYS[date.getDay()]} ${day} de ${MONTHS[month - 1]} de ${year}`;

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const blue: [number, number, number] = [0, 100, 200];
  const darkBlue: [number, number, number] = [10, 40, 90];

  // ── Header azul oscuro ──────────────────────────────────────────────
  doc.setFillColor(...darkBlue);
  doc.rect(0, 0, W, 42, 'F');

  // Acento azul claro — franja decorativa inferior del header
  doc.setFillColor(...blue);
  doc.rect(0, 39, W, 3, 'F');

  // Nombre de la clínica
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ONE Smile', W / 2, 20, { align: 'center' });

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 195, 240);
  doc.text('ODONTOLOGÍA TRIFIRO', W / 2, 29, { align: 'center' });

  // Profesional
  doc.setFontSize(8);
  doc.setTextColor(120, 170, 220);
  doc.text(`Dr/a. ${professionalName}`, W / 2, 37, { align: 'center' });

  // ── Etiqueta "Confirmación de turno" ────────────────────────────────
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(14, 50, W - 28, 12, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...blue);
  doc.text('CONFIRMACIÓN DE TURNO', W / 2, 58, { align: 'center' });

  // ── Nombre del paciente ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...darkBlue);
  doc.text(patientName, W / 2, 76, { align: 'center' });

  // Línea separadora
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.5);
  doc.line(14, 81, W - 14, 81);

  // ── Detalles del turno ──────────────────────────────────────────────
  const rows: [string, string][] = [
    ['Fecha', dateLabel],
    ['Hora', timePart ?? ''],
  ];
  if (appt.reason) rows.push(['Motivo', appt.reason]);

  let y = 95;
  for (const [label, value] of rows) {
    // Fondo sutil por fila
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(14, y - 6, W - 28, 10, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...blue);
    doc.text(label.toUpperCase(), 20, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text(value, 55, y);
    y += 14;
  }

  // ── Footer ──────────────────────────────────────────────────────────
  doc.setFillColor(...darkBlue);
  doc.rect(0, H - 18, W, 18, 'F');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(160, 195, 240);
  doc.text('Por favor, llegá 10 minutos antes de tu turno.', W / 2, H - 8, { align: 'center' });

  const fileName = `turno_${patientName.replace(/\s+/g, '_')}_${datePart}.pdf`;
  doc.save(fileName);
}
