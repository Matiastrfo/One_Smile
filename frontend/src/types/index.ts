export interface Patient {
  id?: number;
  name: string;
  dni: string;
  phone?: string;
  blood_type?: string;
  allergies?: string;
  diseases?: string;
  medications?: string;
  observations?: string;
  // Datos filiatorios
  last_name?: string;
  social_security?: string;
  social_security_number?: string;
  address?: string;
  province?: string;
  city?: string;
  email?: string;
  birth_date?: string;
  photo_path?: string;
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
  arch_teeth?: string;
  odontogram_type?: string;
  odontogram_color?: string;
  odontogram_faces?: string;
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
  professional_morning_id?: number;
  professional_afternoon_id?: number;
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

export interface PatientImage {
  id?: number;
  patient_id: number;
  date: string;
  treatment_type: string;
  description?: string;
  file_path: string;
  professional_name?: string;
}

export interface PatientPayment {
  id?: number;
  patient_id: number;
  date: string;
  amount: number;
  description: string;
  professional_name?: string;
}

export interface AccountEntry {
  id: number;
  source: "treatment" | "payment";
  date: string;
  description: string;
  amount: number;
  professional_name?: string;
}

export interface PatientAccount {
  entries: AccountEntry[];
  total_charges: number;
  total_payments: number;
  balance: number;
}

export interface AccountSummaryRow {
  patient_id: number;
  patient_name: string;
  last_name?: string;
  dni?: string;
  total_charges: number;
  total_payments: number;
  balance: number;
}

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
