import React, { useContext, useMemo, useState } from "react";
import { AuthContext } from "../App";

const parseCredentials = (rawValue) => {
  const credentials = {};
  let detectedEntries = 0;

  const registerCredential = (email, token) => {
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedToken =
      typeof token === "string" ? token.trim() : token ?? "";

    if (!normalizedEmail || !normalizedToken) {
      return false;
    }

    credentials[normalizedEmail] = normalizedToken;
    return true;
  };

  const raw =
    typeof rawValue === "string"
      ? rawValue
      : rawValue === null || rawValue === undefined
        ? ""
        : String(rawValue);
  const trimmed = raw.trim();

  if (!trimmed) {
    return { credentials, detectedEntries };
  }

  let parsedFromJson = false;

  if (/^[{\[]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (entry && typeof entry === "object") {
            const email =
              entry.email ??
              entry.correo ??
              entry.user ??
              entry.usuario ??
              entry.login ??
              entry.name;
            const token =
              entry.token ??
              entry.password ??
              entry.clave ??
              entry.pass ??
              entry.value;

            if (email !== undefined || token !== undefined) {
              detectedEntries += 1;
              if (email !== undefined && token !== undefined) {
                registerCredential(email, token);
              }
            }
          }
        });
      } else if (parsed && typeof parsed === "object") {
        Object.entries(parsed).forEach(([email, token]) => {
          detectedEntries += 1;
          registerCredential(email, token);
        });
      } else if (typeof parsed === "string") {
        return parseCredentials(parsed);
      }

      parsedFromJson = true;
    } catch (error) {
      parsedFromJson = false;
    }
  }

  if (Object.keys(credentials).length > 0 || (parsedFromJson && detectedEntries > 0)) {
    return { credentials, detectedEntries };
  }

  const entries = trimmed
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  entries.forEach((entry) => {
    const separatorMatch = entry.match(/^([^:=\s]+)\s*[:=]\s*(.+)$/);
    if (separatorMatch) {
      detectedEntries += 1;
      registerCredential(separatorMatch[1], separatorMatch[2]);
      return;
    }

    const spaceIndex = entry.search(/\s/);
    if (spaceIndex !== -1) {
      detectedEntries += 1;
      registerCredential(entry.slice(0, spaceIndex), entry.slice(spaceIndex + 1));
      return;
    }

    if (entry.includes("@")) {
      detectedEntries += 1;
      return;
    }

    detectedEntries += 1;
    registerCredential("*", entry);
  });

  return { credentials, detectedEntries };
};

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  const rawAuthorizedUsers = import.meta.env.VITE_AUTHORIZED_USERS;
  const { credentials, detectedEntries } = useMemo(
    () => parseCredentials(rawAuthorizedUsers),
    [rawAuthorizedUsers],
  );

  const hasRawValue =
    typeof rawAuthorizedUsers === "string" && rawAuthorizedUsers.trim() !== "";
  const hasValidCredentials = Object.keys(credentials).length > 0;
  const hasInvalidFormat = hasRawValue && !hasValidCredentials && detectedEntries > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();

    if (!normalizedEmail || !normalizedToken) {
      setError("Introduce tu correo corporativo y token de acceso.");
      return;
    }

    const storedToken = credentials[normalizedEmail] ?? credentials["*"];

    if (storedToken && storedToken === normalizedToken) {
      login({ email: normalizedEmail });
      setEmail("");
      setToken("");
      setIsTokenVisible(false);
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
            Introduce tu correo corporativo y el token facilitado por el área de Sistemas.
          </p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {!hasRawValue && (
            <div className="alert alert-warning" role="alert">
              No hay credenciales configuradas en el entorno. Contacta con la persona administradora.
            </div>
          )}
          {hasInvalidFormat && (
            <div className="alert alert-warning" role="alert">
              El formato de las credenciales configuradas no es válido. Revisa la variable de entorno
              <code className="ms-1">VITE_AUTHORIZED_USERS</code>.
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
              <div className="input-group">
                <input
                  id="login-token"
                  type={isTokenVisible ? "text" : "password"}
                  className="form-control"
                  autoComplete="current-password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setIsTokenVisible((value) => !value)}
                  aria-label={
                    isTokenVisible ? "Ocultar token de acceso" : "Mostrar token de acceso"
                  }
                  aria-pressed={isTokenVisible}
                  title={isTokenVisible ? "Ocultar token" : "Mostrar token"}
                >
                  <i
                    className={`bi ${isTokenVisible ? "bi-eye-slash" : "bi-eye"}`}
                    aria-hidden="true"
                  ></i>
                  <span className="visually-hidden">
                    {isTokenVisible ? "Ocultar token" : "Mostrar token"}
                  </span>
                </button>
              </div>
              <div className="form-text">
                El token distingue mayúsculas y minúsculas. No lo compartas públicamente.
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={!hasValidCredentials}>
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
