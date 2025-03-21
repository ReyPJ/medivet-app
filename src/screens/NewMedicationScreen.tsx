import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  TextInput,
  Button,
  Text,
  Headline,
  Divider,
  Modal,
  Portal,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { format, addHours } from "date-fns";
import { RootStackParamList } from "../navigation/types";
import { addMedication } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Picker } from "@react-native-picker/picker";

type NewMedicationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "NewMedication"
>;

const NewMedicationScreen: React.FC<NewMedicationScreenProps> = ({
  route,
  navigation,
}) => {
  const { patientId } = route.params;
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para modal de selección de fecha/hora
  const [dateTimeModalVisible, setDateTimeModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempHours, setTempHours] = useState(startTime.getHours());
  const [tempMinutes, setTempMinutes] = useState(startTime.getMinutes());

  // Calcular el número total de dosis basado en frecuencia y duración
  const calculateTotalDoses = () => {
    const freq = parseFloat(frequency);
    const days = parseFloat(durationDays);

    if (!isNaN(freq) && !isNaN(days) && freq > 0 && days > 0) {
      return Math.floor((days * 24) / freq);
    }
    return 0;
  };

  const totalDoses = calculateTotalDoses();

  // Generar arrays para los selectores
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Array de meses
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  // Obtener el año actual y los próximos 5 años
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const showDateTimeModal = () => {
    setTempDate(new Date(startTime)); // Copiar la fecha actual
    setTempHours(startTime.getHours());
    setTempMinutes(startTime.getMinutes());
    setDateTimeModalVisible(true);
  };

  const hideDateTimeModal = () => {
    setDateTimeModalVisible(false);
  };

  const confirmDateTime = () => {
    const newDate = new Date(tempDate);
    newDate.setHours(tempHours);
    newDate.setMinutes(tempMinutes);
    setStartTime(newDate);
    hideDateTimeModal();
  };

  // Calcular fecha de última dosis
  const calculateLastDoseDate = () => {
    if (totalDoses <= 0 || !frequency) return null;

    // Calcula la última dosis basada en la primera dosis + (número de dosis - 1) * frecuencia
    return addHours(startTime, (totalDoses - 1) * parseFloat(frequency));
  };

  const handleCreateMedication = async () => {
    if (!name || !dosage || !frequency || !durationDays) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos");
      return;
    }

    const frequencyNum = parseFloat(frequency);
    const durationNum = parseFloat(durationDays);

    if (isNaN(frequencyNum) || frequencyNum <= 0) {
      Alert.alert("Error", "La frecuencia debe ser un número mayor que cero");
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert("Error", "La duración debe ser un número mayor que cero");
      return;
    }

    try {
      setIsSubmitting(true);

      const formattedStartTime = format(startTime, "yyyy-MM-dd HH:mm:ss");

      const medicationData = {
        name,
        dosage,
        frequency: frequencyNum,
        start_time: formattedStartTime,
        duration_days: durationNum,
        patient_id: patientId,
      };

      console.log(
        "Enviando medicacion con hora de inicio:",
        formattedStartTime
      );

      await addMedication(medicationData);

      Alert.alert("Éxito", "Medicación creada correctamente", [
        {
          text: "OK",
          onPress: () => navigation.navigate("PatientDetails", { patientId }),
        },
      ]);
    } catch (error) {
      console.error("Error al crear medicación:", error);
      Alert.alert("Error", "No se pudo crear la medicación");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const lastDoseDate = calculateLastDoseDate();

  return (
    <ScrollView style={styles.container}>
      <Headline style={styles.title}>Nueva Medicación</Headline>

      <TextInput
        label="Nombre del medicamento"
        value={name}
        onChangeText={setName}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Dosis"
        value={dosage}
        onChangeText={setDosage}
        style={styles.input}
        mode="outlined"
        placeholder="Ej: 10mg, 1 tableta, etc."
      />

      <TextInput
        label="Frecuencia (horas)"
        value={frequency}
        onChangeText={setFrequency}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
        placeholder="Ej: 12 (cada 12 horas)"
      />

      <TextInput
        label="Duración (días)"
        value={durationDays}
        onChangeText={setDurationDays}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
        placeholder="Ej: 7 (durante 7 días)"
      />

      <Button mode="outlined" onPress={showDateTimeModal} style={styles.input}>
        Hora de inicio: {format(startTime, "dd/MM/yyyy HH:mm")}
      </Button>

      {totalDoses > 0 && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Este tratamiento requerirá {totalDoses} dosis en total,
            administradas cada {frequency} horas durante {durationDays} días.
          </Text>
          <Divider style={styles.divider} />
          <Text>Primera dosis: {format(startTime, "dd/MM/yyyy HH:mm")}</Text>

          {lastDoseDate && (
            <Text>
              Última dosis: {format(lastDoseDate, "dd/MM/yyyy HH:mm")}
            </Text>
          )}
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleCreateMedication}
          loading={isSubmitting}
          disabled={
            isSubmitting ||
            !name ||
            !dosage ||
            !frequency ||
            !durationDays ||
            totalDoses === 0
          }
          style={styles.submitButton}
        >
          Crear Medicación
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
          style={styles.cancelButton}
        >
          Cancelar
        </Button>
      </View>

      {/* Modal para selección de fecha y hora */}
      <Portal>
        <Modal
          visible={dateTimeModalVisible}
          onDismiss={hideDateTimeModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Headline style={styles.modalTitle}>
            Seleccionar fecha y hora
          </Headline>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Día</Text>
              <Picker
                selectedValue={tempDate.getDate()}
                onValueChange={(value) => {
                  const newDate = new Date(tempDate);
                  newDate.setDate(value);
                  setTempDate(newDate);
                }}
                style={styles.picker}
              >
                {days.map((day) => (
                  <Picker.Item
                    key={`day-${day}`}
                    label={day.toString()}
                    value={day}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Mes</Text>
              <Picker
                selectedValue={tempDate.getMonth()}
                onValueChange={(value) => {
                  const newDate = new Date(tempDate);
                  newDate.setMonth(value);
                  setTempDate(newDate);
                }}
                style={styles.picker}
              >
                {months.map((month, index) => (
                  <Picker.Item
                    key={`month-${index}`}
                    label={month}
                    value={index}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Año</Text>
              <Picker
                selectedValue={tempDate.getFullYear()}
                onValueChange={(value) => {
                  const newDate = new Date(tempDate);
                  newDate.setFullYear(value);
                  setTempDate(newDate);
                }}
                style={styles.picker}
              >
                {years.map((year) => (
                  <Picker.Item
                    key={`year-${year}`}
                    label={year.toString()}
                    value={year}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.timePickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hora</Text>
              <Picker
                selectedValue={tempHours}
                onValueChange={setTempHours}
                style={styles.picker}
              >
                {hours.map((hour) => (
                  <Picker.Item
                    key={`hour-${hour}`}
                    label={hour.toString().padStart(2, "0")}
                    value={hour}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Minutos</Text>
              <Picker
                selectedValue={tempMinutes}
                onValueChange={setTempMinutes}
                style={styles.picker}
              >
                {minutes.map((minute) => (
                  <Picker.Item
                    key={`minute-${minute}`}
                    label={minute.toString().padStart(2, "0")}
                    value={minute}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button onPress={hideDateTimeModal} style={styles.modalButton}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={confirmDateTime}
              style={styles.modalButton}
            >
              Confirmar
            </Button>
          </View>
        </Modal>
      </Portal>
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
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  infoContainer: {
    backgroundColor: "#e3f2fd",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  infoText: {
    marginBottom: 8,
    fontSize: 16,
  },
  divider: {
    marginVertical: 8,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  submitButton: {
    marginBottom: 12,
    paddingVertical: 6,
    backgroundColor: "#00796B",
  },
  cancelButton: {
    paddingVertical: 6,
  },
  // Estilos para el modal
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
    fontSize: 18,
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timePickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  pickerLabel: {
    marginBottom: 4,
    fontWeight: "bold",
  },
  picker: {
    width: "100%",
    height: 120,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default NewMedicationScreen;
