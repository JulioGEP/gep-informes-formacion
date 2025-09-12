// src/App.jsx
import React, { useState } from "react";
import Form from "./components/Form";
import Preview from "./components/Preview";

export default function App() {
  const [step, setStep] = useState("form");  // "form" | "preview"
  const [payload, setPayload] = useState(null);

  return (
    <div className="container py-4">
      {step === "form" ? (
        <Form
          initial={payload}
          onNext={(data) => {
            setPayload(data);
            setStep("preview");
          }}
        />
      ) : (
        <Preview
          data={payload}
          onBack={() => setStep("form")}
        />
      )}
    </div>
  );
}
