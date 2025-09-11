import React, { useState } from 'react'
import Formulario from './components/Formulario.jsx'
import Preview from './components/Preview.jsx'

export default function App(){
  const [draft, setDraft] = useState(null)

  return (
    <div>
      <header className="mb-4">
        <h1 className="h3 mb-1">GEP Group — Informes de formación</h1>
        <p className="text-secondary mb-0">
          Rellena el formulario, genera el borrador, edítalo y descárgalo en PDF.
        </p>
      </header>

      {!draft && <Formulario onPreview={setDraft} />}

      {draft && <Preview draft={draft} onBack={()=>setDraft(null)} />}
    </div>
  )
}
