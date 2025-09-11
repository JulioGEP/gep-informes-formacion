import React from 'react'
import { jsPDF } from 'jspdf'

export default function Preview({ draft, onBack }){
  const [texto, setTexto] = React.useState(draft?.borrador || '')

  const descargarPDF = () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    const maxWidth = 515

    pdf.setFont('Times','')
    pdf.setFontSize(14)

    const titulo = `GEP Group – ${draft.dealId} – ${draft.datos.cliente} – ${extraerFormacion(draft)} – ${draft.datos.fecha}`
    pdf.text(titulo, margin, margin)

    const lines = pdf.splitTextToSize(texto, maxWidth)
    pdf.text(lines, margin, margin + 24)

    pdf.save(`${titulo}.pdf`)
  }

  return (
    <div style={{display:'grid', gap:12}}>
      <button onClick={onBack}>← Volver al formulario</button>
      <h2>Vista previa (editable)</h2>
      <textarea
        style={{width:'100%', minHeight: '60vh'}}
        value={texto}
        onChange={e=>setTexto(e.target.value)}
      />
      <button onClick={descargarPDF}>Generar PDF</button>
      <small>En esta v1, el formador descargará el PDF y lo enviará manualmente por correo.</small>
    </div>
  )
}

function extraerFormacion(draft){
  const names = (draft?.datos?.productos || []).map(p => p.product?.name).filter(Boolean)
  return names[0] || 'Formación'
}
