import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  IconButton,
  Card,
  Button,
  ActivityIndicator,
  Portal,
  Snackbar,
  Dialog,
  Title,
  Paragraph,
  Modal,
  Surface,
  Menu,
  Divider,
  Chip,
  HelperText,
  ProgressBar,
  List,
} from "react-native-paper";
import { useTheme } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { createPatient, addMedication, getAssistants } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  extractPatientData,
  ExtractedPatientData,
  ExtractedMedication,
} from "../services/ai-service";
import { Medication } from "../types";
import {
  ChatMessage,
  MedicationEdit,
  convertToSystemMedication,
  frequencyToString,
  durationToString,
  formatDateTime,
} from "../types/ai-assistant";

type AIAssistantScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "AIAssistant"
>;

const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({
  navigation,
}) => {
  const theme = useTheme();
  const { user } = useAuth();

  // Estados para el chat
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: 'Hola, soy tu asistente virtual. Puedes pedirme que registre pacientes y medicamentos. Por ejemplo:\n\n"Registra a Luna, gato, asistente asignado Javier, receta amoxicilina 50mg/kg oral cada 12 horas por 7 días a partir de mañana, y Meloxicam 0.1mg/kg una vez al día por 3 días"',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  // Estados para datos extraídos y confirmación
  const [extractedData, setExtractedData] =
    useState<ExtractedPatientData | null>(null);
  const [editableData, setEditableData] = useState<ExtractedPatientData | null>(
    null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);

  // Estado para edición de medicamentos
  const [editingMedication, setEditingMedication] =
    useState<MedicationEdit | null>(null);
  const [editingMedicationIndex, setEditingMedicationIndex] =
    useState<number>(-1);
  const [showMedicationEditor, setShowMedicationEditor] = useState(false);

  // Estado para sugerencias de medicamentos
  const [medicationSuggestions, setMedicationSuggestions] = useState<string[]>(
    []
  );
  const [showMedicationSuggestions, setShowMedicationSuggestions] =
    useState(false);

  // Estados para notificaciones y mensajes
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);

  // Lista de asistentes para asignar al paciente
  const [assistants, setAssistants] = useState<any[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(true);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Referencias para UI
  const flatListRef = useRef<FlatList>(null);

  // Cargar asistentes al iniciar
  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        setAssistantsLoading(true);
        const assistantsData = await getAssistants();
        setAssistants(assistantsData);
      } catch (error) {
        console.error("Error al cargar asistentes:", error);
      } finally {
        setAssistantsLoading(false);
      }
    };

    fetchAssistants();
  }, []);

  // Función para enviar mensaje y procesarlo
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Añadir mensaje del usuario al chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    // Mostrar indicador de procesamiento
    const processingMsg: ChatMessage = {
      id: "processing-" + Date.now().toString(),
      text: "Procesando tu solicitud...",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMsg]);

    // Simular progreso
    startProgressSimulation();

    try {
      // Llamar a la API de IA para extraer información
      const extractedInfo = await extractPatientData(userMessage.text);

      // Detener simulación de progreso
      stopProgressSimulation(1.0);

      // Actualizar mensaje de procesamiento con un resumen
      const summaryText = generateSummaryText(extractedInfo);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === processingMsg.id ? { ...msg, text: summaryText } : msg
        )
      );

      // Buscar asistente si existe el nombre antes de preparar datos para edición
      if (extractedInfo.assistant_name && assistants.length > 0) {
        const searchName = extractedInfo.assistant_name.toLowerCase();
        const foundAssistant = assistants.find(
          (a) =>
            (a.name && a.name.toLowerCase() === searchName) ||
            (a.full_name && a.full_name.toLowerCase() === searchName) ||
            (a.username && a.username.toLowerCase() === searchName) ||
            // Búsqueda parcial
            (a.name && a.name.toLowerCase().includes(searchName)) ||
            (a.full_name && a.full_name.toLowerCase().includes(searchName)) ||
            (a.username && a.username.toLowerCase().includes(searchName))
        );

        if (foundAssistant) {
          extractedInfo.assistant_id = foundAssistant.id;
          extractedInfo.assistant_name =
            foundAssistant.full_name ||
            foundAssistant.name ||
            foundAssistant.username;

          // Mensaje de confirmación
          console.log(
            `Asistente encontrado: ${extractedInfo.assistant_name} (ID: ${extractedInfo.assistant_id})`
          );
        } else {
          console.warn(
            `No se encontró un asistente con el nombre "${extractedInfo.assistant_name}"`
          );
        }
      }

      // Preparar datos para edición y confirmación
      setExtractedData(extractedInfo);
      setEditableData({ ...extractedInfo });
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error al procesar mensaje:", error);

      // Detener simulación de progreso
      stopProgressSimulation(1.0);

      // Mostrar mensaje de error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === processingMsg.id
            ? {
                ...msg,
                text: "Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta nuevamente con más detalles o usa el formulario manual.",
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Simular progreso durante el procesamiento
  const startProgressSimulation = () => {
    setProcessingProgress(0);
    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 0.9) {
          clearInterval(interval);
          return 0.9;
        }
        return prev + 0.1;
      });
    }, 300);
  };

  const stopProgressSimulation = (finalValue: number) => {
    setProcessingProgress(finalValue);
    setTimeout(() => {
      setProcessingProgress(0);
    }, 500);
  };

  // Generar texto de resumen a partir de los datos extraídos
  const generateSummaryText = (data: ExtractedPatientData): string => {
    let summary = `He identificado la siguiente información:\n\n`;
    summary += `📋 **Paciente**: ${data.name || "No especificado"}\n`;
    summary += `🐾 **Especie**: ${data.species || "No especificada"}\n`;

    if (data.assistant_name) {
      summary += `👨‍⚕️ **Asistente**: ${data.assistant_name}\n`;
    }

    if (data.medications && data.medications.length > 0) {
      summary += `\n💊 **Medicaciones**:\n`;
      data.medications.forEach((med, index) => {
        summary += `- ${med.name || "Medicamento"} ${med.dosage || ""}\n`;
        if (med.frequency)
          summary += `  Frecuencia: ${frequencyToString(med.frequency)}\n`;
        if (med.duration_days)
          summary += `  Duración: ${durationToString(med.duration_days)}\n`;
        if (med.start_time)
          summary += `  Inicio: ${formatDateTime(med.start_time)}\n`;
      });
    } else {
      summary += `\nNo se identificaron medicamentos.\n`;
    }

    summary += `\n¿Deseas registrar esta información? Puedes editarla antes de confirmar.`;

    return summary;
  };

  // Manejar la creación del paciente
  const handleCreatePatient = async () => {
    if (!editableData) return;

    setIsSubmitting(true);

    try {
      // Encontrar el asistente por nombre
      let assistant_id = user?.id || 0;
      let assistant_name = user?.full_name || "";

      if (editableData.assistant_name) {
        // Búsqueda de asistente por nombre - búsqueda flexible
        const searchName = editableData.assistant_name.toLowerCase();
        const foundAssistant = assistants.find(
          (a) =>
            (a.name && a.name.toLowerCase() === searchName) ||
            (a.full_name && a.full_name.toLowerCase() === searchName) ||
            (a.username && a.username.toLowerCase() === searchName) ||
            // Búsqueda parcial
            (a.name && a.name.toLowerCase().includes(searchName)) ||
            (a.full_name && a.full_name.toLowerCase().includes(searchName)) ||
            (a.username && a.username.toLowerCase().includes(searchName))
        );

        if (foundAssistant) {
          assistant_id = foundAssistant.id;
          assistant_name =
            foundAssistant.full_name ||
            foundAssistant.name ||
            foundAssistant.username;
          console.log(
            `Usando asistente: ${assistant_name} (ID: ${assistant_id})`
          );
        } else {
          console.warn(
            `No se encontró un asistente con el nombre "${editableData.assistant_name}". Usando el usuario actual como asistente.`
          );
          setSnackbarMessage(
            `No se encontró al asistente "${editableData.assistant_name}". Se usará a ti como asistente por defecto.`
          );
          setSnackbarVisible(true);
        }
      }

      // Asegurar que las notas tengan el formato correcto
      let formattedNotes: { content: string }[] = [];

      if (editableData.notes && editableData.notes.length > 0) {
        formattedNotes = editableData.notes
          .map((note: any) => {
            // Si ya tiene el formato correcto
            if (note && typeof note === "object" && "content" in note) {
              return note;
            }
            // Si es una cadena de texto
            if (typeof note === "string") {
              return { content: note };
            }
            // Por defecto
            return { content: "" };
          })
          .filter((note: { content: string }) => note.content.trim() !== "");
      }

      // Crear objeto con datos validados
      const patientData = {
        name: editableData.name || "Paciente sin nombre",
        species: editableData.species || "Especie sin determinar",
        assistant_id,
        assistant_name,
        notes: formattedNotes,
      };

      console.log("Creando paciente con datos:", patientData);

      // Crear paciente
      const response = await createPatient(patientData);

      // Si hay medicamentos en editableData, crearlos
      if (
        editableData.medications &&
        Array.isArray(editableData.medications) &&
        editableData.medications.length > 0 &&
        response &&
        response.id
      ) {
        await Promise.all(
          editableData.medications
            .map((med: any) => {
              if (!med || !med.name) return Promise.resolve();

              return addMedication({
                ...med,
                patient_id: response.id,
              });
            })
            .filter(Boolean)
        );
      }

      // Mostrar mensaje de éxito
      setSnackbarMessage("Paciente creado con éxito");
      setSnackbarVisible(true);

      // Limpiar datos y navegar a inicio
      setEditableData({} as ExtractedPatientData);
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error al crear paciente:", error);
      setSnackbarMessage(
        "Error al crear paciente. Por favor, verifica los datos e intenta nuevamente."
      );
      setSnackbarVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar creación
  const handleCancelCreate = () => {
    setShowConfirmation(false);
    setExtractedData(null);
    setEditableData(null);

    // Añadir mensaje de cancelación
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Se ha cancelado la creación del paciente.",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  // Editar un medicamento
  const handleEditMedication = (
    medication: ExtractedMedication,
    index: number
  ) => {
    if (!editableData || !medication) return;

    // Convertir de ExtractedMedication a MedicationEdit
    setEditingMedication({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      duration_days: medication.duration_days,
      start_time: medication.start_time,
      notes: medication.notes,
    });
    setEditingMedicationIndex(index);
    setShowMedicationEditor(true);
  };

  // Guardar cambios en medicamento
  const saveMedicationChanges = () => {
    if (!editingMedication || !editableData || editingMedicationIndex < 0)
      return;

    // Asegurar que medications existe
    if (!editableData.medications) {
      setEditableData({
        ...editableData,
        medications: [],
      });
    }

    // Convertir valores de cadena a números
    const updatedMedication: ExtractedMedication = {
      name: editingMedication.name,
      dosage: editingMedication.dosage,
      frequency:
        typeof editingMedication.frequency === "string"
          ? parseInt(editingMedication.frequency) || 24
          : editingMedication.frequency,
      duration_days:
        typeof editingMedication.duration_days === "string"
          ? parseInt(editingMedication.duration_days) || 7
          : editingMedication.duration_days,
      start_time: editingMedication.start_time,
      notes: editingMedication.notes,
    };

    const updatedMedications = [...(editableData.medications || [])];

    if (editingMedicationIndex >= (updatedMedications?.length || 0)) {
      // Es un nuevo medicamento
      updatedMedications.push(updatedMedication);
    } else {
      // Actualizar medicamento existente
      updatedMedications[editingMedicationIndex] = updatedMedication;
    }

    setEditableData({
      ...editableData,
      medications: updatedMedications,
    });

    setShowMedicationEditor(false);
    setEditingMedication(null);
    setEditingMedicationIndex(-1);
  };

  // Buscar sugerencias de medicamentos al escribir
  const handleMedicationNameChange = async (name: string) => {
    if (!editingMedication) return;

    setEditingMedication({ ...editingMedication, name });

    if (name.length >= 2) {
      try {
        // Esta función simularía una búsqueda en una base de datos de medicamentos
        const suggestions = await searchMedicationDatabase(name);
        setMedicationSuggestions(suggestions);
        setShowMedicationSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error("Error al buscar medicamentos:", error);
      }
    } else {
      setShowMedicationSuggestions(false);
    }
  };

  // Seleccionar una sugerencia de medicamento
  const selectMedicationSuggestion = (medication: string) => {
    if (!editingMedication) return;

    setEditingMedication({ ...editingMedication, name: medication });
    setShowMedicationSuggestions(false);
  };

  // Añadir nuevo medicamento
  const handleAddMedication = () => {
    if (!editableData) return;

    // Asegurar que existe medications
    if (!editableData.medications) {
      setEditableData({
        ...editableData,
        medications: [],
      });
    }

    const newMed: MedicationEdit = {
      name: "",
      dosage: "",
      frequency: 24,
      duration_days: 7,
      start_time: new Date().toISOString().split("T")[0],
    };

    setEditingMedication(newMed);
    setEditingMedicationIndex((editableData.medications || []).length || 0);
    setShowMedicationEditor(true);
  };

  // Eliminar medicamento
  const handleDeleteMedication = (index: number) => {
    if (!editableData) return;

    // Verificar que medications existe
    if (!editableData.medications || !Array.isArray(editableData.medications)) {
      return;
    }

    Alert.alert(
      "Eliminar medicamento",
      "¿Estás seguro de eliminar este medicamento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            const updatedMedications = [...editableData.medications];
            updatedMedications.splice(index, 1);

            setEditableData({
              ...editableData,
              medications: updatedMedications,
            });
          },
        },
      ]
    );
  };

  // Renderizar el editor de medicamentos
  const renderMedicationEditor = () => {
    if (!editingMedication) return null;

    return (
      <Portal>
        <Modal
          visible={showMedicationEditor}
          onDismiss={() => setShowMedicationEditor(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>
              {editingMedicationIndex >=
              (editableData?.medications?.length || 0)
                ? "Nuevo Medicamento"
                : "Editar Medicamento"}
            </Text>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.medicationFormField}>
                <TextInput
                  label="Nombre del medicamento"
                  value={editingMedication.name}
                  onChangeText={handleMedicationNameChange}
                  style={styles.input}
                />

                {/* Sugerencias de medicamentos */}
                {showMedicationSuggestions && (
                  <Card style={styles.suggestionsCard}>
                    <Card.Content>
                      <FlatList
                        data={medicationSuggestions}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => selectMedicationSuggestion(item)}
                            style={styles.suggestionItem}
                          >
                            <Text>{item}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </Card.Content>
                  </Card>
                )}
              </View>

              <View style={styles.medicationFormField}>
                <TextInput
                  label="Dosis (ej. 50mg, 2ml)"
                  value={editingMedication.dosage}
                  onChangeText={(dosage) =>
                    setEditingMedication({ ...editingMedication, dosage })
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.medicationFormField}>
                <TextInput
                  label="Frecuencia (horas)"
                  value={
                    typeof editingMedication.frequency === "number"
                      ? editingMedication.frequency.toString()
                      : editingMedication.frequency
                  }
                  onChangeText={(frequency) =>
                    setEditingMedication({ ...editingMedication, frequency })
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={styles.medicationFormField}>
                <TextInput
                  label="Duración (días)"
                  value={
                    typeof editingMedication.duration_days === "number"
                      ? editingMedication.duration_days.toString()
                      : editingMedication.duration_days
                  }
                  onChangeText={(duration_days) =>
                    setEditingMedication({
                      ...editingMedication,
                      duration_days,
                    })
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={styles.medicationFormField}>
                <TextInput
                  label="Fecha de inicio (YYYY-MM-DD)"
                  value={editingMedication.start_time}
                  onChangeText={(start_time) =>
                    setEditingMedication({ ...editingMedication, start_time })
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.medicationFormField}>
                <TextInput
                  label="Notas adicionales"
                  value={editingMedication.notes || ""}
                  onChangeText={(notes) =>
                    setEditingMedication({ ...editingMedication, notes })
                  }
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button onPress={() => setShowMedicationEditor(false)}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={saveMedicationChanges}
                disabled={!editingMedication.name.trim()}
              >
                Guardar
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  };

  // Seleccionar un asistente
  const handleSelectAssistant = (assistant: any) => {
    if (!editableData) return;

    setEditableData({
      ...editableData,
      assistant_id: assistant.id,
      assistant_name: assistant.full_name || assistant.username,
    });
  };

  // Renderizar tarjeta de confirmación
  const renderConfirmationCard = () => {
    if (!editableData) return null;

    // Asegurar que medications exista
    const medications = editableData.medications || [];

    return (
      <Card style={styles.confirmationCard}>
        <Card.Title title="Confirmar datos del paciente" />
        <Card.Content>
          <View style={styles.confirmationField}>
            <Text style={styles.confirmationLabel}>Nombre:</Text>
            <TextInput
              value={editableData.name}
              onChangeText={(name) =>
                setEditableData({ ...editableData, name })
              }
              style={styles.confirmationInput}
            />
          </View>

          <View style={styles.confirmationField}>
            <Text style={styles.confirmationLabel}>Especie:</Text>
            <TextInput
              value={editableData.species}
              onChangeText={(species) =>
                setEditableData({ ...editableData, species })
              }
              style={styles.confirmationInput}
            />
          </View>

          <View style={styles.confirmationField}>
            <Text style={styles.confirmationLabel}>Asistente:</Text>
            <Button
              mode="outlined"
              onPress={() => setShowAssistantModal(true)}
              style={styles.assistantSelector}
            >
              {editableData.assistant_name
                ? `Asistente: ${editableData.assistant_name}`
                : "Seleccionar Asistente"}
            </Button>

            <Portal>
              <Modal
                visible={showAssistantModal}
                onDismiss={() => setShowAssistantModal(false)}
                contentContainerStyle={styles.modalContainer}
              >
                <Text style={styles.modalTitle}>Seleccionar Asistente</Text>
                {assistantsLoading ? (
                  <ActivityIndicator style={{ margin: 20 }} />
                ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {assistants.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No hay asistentes disponibles
                      </Text>
                    ) : (
                      assistants.map((assistant) => (
                        <List.Item
                          key={assistant.id}
                          title={assistant.full_name || assistant.username}
                          description={assistant.email}
                          onPress={() => {
                            handleSelectAssistant(assistant);
                            setShowAssistantModal(false);
                          }}
                          left={(props) => (
                            <List.Icon {...props} icon="account" />
                          )}
                        />
                      ))
                    )}
                  </ScrollView>
                )}
                <Button
                  mode="text"
                  onPress={() => setShowAssistantModal(false)}
                  style={{ marginTop: 10 }}
                >
                  Cancelar
                </Button>
              </Modal>
            </Portal>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.medicationsHeader}>
            <Text style={styles.medicationsTitle}>Medicaciones</Text>
            <Button
              mode="outlined"
              icon="plus"
              onPress={handleAddMedication}
              compact
            >
              Añadir
            </Button>
          </View>

          {medications.length === 0 ? (
            <Text style={styles.noMedicationsText}>
              No hay medicaciones registradas
            </Text>
          ) : (
            medications.map((med, index) => (
              <Card key={index} style={styles.medicationCard}>
                <Card.Content>
                  <View style={styles.medicationHeader}>
                    <Text style={styles.medicationName}>
                      {med.name || "Medicamento sin nombre"}
                    </Text>
                    <View style={styles.medicationActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => handleEditMedication(med, index)}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleDeleteMedication(index)}
                      />
                    </View>
                  </View>

                  <View style={styles.medicationDetails}>
                    {med.dosage && (
                      <Chip icon="pill" style={styles.medicationChip}>
                        {med.dosage}
                      </Chip>
                    )}

                    {med.frequency && (
                      <Chip icon="clock-outline" style={styles.medicationChip}>
                        {frequencyToString(med.frequency)}
                      </Chip>
                    )}

                    {med.duration_days && (
                      <Chip icon="calendar-range" style={styles.medicationChip}>
                        {durationToString(med.duration_days)}
                      </Chip>
                    )}

                    <Chip icon="calendar" style={styles.medicationChip}>
                      {formatDateTime(med.start_time)}
                    </Chip>
                  </View>

                  {med.notes && (
                    <Text style={styles.medicationNotes}>
                      Notas: {med.notes}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            ))
          )}

          <View style={styles.confirmButtonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancelCreate}
              style={styles.confirmButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreatePatient}
              loading={isSubmitting}
              disabled={
                isSubmitting || !editableData.name || !editableData.species
              }
              style={styles.confirmButton}
            >
              Crear Paciente
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      {processingProgress > 0 && (
        <ProgressBar
          progress={processingProgress}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: showConfirmation ? 500 : 80, // Más espacio si la confirmación está visible
        }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.isUser ? styles.userMessage : styles.systemMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timestamp}>
              {item.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
      />

      {showConfirmation && renderConfirmationCard()}
      {renderMedicationEditor()}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Describe el paciente y medicaciones..."
          value={message}
          onChangeText={setMessage}
          multiline
          disabled={loading || showConfirmation}
          right={
            <TextInput.Icon
              icon="send"
              onPress={handleSendMessage}
              disabled={!message.trim() || loading || showConfirmation}
            />
          }
        />
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

// Servicio simulado para buscar medicamentos
// En una implementación real, esto se conectaría a una base de datos de medicamentos veterinarios
const searchMedicationDatabase = async (query: string): Promise<string[]> => {
  // Simulación de una base de datos de medicamentos veterinarios comunes
  const medicationDatabase = [
    "Amoxicilina",
    "Cefovecin",
    "Meloxicam",
    "Carprofeno",
    "Tramadol",
    "Prednisolona",
    "Dexametasona",
    "Metronidazol",
    "Clavamox",
    "Furosemida",
    "Enalapril",
    "Levotiroxina",
    "Insulina",
    "Cerenia",
    "Metoclopramida",
    "Ranitidina",
    "Omeprazol",
    "Baytril",
    "Ivermectina",
    "Fenbendazol",
    "Praziquantel",
    "Clindamicina",
    "Cefalexina",
    "Ciprofloxacino",
    "Gentamicina",
    "Ketoconazol",
    "Fluconazol",
    "Terbinafina",
    "Apoquel",
    "Atopica",
    "Rimadyl",
    "Metacam",
    "Onsior",
    "Convenia",
    "Fortekor",
    "Vetmedin",
    "Theophylline",
    "Terbutalina",
    "Claritin",
    "Benadryl",
    "Gabapentina",
    "Fenobarbital",
    "Keppra",
    "Zonisamida",
    "Propranolol",
  ];

  // Simular demora de red
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Filtrar medicamentos que coincidan con la consulta
  const results = medicationDatabase.filter((med) =>
    med.toLowerCase().includes(query.toLowerCase())
  );

  // Devolver máximo 5 resultados
  return results.slice(0, 5);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  progressBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  messagesList: {
    flex: 1,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
    maxWidth: "85%",
  },
  userMessage: {
    backgroundColor: "#E3F2FD",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  systemMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: "#888",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    backgroundColor: "#fff",
  },
  confirmationCard: {
    margin: 16,
    marginBottom: 80,
    elevation: 4,
  },
  confirmationField: {
    marginBottom: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: "#555",
  },
  confirmationInput: {
    backgroundColor: "transparent",
    fontSize: 16,
    padding: 0,
    height: 40,
  },
  divider: {
    marginVertical: 16,
  },
  medicationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  medicationsTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  noMedicationsText: {
    fontStyle: "italic",
    color: "#888",
    textAlign: "center",
    marginVertical: 16,
  },
  medicationCard: {
    marginBottom: 12,
    elevation: 1,
  },
  medicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  medicationActions: {
    flexDirection: "row",
  },
  medicationDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  medicationChip: {
    margin: 2,
  },
  medicationNotes: {
    marginTop: 8,
    fontStyle: "italic",
  },
  confirmButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  confirmButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
  },
  modalSurface: {
    padding: 20,
    borderRadius: 8,
    elevation: 4,
  },
  modalTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: "bold",
  },
  modalScrollView: {
    maxHeight: 400,
  },
  medicationFormField: {
    marginBottom: 16,
    position: "relative",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  suggestionsCard: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  assistantSelector: {
    width: "100%",
  },
  emptyText: {
    fontStyle: "italic",
    color: "#888",
    textAlign: "center",
    marginVertical: 16,
  },
});

export default AIAssistantScreen;
