// src/components/Preview.jsx
import React from "react";
import logoImg from "../assets/logo-gep.png";

const Preview = ({ data }) => {
  const { titulo = "Informe de Formación", cliente = {}, formador = {}, resumen = "" } = data || {};

  return (
    <div style={styles.page}>
      {/* Header web */}
      <header style={styles.header}>
        <img src={logoImg} alt="GEP Group" style={styles.logo} />
        <div style={styles.headerRight}>
          <h1 style={styles.h1}>{titulo}</h1>
          <p style={styles.subtle}>GEP Group — Formación y Servicios</p>
        </div>
      </header>

      {/* Dos columnas */}
      <div style={styles.row}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Datos del cliente</h2>
          <KV k="Nº Presupuesto" v={cliente.numeroPresupuesto} />
          <KV k="Cliente" v={cliente.cliente} />
          <KV k="CIF" v={cliente.cif} />
          <KV k="Dirección" v={cliente.direccion} />
          <KV k="Sede" v={cliente.sede} />
          <KV k="Persona de contacto" v={cliente.contacto} />
          <KV k="Comercial" v={cliente.comercial} />
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>Datos del formador</h2>
          <KV k="Formador/a" v={nameLang(formador.nombre, formador.idioma)} />
          <KV k="Fecha" v={formador.fecha} />
          <KV k="Sesiones" v={formador.sesiones} />
          <KV k="Nº alumnos" v={formador.alumnos} />
          <KV k="Duración (h)" v={formador.duracionHoras} />
        </section>
      </div>

      <section style={styles.section}>
        <h3 style={styles.h3}>Resumen</h3>
        <p style={styles.p}>{resumen || "—"}</p>
      </section>
    </div>
  );
};

const KV = ({ k, v }) => (
  <div style={styles.kv}>
    <span style={styles.k}>{k}:</span>
    <span style={styles.v}>{v || "—"}</span>
  </div>
);

const nameLang = (n, i) => (n && i ? `${n} (${i})` : n || i || "");

const GREY90 = "#4D4D4D";
const BORDER = "#BDBDBD";

const styles = {
  page: { padding: 24, color: GREY90, fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 },
  header: {
    position: "sticky", top: 0, background: "#fff",
    display: "flex", alignItems: "center", gap: 14,
    padding: "16px 0", borderBottom: `1px solid ${BORDER}`, marginBottom: 12, zIndex: 10,
  },
  logo: { width: 160, height: 46, objectFit: "contain" },
  headerRight: { display: "flex", flexDirection: "column" },
  h1: { fontSize: 18, margin: 0, fontWeight: 700 },
  subtle: { fontSize: 13, margin: "4px 0 0 0" },

  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "stretch" },
  card: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: 14,
    minHeight: 320,
    display: "flex",
    flexDirection: "column",
  },
  h2: { fontSize: 16, margin: "0 0 10px 0" },

  kv: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 8,
    marginBottom: 8,
  },
  k: { fontWeight: 600 },
  v: { },

  section: {
    marginTop: 14,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: 14,
    background: "#fff",
  },
  h3: { margin: "0 0 8px", fontSize: 16 },
  p: { margin: 0, lineHeight: 1.5 },
};

export default Preview;
