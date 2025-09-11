import React, { useState } from 'react'
import Formulario from './components/Formulario.jsx'
import Preview from './components/Preview.jsx'

export default function App(){
  const [draft, setDraft] = useState(null)

  return (
    <div style={{maxWidth: 980, margin: '0 auto', padding: 24, fontFamily: 'Inter, system-ui, Arial'}}>
      <h1>GEP Group — Informes de formación (v1)</h1>
      <p style={{color:'#555'}}>Rellena el formulario, genera el borrador, edítalo y descárgalo en PDF.</p>

      {!draft && (
        <Formulario onPreview={setDraft} />
      )}

      {draft && (
        <Preview draft={draft} onBack={()=>setDraft(null)} />
      )}
    </div>
  )
}
