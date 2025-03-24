import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ENV } from "../config/env";
import { parse, format, isValid } from "date-fns";

const API_KEY = ENV.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error(
    "Error: No se ha configurado la clave API de Google (GOOGLE_API_KEY)"
  );
}
const MODEL_NAME = "gemini-2.0-flash";

const genAI = new GoogleGenerativeAI(API_KEY);

export interface ExtractedPatientData {
  name: string;
  species: string;
  assistant_id: number;
  assistant_name?: string;
  notes?: { content: string }[];
  medications: ExtractedMedication[];
}

// Interfaz que coincide con los campos esperados de la IA
export interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: number;
  duration_days: number;
  start_time: string;
  patient_id?: number;
  notes?: string;
}

export async function extractPatientData(
  userMessage: string
): Promise<ExtractedPatientData> {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    const currentDate = new Date().toISOString().split("T")[0];
    const prompt = `
    Acúa como un sistema de procesamiento de lenguaje natural que extrae información veterinaria.

    # OBJETIVO
    Analiza el siguiente texto y extrae la información estructurada sobre un paciente veterinario y sus medicamentos recetados.

    # CONTEXTO IMPORTANTE
    - Los medicamenteos veterinarios pueden tener múltiples nombres, dosis, frecuencias y duraciones.
    - La informacion puede estar incompleta o ambigua; usa tu mejor juicio para interpretarla.
    - La fecha actual es ${currentDate}.
    - La hora actual es ${new Date().toLocaleTimeString()}.

    # TEXTO A PROCESAR
    """
    ${userMessage}
    """

    # INSTRUCCIONES ESPECÍFICAS
    - Identifica el NOMBRE del paciente (animal).
    - Identifica el ESPECIE del paciente (perro, gato, etc.), no incluyas razas.
    - Identifica el Asistente asignado a la mascota, si no esta claro o no se menciona, asigna "Sin Asistente".
    - Para cada medicamento, indentifica:
      - Nombre del medicamento
      - Dosis (cantidad + unidad, ej: 100mg, 20ml, 1000mcg, 0.5mg/kg, etc.)
      - Frecuencia (horas entre dosis, ej: cada 8 horas, cada 12 horas, dos veces al dia, etc.)
      - Duración (ej: 5 días, 1 semana, 2 meses, etc.)
      - Fecha de inicio (usa formatos ISO YYYY-MM-DD HH:MM:SS)
      - Notas adicionales (ej: se debe administrar antes de las comidas, etc.)

    # FORMATO DE RESPUESTA
    Responde UNICAMENTE con un objeto JSON con la siguiente estructura precisa:
    {
      "name": "<nombre del paciente>",
      "species": "<especie del paciente>",
      "assistant_id": <id del asistente>,
      "assistant_name": "<nombre del asistente>",
      "notes": [
        {
          "content": "<notas del paciente>"
        }
      ],
      "medications": [
        {
          "name": "<nombre del medicamento>",
          "dosage": "<dosis del medicamento>",
          "frequency": <frecuencia en horas>,
          "duration_days": <duración en días>,
          "start_time": "<fecha y hora de inicio: YYYY-MM-DD HH:MM:SS>",
          "notes": "<notas adicionales>"
        }
      ]
    }

    # EJEMPLOS DE ASIGNACIÓN DE HORAS:
    - Si el usuario menciona "hoy a las 12:30" -> "start_time": "2023-08-25 12:30:00"
    - Si el usuario menciona "mañana a las 9" -> "start_time": "2023-08-26 09:00:00"
    - Si el usuario menciona "12pm" -> "start_time": "2023-08-25 12:00:00"

    # REGLAS IMPORTANTES
    - PRIORIDAD MÁXIMA: Si el usuario menciona una hora específica (ej: "12:30", "a las 15:00"), DEBES usar EXACTAMENTE esa hora.
    - Si la fecha de inicio es "hoy", usa la fecha actual con la hora mencionada o la hora actual si no se especifica.
    - Si se menciona "mañana", usa la fecha de mañana con la hora mencionada.
    - Convierte cualquier frecuencia (como "cada 8 horas") a un número de horas.
    - Convierte cualquier duración (como "5 días", "1 semana") a un número de días.
    - Si no puedes determinar algún valor, usa valores por defecto razonables.
    - NO INCLUYAS ningun texto explicativo o comentarios fuera del JSON.
    - Asegurate de que el JSON sea valido y este correctamente formateado.
    `;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();

    // Intentar extraer JSON con o sin marcadores de código
    let jsonData;
    const jsonMatch = textResponse.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);

    if (jsonMatch) {
      // Si encontramos el JSON entre marcadores
      jsonData = jsonMatch[1];
    } else {
      // Intentar interpretar la respuesta completa como JSON
      jsonData = textResponse;
    }

    try {
      const parsedData = JSON.parse(jsonData);

      // Validación y normalización de datos
      const normalizedData: ExtractedPatientData = {
        name: parsedData.name || "Paciente sin nombre",
        species: parsedData.species || "Especie sin determinar",
        assistant_id: parsedData.assistant_id || 0,
        assistant_name: parsedData.assistant_name || "Sin Asistente",
        notes: [],
        medications: [],
      };

      // Procesar notas - asegurar que tengan el formato correcto con campo content
      if (Array.isArray(parsedData.notes)) {
        normalizedData.notes = parsedData.notes.map((note: any) => {
          // Si la nota ya tiene el formato correcto (objeto con campo content)
          if (note && typeof note === "object" && "content" in note) {
            return note;
          }
          // Si es una cadena, convertirla al formato correcto
          if (typeof note === "string") {
            return { content: note };
          }
          // En cualquier otro caso, crear una nota vacía
          return { content: "" };
        });
      }

      // Procesar medicamentos
      if (Array.isArray(parsedData.medications)) {
        normalizedData.medications = parsedData.medications.map(
          (medication: any) => {
            // Convertir frecuencia a número
            let frequency = 24; // por defecto diario
            if (typeof medication.frequency === "string") {
              const frequencyMatch = medication.frequency.match(/(\d+)/);
              if (frequencyMatch) {
                frequency = parseInt(frequencyMatch[1], 10);
              } else if (
                medication.frequency.includes("día") ||
                medication.frequency.includes("day")
              ) {
                frequency = 24;
              } else if (
                medication.frequency.includes("semana") ||
                medication.frequency.includes("week")
              ) {
                frequency = 7 * 24;
              }
            } else if (typeof medication.frequency === "number") {
              frequency = medication.frequency;
            }

            // Convertir duración a días
            let durationDays = 7; // por defecto una semana
            if (typeof medication.duration_days === "string") {
              const durationMatch = medication.duration_days.match(/(\d+)/);
              if (durationMatch) {
                durationDays = parseInt(durationMatch[1], 10);
                if (
                  medication.duration_days.includes("semana") ||
                  medication.duration_days.includes("week")
                ) {
                  durationDays *= 7;
                } else if (
                  medication.duration_days.includes("mes") ||
                  medication.duration_days.includes("month")
                ) {
                  durationDays *= 30;
                }
              }
            } else if (typeof medication.duration_days === "number") {
              durationDays = medication.duration_days;
            }

            // Normalizar fecha
            let startTime = medication.start_time;

            // Guardar la hora específica del texto original si existe
            const originalText = typeof startTime === "string" ? startTime : "";

            // Diferentes patrones de hora que podemos encontrar
            const patterns = [
              /(\d{1,2}):(\d{1,2})/, // 12:30
              /a las (\d{1,2}):(\d{1,2})/, // a las 12:30
              /a las (\d{1,2}) y (\d{1,2})/, // a las 12 y 30
              /(\d{1,2}) (?:y|con) (\d{1,2})/, // 12 y 30, 12 con 30
              /(\d{1,2})[\.:](\d{1,2})/, // 12.30 o 12:30
              /(\d{1,2})(?: |:)(\d{1,2}) ?(am|pm)/i, // 12:30 pm, 12 30 am
            ];

            let timeMatch = null;
            let matchedHours = null;
            let matchedMinutes = null;

            // Probar cada patrón hasta encontrar uno que funcione
            for (const pattern of patterns) {
              const match = originalText.match(pattern);
              if (match) {
                timeMatch = match;
                matchedHours = parseInt(match[1], 10);
                matchedMinutes = parseInt(match[2], 10);

                // Ajustar AM/PM si está presente
                if (
                  match[3] &&
                  match[3].toLowerCase() === "pm" &&
                  matchedHours < 12
                ) {
                  matchedHours += 12;
                } else if (
                  match[3] &&
                  match[3].toLowerCase() === "am" &&
                  matchedHours === 12
                ) {
                  matchedHours = 0;
                }

                console.log(
                  `Hora detectada: ${matchedHours}:${matchedMinutes} - Patrón: ${pattern}`
                );
                break;
              }
            }

            const hasSpecificTime = !!timeMatch;
            const specificHour = matchedHours;
            const specificMinute = matchedMinutes;

            if (!startTime || startTime.toLowerCase() === "hoy") {
              // Usar fecha actual pero conservar hora específica si fue mencionada
              const now = new Date();
              if (
                hasSpecificTime &&
                specificHour !== null &&
                specificMinute !== null
              ) {
                now.setHours(specificHour, specificMinute, 0);
                console.log(
                  `Usando hora específica: ${specificHour}:${specificMinute}`
                );
              }

              // Usar formato local en vez de ISO
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, "0");
              const day = String(now.getDate()).padStart(2, "0");
              const hours = String(now.getHours()).padStart(2, "0");
              const minutes = String(now.getMinutes()).padStart(2, "0");

              startTime = `${year}-${month}-${day} ${hours}:${minutes}:00`;
            } else {
              // Intentar parsear diferentes formatos de fecha
              try {
                let parsedDate;

                // Si es solo una fecha YYYY-MM-DD sin hora
                if (startTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  parsedDate = parse(startTime, "yyyy-MM-dd", new Date());
                  // Aplicar hora específica si existe, sino mantener la actual
                  if (
                    hasSpecificTime &&
                    specificHour !== null &&
                    specificMinute !== null
                  ) {
                    parsedDate.setHours(specificHour, specificMinute, 0);
                    console.log(
                      `Aplicando hora específica a fecha ISO: ${specificHour}:${specificMinute}`
                    );
                  }
                }
                // Si ya incluye fecha y hora completa en formato estándar
                else if (
                  startTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
                ) {
                  parsedDate = new Date(startTime.replace(" ", "T"));
                }
                // Intenta extraer fecha "hoy" + hora específica (ej: "hoy a las 12:30")
                else if (
                  startTime.toLowerCase().includes("hoy") &&
                  hasSpecificTime
                ) {
                  parsedDate = new Date();
                  if (specificHour !== null && specificMinute !== null) {
                    parsedDate.setHours(specificHour, specificMinute, 0);
                    console.log(
                      `Extrayendo "hoy" con hora específica: ${specificHour}:${specificMinute}`
                    );
                  }
                }
                // Si es texto como "mañana a las 12:30"
                else if (
                  startTime.toLowerCase().includes("mañana") ||
                  startTime.toLowerCase().includes("manana")
                ) {
                  parsedDate = new Date();
                  parsedDate.setDate(parsedDate.getDate() + 1);
                  if (
                    hasSpecificTime &&
                    specificHour !== null &&
                    specificMinute !== null
                  ) {
                    parsedDate.setHours(specificHour, specificMinute, 0);
                    console.log(
                      `Usando "mañana" con hora específica: ${specificHour}:${specificMinute}`
                    );
                  }
                }
                // Si es otra cosa, intentar un parsing básico
                else {
                  parsedDate = new Date(startTime);
                }

                // Si el parsing fue exitoso
                if (isValid(parsedDate)) {
                  // SIEMPRE dar prioridad a la hora específica mencionada en el texto original
                  if (
                    hasSpecificTime &&
                    specificHour !== null &&
                    specificMinute !== null
                  ) {
                    // Asegurar que usamos la hora exacta sin conversiones de zona horaria
                    parsedDate.setHours(specificHour, specificMinute, 0);
                    console.log(
                      `Ajustando a hora mencionada explícitamente: ${specificHour}:${specificMinute}`
                    );
                  }

                  // Usar formato local en vez de ISO para evitar conversiones UTC
                  const year = parsedDate.getFullYear();
                  const month = String(parsedDate.getMonth() + 1).padStart(
                    2,
                    "0"
                  );
                  const day = String(parsedDate.getDate()).padStart(2, "0");
                  const hours = String(parsedDate.getHours()).padStart(2, "0");
                  const minutes = String(parsedDate.getMinutes()).padStart(
                    2,
                    "0"
                  );

                  startTime = `${year}-${month}-${day} ${hours}:${minutes}:00`;
                  console.log(`Fecha final formateada: ${startTime}`);
                } else {
                  // Si no es válida, usar fecha actual con hora específica o la hora actual
                  const now = new Date();
                  if (
                    hasSpecificTime &&
                    specificHour !== null &&
                    specificMinute !== null
                  ) {
                    now.setHours(specificHour, specificMinute, 0);
                  }

                  // Usar formato local en vez de ISO
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, "0");
                  const day = String(now.getDate()).padStart(2, "0");
                  const hours = String(now.getHours()).padStart(2, "0");
                  const minutes = String(now.getMinutes()).padStart(2, "0");

                  startTime = `${year}-${month}-${day} ${hours}:${minutes}:00`;
                }
              } catch (e) {
                console.error("Error al parsear fecha:", e, startTime);
                // Si hay error, usar fecha actual pero mantener hora específica si existe
                const now = new Date();
                if (
                  hasSpecificTime &&
                  specificHour !== null &&
                  specificMinute !== null
                ) {
                  now.setHours(specificHour, specificMinute, 0);
                }

                // Usar formato local en vez de ISO
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, "0");
                const day = String(now.getDate()).padStart(2, "0");
                const hours = String(now.getHours()).padStart(2, "0");
                const minutes = String(now.getMinutes()).padStart(2, "0");

                startTime = `${year}-${month}-${day} ${hours}:${minutes}:00`;
              }
            }

            return {
              name: medication.name || "",
              dosage: medication.dosage || "",
              frequency: frequency,
              duration_days: durationDays,
              start_time: startTime,
              notes: medication.notes || "",
            };
          }
        );
      }

      return normalizedData;
    } catch (jsonError) {
      console.error(
        "Error al analizar la respuesta JSON:",
        jsonError,
        "Texto recibido:",
        textResponse
      );
      throw new Error("Error al analizar la respuesta JSON.");
    }
  } catch (error) {
    console.error("Error al extraer datos del paciente:", error);
    throw error;
  }
}

/**
 * Función para validar los datos extraídos
 * @param data Datos extraídos
 * @returns Verdadero si los datos son válidos, falso en caso contrario
 */
export function validateExtractedData(data: ExtractedPatientData): boolean {
  if (!data.name || !data.species) {
    return false;
  }

  // Verificar que cada medicamento tenga al menos nombre y dosis
  if (Array.isArray(data.medications)) {
    for (const med of data.medications) {
      if (!med.name || !med.dosage) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Ejemplo de formato del JSON esperado:
 * {
 *   "name": "Nombre del paciente",
 *   "species": "Especie (perro, gato, etc.)",
 *   "assistant_id": 123,
 *   "assistant_name": "Nombre del asistente",
 *   "notes": [
 *     {
 *       "content": "<notas del paciente>"
 *     }
 *   ],
 *   "medications": [
 *     {
 *       "name": "Nombre del medicamento",
 *       "dosage": "50mg/kg",
 *       "frequency": 12,  // frecuencia en horas
 *       "duration_days": 7,
 *       "start_time": "2023-09-10"
 *     }
 *   ]
 * }
 */
