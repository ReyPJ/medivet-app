import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  TextInput,
  Button,
  Text,
  Headline,
  List,
  Modal,
  Portal,
  ActivityIndicator,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createPatient, getAssistants } from "../services/api";
import { User } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import { RootStackParamList } from "../navigation/types";

type NewPatientScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "NewPatient"
>;

const NewPatientScreen: React.FC<NewPatientScreenProps> = ({ navigation }) => {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<User | null>(null);
  const [assistantsLoading, setAssistantsLoading] = useState(true);
  const [showAssistantModal, setShowAssistantModal] = useState(false);

  // Cargar la lista de asistentes cuando se monta el componente
  useEffect(() => {
    const loadAssistants = async () => {
      try {
        setAssistantsLoading(true);
        const data = await getAssistants();
        setAssistants(data);
      } catch (error) {
        console.error("Error al cargar asistentes:", error);
        Alert.alert("Error", "No se pudieron cargar los asistentes");
      } finally {
        setAssistantsLoading(false);
      }
    };

    loadAssistants();
  }, []);

  const handleCreatePatient = async () => {
    if (!name || !species) {
      Alert.alert("Error", "El nombre y la especie son obligatorios");
      return;
    }

    if (!selectedAssistant) {
      Alert.alert("Error", "Debes seleccionar un asistente");
      return;
    }

    try {
      setLoading(true);

      // Preparar los datos del paciente
      const patientData = {
        name,
        species,
        assistant_id: selectedAssistant.id,
        assistant_name: selectedAssistant.full_name,
        notes: note ? [{ content: note }] : [],
      };

      // Enviar la solicitud al servidor
      await createPatient(patientData);

      // Mostrar mensaje de éxito y regresar a la pantalla anterior
      Alert.alert("Éxito", "Paciente creado correctamente", [
        { text: "OK", onPress: () => navigation.navigate("Home") },
      ]);
    } catch (error) {
      console.error("Error al crear paciente:", error);
      Alert.alert("Error", "No se pudo crear el paciente");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Creando paciente..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <Headline style={styles.title}>Nuevo Paciente</Headline>

      <TextInput
        label="Nombre"
        value={name}
        onChangeText={setName}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Especie"
        value={species}
        onChangeText={setSpecies}
        style={styles.input}
        mode="outlined"
      />

      {/* Selector de asistente */}
      <Button
        mode="outlined"
        onPress={() => setShowAssistantModal(true)}
        style={styles.input}
      >
        {selectedAssistant
          ? `Asistente: ${selectedAssistant.full_name}`
          : "Seleccionar Asistente"}
      </Button>

      {/* Modal para seleccionar asistente */}
      <Portal>
        <Modal
          visible={showAssistantModal}
          onDismiss={() => setShowAssistantModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Headline style={styles.modalTitle}>Seleccionar Asistente</Headline>

          {assistantsLoading ? (
            <ActivityIndicator size="large" color="#00796B" />
          ) : (
            <>
              {assistants.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay asistentes disponibles
                </Text>
              ) : (
                <ScrollView>
                  {assistants.map((assistant) => (
                    <List.Item
                      key={assistant.id}
                      title={assistant.full_name}
                      description={`ID: ${assistant.id}`}
                      onPress={() => {
                        setSelectedAssistant(assistant);
                        setShowAssistantModal(false);
                      }}
                      left={(props) => <List.Icon {...props} icon="account" />}
                    />
                  ))}
                </ScrollView>
              )}

              <Button
                mode="text"
                onPress={() => setShowAssistantModal(false)}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
            </>
          )}
        </Modal>
      </Portal>

      <TextInput
        label="Nota (opcional)"
        value={note}
        onChangeText={setNote}
        style={styles.inputTextArea}
        mode="outlined"
        multiline
        numberOfLines={3}
      />

      <Button
        mode="contained"
        onPress={handleCreatePatient}
        style={styles.button}
        disabled={!name || !species || !selectedAssistant}
      >
        Crear Paciente
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        style={styles.cancelButton}
      >
        Cancelar
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  inputTextArea: {
    marginBottom: 16,
    backgroundColor: "#fff",
    height: 100,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
    backgroundColor: "#00796B",
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#757575",
    marginVertical: 16,
  },
});

export default NewPatientScreen;
