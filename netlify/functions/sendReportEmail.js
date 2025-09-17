const ALLOWED_ORIGIN = process.env.REPORTS_ALLOWED_ORIGIN || 'https://www.gepservices.es'

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Expose-Headers': 'content-type',
}

const parseList = (value) => {
  if (!value) return []
  const items = Array.isArray(value) ? value : String(value).split(/[\s,;]+/)
  return items
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

const uniqueEmails = (list) => {
  const seen = new Set()
  const result = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  list.forEach((email) => {
    const normalized = String(email || '').trim()
    if (!normalized) return
    if (!emailRegex.test(normalized)) return
    const key = normalized.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(normalized)
    }
  })
  return result
}

const stripHtml = (html) =>
  (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const resolvePdfBase64 = (pdf = {}) => {
  if (pdf.base64 && typeof pdf.base64 === 'string') {
    return pdf.base64.trim()
  }
  if (pdf.dataUrl && typeof pdf.dataUrl === 'string') {
    const idx = pdf.dataUrl.indexOf(',')
    return idx >= 0 ? pdf.dataUrl.slice(idx + 1).trim() : pdf.dataUrl.trim()
  }
  throw new Error('PDF attachment missing or invalid')
}

const buildPayload = ({
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  pdf,
  metadata,
  from,
  replyTo,
}) => {
  const payload = {
    from,
    to,
    subject: subject || 'Informe GEP',
    attachments: [
      {
        filename: pdf.fileName || 'informe.pdf',
        content: pdf.base64,
        type: 'application/pdf',
      },
    ],
  }

  if (cc.length) payload.cc = cc
  if (bcc.length) payload.bcc = bcc
  if (replyTo) payload.reply_to = replyTo

  if (html) payload.html = html
  if (text) payload.text = text
  if (!payload.html && payload.text) {
    payload.html = payload.text.replace(/\n/g, '<br />')
  }
  if (!payload.text && payload.html) {
    payload.text = stripHtml(payload.html)
  }

  const tags = []
  if (metadata?.dealId) tags.push({ name: 'deal_id', value: String(metadata.dealId) })
  if (metadata?.type) tags.push({ name: 'informe_tipo', value: String(metadata.type) })
  if (metadata?.cliente) tags.push({ name: 'cliente', value: String(metadata.cliente).slice(0, 64) })
  if (tags.length) payload.tags = tags

  return payload
}

const sendViaResend = async (payload) => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')
  const baseUrl = (process.env.RESEND_BASE_URL || 'https://api.resend.com').replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  let data = null
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch (error) {
      console.error('[sendReportEmail] Invalid JSON from Resend:', error, raw)
      if (!response.ok) throw new Error(raw || 'Resend error')
      throw new Error('Unexpected response from Resend')
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || raw || 'Resend error'
    const error = new Error(message)
    error.statusCode = response.status
    throw error
  }

  return data
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' }
  }

  const sharedSecret = process.env.REPORTS_API_TOKEN
  if (!sharedSecret) {
    console.error('[sendReportEmail] Missing REPORTS_API_TOKEN')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Server misconfiguration' }),
    }
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  if (authHeader !== `Bearer ${sharedSecret}`) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const toList = uniqueEmails(parseList(body.to))
    const ccList = uniqueEmails(parseList(body.cc))
    const bccList = uniqueEmails(parseList(body.bcc))

    if (!toList.length) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
        body: JSON.stringify({ error: 'Destinatarios no válidos' }),
      }
    }

    const pdfBase64 = resolvePdfBase64(body.pdf)

    const from = process.env.REPORTS_EMAIL_FROM || process.env.RESEND_FROM || 'informes@gepservices.es'
    const replyTo = body.replyTo || process.env.REPORTS_EMAIL_REPLY_TO || ''

    const textMessage = typeof body.message === 'string' ? body.message : ''
    const htmlMessage = typeof body.html === 'string' ? body.html : ''

    const payload = buildPayload({
      to: toList,
      cc: ccList,
      bcc: bccList,
      subject: typeof body.subject === 'string' ? body.subject : 'Informe GEP',
      html: htmlMessage || null,
      text: textMessage || null,
      pdf: { base64: pdfBase64, fileName: body.pdf?.fileName || 'informe.pdf' },
      metadata: {
        dealId: body.dealId || null,
        type: body.type || null,
        cliente: body.datos?.cliente || null,
      },
      from,
      replyTo,
    })

    const data = await sendViaResend(payload)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ id: data?.id || null, status: 'sent' }),
    }
  } catch (error) {
    const statusCode = error.statusCode || 500
    console.error('[sendReportEmail] error:', error)
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: error.message || 'Unexpected error' }),
    }
  }
}
