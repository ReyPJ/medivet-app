import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider as PaperProvider } from "react-native-paper";
import { AuthProvider } from "./src/contexts/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import PatientDetailsScreen from "./src/screens/PatientDetailsScreen";
import NewPatientScreen from "./src/screens/NewPatientScreen";
import NewMedicationScreen from "./src/screens/NewMedicationScreen";
import MedicationDetailsScreen from "./src/screens/MedicationDetailsScreen";
import { RootStackParamList } from "./src/navigation/types";
import { appTheme } from "./src/theme/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <PaperProvider theme={appTheme}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                title: "MediVet",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="PatientDetails"
              component={PatientDetailsScreen}
              options={{
                title: "Detalles del Paciente",
              }}
            />
            <Stack.Screen
              name="NewPatient"
              component={NewPatientScreen}
              options={{
                title: "Nuevo Paciente",
              }}
            />
            <Stack.Screen
              name="NewMedication"
              component={NewMedicationScreen}
              options={{
                title: "Nueva Medicación",
              }}
            />
            <Stack.Screen
              name="MedicationDetails"
              component={MedicationDetailsScreen}
              options={{
                title: "Detalles del Tratamiento",
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}
