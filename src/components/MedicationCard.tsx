import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Card,
  Text,
  Paragraph,
  Button,
  ProgressBar,
  Badge,
  Dialog,
  Portal,
} from "react-native-paper";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Medication } from "../types";
import { cancelMedication } from "../services/api";

interface MedicationCardProps {
  medication: Medication;
  onPress?: () => void;
  onUpdate?: () => void;
}

const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  onPress,
  onUpdate,
}) => {
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "#4CAF50"; // Green
      case "completed":
        return "#2196F3"; // Blue
      case "cancelled":
        return "#F44336"; // Red
      default:
        return "#9E9E9E"; // Grey
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "active":
        return "Activo";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return "Desconocido";
    }
  };

  const calculateProgress = (): number => {
    const totalDoses = medication.doses.length;
    if (totalDoses === 0) return 0;

    const administeredDoses = medication.doses.filter(
      (dose) => dose.status === "administered"
    ).length;
    return administeredDoses / totalDoses;
  };

  const findNextPendingDose = () => {
    return medication.doses.find((dose) => dose.status === "pending");
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      await cancelMedication(medication.id);
      setConfirmDialogVisible(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error al cancelar medicación:", error);
    } finally {
      setLoading(false);
    }
  };

  const progress = calculateProgress();
  const nextDose = findNextPendingDose();

  return (
    <>
      <Card style={styles.card} onPress={onPress}>
        <Card.Content>
          <View style={styles.header}>
            <Text style={styles.title}>{medication.name}</Text>
            <Badge
              style={[
                styles.badge,
                { backgroundColor: getStatusColor(medication.status) },
              ]}
            >
              {getStatusText(medication.status)}
            </Badge>
          </View>

          <Paragraph style={styles.dosage}>
            Dosis: {medication.dosage}
          </Paragraph>
          <Paragraph style={styles.frequency}>
            Frecuencia: cada {medication.frequency} horas
          </Paragraph>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text>Progreso</Text>
              <Text>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar
              progress={progress}
              color={"#00796B"}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.details}>
            <Text style={styles.detailText}>
              Inicio: {formatDate(medication.start_time)}
            </Text>
            <Text style={styles.detailText}>
              Duración: {medication.duration_days} días
            </Text>
          </View>

          {nextDose && medication.status === "active" && (
            <View style={styles.nextDose}>
              <Text style={styles.nextDoseText}>
                Próxima dosis: {formatDate(nextDose.scheduled_time)}
              </Text>
            </View>
          )}
        </Card.Content>

        {medication.status === "active" && (
          <Card.Actions>
            <Button
              mode="outlined"
              onPress={() => setConfirmDialogVisible(true)}
              style={styles.cancelButton}
            >
              Cancelar Tratamiento
            </Button>
          </Card.Actions>
        )}
      </Card>

      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={() => setConfirmDialogVisible(false)}
        >
          <Dialog.Title>Confirmar cancelación</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              ¿Estás seguro de que deseas cancelar este tratamiento? Todas las
              dosis pendientes se marcarán como omitidas.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)}>No</Button>
            <Button
              mode="contained"
              onPress={handleCancel}
              loading={loading}
              disabled={loading}
              color="#F44336"
            >
              Sí, Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
  },
  dosage: {
    fontSize: 14,
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressSection: {
    marginVertical: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  details: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailText: {
    fontSize: 12,
    color: "#757575",
  },
  nextDose: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    padding: 8,
    borderRadius: 4,
  },
  nextDoseText: {
    color: "#2E7D32",
    fontWeight: "bold",
    textAlign: "center",
  },
  cancelButton: {
    borderColor: "#F44336",
    color: "#F44336",
  },
});

export default MedicationCard;
