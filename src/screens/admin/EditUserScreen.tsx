import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
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
import { getUserById, updateUser } from "../../services/api";
import { RootStackParamList } from "../../navigation/types";
import LoadingSpinner from "../../components/LoadingSpinner";
import { User } from "../../types";

type EditUserScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "EditUser"
>;

const EditUserScreen: React.FC<EditUserScreenProps> = ({
  route,
  navigation,
}) => {
  const { userId } = route.params;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [full_name, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setInitialLoading(true);
        const userData = await getUserById(userId);
        setUser(userData);
        setUsername(userData.username || "");
        setEmail(userData.email || "");
        setPhone(userData.phone || "");
        setFullName(userData.full_name || "");
        setRole(userData.role || "");
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
        Alert.alert("Error", "No se pudo cargar la información del usuario");
        navigation.goBack();
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

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

    // Solo validar contraseña si se está actualizando
    if (password) {
      if (password.length < 6) {
        newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      }
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

      type UserData = {
        username: string;
        email: string;
        role: string;
        phone: string;
        full_name: string;
        password?: string;
      };
      const userData: UserData = {
        username,
        email,
        role,
        phone,
        full_name,
      };

      // Solo incluir contraseña si se ha especificado una nueva
      if (password) {
        userData.password = password;
      }

      await updateUser(userId, userData);

      setSnackbarMessage("Usuario actualizado exitosamente");
      setSnackbarVisible(true);

      // Regresar a la lista después de un breve retraso
      setTimeout(() => {
        navigation.navigate("AdminUsers");
      }, 1500);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      setSnackbarMessage("Error al actualizar usuario. Inténtalo nuevamente.");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title={`Editar Usuario: ${user?.username}`} />
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
          />

          <TextInput
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />

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
            label="Nueva Contraseña (dejar en blanco para no cambiar)"
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
            label="Confirmar Nueva Contraseña"
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
              Actualizar
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

export default EditUserScreen;
