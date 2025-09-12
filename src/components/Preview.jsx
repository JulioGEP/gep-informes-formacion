import React, { useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import logoUrl from '../assets/logo-gep.png'

export default function Preview({ draft, onBack }){
  const [notaLibre, setNotaLibre] = useState('') // para pequeños ajustes
  const printRef = useRef(null)

  const data = draft?.datos || {}
  const formador = draft?.formador || {}
  const formacionTitulo = data.formacionTitulo || (data.plantillasSeleccionadas?.[0] || 'Formación')

  // HTML del informe con Bootstrap
  const informeHTML = useMemo(() => (
    <div className="print-area">
      <div className="d-flex align-items-center gap-3 mb-3">
        <img src={logoUrl} alt="GEP Group" style={{width: 44}} />
        <div>
          <h1 className="h5 mb-0">Informe de formación</h1>
          <div className="text-secondary small">GEP Group</div>
        </div>
      </div>

      <section>
        <h2 className="h6">Datos generales</h2>
        <div className="row g-2">
          <div className="col-md-6"><strong>Cliente:</strong> {data.cliente || '—'}</div>
          <div className="col-md-6"><strong>CIF:</strong> {data.cif || '—'}</div>
          <div className="col-md-6"><strong>Dirección (Organización):</strong> {data.direccionOrg || '—'}</div>
          <div className="col-md-6"><strong>Dirección de la formación:</strong> {data.sede || '—'}</div>
          <div className="col-md-4"><strong>Fecha:</strong> {data.fecha || '—'}</div>
          <div className="col-md-4"><strong>Sesiones:</strong> {data.sesiones || '—'}</div>
          <div className="col-md-4"><strong>Alumnos:</strong> {data.alumnos || '—'}</div>
          <div className="col-md-4"><strong>Duración:</strong> {data.duracion ? `${data.duracion} h` : '—'}</div>
          <div className="col-md-4"><strong>Formador/a:</strong> {formador.nombre || '—'}</div>
          <div className="col-md-4"><strong>Formación:</strong> {formacionTitulo}</div>
        </div>
      </section>

      <section className="mt-3">
        <h2 className="h6">Valora la formación del 1 al 10</h2>
        <ul>
          <li><strong>Participación:</strong> {data.escalas?.participacion ?? '—'}</li>
          <li><strong>Compromiso:</strong> {data.escalas?.compromiso ?? '—'}</li>
          <li><strong>Superación:</strong> {data.escalas?.superacion ?? '—'}</li>
        </ul>
      </section>

      <section className="mt-3">
        <h2 className="h6">Contenido de la formación</h2>
        <div className="row">
          <div className="col-md-6">
            <h3 className="h6">Parte Teórica</h3>
            <ul className="mb-0">
              {(data.contenidoTeorica || []).map((li, idx) => <li key={`t-${idx}`}>{li}</li>)}
            </ul>
          </div>
          <div className="col-md-6">
            <h3 className="h6">Parte Práctica</h3>
            <ul className="mb-0">
              {(data.contenidoPractica || []).map((li, idx) => <li key={`p-${idx}`}>{li}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-3">
        <h2 className="h6">Observaciones y recomendaciones del formador</h2>
        <ul>
          {[
            ['Puntos fuertes de los alumnos a destacar', data.comentarios?.c11],
            ['Incidencias: Referentes a la asistencia', data.comentarios?.c12],
            ['Incidencias: Referentes a la Puntualidad', data.comentarios?.c13],
            ['Incidencias: Accidentes', data.comentarios?.c14],
            ['Recomendaciones: Formaciones Futuras', data.comentarios?.c15],
            ['Recomendaciones: Del entorno de Trabajo', data.comentarios?.c16],
            ['Recomendaciones: De Materiales', data.comentarios?.c17],
          ].filter(([,v]) => v && String(v).trim()).map(([t,v], i) => (
            <li key={i}><strong>{t}:</strong> {v}</li>
          ))}
          {notaLibre && <li><strong>Ajustes finales:</strong> {notaLibre}</li>}
        </ul>
      </section>

      <section className="mt-4">
        <p className="text-secondary small mb-0">
          Documento confidencial. Uso interno del cliente y GEP Group. Tratamiento de datos conforme al RGPD y normativa aplicable.
        </p>
      </section>
    </div>
  ), [data, formador, formacionTitulo, notaLibre])

  // Descargar como PDF (renderizando el HTML con Bootstrap) y añadir cabecera en todas las páginas
  const descargarPDF = async () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const headerH = 70
    await pdf.html(printRef.current, {
      x: 56, y: 56 + headerH,
      html2canvas: { scale: 0.9, useCORS: true },
      callback: (doc) => {
        const total = doc.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
          doc.setPage(i)
          // Cabecera con logo/título en cada página
          doc.setDrawColor(220)
          doc.addImage(logoUrl, 'PNG', 56, 40, 44, 44, undefined, 'FAST')
          doc.setFont('helvetica','bold') // (si luego integras Poppins, se cambia aquí)
          doc.setFontSize(12)
          doc.text('Informes de formación', 56 + 44 + 10, 56)
          doc.setFont('helvetica','normal')
          doc.setTextColor(120)
          doc.setFontSize(10)
          doc.text('GEP Group', 56 + 44 + 10, 56 + 16)
          doc.setTextColor(0)
          doc.line(56, 56 + headerH, 595 - 56, 56 + headerH)

          // Pie de página
          doc.setFontSize(9)
          doc.setTextColor(140)
          doc.text(`Página ${i} de ${total}`, 595 - 56 - 80, 842 - 30)
          doc.setTextColor(0)
        }

        const fileName = `GEP Group – ${draft.dealId} – ${data.cliente || 'Cliente'} – ${formacionTitulo} – ${data.fecha || ''}.pdf`
        doc.save(fileName)
      }
    })
  }

  return (
    <div className="d-grid gap-3">
      {/* Botón de volver → “Mejorar documento” (solo aquí) */}
      <button className="btn btn-link p-0 w-auto" onClick={onBack}>← Mejorar documento</button>

      {/* Vista previa Bootstrap */}
      <div className="card">
        <div className="card-body">
          {/* Contenedor imprimible */}
          <div ref={printRef}>{informeHTML}</div>

          {/* Ajustes finales (opcional) */}
          <div className="mt-3">
            <label className="form-label">Ajustes finales (opcional)</label>
            <textarea
              className="form-control"
              placeholder="Añade una frase o matiz adicional que quieras incorporar al informe…"
              value={notaLibre}
              onChange={e => setNotaLibre(e.target.value)}
            />
          </div>

          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-success" onClick={descar garPDF}>Descargar PDF</button>
          </div>
        </div>
      </div>
    </div>
  )
}
