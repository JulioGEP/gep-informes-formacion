import React, { useState } from 'react'
import Formulario from './components/Formulario.jsx'
import Preview from './components/Preview.jsx'
import logoUrl from './assets/logo-gep.png'

export default function App(){
  // Guardamos el último payload para NO perder datos al volver
  const [lastPayload, setLastPayload] = useState(null)
  const [draft, setDraft] = useState(null)

  const handlePreview = (payloadConBorrador) => {
    setLastPayload({
      dealId: payloadConBorrador.dealId,
      formador: payloadConBorrador.formador,
      datos: payloadConBorrador.datos
    })
    setDraft(payloadConBorrador) // { dealId, formador, datos, borrador }
  }

  return (
    <div>
      <header className="d-flex align-items-center gap-3 mb-4">
        <img src={logoUrl} alt="GEP Group" style={{ width: 44, height: 'auto' }} />
        <div>
          <h1 className="h4 mb-0">Informes de formación</h1>
          <small className="text-secondary">GEP Group</small>
        </div>
      </header>

      {!draft && (
        <Formulario onPreview={handlePreview} initial={lastPayload} />
      )}

      {draft && (
        <Preview
          draft={draft}
          onBack={() => setDraft(null)}     // volvemos sin perder state (se mantiene en lastPayload)
        />
      )}
    </div>
  )
}
