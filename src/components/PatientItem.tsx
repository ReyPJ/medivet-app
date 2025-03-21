import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Title, Paragraph, Text, Badge } from "react-native-paper";

interface PatientItemProps {
  patient: any;
  onPress: () => void;
  inAccordion?: boolean; // Nueva prop para ajustar estilos cuando está en un acordeón
}

const PatientItem: React.FC<PatientItemProps> = ({
  patient,
  onPress,
  inAccordion = true,
}) => {
  // Calcular medicaciones pendientes
  const pendingMedications = patient.medications?.filter
    ? patient.medications.filter((med: any) => med.status === "active").length
    : 0;

  return (
    <Card
      style={[styles.card, inAccordion && styles.cardInAccordion]}
      onPress={onPress}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Title>{patient.name}</Title>
          {pendingMedications > 0 && (
            <Badge style={styles.badge}>{pendingMedications}</Badge>
          )}
        </View>
        <Paragraph>Especie: {patient.species}</Paragraph>
        <Paragraph>Raza: {patient.breed || "No especificada"}</Paragraph>
        {patient.assistant_name && (
          <Paragraph>Asignado a: {patient.assistant_name}</Paragraph>
        )}
        <Text
          style={[
            styles.medicationStatus,
            pendingMedications > 0 ? styles.pending : styles.noPending,
          ]}
        >
          {pendingMedications === 0
            ? "✓ Sin tratamientos pendientes"
            : `⏰ ${pendingMedications} tratamiento${
                pendingMedications !== 1 ? "s" : ""
              } activo${pendingMedications !== 1 ? "s" : ""}`}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 12,
    elevation: 2,
  },
  cardInAccordion: {
    marginLeft: 0, // Elimina el margen izquierdo cuando está en un acordeón
    marginRight: 0, // Elimina el margen derecho también
    borderRadius: 0, // Quita bordes redondeados para una apariencia más integrada
  },
  cardContent: {
    paddingHorizontal: 16, // Reduce el padding horizontal predeterminado
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#FF5722",
  },
  medicationStatus: {
    marginTop: 8,
    fontWeight: "500",
  },
  pending: {
    color: "#FF5722",
  },
  noPending: {
    color: "#4CAF50",
  },
});

export default PatientItem;
