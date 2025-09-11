import React from 'react'
import { jsPDF } from 'jspdf'
import logoUrl from '../assets/logo-gep.png'

export default function Preview({ draft, onBack }){
  const [texto, setTexto] = React.useState(draft?.borrador || '')

  // Utilidad: cargar imagen como DataURL para jsPDF
  const loadImageAsDataURL = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })

  const descargarPDF = async () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })

    const marginX = 56
    const headerH = 64
    const contentTop = marginX + headerH // espacio para cabecera
    const maxWidth = 483 // 595pt ancho A4 - 2*56pt margen

    // Cabecera (logo + título) en página actual
    const drawHeader = (logoDataUrl) => {
      // Logo
      const logoW = 90
      const logoH = 90 * 0.42 // aprox. ratio del PNG; ajusta si ves distorsión
      pdf.addImage(logoDataUrl, 'PNG', marginX, marginX - 12, logoW, logoH, undefined, 'FAST')

      // Títulos
      pdf.setFont('Times', 'bold')
      pdf.setFontSize(14)
      pdf.text('Informes de formación', marginX + logoW + 12, marginX + 10)
      pdf.setFont('Times', '')
      pdf.setFontSize(10)
      pdf.setTextColor(120)
      pdf.text('GEP Group', marginX + logoW + 12, marginX + 28)
      pdf.setTextColor(0)

      // Línea separadora
      pdf.setDrawColor(220)
      pdf.line(marginX, marginX + headerH - 10, 595 - marginX, marginX + headerH - 10)
    }

    // Carga logo
    const logoDataUrl = await loadImageAsDataURL(logoUrl)

    // Escribe contenido (título documento + texto)
    pdf.setFont('Times','')
    pdf.setFontSize(12)

    const tituloDoc = `Nº Presupuesto: ${draft.dealId}  ·  ${draft.datos.cliente || ''}  ·  ${draft.datos.fecha || ''}`
    pdf.text(tituloDoc, marginX, contentTop)

    // cuerpo
    const bodyYStart = contentTop + 20
    const lines = pdf.splitTextToSize(texto, maxWidth)
    let cursorY = bodyYStart

    lines.forEach(line => {
      if (cursorY > 842 - marginX) { // salto de página si se pasa del final
        pdf.addPage()
        cursorY = contentTop
      }
      pdf.text(line, marginX, cursorY)
      cursorY += 16
    })

    // Dibuja cabecera en TODAS las páginas
    const total = pdf.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i)
      drawHeader(logoDataUrl)
      // pie de página opcional
      pdf.setFontSize(9)
      pdf.setTextColor(140)
      pdf.text(`Página ${i} de ${total}`, 595 - marginX - 80, 842 - 30)
      pdf.setTextColor(0)
    }

    const fileName = `GEP Group – ${draft.dealId} – ${draft.datos.cliente || 'Cliente'} – ${extraerFormacion(draft)} – ${draft.datos.fecha || ''}.pdf`
    pdf.save(fileName)
  }

  return (
    <div className="d-grid gap-3">
      <button className="btn btn-link p-0 w-auto" onClick={onBack}>← Volver al formulario</button>

      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            <img src={logoUrl} alt="GEP Group" style={{width: 36, height: 'auto'}} />
            <div>
              <h2 className="h5 mb-0">Borrador del informe</h2>
              <small className="text-secondary">Previsualiza y edita el contenido antes de generar el PDF</small>
            </div>
          </div>

          <textarea
            className="form-control"
            style={{minHeight: '60vh'}}
            value={texto}
            onChange={e=>setTexto(e.target.value)}
          />

          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-success" onClick={descargarPDF}>Generar PDF</button>
            <button className="btn btn-outline-secondary" onClick={()=>window.scrollTo({ top: 0, behavior:'smooth' })}>
              Subir arriba
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function extraerFormacion(draft){
  const names = (draft?.datos?.productos || []).map(p => p.product?.name).filter(Boolean)
  return names[0] || (draft?.datos?.plantillasSeleccionadas?.[0] || 'Formación')
}
