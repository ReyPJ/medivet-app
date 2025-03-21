import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Divider,
  Headline,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getPatientDetails, cancelMedication } from "../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DoseItem } from "../components/DoseItem";
import LoadingSpinner from "../components/LoadingSpinner";
import { RootStackParamList } from "../navigation/types";

type MedicationDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "MedicationDetails"
>;

const MedicationDetailsScreen: React.FC<MedicationDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { patientId, medicationId } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [medication, setMedication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getPatientDetails(patientId);
      setPatient(data);

      const med = data.medications.find((m: any) => m.id === medicationId);
      if (med) {
        setMedication(med);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId, medicationId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCancelMedication = async () => {
    try {
      await cancelMedication(medicationId);
      await fetchData();
    } catch (error) {
      console.error("Error al cancelar medicación:", error);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  if (!medication || !patient) {
    return (
      <View style={styles.container}>
        <Text>No se encontró la información de la medicación</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Volver
        </Button>
      </View>
    );
  }

  // Agrupar dosis por estado
  const pendingDoses = medication.doses.filter(
    (dose: any) => dose.status === "pending"
  );
  const administeredDoses = medication.doses.filter(
    (dose: any) => dose.status === "administered"
  );
  const missedDoses = medication.doses.filter(
    (dose: any) => dose.status === "missed"
  );

  // Calcular progreso
  const totalDoses = medication.doses.length;
  const progress =
    totalDoses > 0
      ? Math.round((administeredDoses.length / totalDoses) * 100)
      : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title style={styles.medicationName}>{medication.name}</Title>
          <Paragraph style={styles.dosage}>
            Dosis: {medication.dosage}
          </Paragraph>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Frecuencia:</Text>
              <Text style={styles.value}>
                Cada {medication.frequency} horas
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Duración:</Text>
              <Text style={styles.value}>{medication.duration_days} días</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Inicio:</Text>
              <Text style={styles.value}>
                {formatDate(medication.start_time)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.label}>Estado:</Text>
              <Text
                style={[
                  styles.value,
                  {
                    color:
                      medication.status === "active"
                        ? "#4CAF50"
                        : medication.status === "completed"
                        ? "#2196F3"
                        : "#F44336",
                  },
                ]}
              >
                {medication.status === "active"
                  ? "Activo"
                  : medication.status === "completed"
                  ? "Completado"
                  : "Cancelado"}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Progreso: {progress}%</Text>
            <Text style={styles.progressDetails}>
              {administeredDoses.length} de {totalDoses} dosis administradas
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          </View>
        </Card.Content>

        {medication.status === "active" && (
          <Card.Actions>
            <Button
              mode="outlined"
              onPress={handleCancelMedication}
              style={styles.cancelButton}
            >
              Cancelar Tratamiento
            </Button>
          </Card.Actions>
        )}
      </Card>

      {pendingDoses.length > 0 && (
        <View style={styles.section}>
          <Headline style={styles.sectionTitle}>
            Dosis pendientes ({pendingDoses.length})
          </Headline>
          {pendingDoses.map((dose: any) => (
            <DoseItem
              key={dose.id}
              dose={dose}
              medicationName={medication.name}
              onAdminister={fetchData}
            />
          ))}
        </View>
      )}

      {administeredDoses.length > 0 && (
        <View style={styles.section}>
          <Headline style={styles.sectionTitle}>
            Dosis administradas ({administeredDoses.length})
          </Headline>
          {administeredDoses.map((dose: any) => (
            <DoseItem
              key={dose.id}
              dose={dose}
              medicationName={medication.name}
            />
          ))}
        </View>
      )}

      {missedDoses.length > 0 && (
        <View style={styles.section}>
          <Headline style={styles.sectionTitle}>
            Dosis omitidas ({missedDoses.length})
          </Headline>
          {missedDoses.map((dose: any) => (
            <DoseItem
              key={dose.id}
              dose={dose}
              medicationName={medication.name}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  dosage: {
    fontSize: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: "#757575",
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
  },
  progressContainer: {
    marginTop: 16,
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  progressDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: "#F44336",
    color: "#F44336",
  },
});

export default MedicationDetailsScreen;
