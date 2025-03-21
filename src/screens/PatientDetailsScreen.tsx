import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Headline,
  Divider,
  Dialog,
  Portal,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  getPatientDetails,
  getPendingDoses,
  deletePatient,
} from "../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DoseItem } from "../components/DoseItem";
import MedicationCard from "../components/MedicationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { RootStackParamList } from "../navigation/types";

type PatientDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "PatientDetails"
>;

const PatientDetailsScreen: React.FC<PatientDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { patientId } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [pendingDoses, setPendingDoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getPatientDetails(patientId);
      setPatient(data);

      // Obtener dosis pendientes
      const doses = await getPendingDoses(patientId);
      setPendingDoses(doses);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDeletePatient = async () => {
    try {
      setDeleteDialogVisible(false);
      setLoading(true);

      await deletePatient(patientId);

      // Navegar de vuelta al Home
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error al eliminar paciente:", error);
      Alert.alert(
        "Error",
        "No se pudo eliminar el paciente. Inténtalo nuevamente."
      );
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text>No se encontró la información del paciente</Text>
      </View>
    );
  }

  // Separar medicaciones por estado
  const activeMedications = patient.medications.filter(
    (med: any) => med.status === "active"
  );
  const completedMedications = patient.medications.filter(
    (med: any) => med.status === "completed"
  );
  const cancelledMedications = patient.medications.filter(
    (med: any) => med.status === "cancelled"
  );

  // Función para obtener el nombre de una medicación
  const getMedicationName = (medicationId: number) => {
    const med = patient.medications.find((m: any) => m.id === medicationId);
    return med ? med.name : "Desconocido";
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Información del paciente con botón de eliminar */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.patientHeaderRow}>
              <View style={styles.patientInfo}>
                <Title style={styles.patientName}>{patient.name}</Title>
                <Paragraph style={styles.species}>
                  Especie: {patient.species}
                </Paragraph>
                <Paragraph>
                  Asistente: {patient.assistant_name || "No asignado"}
                </Paragraph>
              </View>

              {/* Botón de eliminar */}
              <Button
                icon="delete"
                mode="outlined"
                onPress={() => setDeleteDialogVisible(true)}
                color="#D32F2F"
                style={styles.deleteButton}
              >
                Eliminar
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Dosis pendientes */}
        <View style={styles.section}>
          <Headline style={styles.sectionTitle}>Próximas dosis</Headline>

          {pendingDoses.length === 0 ? (
            <Text style={styles.emptyMessage}>No hay dosis pendientes</Text>
          ) : (
            pendingDoses.map((dose: any) => (
              <DoseItem
                key={dose.id}
                dose={dose}
                medicationName={getMedicationName(dose.medication_id)}
                onAdminister={() => fetchData()}
              />
            ))
          )}
        </View>

        {/* Medicaciones activas */}
        <View style={styles.section}>
          <Headline style={styles.sectionTitle}>
            Tratamientos activos ({activeMedications.length})
          </Headline>

          {activeMedications.length === 0 ? (
            <Text style={styles.emptyMessage}>No hay tratamientos activos</Text>
          ) : (
            activeMedications.map((medication: any) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                onPress={() =>
                  navigation.navigate("MedicationDetails", {
                    patientId: patient.id,
                    medicationId: medication.id,
                  })
                }
                onUpdate={fetchData}
              />
            ))
          )}
        </View>

        {/* Medicaciones completadas */}
        {completedMedications.length > 0 && (
          <View style={styles.section}>
            <Headline style={styles.sectionTitle}>
              Tratamientos completados ({completedMedications.length})
            </Headline>

            {completedMedications.map((medication: any) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                onPress={() =>
                  navigation.navigate("MedicationDetails", {
                    patientId: patient.id,
                    medicationId: medication.id,
                  })
                }
              />
            ))}
          </View>
        )}

        {/* Medicaciones canceladas */}
        {cancelledMedications.length > 0 && (
          <View style={styles.section}>
            <Headline style={styles.sectionTitle}>
              Tratamientos cancelados ({cancelledMedications.length})
            </Headline>

            {cancelledMedications.map((medication: any) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                onPress={() =>
                  navigation.navigate("MedicationDetails", {
                    patientId: patient.id,
                    medicationId: medication.id,
                  })
                }
              />
            ))}
          </View>
        )}

        {/* Notas del paciente */}
        <View style={styles.section}>
          <Headline style={styles.sectionTitle}>
            Notas ({patient.notes.length})
          </Headline>

          {patient.notes.length === 0 ? (
            <Text style={styles.emptyMessage}>No hay notas</Text>
          ) : (
            patient.notes.map((note: any) => (
              <Card key={note.id} style={styles.noteCard}>
                <Card.Content>
                  <Paragraph>{note.content}</Paragraph>
                  <Text style={styles.noteDate}>
                    {format(parseISO(note.created_at), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </Text>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB para agregar medicación */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() =>
          navigation.navigate("NewMedication", { patientId: patient.id })
        }
      />

      {/* Diálogo de confirmación para eliminar paciente */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Eliminar paciente</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              ¿Estás seguro de que deseas eliminar a {patient?.name}? Esta
              acción no se puede deshacer y eliminará todos los tratamientos
              asociados.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancelar
            </Button>
            <Button color="#D32F2F" onPress={handleDeletePatient}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Espacio para el FAB
  },
  card: {
    marginBottom: 16,
  },
  patientHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  species: {
    fontSize: 16,
    marginBottom: 4,
  },
  deleteButton: {
    borderColor: "#D32F2F",
    borderWidth: 1,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 12,
  },
  emptyMessage: {
    textAlign: "center",
    padding: 16,
    color: "#757575",
  },
  noteCard: {
    marginBottom: 8,
    backgroundColor: "#FFF8E1",
  },
  noteDate: {
    fontSize: 12,
    color: "#757575",
    marginTop: 8,
    textAlign: "right",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#00796B",
  },
});

export default PatientDetailsScreen;
