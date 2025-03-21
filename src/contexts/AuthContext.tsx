import React, { createContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin } from "../services/api";
import { User, AuthState } from "../types";

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadToken() {
      try {
        const savedToken = await SecureStore.getItemAsync("token");
        const savedUser = await SecureStore.getItemAsync("user");

        if (savedToken && savedUser) {
          setAuthState({
            token: savedToken,
            user: JSON.parse(savedUser),
            loading: false,
            error: null,
          });
        } else {
          setAuthState((prevState) => ({ ...prevState, loading: false }));
        }
      } catch (e) {
        console.error("Error loading auth token", e);
        setAuthState((prevState) => ({
          ...prevState,
          loading: false,
          error: "Error al cargar la sesión",
        }));
      }
    }

    loadToken();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setAuthState((prevState) => ({ ...prevState, loading: true, error: null }));

    try {
      const response = await apiLogin(username, password);

      if (response.access_token) {
        const userObj: User = response.user || {
          id: 0,
          username: username,
          role: "assistant",
        };

        await SecureStore.setItemAsync("token", response.access_token);
        await SecureStore.setItemAsync("user", JSON.stringify(userObj));

        setAuthState({
          token: response.access_token,
          user: userObj,
          loading: false,
          error: null,
        });
        return true;
      } else {
        setAuthState((prevState) => ({
          ...prevState,
          loading: false,
          error: "Error al iniciar sesión",
        }));
        return false;
      }
    } catch (e) {
      const error = e as Error;
      setAuthState((prevState) => ({
        ...prevState,
        loading: false,
        error: error.message || "Error al iniciar sesión",
      }));
      return false;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("user");
      setAuthState({
        user: null,
        token: null,
        loading: false,
        error: null,
      });
    } catch (e) {
      console.error("Error logging out", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
