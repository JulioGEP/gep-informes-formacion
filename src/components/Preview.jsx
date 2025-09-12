import React, { useEffect, useMemo, useRef, useState } from 'react'
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

  const data = draft?.datos || {}
  const formador = draft?.formador || {}
  const formacionTitulo = data.formacionTitulo || 'Formación'
  const imagenes = draft?.imagenes || [] // [{name, dataUrl}]

  useEffect(() => {
    const saved = Number(localStorage.getItem(lsKey(draft?.dealId)) || '0')
    setAiTries(Number.isFinite(saved) ? saved : 0)
  }, [draft?.dealId])

  useEffect(() => {
    localStorage.setItem(lsKey(draft?.dealId), String(aiTries))
  }, [aiTries, draft?.dealId])

  const informeHTMLBase = useMemo(() => (
    <div className="print-area">
      {/* ... (tus secciones Datos/Contenido/Análisis iguales que antes) ... */}

      {(imagenes && imagenes.length > 0) && (
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
  ), [data, formador, formacionTitulo, analysisText, notaLibre, imagenes])

  const descargarPDF = async () => {
    const blob = await PdfReport({
      logoUrl,
      datos: data,
      formador,
      formacionTitulo,
      analysisText: editBuffer || analysisText || '',
      notaLibre,
      imagenes // <— PASAMOS IMÁGENES AL PDF
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileName = `GEP Group – ${draft.dealId} – ${data.cliente || 'Cliente'} – ${formacionTitulo} – ${data.fecha || ''}.pdf`
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
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
