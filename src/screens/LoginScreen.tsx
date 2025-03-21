import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { TextInput, Button, Text, Headline } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import { RootStackParamList } from "../navigation/types";

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const { login, error, loading, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigation.replace("Home");
    }
  }, [user, navigation]);

  const handleLogin = async () => {
    const success = await login(username, password);
    if (success) {
      navigation.replace("Home");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.logoContainer}>
        <Headline style={styles.title}>MediVet</Headline>
        <Text style={styles.subtitle}>Gestión Veterinaria</Text>
      </View>

      <TextInput
        label={"Usuario"}
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
        mode="outlined"
      />
      <TextInput
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        mode="outlined"
        right={
          <TextInput.Icon
            icon={secureTextEntry ? "eye" : "eye-off"}
            onPress={() => setSecureTextEntry(!secureTextEntry)}
          />
        }
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        mode="contained"
        onPress={handleLogin}
        style={styles.button}
        loading={loading}
        disabled={loading || !username || !password}
      >
        Iniciar Sesión
      </Button>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00796B",
  },
  subtitle: {
    fontSize: 18,
    color: "#00796B",
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
    backgroundColor: "#00796B",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
});

export default LoginScreen;
