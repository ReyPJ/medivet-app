import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
} from "react-native";
import {
  Text,
  FAB,
  IconButton,
  Searchbar,
  List,
  Card,
  Divider,
  Button,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { getPatients } from "../services/api";
import { Patient } from "../types";
import { RootStackParamList } from "../navigation/types";
import PatientItem from "../components/PatientItem";

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSpecies, setExpandedSpecies] = useState<
    Record<string, boolean>
  >({});

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      setFilteredPatients(data);

      // Inicializar secciones expandidas
      const species = Array.from(new Set(data.map((p: Patient) => p.species)));
      const expanded: Record<string, boolean> = {};
      species.forEach((s) => (expanded[s] = true)); // Expandir todas por defecto
      setExpandedSpecies(expanded);
    } catch (error) {
      console.error("Error al cargar la lista de pacientes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Actualizar cuando la pantalla reciba foco o cuando se navegue de vuelta tras eliminar
  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, [
      route.params &&
      typeof route.params === "object" &&
      "refreshTrigger" in route.params
        ? (route.params as { refreshTrigger: unknown }).refreshTrigger
        : null,
    ])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(
        (patient) =>
          patient.name.toLowerCase().includes(query.toLowerCase()) ||
          patient.species.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  };

  const toggleSpecies = (species: string) => {
    setExpandedSpecies({
      ...expandedSpecies,
      [species]: !expandedSpecies[species],
    });
  };

  // Agrupar pacientes por especie
  const getPatientsBySpecies = () => {
    const grouped: Record<string, Patient[]> = {};

    filteredPatients.forEach((patient) => {
      if (!grouped[patient.species]) {
        grouped[patient.species] = [];
      }
      grouped[patient.species].push(patient);
    });

    return grouped;
  };

  const groupedPatients = getPatientsBySpecies();
  const speciesList = Object.keys(groupedPatients).sort();

  const getSpeciesIcon = (species: string) => {
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes("perro")) return "dog";
    if (speciesLower.includes("gato")) return "cat";
    if (speciesLower.includes("ave")) return "bird";
    if (speciesLower.includes("conejo")) return "rabbit";
    if (speciesLower.includes("reptil")) return "lizard";
    if (speciesLower.includes("pez")) return "fish";
    return "paw";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Hola, {user?.username || "Usuario"}
        </Text>
        <View style={styles.headerButtons}>
          {/* Mostrar botón de administración solo para usuarios admin */}
          {user?.role === "admin" && (
            <Button
              icon="account-cog"
              mode="contained"
              onPress={() => navigation.navigate("AdminUsers")}
              style={styles.adminButton}
            >
              Admin
            </Button>
          )}
          <IconButton icon="logout" size={24} onPress={handleLogout} />
        </View>
      </View>

      {/* Barra de búsqueda */}
      <Searchbar
        placeholder="Buscar pacientes"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Lista de especies y pacientes */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <Text>Cargando pacientes...</Text>
          </View>
        ) : speciesList.length > 0 ? (
          speciesList.map((species) => (
            <Card key={species} style={styles.speciesCard}>
              <List.Accordion
                title={`${species} (${groupedPatients[species].length})`}
                expanded={expandedSpecies[species] ?? true}
                onPress={() => toggleSpecies(species)}
                left={(props) => (
                  <List.Icon {...props} icon={getSpeciesIcon(species)} />
                )}
                titleStyle={styles.speciesTitle}
                style={{ paddingLeft: 8 }}
              >
                <Divider />
                {groupedPatients[species].map((patient) => (
                  <PatientItem
                    key={patient.id}
                    patient={patient}
                    inAccordion={true}
                    onPress={() =>
                      navigation.navigate("PatientDetails", {
                        patientId: patient.id,
                      })
                    }
                  />
                ))}
              </List.Accordion>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay pacientes registrados</Text>
          </View>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate("NewPatient")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    elevation: 2,
    marginTop: 40,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminButton: {
    backgroundColor: "#673AB7",
    marginRight: 8,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  searchbar: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Espacio para el FAB
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  speciesCard: {
    marginBottom: 10,
    overflow: "hidden",
  },
  speciesTitle: {
    textTransform: "capitalize",
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#00796B",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#757575",
    fontSize: 16,
  },
});

export default HomeScreen;
