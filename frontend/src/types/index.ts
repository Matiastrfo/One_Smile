export interface Patient {
  id?: number;
  name: string;
  dni: string;
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
  professional_morning_id?: number;
  professional_morning_email?: string;
  professional_afternoon_id?: number;
  professional_afternoon_email?: string;
  contract_duration_morning?: number;
  contract_duration_afternoon?: number;
  specialty_morning?: string;
  specialty_afternoon?: string;
}

export interface BoxPayment {
  id?: number;
  professional_id: number;
  box_id: number;
  shift: string;
  month_year: string;
  status: "PENDING" | "IN_PROGRESS" | "PAID";
  payment_date?: string;
  amount?: number;
  notes?: string;
  professional_email?: string;
  box_name?: string;
  contract_duration?: number;
}

export type DentalPieceCondition = "HEALTHY" | "CARIES" | "FILLED" | "EXTRACTED" | "CROWN" | "IMPLANT";

export interface DentalPiece {
  id: number;
  patient_id: number;
  tooth_number: number;
  condition: DentalPieceCondition;
}

export interface ToothTreatmentCreate {
  condition: DentalPieceCondition;
  description: string;
  price: number;
}
