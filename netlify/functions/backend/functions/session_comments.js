const ALLOWED_ORIGIN = process.env.REPORTS_ALLOWED_ORIGIN || 'https://www.gepservices.es'
const INTENT_HEADER = 'x-reports-intent'
const EXPECTED_INTENT = 'session-comment'

const DEFAULT_AUTHOR = 'Informes GEP'
const DEFAULT_SERVICE_ORIGIN = 'https://www.gepservices.es'
const SERVICE_PATH = '/backend/functions/session_comments'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type,x-reports-intent',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Expose-Headers': 'content-type',
}

const normalizeHeader = (headers, target) => {
  if (!headers || !target) return ''
  const lower = String(target).toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === lower) {
      return typeof value === 'string' ? value : Array.isArray(value) ? value.join(',') : ''
    }
  }
  return ''
}

const normalizeIntent = (value) => String(value || '').trim().toLowerCase()

const normalizeDealId = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return /^\d+$/.test(raw) ? raw : ''
}

const normalizeUuid = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const canonicalRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (canonicalRegex.test(raw)) {
    return raw.toLowerCase()
  }

  const hex = raw.replace(/[^0-9a-f]/gi, '')
  if (hex.length !== 32) return ''

  const formatted = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  return canonicalRegex.test(formatted) ? formatted.toLowerCase() : ''
}

const normalizeContent = (value) => {
  const safe = String(value || '').replace(/\s+/g, ' ').trim()
  return safe
}

const normalizeAuthor = (value) => {
  const safe = String(value || '').trim()
  if (!safe) return DEFAULT_AUTHOR
  return safe.slice(0, 120)
}

const resolveServiceUrl = (event) => {
  const rawUrl = typeof event?.rawUrl === 'string' ? event.rawUrl : ''
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      parsed.pathname = SERVICE_PATH
      parsed.search = ''
      parsed.hash = ''
      return parsed.toString()
    } catch (error) {
      console.warn('[session_comments] rawUrl parse error, falling back to default', error)
    }
  }

  const origin = normalizeHeader(event?.headers, 'origin') || DEFAULT_SERVICE_ORIGIN
  try {
    const parsed = new URL(origin)
    parsed.pathname = SERVICE_PATH
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch (error) {
    console.warn('[session_comments] origin parse error, using hardcoded fallback', error)
    return `${DEFAULT_SERVICE_ORIGIN}${SERVICE_PATH}`
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  }

  const intentHeader = normalizeIntent(normalizeHeader(event.headers, INTENT_HEADER))
  if (intentHeader !== EXPECTED_INTENT) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Invalid request intent' }),
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const dealId = normalizeDealId(payload?.dealId ?? payload?.deal_id)
  if (!dealId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'dealId must be a numeric string' }),
    }
  }

  const sessionId = normalizeUuid(payload?.sessionId ?? payload?.session_id)
  if (!sessionId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'sessionId must be a valid UUID' }),
    }
  }

  const content = normalizeContent(payload?.content)
  if (!content) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'content must not be empty' }),
    }
  }

  const author = normalizeAuthor(payload?.author)
  const serviceUrl = resolveServiceUrl(event)

  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: normalizeHeader(event.headers, 'authorization'),
      },
      body: JSON.stringify({
        dealId,
        sessionId,
        author,
        content,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = data?.error || data?.message || 'Failed to store comment'
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: message }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ data }),
    }
  } catch (error) {
    console.error('[session_comments] error forwarding request', error)
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Upstream service error' }),
    }
  }
}
