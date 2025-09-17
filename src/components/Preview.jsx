// src/components/Preview.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import logoImg from '../assets/logo-nuevo.png'
import { generateReportPdfmake } from '../pdf/reportPdfmake'
import { triesKey, htmlKey } from '../utils/keys'

let warnedMissingReportsToken = false
const getReportsAuthHeaders = () => {
  const token = import.meta.env.VITE_REPORTS_API_TOKEN
  if (!token) {
    if (!warnedMissingReportsToken) {
      console.warn('VITE_REPORTS_API_TOKEN no está configurado; las peticiones a Netlify serán rechazadas.')
      warnedMissingReportsToken = true
    }
    return {}
  }
  return { Authorization: `Bearer ${token}` }
}

const maxTries = 3

const preventivoHeadings = {
  ES: {
    generales: 'Datos generales',
    registro: 'Registro',
    trabajos: 'Trabajos',
    tareas: 'Tareas',
    observaciones: 'Observaciones',
    incidencias: 'Incidencias',
    firma: 'Firma',
    anexos: 'Anexo de imágenes',
  },
  CA: {
    generales: 'Dades generals',
    registro: 'Registre',
    trabajos: 'Treballs',
    tareas: 'Tasques',
    observaciones: 'Observacions',
    incidencias: 'Incidències',
    firma: 'Signatura',
    anexos: "Annex d'imatges",
  },
  EN: {
    generales: 'General information',
    registro: 'Logbook',
    trabajos: 'Works performed',
    tareas: 'Tasks',
    observaciones: 'Observations',
    incidencias: 'Incidents',
    firma: 'Signature',
    anexos: 'Image annex',
  },
}

const preventivoCardLabels = {
  ES: { registro: 'Registro', bombero: 'Bombero/a', fecha: 'Fecha ejercicio' },
  CA: { registro: 'Registre', bombero: 'Bomber/a', fecha: "Data de l'exercici" },
  EN: { registro: 'Logbook', bombero: 'Firefighter', fecha: 'Exercise date' },
}

const EMAIL_DEFAULT_MESSAGE = 'Adjuntamos el informe generado.'

const parseEmailList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }
  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeText = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const preventivoTextToHtml = (text = '', idioma = 'ES', options = {}) => {
  const { hasImages = true } = options
  const lang = (idioma || 'ES').toUpperCase()
  const labels = preventivoHeadings[lang] || preventivoHeadings.ES
  const order = [
    labels.generales,
    labels.registro,
    labels.trabajos,
    labels.tareas,
    labels.observaciones,
    labels.incidencias,
    labels.firma,
    labels.anexos,
  ]
  const generalKey = normalizeText(labels.generales)
  const lookup = new Map(order.map((title) => [normalizeText(title), title]))
  const skipTitles = new Set([generalKey])
  if (!hasImages && labels.anexos) {
    skipTitles.add(normalizeText(labels.anexos))
  }

  const lines = String(text || '').split(/\r?\n/)
  const parts = []
  let buffer = []
  let currentSection = null

  const flushBuffer = () => {
    const raw = buffer.join('\n').trim()
    buffer = []
    if (!raw) return
    if (currentSection?.skip) return
    const paragraphs = raw.split(/\n{2,}/)
    paragraphs.forEach((paragraph) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return
      const html = escapeHtml(trimmed).replace(/\n/g, '<br />')
      parts.push(`<p>${html}</p>`)
    })
  }

  const closeSection = () => {
    flushBuffer()
    if (currentSection && !currentSection.skip) {
      parts.push('</section>')
    }
    currentSection = null
  }

  const openSection = (title) => {
    closeSection()
    const normalized = normalizeText(title)
    const skip = skipTitles.has(normalized)
    currentSection = { title, skip }
    if (!skip) {
      parts.push(`<section><h3>${title}</h3>`)
    }
  }

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim()
    const heading = lookup.get(normalizeText(trimmed.replace(/[:：]\s*$/, '')))
    if (heading) {
      openSection(heading)
    } else {
      buffer.push(rawLine)
    }
  })

  closeSection()

  if (!parts.length) {
    const sanitizedLines = []
    let skipping = false

    lines.forEach((rawLine) => {
      const trimmed = rawLine.trim()
      const normalized = normalizeText(trimmed.replace(/[:：]\s*$/, ''))
      if (!skipping && normalized && skipTitles.has(normalized)) {
        skipping = true
        return
      }
      if (skipping) {
        if (!trimmed) {
          skipping = false
        } else if (lookup.has(normalized) && !skipTitles.has(normalized)) {
          skipping = false
        }
      }
      if (!skipping) sanitizedLines.push(rawLine)
    })

    const fallbackText = sanitizedLines.join('\n').trim()
    const fallback = escapeHtml(fallbackText)
    return fallback ? `<p>${fallback.replace(/\n/g, '<br />')}</p>` : ''
  }

  return parts.join('')
}

/**
 * Editor NO controlado para el HTML de IA (sin saltos de cursor):
 * - Inicializa innerHTML con initialHtml (o lo guardado).
 * - Guarda en sessionStorage y notifica onChange(html) en cada cambio.
 */
function EditableHtml({ dealId, initialHtml, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const nextHtml = initialHtml || ''
    if (ref.current.innerHTML !== nextHtml) {
      ref.current.innerHTML = nextHtml
    }
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
  const { onBack, title = 'Informe de Formación', type: propType } = props
  const draft = props.draft ?? props.data ?? {}
  const { datos, imagenes, formador, dealId, type: draftType } = draft
  const type = propType || draftType || 'formacion'
  const isSimulacro = type === 'simulacro'
  const isPreventivo = type === 'preventivo'
  const idioma = (datos?.idioma || formador?.idioma || 'ES').toUpperCase()
  const idiomaLabel = idioma === 'CA' ? 'Català' : idioma === 'EN' ? 'English' : 'Castellano'
  const preventivoLabels = preventivoHeadings[idioma] || preventivoHeadings.ES
  const preventivoCard = preventivoCardLabels[idioma] || preventivoCardLabels.ES
  const direccionSedeLabel = isPreventivo
    ? 'Dirección del Preventivo'
    : isSimulacro
      ? 'Dirección del simulacro'
      : 'Dirección de la formación'

  const [aiHtml, setAiHtml] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [tries, setTries] = useState(0)

  const emailDefaultSubject = useMemo(() => {
    const parts = []
    if (isPreventivo) parts.push('Informe preventivo')
    else if (isSimulacro) parts.push('Informe de simulacro')
    else parts.push('Informe de formación')
    if (dealId) parts.push(`#${dealId}`)
    if (datos?.cliente) parts.push(datos.cliente)
    if (!isPreventivo && !isSimulacro && datos?.formacionTitulo) parts.push(datos.formacionTitulo)
    return parts.filter(Boolean).join(' – ')
  }, [isPreventivo, isSimulacro, dealId, datos?.cliente, datos?.formacionTitulo])

  const emailResetKey = useMemo(
    () => [dealId || '', datos?.cliente || '', datos?.formacionTitulo || '', datos?.fecha || '', type].join('|'),
    [dealId, datos?.cliente, datos?.formacionTitulo, datos?.fecha, type],
  )

  const [emailForm, setEmailForm] = useState(() => ({
    from: '',
    to: '',
    cc: '',
    subject: emailDefaultSubject,
    text: EMAIL_DEFAULT_MESSAGE,
  }))
  const [emailStatus, setEmailStatus] = useState('idle')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)

  useEffect(() => {
    setEmailForm({
      from: '',
      to: '',
      cc: '',
      subject: emailDefaultSubject,
      text: EMAIL_DEFAULT_MESSAGE,
    })
    setEmailStatus('idle')
    setEmailMessage('')
  }, [emailResetKey, emailDefaultSubject])

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
    if (isSimulacro) {
      return (
        (datos.cronologia?.length || 0) > 0 ||
        (datos.desarrollo || '').trim() !== '' ||
        Object.values(datos?.comentarios || {}).some(v => (v || '').trim() !== '') ||
        (Array.isArray(imagenes) && imagenes.length > 0)
      )
    }
    if (isPreventivo) {
      const secciones = datos?.preventivo || {}
      return (
        Object.values(secciones).some(v => (v || '').trim() !== '') ||
        (Array.isArray(imagenes) && imagenes.length > 0)
      )
    }
    return (
      (datos.formacionTitulo && (datos.contenidoTeorica?.length || datos.contenidoPractica?.length)) ||
      Object.values(datos?.comentarios || {}).some(v => (v || '').trim() !== '') ||
      (Array.isArray(imagenes) && imagenes.length > 0)
    )
  }, [datos, imagenes, isPreventivo, isSimulacro])

  const mejorarInforme = async () => {
    if (dealId && tries >= maxTries) return
    setAiBusy(true)
    try {
      const r = await fetch('/.netlify/functions/generateReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getReportsAuthHeaders() },
        body: JSON.stringify({ formador, datos }),
      })
      const raw = await r.text()
      let data = null
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch (parseError) {
          console.error('Respuesta IA no JSON:', parseError, raw)
        }
      }

      if (!r.ok) {
        const msg = data?.error || data?.message || raw || 'Error IA'
        throw new Error(msg)
      }

      let html = (data?.html || '').trim()
      if (!html) throw new Error('La IA devolvió un informe vacío.')

      if (isPreventivo) {
        const hasImages = Array.isArray(imagenes) && imagenes.length > 0
        html = preventivoTextToHtml(html, idioma, { hasImages })
      }

      setAiHtml(html)
      if (dealId) {
        try { sessionStorage.setItem(htmlKey(dealId), html) } catch {}
        const next = Math.min(tries + 1, maxTries)
        setTries(next)
        try { localStorage.setItem(triesKey(dealId), String(next)) } catch {}
      }
    } catch (e) {
      console.error(e)
      const message = e?.message ? `No se ha podido mejorar el informe.\n${e.message}` : 'No se ha podido mejorar el informe.'
      alert(message)
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
      await generateReportPdfmake({ dealId, datos, formador, imagenes, type })
    } catch (e) {
      console.error('Error generando PDF (pdfmake):', e)
      alert('No se ha podido generar el PDF.')
    }
  }
  const handleEmailFieldChange = (field) => (event) => {
    const value = event.target.value
    setEmailForm((prev) => ({ ...prev, [field]: value }))
  }

  const emailIndicatorColor =
    emailStatus === 'success'
      ? '#198754'
      : emailStatus === 'error'
        ? '#dc3545'
        : emailStatus === 'pending'
          ? '#ffc107'
          : '#6c757d'

  const emailIndicatorLabel =
    emailStatus === 'success'
      ? 'Último envío correcto'
      : emailStatus === 'error'
        ? 'Error en el último envío'
        : emailStatus === 'pending'
          ? 'Enviando…'
          : 'Pendiente de envío'

  const enviarInformePorEmail = async () => {
    const from = (emailForm.from || '').trim()
    const toList = parseEmailList(emailForm.to)
    const ccList = parseEmailList(emailForm.cc)
    const subject = (emailForm.subject || '').trim()
    const textRaw = emailForm.text || ''

    if (!from) {
      setEmailStatus('error')
      setEmailMessage('Introduce un remitente válido.')
      return
    }
    if (!toList.length) {
      setEmailStatus('error')
      setEmailMessage('Introduce al menos un destinatario.')
      return
    }
    if (!subject) {
      setEmailStatus('error')
      setEmailMessage('Introduce un asunto para el correo.')
      return
    }
    if (!textRaw.trim()) {
      setEmailStatus('error')
      setEmailMessage('Añade un mensaje para el correo.')
      return
    }

    setEmailSending(true)
    setEmailStatus('pending')
    setEmailMessage('')

    try {
      const pdf = await generateReportPdfmake({ dealId, datos, formador, imagenes, type }, { output: 'base64' })
      const pdfBase64 = pdf?.base64 || ''
      const filename = pdf?.filename || 'informe.pdf'
      if (!pdfBase64) throw new Error('No se pudo generar el PDF para adjuntar.')

      const payload = {
        from,
        to: toList,
        subject,
        text: textRaw,
        attachments: [
          {
            filename,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ],
      }
      if (ccList.length) payload.cc = ccList

      const response = await fetch('/.netlify/functions/sendReportEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getReportsAuthHeaders() },
        body: JSON.stringify(payload),
      })

      const raw = await response.text()
      let data = null
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch (parseError) {
          console.error('Respuesta sendReportEmail no JSON:', parseError, raw)
        }
      }

      if (!response.ok || data?.error) {
        const message = data?.error || data?.message || raw || 'No se pudo enviar el correo.'
        throw new Error(message)
      }

      setEmailStatus('success')
      setEmailMessage('Correo enviado correctamente.')
    } catch (error) {
      console.error('Error enviando informe por email:', error)
      const message = error?.message ? `No se ha podido enviar el correo. ${error.message}` : 'No se ha podido enviar el correo.'
      setEmailStatus('error')
      setEmailMessage(message)
    } finally {
      setEmailSending(false)
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
          <h5 className="card-title mb-3">{isPreventivo ? preventivoLabels.generales : 'Datos generales'}</h5>
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
                  <div className="col-md-6"><strong>{direccionSedeLabel}:</strong> {datos?.sede || '—'}</div>
                  <div className="col-md-6"><strong>Persona de contacto:</strong> {datos?.contacto || '—'}</div>
                  <div className="col-md-6"><strong>Comercial:</strong> {datos?.comercial || '—'}</div>
                </div>
              </div>
            </div>
            {/* Derecha: Formador / Registro */}
            <div className="col-md-6 d-flex">
              <div className="border rounded p-3 w-100 h-100">
                <h6 className="mb-3">{isPreventivo ? preventivoCard.registro : (isSimulacro ? 'Datos del auditor' : 'Datos del formador')}</h6>
                <div className="row g-2">
                  <div className="col-12">
                    <strong>{isPreventivo ? preventivoCard.bombero : (isSimulacro ? 'Auditor/a' : 'Formador/a')}:</strong> {formador?.nombre || '—'}
                  </div>
                  <div className="col-12">
                    <strong>{isPreventivo ? preventivoCard.fecha : 'Fecha'}:</strong> {datos?.fecha || '—'}
                  </div>
                  <div className="col-12">
                    <strong>Idioma:</strong> {idiomaLabel}
                  </div>
                  {!isPreventivo && (
                    <>
                      <div className="col-12">
                        <strong>Sesiones:</strong> {datos?.sesiones || '—'}
                      </div>
                      <div className="col-12">
                        <strong>Duración (h):</strong> {datos?.duracion || '—'}
                      </div>
                      {!isSimulacro && (
                        <div className="col-12">
                          <strong>Nº de alumnos:</strong> {datos?.alumnos || '—'}
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>

          {isSimulacro ? (
            <>
              <hr className="my-4" />
              <h5 className="card-title mb-3 text-danger">DESARROLLO / INCIDENCIAS / RECOMENDACIONES</h5>
              <h5 className="card-title mb-3">Desarrollo</h5>
              <p>{datos?.desarrollo || '—'}</p>
              <h5 className="card-title mb-3">Cronología</h5>
              <ul className="mb-0">
                {(datos?.cronologia || []).map((p, i) => <li key={i}>{p.hora} {p.texto}</li>)}
              </ul>
              {!aiHtml && (
                <>
                  <hr className="my-4" />
                  <h5 className="card-title mb-3">Valoración</h5>
                  <div className="row g-3">
                    <div className="col-md-4"><strong>Participación:</strong> {datos?.escalas?.participacion || '—'}</div>
                    <div className="col-md-4"><strong>Compromiso:</strong> {datos?.escalas?.compromiso || '—'}</div>
                    <div className="col-md-4"><strong>Superación:</strong> {datos?.escalas?.superacion || '—'}</div>
                    <div className="col-md-6"><strong>Incidencias detectadas:</strong> <div>{datos?.comentarios?.c12 || '—'}</div></div>
                    <div className="col-md-6"><strong>Accidentes:</strong> <div>{datos?.comentarios?.c14 || '—'}</div></div>
                    <div className="col-md-4"><strong>Recomendaciones: Formaciones:</strong> <div>{datos?.comentarios?.c15 || '—'}</div></div>
                    <div className="col-md-4"><strong>Recomendaciones: Entorno de trabajo:</strong> <div>{datos?.comentarios?.c16 || '—'}</div></div>
                    <div className="col-md-4"><strong>Recomendaciones: Materiales:</strong> <div>{datos?.comentarios?.c17 || '—'}</div></div>
                    <div className="col-12"><strong>Observaciones generales:</strong> <div>{datos?.comentarios?.c11 || '—'}</div></div>
                  </div>
                </>
              )}
            </>
          ) : isPreventivo ? (
            <>
              <hr className="my-4" />
              {aiHtml ? (
                <EditableHtml dealId={dealId} initialHtml={aiHtml} onChange={setAiHtml} />
              ) : (
                <div className="d-grid gap-3">
                  <div>
                    <h5 className="card-title mb-2">{preventivoLabels.trabajos}</h5>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{datos?.preventivo?.trabajos || '—'}</p>
                  </div>
                  <div>
                    <h5 className="card-title mb-2">{preventivoLabels.tareas}</h5>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{datos?.preventivo?.tareas || '—'}</p>
                  </div>
                  <div>
                    <h5 className="card-title mb-2">{preventivoLabels.observaciones}</h5>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{datos?.preventivo?.observaciones || '—'}</p>
                  </div>
                  <div>
                    <h5 className="card-title mb-2">{preventivoLabels.incidencias}</h5>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{datos?.preventivo?.incidencias || '—'}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}

          {aiHtml && !isPreventivo && (
            <>
              <hr className="my-4" />
              {/* EDITABLE: guarda en sessionStorage y actualiza aiHtml */}
              <EditableHtml dealId={dealId} initialHtml={aiHtml} onChange={setAiHtml} />
            </>
          )}

          <hr className="my-4" />
          <div>
            <p className="mb-1">Atentamente,</p>
            <strong>Jaime Martret</strong>
            <div className="text-danger">Responsable de formaciones</div>
          </div>

          {Array.isArray(imagenes) && imagenes.length > 0 && (
            <>
              <hr className="my-4" />
              <h5 className="card-title mb-3">Anexos — Imágenes de apoyo</h5>
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

      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
            <h5 className="card-title mb-0">Enviar informe por email</h5>
            <div className="d-flex align-items-center gap-2">
              <span
                className="rounded-circle"
                style={{ width: 12, height: 12, backgroundColor: emailIndicatorColor, display: 'inline-block' }}
              />
              <span
                className={`small ${
                  emailStatus === 'error'
                    ? 'text-danger'
                    : emailStatus === 'success'
                      ? 'text-success'
                      : 'text-muted'
                }`}
              >
                {emailIndicatorLabel}
              </span>
            </div>
          </div>

          <div className="row g-3 mt-2">
            <div className="col-md-6">
              <label className="form-label">Remitente</label>
              <input
                className="form-control"
                placeholder="Nombre &lt;correo@dominio&gt;"
                value={emailForm.from}
                onChange={handleEmailFieldChange('from')}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Destinatarios (To)</label>
              <input
                className="form-control"
                placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                value={emailForm.to}
                onChange={handleEmailFieldChange('to')}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">CC (opcional)</label>
              <input
                className="form-control"
                placeholder="Separar con comas o saltos de línea"
                value={emailForm.cc}
                onChange={handleEmailFieldChange('cc')}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Asunto</label>
              <input
                className="form-control"
                value={emailForm.subject}
                onChange={handleEmailFieldChange('subject')}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Mensaje</label>
              <textarea
                className="form-control"
                rows={3}
                value={emailForm.text}
                onChange={handleEmailFieldChange('text')}
              />
            </div>
          </div>

          {emailMessage && (
            <div className={`mt-2 small ${emailStatus === 'error' ? 'text-danger' : 'text-success'}`}>
              {emailMessage}
            </div>
          )}

          <div className="d-flex justify-content-end mt-3">
            <button
              className="btn btn-primary"
              onClick={enviarInformePorEmail}
              disabled={emailSending || !tieneContenido}
            >
              {emailSending ? 'Enviando…' : 'Enviar informe por email'}
            </button>
          </div>
          {!tieneContenido && (
            <div className="text-muted small mt-2">
              Completa el informe para habilitar el envío por correo.
            </div>
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
