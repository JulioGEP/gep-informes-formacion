import React, { useContext, useMemo, useState } from "react";
import { AuthContext } from "../App";

const DEFAULT_TOKEN = "GEP_Group112";

const normalizeToken = (token) =>
  typeof token === "string"
    ? token
        .trim()
        .replace(/^"|"$/g, "")
    : "";

const resolveAuthorizedTokens = () => {
  const envTokens = import.meta.env.VITE_AUTHORIZED_USERS;

  if (typeof envTokens !== "string") {
    return [DEFAULT_TOKEN];
  }

  const trimmed = envTokens.trim();

  if (!trimmed) {
    return [DEFAULT_TOKEN];
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      const tokens = parsed
        .map((entry) =>
          typeof entry === "string"
            ? normalizeToken(entry)
            : typeof entry?.token === "string"
            ? normalizeToken(entry.token)
            : null,
        )
        .filter(Boolean);

      if (tokens.length > 0) {
        return [...new Set(tokens)];
      }
    }

    if (parsed && typeof parsed === "object") {
      const tokens = Object.values(parsed)
        .map((value) =>
          typeof value === "string"
            ? normalizeToken(value)
            : Array.isArray(value)
            ? value
                .map((nested) =>
                  typeof nested === "string"
                    ? normalizeToken(nested)
                    : null,
                )
                .filter(Boolean)
            : null,
        )
        .flat()
        .filter(Boolean);

      if (tokens.length > 0) {
        return [...new Set(tokens)];
      }
    }
  } catch (error) {
    // El valor no es JSON: continuamos con el resto de formatos soportados.
  }

  const tokens = trimmed
    .split(/[\n,;]+/)
    .map((entry) => normalizeToken(entry))
    .filter(Boolean);

  if (tokens.length === 0) {
    return [DEFAULT_TOKEN];
  }

  return [...new Set(tokens)];
};

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const authorizedTokens = useMemo(() => resolveAuthorizedTokens(), []);
  const hasCustomTokens = useMemo(() => {
    const rawTokens = import.meta.env.VITE_AUTHORIZED_USERS;
    return typeof rawTokens === "string" && rawTokens.trim().length > 0;
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = normalizeToken(token);

    if (!normalizedEmail || !normalizedToken) {
      setError("Introduce tu correo electrónico y el token de acceso.");
      return;
    }

    if (authorizedTokens.includes(normalizedToken)) {
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
          {!hasCustomTokens && (
            <div className="alert alert-warning" role="alert">
              No se encontraron tokens configurados en <code>VITE_AUTHORIZED_USERS</code>. Se usará el token
              predeterminado <strong>{DEFAULT_TOKEN}</strong>.
            </div>
          )}
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
