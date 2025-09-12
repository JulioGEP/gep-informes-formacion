// src/App.jsx
import React, { useState } from 'react'
import Form from './components/Form.jsx'
import Preview from './components/Preview.jsx'

export default function App() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(null)

  const handleNext = (data) => {
    setDraft(data)
    setStep(1)
  }
  const handleBack = () => setStep(0)

  return (
    <div className="container my-4">
      {step === 0 && <Form initial={draft} onNext={handleNext} />}
      {step === 1 && <Preview draft={draft} onBack={handleBack} />}
    </div>
  )
}
