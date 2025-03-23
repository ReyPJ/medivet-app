import axios, { AxiosError, AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import {
  User,
  Patient,
  Medication,
  Dose,
  CreateUserDto,
  UpdateUserDto,
} from "../types";
import { format } from "date-fns";

const API_URL = "http://10.0.2.2:8000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  try {
    console.log(`Intentando login con: ${username}`);

    // Verificamos que los campos no estén vacíos
    if (!username || !password) {
      throw new Error("El nombre de usuario y la contraseña son obligatorios");
    }

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response: AxiosResponse<LoginResponse> = await axios.post(
      `${API_URL}/auth/login`,
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("Login exitoso, token recibido");

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      "Login Error:",
      axiosError.response?.data || axiosError.message
    );
    if (axiosError.response?.status === 422) {
      throw new Error(
        "Formato de solicitud incorrecto. Verifica los campos requeridos."
      );
    } else if (axiosError.response?.status === 401) {
      throw new Error("Usuario o contraseña incorrectos");
    } else {
      throw new Error(
        JSON.stringify(axiosError.response?.data) || "Error al iniciar sesión"
      );
    }
  }
};

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const response: AxiosResponse<Patient[]> = await apiClient.get(
      "/patients/"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching patients:", error);
    throw new Error("Error al obtener la lista de pacientes");
  }
};

export const getPatientDetails = async (
  patientId: number
): Promise<Patient> => {
  try {
    const response: AxiosResponse<Patient> = await apiClient.get(
      `/patients/${patientId}`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching patient details for patient ${patientId}:`,
      error
    );
    throw new Error("Error al obtener los detalles del paciente");
  }
};

export const completeMedication = async (
  medicationId: number
): Promise<Medication> => {
  try {
    const response = await apiClient.post(
      `/patients/medications/${medicationId}/complete`
    );
    return response.data;
  } catch (error) {
    console.error(`Error al completar la medicacion ${medicationId}:`, error);
    throw new Error("Error al completar la medicación");
  }
};

export const addMedication = async (medicationData: {
  name: string;
  dosage: string;
  frequency: number;
  start_time: string | Date;
  duration_days: number;
  patient_id: number;
}): Promise<Medication> => {
  try {
    const formattedData = {
      ...medicationData,
      start_time:
        typeof medicationData.start_time === "string"
          ? medicationData.start_time
          : format(medicationData.start_time, "yyyy-MM-dd HH:mm:ss"),
    };
    const response = await apiClient.post(
      `/patients/${medicationData.patient_id}/medications`,
      medicationData
    );
    return response.data;
  } catch (error) {
    console.error("Error al agregar medicación:", error);
    if (error instanceof AxiosError && error.response?.data) {
      console.error("Error data:", error.response.data);
    }
    throw new Error("Error al agregar nueva medicación");
  }
};

export const getAssistants = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get("users/assistants");
    return response.data;
  } catch (error) {
    console.error("Error al obtener la lista de asistentes:", error);
    throw new Error("Error al obtener la lista de asistentes");
  }
};

export const getUsers = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get("/users");
    return response.data;
  } catch (error) {
    console.error("Error en getUsers:", error);
    throw error;
  }
};

// Obtener un usuario por ID
export const getUserById = async (userId: number): Promise<any> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error en getUserById:", error);
    throw error;
  }
};

// Crear un nuevo usuario
export const createUser = async (userData: CreateUserDto): Promise<User> => {
  try {
    // Mapear los nombres de campos correctos
    const userPayload = {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      full_name: userData.full_name, // Asegurarse de usar el nombre correcto
      phone: userData.phone, // Asegurarse de usar el nombre correcto
    };

    const response = await apiClient.post("/users/", userPayload);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err.response) {
      console.error("Error en createUser:", err.response.status);
      console.error("Datos del error:", err.response.data);
    } else if (err.request) {
      console.error("No se recibió respuesta:", err.request);
    } else {
      console.error("Error:", (err as Error).message);
    }
    throw error;
  }
};
// Actualizar un usuario existente
export const updateUser = async (
  userId: number,
  userData: UpdateUserDto
): Promise<User> => {
  try {
    // Mapear los nombres de campos correctos
    const userPayload: Partial<UpdateUserDto> = {
      username: userData.username,
      email: userData.email,
      role: userData.role,
      full_name: userData.full_name, // Usar el nombre correcto
      phone: userData.phone, // Usar el nombre correcto
    };

    // Solo incluir contraseña si se proporcionó
    if (userData.password) {
      userPayload.password = userData.password;
    }

    console.log("Datos actualizados:", JSON.stringify(userPayload, null, 2));
    const response = await apiClient.put(`/users/${userId}/`, userPayload);
    return response.data;
  } catch (error) {
    const err = error as AxiosError;
    if (err.response) {
      console.error("Error en updateUser:", err.response.status);
      console.error("Datos del error:", err.response.data);
    } else {
      console.error("Error en updateUser:", (err as Error).message);
    }
    throw error;
  }
};

// Eliminar un usuario
export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await apiClient.delete(`/users/${userId}`);
  } catch (error) {
    console.error("Error en deleteUser:", error);
    throw error;
  }
};

// Interfaz para datos de creación de paciente
interface PatientCreate {
  name: string;
  species: string;
  assistant_id: number;
  assistant_name?: string;
  notes?: { content: string }[];
}

// Función para crear un nuevo paciente
export const createPatient = async (
  patientData: PatientCreate
): Promise<Patient> => {
  try {
    const response = await apiClient.post("/patients/", patientData);
    return response.data;
  } catch (error) {
    console.error("Error al crear paciente:", error);
    throw new Error("Error al crear paciente");
  }
};

export const updatePatientAssistant = async (
  patientId: number,
  assistantId: number
): Promise<Patient> => {
  try {
    const response = await apiClient.patch(`/patients/${patientId}`, {
      assistant_id: assistantId,
    });
    return response.data;
  } catch (error) {
    console.error("Error al actualizar asistente:", error);
    throw new Error("Error al actualizar el asistente");
  }
};

// Función para administrar una dosis específica
export const administerDose = async (
  doseId: number,
  notes?: string
): Promise<Dose> => {
  try {
    const response = await apiClient.post(
      `/patients/doses/${doseId}/administer`,
      { notes: notes }
    );
    return response.data;
  } catch (error) {
    console.error(`Error al administrar dosis ${doseId}:`, error);
    throw new Error("Error al administrar la dosis");
  }
};

// Función para cancelar un tratamiento
export const cancelMedication = async (
  medicationId: number
): Promise<Medication> => {
  try {
    const response = await apiClient.post(
      `/patients/medications/${medicationId}/cancel`
    );
    return response.data;
  } catch (error) {
    console.error(`Error al cancelar medicación ${medicationId}:`, error);
    throw new Error("Error al cancelar el tratamiento");
  }
};

// Función para obtener dosis pendientes de un paciente
export const getPendingDoses = async (patientId: number): Promise<Dose[]> => {
  try {
    const response = await apiClient.get(
      `/patients/${patientId}/pending-doses/`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error al obtener dosis pendientes para paciente ${patientId}:`,
      error
    );
    throw new Error("Error al obtener las dosis pendientes");
  }
};

export const deletePatient = async (patientId: number): Promise<void> => {
  try {
    const response = await apiClient.delete(`/patients/${patientId}`);
    return response.data;
  } catch (error) {
    console.log(`Error al eliminar paciente ${patientId}:`, error);
    throw new Error("Error al eliminar paciente");
  }
};
