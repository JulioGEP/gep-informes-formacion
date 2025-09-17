import React, { useContext, useMemo, useState } from "react";
import { AuthContext } from "../App";

const DEFAULT_TOKEN = "GEP_Group112";

const resolveAuthorizedToken = () => {
  const envToken = import.meta.env.VITE_ACCESS_TOKEN;

  if (typeof envToken === "string" && envToken.trim().length > 0) {
    return envToken.trim();
  }

  return DEFAULT_TOKEN;
};

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const authorizedToken = useMemo(() => resolveAuthorizedToken(), []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();

    if (!normalizedEmail || !normalizedToken) {
      setError("Introduce tu correo electrónico y el token de acceso.");
      return;
    }

    if (normalizedToken === authorizedToken) {
      login({ email: normalizedEmail });
      setEmail("");
      setToken("");
      return;
    }

    setError("Credenciales no válidas. Revisa la información proporcionada.");
  };

  return (
    <div className="d-flex flex-column align-items-center py-5">
      <div className="card shadow-sm w-100" style={{ maxWidth: 420 }}>
        <div className="card-body">
          <h1 className="h4 mb-3 text-center">Accede a los informes</h1>
          <p className="text-muted small text-center mb-4">
            Introduce tu correo electrónico y el token facilitado por el área de Sistemas.
          </p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <form className="d-grid gap-3" onSubmit={handleSubmit}>
            <div className="d-grid gap-2">
              <label className="form-label" htmlFor="login-email">
                Correo electrónico
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
            <button className="btn btn-primary" type="submit">
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
