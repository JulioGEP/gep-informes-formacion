// src/components/Preview.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import PdfReport from './PdfReport.jsx'

const maxTries = 3
const triesKey = (dealId) => `aiAttempts:${dealId || 'sin'}`
const htmlKey  = (dealId) => `aiHtml:${dealId || 'sin'}`

export default function Preview({ draft, onBack }) {
  const { datos, imagenes, formador, dealId } = draft || {}
  const [aiHtml, setAiHtml] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [tries, setTries] = useState(0)

  // Cargar contador + html si hay dealId; si no hay, no aplicamos el límite
  useEffect(() => {
    if (dealId) {
      try {
        const savedTries = Number(localStorage.getItem(triesKey(dealId)) || '0')
        setTries(isNaN(savedTries) ? 0 : savedTries)
      } catch {}
      try {
        const savedHtml = sessionStorage.getItem(htmlKey(dealId))
        if (savedHtml) setAiHtml(savedHtml)
      } catch {}
    } else {
      // Sin dealId => no aplicamos límite ni html persistido
      setTries(0)
      setAiHtml(null)
    }
  }, [dealId])

  const tieneContenido = useMemo(() => {
    if (!datos) return false
    return (
      (datos.formacionTitulo && (datos.contenidoTeorica?.length || datos.contenidoPractica?.length)) ||
      Object.values(datos?.comentarios || {}).some(v => (v || '').trim() !== '') ||
      (Array.isArray(imagenes) && imagenes.length > 0)
    )
  }, [datos, imagenes])

  const mejorarInforme = async () => {
    // Si no hay dealId, permitimos igual (sin persistir contador); si hay, comprobamos límite
    if (dealId && tries >= maxTries) return
    setAiBusy(true)
    try {
      const r = await fetch('/.netlify/functions/generateReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formador, datos }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Error IA')

      const html = (data.html || '').trim()
      setAiHtml(html)
      if (dealId) {
        try { sessionStorage.setItem(htmlKey(dealId), html) } catch {}
        const next = Math.min(tries + 1, maxTries)
        setTries(next)
        try { localStorage.setItem(triesKey(dealId), String(next)) } catch {}
      }
    } catch (e) {
      console.error(e)
      alert('No se ha podido mejorar el informe.')
    } finally {
      setAiBusy(false)
    }
  }

  const stripHtml = (html) => (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  const descargarPDF = async () => {
    try {
      const aiText = aiHtml ? stripHtml(aiHtml) : ''
      const blob = await pdf(
        <PdfReport
          dealId={dealId}
          formador={formador}
          datos={datos}
          imagenes={imagenes}
          aiText={aiText}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fecha = (datos?.fecha || '').slice(0, 10)
      const cliente = (datos?.cliente || '').replace(/[^\w\s\-._]/g, '').trim()
      const titulo = (datos?.formacionTitulo || 'Formación').replace(/[^\w\s\-._]/g, '').trim()
      a.href = url
      a.download = `GEP Group – ${dealId || 'SinPresu'} – ${cliente || 'Cliente'} – ${titulo} – ${fecha || 'fecha'}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      try { sessionStorage.removeItem('tmpImages') } catch {}
    } catch (e) {
      console.error('Error generando PDF:', e)
      alert('No se ha podido generar el PDF.')
    }
  }

  // Mostrar contador si hay dealId; si no, mostrar “(0/3)” para guiar
  const triesLabel = `${dealId ? tries : 0}/${maxTries}`
  const quedanIntentos = dealId ? tries < maxTries : true

  return (
    <div className="d-grid gap-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="h5 mb-0">Borrador del informe</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-secondary" onClick={onBack}>Volver al formulario</button>

          {quedanIntentos && (
            <button className="btn btn-warning" onClick={mejorarInforme} disabled={aiBusy}>
              {aiBusy ? 'Mejorando…' : `Mejorar informe (${triesLabel})`}
            </button>
          )}

          {aiHtml && (
            <button className="btn btn-success" onClick={descargarPDF} disabled={!tieneContenido}>
              Descargar PDF
            </button>
          )}
        </div>
      </div>

      {quedanIntentos && (
        <div className="text-muted small">Solo tienes 3 oportunidades para mejorar el informe.</div>
      )}

      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-3">Datos generales</h5>
          <div className="row g-3">
            <div className="col-md-4"><strong>Nº Presupuesto:</strong> {dealId || '—'}</div>
            <div className="col-md-4"><strong>Cliente:</strong> {datos?.cliente || '—'}</div>
            <div className="col-md-4"><strong>CIF:</strong> {datos?.cif || '—'}</div>
            <div className="col-md-6"><strong>Dirección (Organización):</strong> {datos?.direccionOrg || '—'}</div>
            <div className="col-md-6"><strong>Dirección de la formación (Sede):</strong> {datos?.sede || '—'}</div>
            <div className="col-md-4"><strong>Persona de contacto:</strong> {datos?.contacto || '—'}</div>
            <div className="col-md-4"><strong>Comercial:</strong> {datos?.comercial || '—'}</div>
            <div className="col-md-4"><strong>Formador/a:</strong> {formador?.nombre || '—'} ({formador?.idioma || 'ES'})</div>
            <div className="col-md-3"><strong>Fecha:</strong> {datos?.fecha || '—'}</div>
            <div className="col-md-3"><strong>Sesiones:</strong> {datos?.sesiones || '—'}</div>
            <div className="col-md-3"><strong>Nº de alumnos:</strong> {datos?.alumnos || '—'}</div>
            <div className="col-md-3"><strong>Duración (h):</strong> {datos?.duracion || '—'}</div>
          </div>

          <hr className="my-4" />
          <h5 className="card-title mb-3">Formación realizada</h5>
          <p className="mb-2"><strong>Formación:</strong> {datos?.formacionTitulo || '—'}</p>
          <div className="row g-4">
            <div className="col-md-6">
              <h6>Parte Teórica</h6>
              <ul className="mb-0">
                {(datos?.contenidoTeorica || []).map((p, i) => <li key={`t-${i}`}>{p || '—'}</li>)}
              </ul>
            </div>
            <div className="col-md-6">
              <h6>Parte Práctica</h6>
              <ul className="mb-0">
                {(datos?.contenidoPractica || []).map((p, i) => <li key={`p-${i}`}>{p || '—'}</li>)}
              </ul>
            </div>
          </div>

          {/* Ocultamos lo literal del formador si ya hay IA */}
          {!aiHtml && (
            <>
              <hr className="my-4" />
              <h5 className="card-title mb-3">Valoración y observaciones</h5>
              <div className="row g-3">
                <div className="col-md-4"><strong>Participación:</strong> {datos?.escalas?.participacion || '—'}</div>
                <div className="col-md-4"><strong>Compromiso:</strong> {datos?.escalas?.compromiso || '—'}</div>
                <div className="col-md-4"><strong>Superación:</strong> {datos?.escalas?.superacion || '—'}</div>
                <div className="col-md-6"><strong>Puntos fuertes:</strong> <div>{datos?.comentarios?.c11 || '—'}</div></div>
                <div className="col-md-6"><strong>Asistencia:</strong> <div>{datos?.comentarios?.c12 || '—'}</div></div>
                <div className="col-md-6"><strong>Puntualidad:</strong> <div>{datos?.comentarios?.c13 || '—'}</div></div>
                <div className="col-md-6"><strong>Accidentes:</strong> <div>{datos?.comentarios?.c14 || '—'}</div></div>
                <div className="col-md-4"><strong>Formaciones futuras:</strong> <div>{datos?.comentarios?.c15 || '—'}</div></div>
                <div className="col-md-4"><strong>Entorno de trabajo:</strong> <div>{datos?.comentarios?.c16 || '—'}</div></div>
                <div className="col-md-4"><strong>Materiales:</strong> <div>{datos?.comentarios?.c17 || '—'}</div></div>
              </div>
            </>
          )}

          {aiHtml && (
            <>
              <hr className="my-4" />
              <div className="border rounded p-3" dangerouslySetInnerHTML={{ __html: aiHtml }} />
            </>
          )}

          {Array.isArray(imagenes) && imagenes.length > 0 && (
            <>
              <hr className="my-4" />
              <h5 className="card-title mb-3">Imágenes de apoyo</h5>
              <div className="d-flex flex-wrap gap-2">
                {imagenes.map((img, i) => (
                  <div key={i} className="border rounded p-1" style={{ width: 120 }}>
                    <img src={img.dataUrl} alt={img.name} className="img-fluid rounded" />
                    <div className="small text-truncate" title={img.name}>{img.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
