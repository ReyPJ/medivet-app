export interface User {
  id: number;
  username: string;
  role: string;
  phone?: string;
  email?: string;
  full_name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface Note {
  id: number;
  content: string;
  patient_id: number;
  created_by: string;
  created_at: string;
}

export interface Patient {
  id: number;
  name: string;
  species: string;
  assistant_id: number;
  assistant_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  medications: Medication[];
  notes: Note[];
}

export interface Dose {
  id: number;
  medication_id: number;
  scheduled_time: string;
  status: "pending" | "administered" | "missed";
  administration_time?: string;
  administered_by?: number;
  notes?: string;
  notification_sent: boolean;
}

export interface Medication {
  id: number;
  patient_id: number;
  name: string;
  dosage: string;
  frequency: number; // horas entre dosis
  start_time: string; // nuevo campo
  duration_days: number; // nuevo campo
  status: "active" | "completed" | "cancelled"; // nuevo campo
  next_dose_time: string; // campo existente para compatibilidad
  completed: boolean; // campo existente para compatibilidad
  completed_at?: string;
  completed_by?: number;
  created_at: string;
  notification_sent: boolean;
  doses: Dose[]; // nueva relación
}
