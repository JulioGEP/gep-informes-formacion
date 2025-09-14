// src/components/Preview.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import logoImg from '../assets/logo-gep.png'
import { generateReportPdfmake } from '../pdf/reportPdfmake'
import { triesKey, htmlKey } from '../utils/keys'

const maxTries = 3

/**
 * Editor NO controlado para el HTML de IA (sin saltos de cursor):
 * - Inicializa innerHTML con initialHtml (o lo guardado).
 * - Guarda en sessionStorage y notifica onChange(html) en cada cambio.
 */
function EditableHtml({ dealId, initialHtml, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || ''
  }, [initialHtml, dealId])

  const handleInput = () => {
    const html = ref.current?.innerHTML || ''
    try { sessionStorage.setItem(htmlKey(dealId), html) } catch {}
    onChange?.(html)
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="form-control"
      style={{ minHeight: 220, lineHeight: 1.5, overflow: 'auto' }}
      onInput={handleInput}
    />
  )
}

// Acepta draft o data (compat con tu App)
export default function Preview(props) {
  const { onBack, title = 'Informe de Formación' } = props
  const draft = props.draft ?? props.data ?? {}
  const { datos, imagenes, formador, dealId } = draft

  const [aiHtml, setAiHtml] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [tries, setTries] = useState(0)

  // Cargar contador + HTML guardado
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
      setTries(0); setAiHtml(null)
    }
  }, [dealId])

  const resetLocalForDeal = () => {
    try {
      localStorage.removeItem(triesKey(dealId))
      sessionStorage.removeItem(htmlKey(dealId))
    } catch {}
    setTries(0); setAiHtml(null)
  }

  const tieneContenido = useMemo(() => {
    if (!datos) return false
    return (
      (datos.formacionTitulo && (datos.contenidoTeorica?.length || datos.contenidoPractica?.length)) ||
      Object.values(datos?.comentarios || {}).some(v => (v || '').trim() !== '') ||
      (Array.isArray(imagenes) && imagenes.length > 0)
    )
  }, [datos, imagenes])

  const mejorarInforme = async () => {
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
    await generateReportPdfmake({ dealId, datos, formador, imagenes })
  } catch (e) {
    console.error('Error generando PDF (pdfmake):', e)
    alert('No se ha podido generar el PDF.')
  }
}
  const triesLabel = `${dealId ? tries : 0}/${maxTries}`
  const quedanIntentos = dealId ? tries < maxTries : true

  return (
    <div className="d-grid gap-4">
      {/* Header con margen superior e inferior simétrico */}
      <div
        className="border-bottom d-flex align-items-center gap-3 sticky-top bg-white py-3 my-3"
        style={{ top: 0, zIndex: 10 }}
      >
        <img
          src={logoImg}
          alt="GEP Group"
          style={{ width: 180, height: 52, objectFit: 'contain', display: 'block' }}
        />
        <div className="flex-grow-1">
          <h1 className="h5 mb-0">{title}</h1>
          <small className="text-muted">GEP Group — Formación y Servicios</small>
        </div>
      </div>

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

      <div className="card">
        <div className="card-body">
          {/* ===== Datos generales (dos columnas, textos pedidos) ===== */}
          <h5 className="card-title mb-3">Datos generales</h5>
          <div className="row g-3 align-items-stretch">
            {/* Izquierda: Cliente */}
            <div className="col-md-6 d-flex">
              <div className="border rounded p-3 w-100 h-100">
                <h6 className="mb-3">Datos del cliente</h6>
                <div className="row g-2">
                  <div className="col-12"><strong>Nº Presupuesto:</strong> {dealId || '—'}</div>
                  <div className="col-md-7"><strong>Cliente:</strong> {datos?.cliente || '—'}</div>
                  <div className="col-md-5"><strong>CIF:</strong> {datos?.cif || '—'}</div>
                  <div className="col-md-6"><strong>Dirección fiscal:</strong> {datos?.direccionOrg || '—'}</div>
                  <div className="col-md-6"><strong>Dirección formación:</strong> {datos?.sede || '—'}</div>
                  <div className="col-md-6"><strong>Persona de contacto:</strong> {datos?.contacto || '—'}</div>
                  <div className="col-md-6"><strong>Comercial:</strong> {datos?.comercial || '—'}</div>
                </div>
              </div>
            </div>
            {/* Derecha: Formador */}
            <div className="col-md-6 d-flex">
              <div className="border rounded p-3 w-100 h-100">
                <h6 className="mb-3">Datos del formador</h6>
                <div className="row g-2">
  <div className="col-12">
    <strong>Formador/a:</strong> {formador?.nombre || '—'}
  </div>

  {/* Fecha a ancho completo */}
  <div className="col-12">
    <strong>Fecha:</strong> {datos?.fecha || '—'}
  </div>

  {/* Debajo de Fecha → Sesiones */}
  <div className="col-12">
    <strong>Sesiones:</strong> {datos?.sesiones || '—'}
  </div>

  {/* Debajo de Sesiones → Duración (h) */}
  <div className="col-12">
    <strong>Duración (h):</strong> {datos?.duracion || '—'}
  </div>

  {/* Luego Nº de alumnos */}
  <div className="col-12">
    <strong>Nº de alumnos:</strong> {datos?.alumnos || '—'}
  </div>
</div>
                
              </div>
            </div>
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

          {/* Si no hay IA, mostramos lo literal del formulario */}
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
              {/* EDITABLE: guarda en sessionStorage y actualiza aiHtml */}
              <EditableHtml dealId={dealId} initialHtml={aiHtml} onChange={setAiHtml} />
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

      <div className="d-flex gap-2 justify-content-end">
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

      {dealId && tries >= maxTries && (
        <div className="text-muted small">
          Has agotado las 3 mejoras para este presupuesto.{' '}
          <button className="btn btn-link p-0 align-baseline" onClick={resetLocalForDeal}>
            Reiniciar intentos (solo pruebas)
          </button>
        </div>
      )}
    </div>
  )
}
