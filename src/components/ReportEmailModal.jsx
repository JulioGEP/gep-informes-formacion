// src/components/ReportEmailModal.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../App'

const emailRegex = /^[^\s@]+@[^\s@]+\.(es|com)$/i

const normalizeText = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const normalizeEmail = (value = '') => value.trim().toLowerCase()

const comercialEmailMap = new Map(
  [
    ['elsa viana', 'elsa.viana@gepgroup.es'],
    ['jero riera', 'jero.riera@gepgroup.es'],
    ['lluis vicent', 'lluis.vicent@gepgroup.es'],
    ['julio garcia', 'julio.garcia@gepgroup.es'],
  ].map(([name, email]) => [normalizeText(name), email]),
)

const formatSubject = ({ title, cliente, dealId }) => {
  const cleanTitle = String(title || 'Informe').trim()
  const cleanCliente = String(cliente || '').trim()
  const dealLabel = dealId ? `Presupuesto ${dealId}` : 'Sin presupuesto'
  return `${cleanTitle}${cleanCliente ? ` – ${cleanCliente}` : ''} – ${dealLabel}`
}

const formatBody = ({ title, cliente, dealId, formadorNombre }) => {
  const informe = String(title || 'Informe').trim()
  const clienteTexto = String(cliente || 'nuestro cliente').trim() || 'nuestro cliente'
  const presupuestoTexto = dealId ? `presupuesto ${dealId}` : 'presupuesto sin numeración'
  const formadorTexto = formadorNombre ? `, impartido por ${formadorNombre}` : ''

  return [
    'Hola,',
    '',
    `Adjunto el ${informe} de ${clienteTexto} correspondiente al ${presupuestoTexto}${formadorTexto}.`,
    '',
    'Un saludo,',
    'Jaime Martret',
    'Responsable de formaciones',
    'GEP Group',
  ].join('\n')
}

export default function ReportEmailModal(props) {
  const { isOpen, onClose, datos, formador, dealId, title, pdf, onResult, getAuthHeaders } = props
  const { user } = useContext(AuthContext)

  const userEmail = normalizeEmail(user?.email || '')

  const defaultTo = useMemo(() => {
    const comercial = normalizeText(datos?.comercial || '')
    return comercialEmailMap.get(comercial) || ''
  }, [datos?.comercial])

  const requiredCc = useMemo(() => {
    const base = ['jaime@gepgroup.es']
    if (userEmail) base.push(userEmail)
    const seen = new Set()
    return base
      .map(normalizeEmail)
      .filter((email) => {
        if (!email) return false
        if (seen.has(email)) return false
        seen.add(email)
        return true
      })
  }, [userEmail])

  const [toList, setToList] = useState(() => (defaultTo ? [defaultTo] : []))
  const [optionalCc, setOptionalCc] = useState([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [toError, setToError] = useState('')
  const [ccError, setCcError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setToList(defaultTo ? [defaultTo] : [])
      setOptionalCc([])
      setToInput('')
      setCcInput('')
      setToError('')
      setCcError('')
      setSubmitError('')
      setIsSending(false)
    }
  }, [isOpen, defaultTo, requiredCc])

  const ccRecipients = useMemo(() => {
    const seen = new Set()
    return [...requiredCc, ...optionalCc].filter((email) => {
      if (!email) return false
      if (seen.has(email)) return false
      seen.add(email)
      return true
    })
  }, [requiredCc, optionalCc])

  const subject = useMemo(
    () =>
      formatSubject({
        title: title || 'Informe',
        cliente: datos?.cliente,
        dealId,
      }),
    [title, datos?.cliente, dealId],
  )

  const body = useMemo(
    () =>
      formatBody({
        title: title || 'Informe',
        cliente: datos?.cliente,
        dealId,
        formadorNombre: String(formador?.nombre || '').trim(),
      }),
    [title, datos?.cliente, dealId, formador?.nombre],
  )

  if (!isOpen) return null

  const addRecipient = (type) => {
    const value = type === 'to' ? toInput : ccInput
    const normalized = normalizeEmail(value)
    const setError = type === 'to' ? setToError : setCcError

    if (!normalized) {
      setError('Introduce un correo válido.')
      return
    }
    if (!emailRegex.test(normalized)) {
      setError('Formato de correo no válido. Usa nombre@dominio.es/com')
      return
    }

    if (type === 'to') {
      if (toList.includes(normalized)) {
        setError('Este correo ya está en Para.')
        return
      }
      setToList([...toList, normalized])
      setToInput('')
      setSubmitError('')
      setError('')
    } else {
      if (requiredCc.includes(normalized) || optionalCc.includes(normalized)) {
        setError('Este correo ya está en CC.')
        return
      }
      setOptionalCc([...optionalCc, normalized])
      setCcInput('')
      setSubmitError('')
      setError('')
    }
  }

  const removeTo = (email) => {
    setToList((prev) => prev.filter((item) => item !== email))
  }

  const removeCc = (email) => {
    if (requiredCc.includes(email)) return
    setOptionalCc((prev) => prev.filter((item) => item !== email))
  }

  const handleKeyDown = (event, type) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addRecipient(type)
    }
  }

  const handleCancel = () => {
    if (!isSending) {
      onClose?.()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const finalTo = Array.from(new Set(toList.filter(Boolean)))
    const finalCc = Array.from(new Set(ccRecipients.filter(Boolean)))

    if (!pdf?.base64 || !pdf?.fileName) {
      setSubmitError('No hay ningún PDF generado para adjuntar.')
      return
    }

    if (!finalTo.length) {
      setToError('Añade al menos un destinatario principal.')
      return
    }

    setSubmitError('')
    setIsSending(true)

    try {
      const payload = {
        to: finalTo,
        cc: finalCc,
        subject,
        body,
        attachment: {
          fileName: pdf.fileName,
          base64: pdf.base64,
        },
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
      }

      const response = await fetch('/.netlify/functions/sendReportEmail', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const text = await response.text()
      let data = null
      if (text) {
        try {
          data = JSON.parse(text)
        } catch (error) {
          console.warn('Respuesta de sendReportEmail no JSON:', error, text)
        }
      }

      if (!response.ok) {
        const message = data?.error || data?.message || text || 'No se ha podido enviar el correo.'
        throw new Error(message)
      }

      setIsSending(false)
      onResult?.({ ok: true, data })
      onClose?.()
    } catch (error) {
      console.error('Error enviando el informe por mail:', error)
      setSubmitError(error?.message || 'No se ha podido enviar el correo.')
      setIsSending(false)
      onResult?.({ ok: false, error })
    }
  }

  const canSend = Boolean(pdf?.base64 && pdf?.fileName && toList.length > 0)

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Enviar informe por mail</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={handleCancel}
                disabled={isSending}
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Para</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {toList.map((email) => (
                      <span key={email} className="badge text-bg-secondary d-inline-flex align-items-center gap-2">
                        {email}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light border-0 px-1 py-0"
                          onClick={() => removeTo(email)}
                          aria-label={`Eliminar ${email} de Para`}
                          disabled={isSending}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {!toList.length && <span className="text-muted fst-italic">Sin destinatarios</span>}
                  </div>
                  <div className="input-group">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="nombre@dominio.es"
                      value={toInput}
                      onChange={(event) => {
                        setToInput(event.target.value)
                        setToError('')
                        setSubmitError('')
                      }}
                      onKeyDown={(event) => handleKeyDown(event, 'to')}
                      disabled={isSending}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => addRecipient('to')}
                      disabled={isSending}
                    >
                      Añadir
                    </button>
                  </div>
                  {toError && <div className="text-danger small mt-1">{toError}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label">CC</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {ccRecipients.map((email) => {
                      const required = requiredCc.includes(email)
                      return (
                        <span
                          key={email}
                          className={`badge ${required ? 'text-bg-primary' : 'text-bg-secondary'} d-inline-flex align-items-center gap-2`}
                        >
                          {email}
                          {!required && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-light border-0 px-1 py-0"
                              onClick={() => removeCc(email)}
                              aria-label={`Eliminar ${email} de CC`}
                              disabled={isSending}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      )
                    })}
                  </div>
                  <div className="input-group">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="nombre@dominio.es"
                      value={ccInput}
                      onChange={(event) => {
                        setCcInput(event.target.value)
                        setCcError('')
                        setSubmitError('')
                      }}
                      onKeyDown={(event) => handleKeyDown(event, 'cc')}
                      disabled={isSending}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => addRecipient('cc')}
                      disabled={isSending}
                    >
                      Añadir
                    </button>
                  </div>
                  {ccError && <div className="text-danger small mt-1">{ccError}</div>}
                  <div className="form-text">
                    Siempre se enviará copia a Jaime Martret y al usuario autenticado.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Asunto</label>
                  <input type="text" className="form-control" value={subject} readOnly />
                </div>

                <div className="mb-3">
                  <label className="form-label">Cuerpo del correo</label>
                  <textarea className="form-control" rows={6} value={body} readOnly />
                  <div className="form-text">El PDF adjunto será {pdf?.fileName || 'el informe generado'}.</div>
                </div>

                {submitError && (
                  <div className="alert alert-danger" role="alert">
                    {submitError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={isSending}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSending || !canSend}>
                  {isSending ? 'Enviando…' : 'Enviar'}
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
