import React, { useEffect, useMemo, useState } from 'react'

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

const collectEmails = (value) => {
  if (!value) return { valid: [], invalid: [] }

  const items = Array.isArray(value)
    ? value
    : String(value)
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)

  const valid = []
  const invalid = []
  const seen = new Set()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const emailFinderRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

  items.forEach((rawItem) => {
    const trimmed = rawItem.trim()
    if (!trimmed) return

    const matches = Array.from(trimmed.matchAll(emailFinderRegex)).map((match) =>
      match[0].replace(/^['"<]+|['">]+$/g, '').trim()
    )

    if (matches.length > 0) {
      matches.forEach((email) => {
        if (!email) return
        const dedupeKey = email.toLowerCase()
        if (emailRegex.test(email) && !seen.has(dedupeKey)) {
          seen.add(dedupeKey)
          valid.push(email)
        }
      })
      return
    }

    const candidate = trimmed.replace(/^['"<]+|['">]+$/g, '')
    if (emailRegex.test(candidate)) {
      const dedupeKey = candidate.toLowerCase()
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey)
        valid.push(candidate)
      }
      return
    }

    if (!invalid.includes(trimmed)) {
      invalid.push(trimmed)
    }
  })

  return { valid, invalid }
}

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const ensurePdfBase64 = async (pdf) => {
  if (!pdf) throw new Error('No hay PDF para adjuntar.')
  if (pdf.base64) return pdf.base64
  if (pdf.dataUrl) {
    const commaIndex = pdf.dataUrl.indexOf(',')
    return commaIndex >= 0 ? pdf.dataUrl.slice(commaIndex + 1) : pdf.dataUrl
  }
  if (pdf.arrayBuffer) return arrayBufferToBase64(pdf.arrayBuffer)
  if (pdf.blob) {
    const buffer = await pdf.blob.arrayBuffer()
    return arrayBufferToBase64(buffer)
  }
  throw new Error('No se ha podido preparar el PDF para enviarlo por correo.')
}

export default function SendEmailModal({
  show,
  onClose,
  onSuccess,
  pdf,
  draft,
  title,
}) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const dealId = draft?.dealId || ''
  const cliente = draft?.datos?.cliente || ''
  const fecha = draft?.datos?.fecha || ''
  const contacto = draft?.datos?.contacto || ''

  const formattedDate = useMemo(() => {
    if (!fecha) return ''
    try {
      const parsed = new Date(fecha)
      if (Number.isNaN(parsed.getTime())) return fecha
      return parsed.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch (err) {
      console.warn('No se pudo formatear la fecha del informe.', err)
      return fecha
    }
  }, [fecha])

  const defaultSubject = useMemo(() => {
    const pieces = []
    if (title) pieces.push(title)
    if (cliente) pieces.push(cliente)
    if (formattedDate) pieces.push(formattedDate)
    if (!pieces.length && dealId) pieces.push(`Presupuesto ${dealId}`)
    return pieces.join(' · ') || 'Informe GEP'
  }, [title, cliente, formattedDate, dealId])

  const defaultMessage = useMemo(() => {
    const greeting = contacto ? `Hola ${contacto},` : 'Hola,'
    const mainLine = dealId
      ? `Adjuntamos el informe correspondiente al presupuesto ${dealId}.`
      : 'Adjuntamos el informe correspondiente.'
    const lines = [
      greeting,
      '',
      mainLine,
      'Si necesitas cualquier aclaración o modificación, indícanoslo.',
      '',
      'Un saludo,',
      'GEP Group — Formación y Servicios',
    ]
    return lines.join('\n')
  }, [contacto, dealId])

  useEffect(() => {
    if (show) {
      setSubject(defaultSubject)
      setMessage(defaultMessage)
      setError(null)
    }
  }, [show, defaultSubject, defaultMessage])

  useEffect(() => {
    if (!show) {
      setSending(false)
      setError(null)
      setTo('')
      setCc('')
      setBcc('')
    }
  }, [show])

  const parsedTo = useMemo(() => collectEmails(to), [to])
  const parsedCc = useMemo(() => collectEmails(cc), [cc])
  const parsedBcc = useMemo(() => collectEmails(bcc), [bcc])

  const hasInvalidEmails =
    parsedTo.invalid.length > 0 || parsedCc.invalid.length > 0 || parsedBcc.invalid.length > 0

  const canSubmit = show && parsedTo.valid.length > 0 && !sending && !hasInvalidEmails

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError(null)

    try {
      const base64 = await ensurePdfBase64(pdf)
      const payload = {
        to: parsedTo.valid,
        cc: parsedCc.valid,
        bcc: parsedBcc.valid,
        subject: subject || defaultSubject,
        message,
        dealId,
        type: draft?.type || draft?.datos?.tipo || null,
        datos: {
          cliente: draft?.datos?.cliente || null,
          fecha: draft?.datos?.fecha || null,
          contacto: draft?.datos?.contacto || null,
        },
        pdf: {
          fileName: pdf?.fileName || 'informe.pdf',
          base64,
        },
      }

      const response = await fetch('/.netlify/functions/sendReportEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getReportsAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = data?.error || data?.message || 'No se ha podido enviar el correo.'
        throw new Error(message)
      }

      setSending(false)
      onSuccess?.({
        to: parsedTo.valid,
        cc: parsedCc.valid,
        bcc: parsedBcc.valid,
        response: data,
      })
    } catch (err) {
      console.error('Error enviando el informe por email:', err)
      setSending(false)
      setError(err?.message || 'No se ha podido enviar el correo.')
    }
  }

  const attachmentSizeKb = useMemo(() => {
    if (pdf?.blob?.size) {
      return Math.round(pdf.blob.size / 1024)
    }
    if (pdf?.base64) {
      const sizeInBytes = Math.floor((pdf.base64.length * 3) / 4)
      return Math.round(sizeInBytes / 1024)
    }
    return null
  }, [pdf])

  if (!show) return null

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">Enviar informe por email</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={onClose}
                  disabled={sending}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Para</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="correo@empresa.com"
                    required
                  />
                  <div className="form-text">
                    Separa múltiples direcciones con comas, punto y coma o saltos de línea.
                  </div>
                  {parsedTo.invalid.length > 0 && (
                    <div className="form-text text-danger">
                      Correos no válidos: {parsedTo.invalid.join(', ')}
                    </div>
                  )}
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">CC (opcional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={cc}
                      onChange={(event) => setCc(event.target.value)}
                      placeholder="equipo@empresa.com"
                    />
                    {parsedCc.invalid.length > 0 && (
                      <div className="form-text text-danger">
                        Correos no válidos: {parsedCc.invalid.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">CCO (opcional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={bcc}
                      onChange={(event) => setBcc(event.target.value)}
                      placeholder="direccion@empresa.com"
                    />
                    {parsedBcc.invalid.length > 0 && (
                      <div className="form-text text-danger">
                        Correos no válidos: {parsedBcc.invalid.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Asunto</label>
                  <input
                    className="form-control"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Mensaje</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    required
                  />
                  <div className="form-text">
                    Se enviará tal cual en el cuerpo del correo.
                  </div>
                </div>

                <div className="mb-3">
                  <div className="alert alert-secondary mb-0" role="status">
                    Se adjuntará el archivo <strong>{pdf?.fileName || 'informe.pdf'}</strong>
                    {attachmentSizeKb ? ` (${attachmentSizeKb} KB aprox.)` : ''}.
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={sending}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                  {sending ? 'Enviando…' : 'Enviar informe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}
