import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import logoUrl from '../assets/logo-gep.png'
import PdfReport from './PdfReport.jsx'

const lsKey = (dealId) => `aiTries:${dealId || 'unknown'}`

export default function Preview({ draft, onBack }) {
  const [notaLibre, setNotaLibre] = useState('')
  const [analysisText, setAnalysisText] = useState('')
  const [editBuffer, setEditBuffer] = useState('')
  const [aiTries, setAiTries] = useState(0)
  const [loadingAI, setLoadingAI] = useState(false)

  // imágenes recibidas del formulario
  const [imagenes, setImagenes] = useState(draft?.imagenes || [])
  const [imagesCleared, setImagesCleared] = useState(false)

  const data = draft?.datos || {}
  const formador = draft?.formador || {}
  const formacionTitulo = data.formacionTitulo || 'Formación'

  // Cargar intentos guardados por dealId
  useEffect(() => {
    const saved = Number(localStorage.getItem(lsKey(draft?.dealId)) || '0')
    setAiTries(Number.isFinite(saved) ? saved : 0)
  }, [draft?.dealId])

  // Guardar intentos
  useEffect(() => {
    localStorage.setItem(lsKey(draft?.dealId), String(aiTries))
  }, [aiTries, draft?.dealId])

  const informeHTMLBase = useMemo(() => (
    <div className="print-area">
      <div className="d-flex align-items-center gap-3 mb-3">
        <img src={logoUrl} alt="GEP Group" style={{ width: 64 }} />
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

      {(analysisText || notaLibre) && (
        <section className="mt-3">
          <h2 className="h6">Análisis y recomendaciones</h2>
          {analysisText && analysisText.split('\n').map((p, i) => <p key={i}>{p}</p>)}
          {notaLibre && <p><strong>Ajustes finales:</strong> {notaLibre}</p>}
        </section>
      )}

      {(!imagesCleared && imagenes && imagenes.length > 0) && (
        <section className="mt-3">
          <h2 className="h6">Imágenes de apoyo</h2>
          <div className="d-flex flex-wrap gap-2">
            {imagenes.map((img, idx) => (
              <div key={idx} className="border rounded p-1" style={{ width: 160 }}>
                <img src={img.dataUrl} alt={img.name} className="img-fluid rounded" />
                <div className="text-secondary small mt-1 text-truncate" title={img.name}>{img.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4">
        <p className="text-secondary small mb-0">
          Documento confidencial. Uso interno del cliente y GEP Group. Tratamiento de datos conforme al RGPD y normativa aplicable.
        </p>
      </section>
    </div>
  ), [data, formador, formacionTitulo, analysisText, notaLibre, imagenes, imagesCleared])

  const descargarPDF = async () => {
    const blob = await PdfReport({
      logoUrl,
      datos: data,
      formador,
      formacionTitulo,
      analysisText: editBuffer || analysisText || '',
      notaLibre,
      imagenes
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileName = `GEP Group – ${draft.dealId} – ${data.cliente || 'Cliente'} – ${formacionTitulo} – ${data.fecha || ''}.pdf`
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    // Limpieza de imágenes temporales tras descarga
    try { sessionStorage.removeItem('tmpImages') } catch {}
    setImagenes([])
    setImagesCleared(true)
  }

  const puedeMejorar = aiTries < 3
  const mejorarInforme = async () => {
    if (!puedeMejorar) return
    setLoadingAI(true)
    try {
      const previousText = editBuffer || analysisText || ''
      const { data: resp } = await axios.post('/.netlify/functions/improveReport', {
        formador, datos: data, previousText
      })
      const text = (resp?.analysisText || '').trim()
      if (!text) { alert('No se recibió texto de la IA.'); return }
      setAnalysisText(text)
      setEditBuffer(text)
      setAiTries(t => t + 1)
    } catch (e) {
      console.error(e)
      alert('Error al mejorar el informe.')
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="d-grid gap-3">
      <button
        className="btn btn-link p-0 w-auto"
        onClick={aiTries >= 3 ? undefined : onBack}
        disabled={aiTries >= 3}
        title={aiTries >= 3 ? 'Has agotado las 3 mejoras; no es posible volver al formulario.' : ''}
      >
        ← Modificar Informe
      </button>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <h2 className="h5 mb-0">{analysisText ? 'Informe mejorado' : 'Borrador del informe'}</h2>
            <div className="d-flex gap-2">
              {puedeMejorar && (
                <button className="btn btn-outline-primary" onClick={mejorarInforme} disabled={loadingAI}>
                  {loadingAI ? 'Mejorando…' : `Mejorar informe (${aiTries}/3)`}
                </button>
              )}
              {analysisText && (
                <button className="btn btn-success" onClick={descargarPDF}>Descargar PDF</button>
              )}
            </div>
          </div>
          <div className="text-secondary small mb-3">
            Solo tienes 3 oportunidades para mejorar el informe
          </div>

          <div>{informeHTMLBase}</div>

          {analysisText && (
            <div className="mt-3">
              <label className="form-label">Editar “Análisis y recomendaciones” (opcional)</label>
              <textarea
                className="form-control"
                style={{ minHeight: 140 }}
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
              />
            </div>
          )}

          <div className="mt-3">
            <label className="form-label">Ajustes finales (opcional)</label>
            <textarea
              className="form-control"
              placeholder="Añade una frase o matiz adicional que quieras incorporar al informe…"
              value={notaLibre}
              onChange={(e) => setNotaLibre(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
