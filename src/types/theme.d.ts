import "@react-native-paper/react-native-paper";

declare module "@react-native-paper/react-native-paper" {
  interface MD3Colors {
    // Tus colores personalizados
    success: string;
    warning: string;
    textSecondary: string;
    notification: string;
    card: string;
    border: string;
    // Nota: 'disabled' ya existe en MD3Colors, no es necesario redeclararlo
  }
}

// Esto es para asegurar que el archivo se trate como un módulo
export {};
