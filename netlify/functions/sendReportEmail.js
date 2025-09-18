import { google } from 'googleapis'

const ALLOWED_ORIGIN = process.env.REPORTS_ALLOWED_ORIGIN || 'https://www.gepservices.es'

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Expose-Headers': 'content-type',
}

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send']

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

const sanitizeTagValue = (value) => {
  if (value === undefined || value === null) return null
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64)
  return normalized ? normalized : null
}

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
  const dealIdTag = sanitizeTagValue(metadata?.dealId)
  if (dealIdTag) tags.push({ name: 'deal_id', value: dealIdTag })
  const typeTag = sanitizeTagValue(metadata?.type)
  if (typeTag) tags.push({ name: 'informe_tipo', value: typeTag })
  const clienteTag = sanitizeTagValue(metadata?.cliente)
  if (clienteTag) tags.push({ name: 'cliente', value: clienteTag })
  if (tags.length) payload.tags = tags

  return payload
}

const wrapBase64 = (base64) => {
  const clean = String(base64 || '').replace(/[^A-Za-z0-9+/=]+/g, '')
  if (!clean) return ''
  const chunkSize = 76
  const chunks = []
  for (let i = 0; i < clean.length; i += chunkSize) {
    chunks.push(clean.slice(i, i + chunkSize))
  }
  return chunks.join('\r\n')
}

const encodeBodyBase64 = (value) => {
  const normalized = String(value || '')
  if (!normalized) return ''
  const base64 = Buffer.from(normalized, 'utf8').toString('base64')
  return wrapBase64(base64)
}

const encodeHeaderValue = (value) => {
  const safe = String(value || '')
  if (!safe) return ''
  return /[\u007f-\uffff]/.test(safe)
    ? `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`
    : safe
}

const buildMimeMessage = (payload) => {
  const boundary = `=_boundary_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`
  const alternativeBoundary = `${boundary}_alt`
  const lines = []

  lines.push(`From: ${payload.from}`)
  lines.push(`To: ${payload.to.join(', ')}`)
  if (payload.cc?.length) lines.push(`Cc: ${payload.cc.join(', ')}`)
  if (payload.bcc?.length) lines.push(`Bcc: ${payload.bcc.join(', ')}`)
  if (payload.reply_to) lines.push(`Reply-To: ${payload.reply_to}`)
  lines.push(`Subject: ${encodeHeaderValue(payload.subject)}`)
  lines.push('MIME-Version: 1.0')
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  lines.push('')

  const hasText = Boolean(payload.text)
  const hasHtml = Boolean(payload.html)

  if (hasText && hasHtml) {
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`)
    lines.push('')

    lines.push(`--${alternativeBoundary}`)
    lines.push('Content-Type: text/plain; charset="utf-8"')
    lines.push('Content-Transfer-Encoding: base64')
    lines.push('')
    lines.push(encodeBodyBase64(payload.text))
    lines.push('')

    lines.push(`--${alternativeBoundary}`)
    lines.push('Content-Type: text/html; charset="utf-8"')
    lines.push('Content-Transfer-Encoding: base64')
    lines.push('')
    lines.push(encodeBodyBase64(payload.html))
    lines.push('')

    lines.push(`--${alternativeBoundary}--`)
    lines.push('')
  } else if (hasHtml || hasText) {
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: text/${hasHtml ? 'html' : 'plain'}; charset="utf-8"`)
    lines.push('Content-Transfer-Encoding: base64')
    lines.push('')
    lines.push(encodeBodyBase64(hasHtml ? payload.html : payload.text))
    lines.push('')
  }

  for (const attachment of payload.attachments || []) {
    if (!attachment?.content) continue
    const filename = attachment.filename || 'attachment'
    const contentType = attachment.type || 'application/octet-stream'
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: ${contentType}; name="${filename}"`)
    lines.push('Content-Transfer-Encoding: base64')
    lines.push(`Content-Disposition: attachment; filename="${filename}"`)
    lines.push('')
    lines.push(wrapBase64(attachment.content))
    lines.push('')
  }

  lines.push(`--${boundary}--`)
  lines.push('')

  return lines.join('\r\n')
}

const encodeBase64Url = (input) =>
  Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

const sendViaGmail = async (payload) => {
  const clientEmail = process.env.GMAIL_CLIENT_EMAIL || ''
  const privateKeyRaw = process.env.GMAIL_PRIVATE_KEY || ''
  const sender = process.env.GMAIL_SENDER || ''

  if (!clientEmail || !privateKeyRaw || !sender) {
    throw new Error('Gmail API not configured')
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: GMAIL_SCOPES,
    subject: sender,
  })

  await auth.authorize()

  const gmail = google.gmail({ version: 'v1', auth })
  const mime = buildMimeMessage(payload)
  const raw = encodeBase64Url(mime)

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })

  return data
}

export const handler = async (event) => {
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

    const from = process.env.GMAIL_SENDER || ''
    const replyTo = body.replyTo || process.env.GMAIL_REPLY_TO || process.env.REPORTS_EMAIL_REPLY_TO || ''

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

    const data = await sendViaGmail(payload)

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
