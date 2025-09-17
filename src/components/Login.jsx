import React, { useContext, useMemo, useState } from "react";
import { AuthContext } from "../App";

const parseCredentials = (rawValue) => {
  if (!rawValue || typeof rawValue !== "string") {
    if (import.meta.env.DEV) {
      console.warn(
        "[Login] No se encontraron credenciales definidas en VITE_AUTHORIZED_USERS.",
      );
    }
    return {};
  }

  const parsed = rawValue
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const email = entry.slice(0, separatorIndex).trim().toLowerCase();
      const token = entry.slice(separatorIndex + 1).trim();

      if (email && token) {
        accumulator[email] = token;
      }

      return accumulator;
    }, {});

  if (import.meta.env.DEV && Object.keys(parsed).length === 0) {
    console.warn(
      "[Login] No se encontraron credenciales válidas en VITE_AUTHORIZED_USERS.",
    );
  }

  return parsed;
};

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const credentials = useMemo(
    () => parseCredentials(import.meta.env.VITE_AUTHORIZED_USERS),
    [],
  );

  const isConfigured = Object.keys(credentials).length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();

    if (!normalizedEmail || !normalizedToken) {
      setError("Introduce tu correo corporativo y token de acceso.");
      return;
    }

    const storedToken = credentials[normalizedEmail];

    if (storedToken && storedToken === normalizedToken) {
      login({ email: normalizedEmail });
      setEmail("");
      setToken("");
      return;
    }

    setError("Si has olvidado la contraseña ponte en contacto con Jaime para que la den.");
  };

  return (
    <div className="d-flex flex-column align-items-center py-5">
      <div className="card shadow-sm w-100" style={{ maxWidth: 420 }}>
        <div className="card-body">
          <h1 className="h4 mb-3 text-center">Accede a los informes</h1>
          <p className="text-muted small text-center mb-4">
            Introduce tu correo corporativo y el token facilitado por el área de Sistemas.
          </p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {!isConfigured && (
            <div className="alert alert-warning" role="alert">
              No hay credenciales configuradas en el entorno. Si necesitas acceso, ponte en contacto con Jaime.
            </div>
          )}
          <form className="d-grid gap-3" onSubmit={handleSubmit}>
            <div className="d-grid gap-2">
              <label className="form-label" htmlFor="login-email">
                Correo corporativo
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="d-grid gap-2">
              <label className="form-label" htmlFor="login-token">
                Token de acceso
              </label>
              <input
                id="login-token"
                type="password"
                className="form-control"
                autoComplete="current-password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
              <div className="form-text">
                El token distingue mayúsculas y minúsculas. No lo compartas públicamente.
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={!isConfigured}>
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
