// src/App.jsx
import React, { useState } from "react";
import Form from "./components/Form";
import Preview from "./components/Preview";
import Home from "./components/Home";

export default function App() {
  const [screen, setScreen] = useState('home');
  const [formacion, setFormacion] = useState(null);
  const [simulacro, setSimulacro] = useState(null);
  const [preventivo, setPreventivo] = useState(null);

  return (
    <div className="container py-4">
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
          title="Informe de Preventivo"
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
          title="Informe de Preventivo"
          type="preventivo"
          onBack={() => setScreen('preventivo-form')}
        />
      )}
    </div>
  );
}
