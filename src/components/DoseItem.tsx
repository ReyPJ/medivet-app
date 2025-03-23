import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button, Card } from "react-native-paper";
import { Dose } from "../types";
import { format } from "date-fns";
import { useExtendedTheme } from "../theme/theme";
import { administerDose } from "../services/api";

interface DoseItemProps {
  dose: Dose;
  onAdminister?: (dose: Dose) => void;
  medicationName?: string;
}

export const DoseItem: React.FC<DoseItemProps> = ({ dose, onAdminister }) => {
  const theme = useExtendedTheme(); // Usamos nuestro hook personalizado
  const scheduledTime = new Date(dose.scheduled_time);
  const currentTime = new Date();

  // Permitimos administrar 5 minutos antes de la hora programada como máximo
  const canAdminister =
    dose.status === "pending" &&
    (currentTime >= scheduledTime ||
      scheduledTime.getTime() - currentTime.getTime() < 5 * 60 * 1000);

  const adminDose = async () => {
    try {
      await administerDose(dose.id);
      onAdminister && onAdminister(dose);
    } catch (error) {
      console.error("Error al administrar dosis:", error);
    }
  };

  // Texto de estado según condiciones
  const getStatusText = () => {
    if (dose.status === "administered") {
      return "Administrada";
    } else if (dose.status === "missed") {
      return "Omitida";
    } else if (canAdminister) {
      return "Pendiente - Lista para administrar";
    } else {
      // Calcular el tiempo restante en minutos
      const timeRemainingMinutes = Math.floor(
        (scheduledTime.getTime() - currentTime.getTime()) / (60 * 1000)
      );

      // Convertir a formato de horas y minutos
      if (timeRemainingMinutes < 60) {
        // Menos de una hora
        return `Pendiente - Faltan ${timeRemainingMinutes} ${
          timeRemainingMinutes === 1 ? "minuto" : "minutos"
        }`;
      } else {
        // Más de una hora
        const hours = Math.floor(timeRemainingMinutes / 60);
        const minutes = timeRemainingMinutes % 60;

        if (minutes === 0) {
          // Horas exactas
          return `Pendiente - Faltan ${hours} ${
            hours === 1 ? "hora" : "horas"
          }`;
        } else {
          // Horas y minutos
          return `Pendiente - Faltan ${hours} ${
            hours === 1 ? "hora" : "horas"
          } y ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
        }
      }
    }
  };

  // Color del estado
  const getStatusColor = () => {
    if (dose.status === "administered") {
      return theme.colors.success;
    } else if (canAdminister) {
      return theme.colors.primary;
    } else {
      return theme.colors.secondary || theme.colors.primary;
    }
  };

  return (
    <Card style={styles.container} mode="elevated">
      <Card.Content style={styles.cardContent}>
        <View style={styles.infoContainer}>
          <Text style={[styles.time, { color: theme.colors.onSurface }]}>
            {format(scheduledTime, "HH:mm")}
          </Text>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {dose.notes && (
            <Text style={[styles.notes, { color: theme.colors.textSecondary }]}>
              Notas: {dose.notes}
            </Text>
          )}
        </View>

        {dose.status === "pending" && (
          <Button
            mode="contained"
            icon="needle"
            onPress={adminDose}
            disabled={!canAdminister}
            style={[
              styles.button,
              {
                opacity: canAdminister ? 1 : 0.7,
                backgroundColor: canAdminister
                  ? theme.colors.primary
                  : theme.colors.surfaceDisabled,
              },
            ]}
          >
            {canAdminister ? "Administrar" : "Esperar"}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  time: {
    fontSize: 18,
    fontWeight: "bold",
  },
  status: {
    fontSize: 14,
    marginTop: 2,
  },
  notes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  button: {
    marginLeft: 8,
  },
});
