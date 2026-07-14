import jsPDF from 'jspdf';

// Nomenclador odontológico de referencia: códigos y nombres de prestaciones habituales,
// organizados por categoría. Documento puramente informativo — SIN PRECIOS.
const CATEGORIES: { title: string; items: { code: string; name: string }[] }[] = [
  {
    title: 'Consultas',
    items: [
      { code: '110101', name: 'Consulta odontológica' },
      { code: '110102', name: 'Consulta de urgencia' },
      { code: '110103', name: 'Interconsulta' },
      { code: '110104', name: 'Consulta de control' },
    ],
  },
  {
    title: 'Diagnóstico',
    items: [
      { code: '120101', name: 'Radiografía periapical' },
      { code: '120102', name: 'Radiografía bite-wing' },
      { code: '120103', name: 'Radiografía panorámica' },
      { code: '120104', name: 'Modelos de estudio' },
      { code: '120105', name: 'Fotografías clínicas' },
      { code: '120106', name: 'Plan de tratamiento' },
    ],
  },
  {
    title: 'Prevención',
    items: [
      { code: '130101', name: 'Profilaxis (limpieza dental)' },
      { code: '130102', name: 'Aplicación tópica de flúor' },
      { code: '130103', name: 'Selladores de fosas y fisuras' },
      { code: '130104', name: 'Educación para la salud bucal' },
      { code: '130105', name: 'Destartraje supragingival' },
    ],
  },
  {
    title: 'Operatoria dental',
    items: [
      { code: '210101', name: 'Obturación con amalgama - 1 superficie' },
      { code: '210102', name: 'Obturación con amalgama - 2 superficies' },
      { code: '210103', name: 'Obturación con resina - 1 superficie' },
      { code: '210104', name: 'Obturación con resina - 2 superficies' },
      { code: '210105', name: 'Obturación con resina - 3 o más superficies' },
      { code: '210106', name: 'Reconstrucción con perno' },
      { code: '210107', name: 'Recubrimiento pulpar directo' },
      { code: '210108', name: 'Recubrimiento pulpar indirecto' },
    ],
  },
  {
    title: 'Endodoncia',
    items: [
      { code: '220101', name: 'Tratamiento de conducto - unirradicular' },
      { code: '220102', name: 'Tratamiento de conducto - birradicular' },
      { code: '220103', name: 'Tratamiento de conducto - multirradicular' },
      { code: '220104', name: 'Retratamiento de conducto' },
      { code: '220105', name: 'Pulpectomía' },
      { code: '220106', name: 'Pulpotomía' },
      { code: '220107', name: 'Apicectomía' },
    ],
  },
  {
    title: 'Cirugía',
    items: [
      { code: '230101', name: 'Extracción dentaria simple' },
      { code: '230102', name: 'Extracción dentaria compleja' },
      { code: '230103', name: 'Extracción de restos radiculares' },
      { code: '230104', name: 'Cirugía de dientes retenidos / incluidos' },
      { code: '230105', name: 'Alveoloplastía' },
      { code: '230106', name: 'Biopsia de tejidos blandos' },
      { code: '230107', name: 'Frenectomía' },
      { code: '230108', name: 'Colocación de implante dental' },
    ],
  },
  {
    title: 'Periodoncia',
    items: [
      { code: '240101', name: 'Raspaje y alisado radicular por cuadrante' },
      { code: '240102', name: 'Curetaje subgingival' },
      { code: '240103', name: 'Cirugía periodontal' },
      { code: '240104', name: 'Gingivectomía' },
      { code: '240105', name: 'Férula periodontal' },
    ],
  },
  {
    title: 'Prótesis',
    items: [
      { code: '310101', name: 'Corona completa metálica' },
      { code: '310102', name: 'Corona completa cerámica' },
      { code: '310103', name: 'Corona de metal-porcelana' },
      { code: '310104', name: 'Prótesis parcial removible' },
      { code: '310105', name: 'Prótesis completa superior' },
      { code: '310106', name: 'Prótesis completa inferior' },
      { code: '310107', name: 'Puente fijo (por unidad)' },
      { code: '310108', name: 'Rebase de prótesis' },
      { code: '310109', name: 'Reparación de prótesis' },
    ],
  },
  {
    title: 'Ortodoncia',
    items: [
      { code: '410101', name: 'Estudio y diagnóstico ortodóncico' },
      { code: '410102', name: 'Colocación de aparatología fija' },
      { code: '410103', name: 'Control mensual de ortodoncia' },
      { code: '410104', name: 'Colocación de placa removible' },
      { code: '410105', name: 'Retenedor de contención' },
      { code: '410106', name: 'Alineadores transparentes - set' },
    ],
  },
];

export function downloadArancelNacionalPdf() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const darkBlue: [number, number, number] = [10, 40, 90];
  const blue: [number, number, number] = [0, 100, 200];

  const addHeader = () => {
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
    doc.text('ARANCEL NACIONAL DE REFERENCIA', W / 2, 30, { align: 'center' });
  };

  const addFooter = () => {
    doc.setFillColor(...darkBlue);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(160, 195, 240);
    doc.text('Documento generado por ONE Smile · Odontología Trifiro', W / 2, H - 5, { align: 'center' });
  };

  addHeader();
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(...darkBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Nomenclador Odontológico de Referencia', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text(dateStr, W - 14, 48, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text('Listado de códigos y prestaciones habituales. Documento sin valores — a fines orientativos únicamente.', 14, 54);
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 58, W - 14, 58);

  let y = 68;
  const colX = [14, 44];

  for (const category of CATEGORIES) {
    if (y > H - 40) { doc.addPage(); addFooter(); addHeader(); y = 62; }

    doc.setFillColor(240, 245, 255);
    doc.rect(14, y - 6, W - 28, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...blue);
    doc.text(category.title.toUpperCase(), 16, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    doc.text('Código', colX[0], y);
    doc.text('Prestación', colX[1], y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    category.items.forEach((item, idx) => {
      if (y > H - 25) { doc.addPage(); addFooter(); addHeader(); y = 62; }
      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(14, y - 4.5, W - 28, 7.5, 'F');
      }
      doc.setTextColor(...darkBlue);
      doc.setFont('helvetica', 'bold');
      doc.text(item.code, colX[0], y);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name, colX[1], y);
      y += 7.5;
    });

    y += 6;
  }

  addFooter();
  doc.save('arancel_nacional_referencia.pdf');
}
