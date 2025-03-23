import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  RadioButton,
  Snackbar,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createUser } from "../../services/api";
import { RootStackParamList } from "../../navigation/types";

type CreateUserScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "CreateUser"
>;

const CreateUserScreen: React.FC<CreateUserScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(""); // Cambiado de phoneNumber a phone
  const [full_name, setFullName] = useState(""); // Cambiado de fullName a full_name
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("assistant");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = "El nombre de usuario es obligatorio";
    }

    if (!email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Formato de correo electrónico inválido";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!phone.trim()) {
      newErrors.phone = "El número de teléfono es obligatorio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await createUser({
        username,
        email,
        password,
        role,
        full_name, // Nombre correcto según la API
        phone, // Nombre correcto según la API
      });

      setSnackbarMessage("Usuario creado exitosamente");
      setSnackbarVisible(true);

      // Limpiar el formulario
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("assistant");
      setFullName("");
      setPhone("");

      // Regresar a la lista de usuarios después de un breve retraso
      setTimeout(() => {
        navigation.navigate("AdminUsers");
      }, 1500);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      setSnackbarMessage("Error al crear usuario. Inténtalo nuevamente.");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Crear Nuevo Usuario" />
        <Card.Content>
          <TextInput
            label="Nombre de Usuario"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            error={!!errors.username}
          />
          {errors.username && (
            <HelperText type="error">{errors.username}</HelperText>
          )}

          <TextInput
            label="Nombre Completo"
            value={full_name}
            onChangeText={setFullName}
            style={styles.input}
            error={!!errors.full_name}
          />

          <TextInput
            label="Número de Teléfono (agregar +506)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            error={!!errors.phone}
          />
          {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}

          <TextInput
            label="Correo Electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            error={!!errors.email}
          />
          {errors.email && <HelperText type="error">{errors.email}</HelperText>}

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            error={!!errors.password}
          />
          {errors.password && (
            <HelperText type="error">{errors.password}</HelperText>
          )}

          <TextInput
            label="Confirmar Contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            error={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <HelperText type="error">{errors.confirmPassword}</HelperText>
          )}

          <Text style={styles.roleLabel}>Rol</Text>
          <RadioButton.Group
            onValueChange={(value) => setRole(value)}
            value={role}
          >
            <View style={styles.roleOption}>
              <RadioButton value="admin" />
              <Text>Administrador</Text>
            </View>
            <View style={styles.roleOption}>
              <RadioButton value="vet" />
              <Text>Veterinario</Text>
            </View>
            <View style={styles.roleOption}>
              <RadioButton value="assistant" />
              <Text>Asistente</Text>
            </View>
          </RadioButton.Group>

          <View style={styles.buttonsContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={[styles.button, styles.submitButton]}
            >
              Crear Usuario
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  roleLabel: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    backgroundColor: "#00796B",
  },
});

export default CreateUserScreen;
