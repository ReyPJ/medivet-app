import { Medication, Note } from "./index";
import {
  ExtractedMedication,
  ExtractedPatientData,
} from "../services/ai-service";

// Tipo para mensajes del chat
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Tipo para medicamentos en edición
export interface MedicationEdit {
  name: string;
  dosage: string;
  frequency: number | string;
  duration_days: number | string;
  start_time: string;
  notes?: string;
}

// Tipo para convertir medicamentos extraídos a medicamentos del sistema
export function convertToSystemMedication(
  med: ExtractedMedication | MedicationEdit
): Partial<Medication> {
  // Asegurarnos de convertir frecuencia y duración a números
  const frequency =
    typeof med.frequency === "string"
      ? parseInt(med.frequency) || 24
      : med.frequency;

  const duration_days =
    typeof med.duration_days === "string"
      ? parseInt(med.duration_days) || 7
      : med.duration_days;

  return {
    name: med.name,
    dosage: med.dosage,
    frequency: frequency,
    duration_days: duration_days,
    start_time: med.start_time,
    status: "active",
    completed: false,
    notification_sent: false,
  };
}

// Funciones de ayuda
export function frequencyToString(hours: number): string {
  if (hours === 24) return "cada día";
  if (hours === 12) return "cada 12 horas";
  if (hours === 8) return "cada 8 horas";
  if (hours === 6) return "cada 6 horas";
  if (hours === 4) return "cada 4 horas";
  return `cada ${hours} horas`;
}

export function durationToString(days: number): string {
  if (days === 1) return "1 día";
  if (days < 7) return `${days} días`;
  if (days === 7) return "1 semana";
  if (days % 7 === 0) return `${days / 7} semanas`;
  if (days === 30) return "1 mes";
  if (days % 30 === 0) return `${days / 30} meses`;
  return `${days} días`;
}

// Formatea una fecha y hora para mostrar de forma amigable
export function formatDateTime(dateTimeStr: string): string {
  try {
    // Crear una fecha a partir del string pero sin convertir a UTC
    const dateParts = dateTimeStr.split(/[- :]/);
    if (dateParts.length < 6) {
      // No tenemos todas las partes necesarias, añadir ceros para segundos si hace falta
      while (dateParts.length < 6) {
        dateParts.push("00");
      }
    }

    // Crear fecha local (los meses en JavaScript son 0-indexed)
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const hour = parseInt(dateParts[3], 10);
    const minute = parseInt(dateParts[4], 10);
    const second = parseInt(dateParts[5], 10);

    const date = new Date(year, month, day, hour, minute, second);

    if (isNaN(date.getTime())) {
      return dateTimeStr; // Si no se puede parsear, devolver el string original
    }

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    // Formatear la fecha manualmente para evitar conversiones de zona horaria
    const dayFormatted = date.getDate().toString().padStart(2, "0");
    const monthFormatted = (date.getMonth() + 1).toString().padStart(2, "0");
    const yearFormatted = date.getFullYear();

    // Formatear la hora
    const hourFormatted = date.getHours().toString().padStart(2, "0");
    const minuteFormatted = date.getMinutes().toString().padStart(2, "0");

    if (isToday) {
      return `Hoy a las ${hourFormatted}:${minuteFormatted}`;
    } else {
      return `${dayFormatted}/${monthFormatted}/${yearFormatted} a las ${hourFormatted}:${minuteFormatted}`;
    }
  } catch (error) {
    console.error("Error al formatear fecha:", error, dateTimeStr);
    return dateTimeStr;
  }
}
