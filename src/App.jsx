// src/App.jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import Form from "./components/Form";
import Preview from "./components/Preview";
import Home from "./components/Home";
import Login from "./components/Login";

export const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

const AUTH_STORAGE_KEY = "gep-informes-auth";

export default function App() {
  const [authState, setAuthState] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            return {
              isAuthenticated: Boolean(parsed.isAuthenticated),
              user: parsed.user || null,
            };
          }
        } catch (error) {
          console.warn("No se pudo recuperar el estado de autenticación almacenado", error);
        }
      }
    }
    return { isAuthenticated: false, user: null };
  });
  const [screen, setScreen] = useState('home');
  const [formacion, setFormacion] = useState(null);
  const [simulacro, setSimulacro] = useState(null);
  const [preventivo, setPreventivo] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (authState.isAuthenticated) {
        window.sessionStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            isAuthenticated: authState.isAuthenticated,
            user: authState.user,
          }),
        );
      } else {
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, [authState]);

  const login = useCallback((userData) => {
    setAuthState({ isAuthenticated: true, user: userData });
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, user: null });
    setScreen('home');
    setFormacion(null);
    setSimulacro(null);
    setPreventivo(null);
  }, []);

  const authValue = useMemo(() => ({
    ...authState,
    login,
    logout,
  }), [authState, login, logout]);

  return (
    <AuthContext.Provider value={authValue}>
      <div className="container py-4">
        {authState.isAuthenticated ? (
          <>
            <div className="d-flex justify-content-end align-items-center gap-3 mb-4">
              <small className="text-muted mb-0">
                Sesión iniciada como <strong>{authState.user?.email}</strong>
              </small>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
            {screen === 'home' && (
              <Home onSelect={(tipo) => setScreen(`${tipo}-form`)} />
            )}
            {screen === 'formacion-form' && (
              <Form
                initial={formacion}
                title="Informe de Formación"
                type="formacion"
                onChooseAnother={() => setScreen('home')}
                onNext={(data) => {
                  setFormacion(data);
                  setScreen('formacion-preview');
                }}
              />
            )}
            {screen === 'formacion-preview' && (
              <Preview
                data={formacion}
                title="Informe de Formación"
                type="formacion"
                onBack={() => setScreen('formacion-form')}
              />
            )}
            {screen === 'simulacro-form' && (
              <Form
                initial={simulacro}
                title="Informe de Simulacro"
                type="simulacro"
                onChooseAnother={() => setScreen('home')}
                onNext={(data) => {
                  setSimulacro(data);
                  setScreen('simulacro-preview');
                }}
              />
            )}
            {screen === 'simulacro-preview' && (
              <Preview
                data={simulacro}
                title="Informe de Simulacro"
                type="simulacro"
                onBack={() => setScreen('simulacro-form')}
              />
            )}
            {screen === 'preventivo-form' && (
              <Form
                initial={preventivo}
                title="Informe de Preventivos"
                type="preventivo"
                onChooseAnother={() => setScreen('home')}
                onNext={(data) => {
                  setPreventivo(data);
                  setScreen('preventivo-preview');
                }}
              />
            )}
            {screen === 'preventivo-preview' && (
              <Preview
                data={preventivo}
                title="Informe de Preventivos"
                type="preventivo"
                onBack={() => setScreen('preventivo-form')}
              />
            )}
          </>
        ) : (
          <Login />
        )}
      </div>
    </AuthContext.Provider>
  );
}
