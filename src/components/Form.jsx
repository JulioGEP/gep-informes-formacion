// src/components/Form.jsx
import React from "react";
import logoImg from "../assets/logo-gep.png";

const Form = ({ values, onChange, onSubmit }) => {
  return (
    <div style={styles.page}>
      {/* Header web */}
      <header style={styles.header}>
        <img src={logoImg} alt="GEP Group" style={styles.logo} />
        <div style={styles.headerRight}>
          <h1 style={styles.h1}>Informe de Formación</h1>
          <p style={styles.subtle}>GEP Group — Formación y Servicios</p>
        </div>
      </header>

      {/* Cards en 2 columnas */}
      <div style={styles.row}>
        {/* Cliente */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Datos del cliente</h2>
          <Field id="numeroPresupuesto" label="Nº Presupuesto" values={values} onChange={onChange}/>
          <Field id="cliente" label="Cliente" values={values} onChange={onChange}/>
          <Field id="cif" label="CIF" values={values} onChange={onChange}/>
          <Field id="direccion" label="Dirección" values={values} onChange={onChange}/>
          <Field id="sede" label="Sede" values={values} onChange={onChange}/>
          <Field id="contacto" label="Persona de contacto" values={values} onChange={onChange}/>
          <Field id="comercial" label="Comercial" values={values} onChange={onChange}/>
        </section>

        {/* Formador */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Datos del formador</h2>
          <Field id="formadorNombre" label="Formador/a" values={values} onChange={onChange}/>
          <Field id="formadorIdioma" label="Idioma" values={values} onChange={onChange}/>
          <Field id="fecha" label="Fecha" type="date" values={values} onChange={onChange}/>
          <Field id="sesiones" label="Sesiones" type="number" values={values} onChange={onChange}/>
          <Field id="alumnos" label="Nº alumnos" type="number" values={values} onChange={onChange}/>
          <Field id="duracionHoras" label="Duración (h)" type="number" values={values} onChange={onChange}/>
        </section>
      </div>

      <div style={styles.actions}>
        <button style={styles.btn} onClick={onSubmit}>Guardar / Previsualizar</button>
      </div>
    </div>
  );
};

const Field = ({ id, label, type="text", values={}, onChange }) => (
  <label htmlFor={id} style={styles.fieldRow}>
    <span style={styles.label}>{label}</span>
    <input
      id={id}
      name={id}
      type={type}
      value={values?.[id] ?? ""}
      onChange={(e) => onChange?.(id, e.target.value)}
      style={styles.input}
    />
  </label>
);

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

  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    alignItems: "stretch",
  },
  card: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: 14,
    minHeight: 320, // asegura misma altura visual
    display: "flex",
    flexDirection: "column",
  },
  h2: { fontSize: 16, margin: "0 0 10px 0" },

  fieldRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  label: { fontWeight: 600, fontSize: 13 },
  input: {
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
  },

  actions: { marginTop: 16, display: "flex", justifyContent: "flex-end" },
  btn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: GREY90,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default Form;
