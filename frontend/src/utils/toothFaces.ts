import type { ToothFace } from '../types';

const UPPER = new Set([11,12,13,14,15,16,17,18, 21,22,23,24,25,26,27,28]);
// Cuadrantes derechos: 1x (superior derecho) y 4x (inferior derecho)
const RIGHT_QUADRANT = new Set([11,12,13,14,15,16,17,18, 41,42,43,44,45,46,47,48]);

export function getFaceLabel(face: ToothFace, toothNumber: number): string {
  const isUpper = UPPER.has(toothNumber);
  const isRight = RIGHT_QUADRANT.has(toothNumber);

  switch (face) {
    case 'center': return 'Oclusal';
    case 'top':    return isUpper ? 'Vestibular' : 'Lingual';
    case 'bottom': return isUpper ? 'Palatino'   : 'Vestibular';
    case 'left':   return isRight  ? 'Distal'    : 'Mesial';
    case 'right':  return isRight  ? 'Mesial'    : 'Distal';
    default:       return face;
  }
}

export function getFaceLabels(faces: string[], toothNumber: number): string {
  if (!faces || faces.length === 0) return '';
  return faces.map(f => getFaceLabel(f as ToothFace, toothNumber)).join(', ');
}
