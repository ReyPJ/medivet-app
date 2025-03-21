import { MD3LightTheme, MD3Theme } from "react-native-paper";

// Extendemos la interfaz del tema para incluir nuestros colores personalizados
interface ExtendedTheme extends MD3Theme {
  colors: MD3Theme["colors"] & {
    success: string;
    warning: string;
    textSecondary: string;
    notification: string;
    border: string;
  };
}

// Creamos nuestro tema con tipos correctos
export const appTheme: ExtendedTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#00796B", // Verde oscuro (principal)
    secondary: "#4CAF50", // Verde claro (secundario)
    background: "#F5F5F5", // Fondo gris claro
    surface: "#FFFFFF", // Superficie blanca

    // Nuestros colores personalizados
    success: "#2E7D32", // Verde para estados exitosos
    warning: "#F57C00", // Naranja para advertencias
    textSecondary: "#757575", // Texto secundario gris
    notification: "#00796B", // Color para notificaciones
    border: "#E0E0E0", // Color para bordes

    // El resto de colores MD3 se mantienen
  },
  roundness: 8,
};

// Exportamos un hook de utilidad para usar nuestro tema con tipos
export const useExtendedTheme = (): ExtendedTheme => {
  // En una aplicación real, aquí obtendrías el tema actual
  return appTheme;
};
