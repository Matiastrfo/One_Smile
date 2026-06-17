export interface Patient {
  id?: number;
  name: string;
  dni: string;
  phone?: string;
}

export interface Appointment {
  id?: number;
  patient_id: number;
  professional_id?: number;
  date_time: string;
  reason: string;
  status?: string;
}

export interface Treatment {
  id?: number;
  patient_id: number;
  professional_id?: number;
  professional_email?: string;
  date_time: string;
  description: string;
  price: number;
  tooth_number?: number;
}

export interface MedicalReport {
  id?: number;
  patient_id: number;
  professional_id?: number;
  professional_email?: string;
  date_time: string;
  description: string;
}

export interface PatientReport {
  patient: Patient;
  appointments: Appointment[];
  treatments: Treatment[];
  medical_reports: MedicalReport[];
}

export interface Box {
  id?: number;
  name: string;
}

export interface BoxPayment {
  id?: number;
  professional_id: number;
  box_id: number;
  shift: string;
  month_year: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAID';
  payment_date?: string;
  amount?: number;
  notes?: string;
  professional_email?: string;
  box_name?: string;
  contract_duration?: number;
  contract_id?: number;
}

export interface Contract {
  id: number;
  professional_id: number;
  box_id: number;
  shift: string;
  day_of_week: string;
  start_month_year: string;
  duration_months: number;
  status: 'ACTIVE' | 'TRANSFERRED' | 'FINISHED';
  previous_contract_id?: number;
  professional_email?: string;
  box_name?: string;
  months_generated?: number;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
export const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes',
};

export type TreatmentType = 'NONE' | 'CARIES' | 'FILLING' | 'EXTRACTION_PENDING' | 'EXTRACTED' | 'ABSENT' | 'CROWN' | 'RX' | 'IMPLANT' | 'PERNO' | 'ENDODONCIA' | 'PROTESIS' | 'PROTESIS_PARCIAL' | 'PUENTE';
export type TreatmentColor = 'BLUE' | 'RED' | 'GREEN';
export type ToothFace = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface DentalPiece {
  id: number;
  patient_id: number;
  tooth_number: number;
  treatment_type: TreatmentType;
  color: TreatmentColor | null;
  faces: ToothFace[];
}

export interface ToothUpdate {
  treatment_type: TreatmentType;
  color: TreatmentColor | null;
  faces: ToothFace[];
}
