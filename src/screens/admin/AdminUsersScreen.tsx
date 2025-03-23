import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Searchbar,
  Chip,
  Divider,
  Dialog,
  Portal,
  Paragraph as DialogParagraph,
} from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getUsers, deleteUser } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { RootStackParamList } from "../../navigation/types";
import LoadingSpinner from "../../components/LoadingSpinner";
import { User } from "../../types";

type AdminUsersScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "AdminUsers"
>;

const AdminUsersScreen: React.FC<AdminUsersScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados para el diálogo de confirmación
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
      // Traducción de roles usando switch
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          (user.email &&
            user.email.toLowerCase().includes(query.toLowerCase())) ||
          user.role.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  // Mostrar el diálogo de confirmación
  const showDeleteConfirmation = (userId: number, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setDeleteDialogVisible(true);
  };

  // Confirmar y realizar la eliminación
  const confirmDelete = async () => {
    if (selectedUserId === null) return;

    try {
      await deleteUser(selectedUserId);
      // Cerrar diálogo y resetear estados
      setDeleteDialogVisible(false);
      setSelectedUserId(null);
      setSelectedUsername("");
      // Recargar lista después de eliminar
      loadUsers();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "#D32F2F"; // Rojo
      case "vet":
        return "#2196F3"; // Azul
      case "assistant":
        return "#4CAF50"; // Verde
      default:
        return "#607D8B"; // Gris
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    // No permitir eliminar el propio usuario
    const isSelfUser = item.id === user?.id;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>{item.username}</Title>
            <Chip
              mode="outlined"
              style={[
                styles.roleChip,
                { borderColor: getRoleColor(item.role) },
              ]}
              textStyle={{ color: getRoleColor(item.role) }}
            >
              {item.role}
            </Chip>
          </View>
          <Paragraph>{item.email || "Sin correo"}</Paragraph>
          {item.full_name && <Paragraph>Nombre: {item.full_name}</Paragraph>}
          {item.phone && <Paragraph>Teléfono: {item.phone}</Paragraph>}

          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={() =>
                navigation.navigate("EditUser", { userId: item.id })
              }
              style={[styles.actionButton, styles.editButton]}
            >
              Editar
            </Button>
            <Button
              mode="outlined"
              onPress={() => showDeleteConfirmation(item.id, item.username)}
              style={[styles.actionButton, styles.deleteButton]}
              disabled={isSelfUser}
            >
              {isSelfUser ? "Usuario actual" : "Eliminar"}
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar usuarios"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron usuarios</Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate("CreateUser")}
      />

      {/* Diálogo de confirmación para eliminar usuario */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Eliminar usuario</Dialog.Title>
          <Dialog.Content>
            <DialogParagraph>
              ¿Está seguro que desea eliminar al usuario "{selectedUsername}"?
              Esta acción no se puede deshacer.
            </DialogParagraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancelar
            </Button>
            <Button onPress={confirmDelete} color="#D32F2F">
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Mantener los estilos existentes
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roleChip: {
    height: 34,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  actionButton: {
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    borderColor: "#D32F2F",
    borderWidth: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#757575",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#00796B",
  },
});

export default AdminUsersScreen;
