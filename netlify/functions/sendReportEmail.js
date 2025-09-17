// netlify/functions/sendReportEmail.js
const ALLOWED_ORIGIN = process.env.REPORTS_ALLOWED_ORIGIN || 'https://www.gepservices.es';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Expose-Headers': 'content-type',
};

const ensureString = (value) => (typeof value === 'string' ? value.trim() : '');

const splitAddresses = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => ensureString(item))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const extractBase64 = (attachment, index) => {
  if (!attachment) throw new Error(`attachments[${index}] no contiene datos`);

  const fromObj = (field) => {
    const value = attachment[field];
    return typeof value === 'string' ? value.trim() : '';
  };

  let raw = '';
  if (typeof attachment === 'string') {
    raw = attachment.trim();
  } else {
    raw =
      fromObj('content') ||
      fromObj('data') ||
      fromObj('dataUrl') ||
      fromObj('blob') ||
      fromObj('base64');
  }

  if (!raw) throw new Error(`attachments[${index}] carece de contenido en base64`);

  const trimmed = raw.trim();
  const cleaned = trimmed.startsWith('data:')
    ? trimmed.slice(trimmed.indexOf(',') + 1).trim()
    : trimmed;

  if (!cleaned) throw new Error(`attachments[${index}] contiene un base64 vacío`);

  try {
    const buffer = Buffer.from(cleaned, 'base64');
    if (!buffer || buffer.length === 0) throw new Error('Contenido vacío');
    return buffer.toString('base64');
  } catch (error) {
    throw new Error(`attachments[${index}] no es un base64 válido`);
  }
};

const normaliseAttachments = (attachments) => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    throw new Error('attachments debe ser un array con al menos un elemento');
  }

  return attachments.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`attachments[${index}] debe ser un objeto`);
    }

    const filename = ensureString(item.filename || item.name);
    if (!filename) throw new Error(`attachments[${index}] necesita filename`);

    const contentType = ensureString(item.contentType || item.type) || 'application/pdf';
    const content = extractBase64(item, index);

    return {
      filename,
      content,
      contentType,
    };
  });
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const sharedSecret = process.env.REPORTS_API_TOKEN;
  if (!sharedSecret) {
    console.error('[sendReportEmail] Missing REPORTS_API_TOKEN');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Server misconfiguration' }),
    };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const expectedHeader = `Bearer ${sharedSecret}`;
  if (authHeader !== expectedHeader) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('[sendReportEmail] Missing RESEND_API_KEY');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Email service misconfiguration' }),
    };
  }

  let data = null;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  try {
    const from = ensureString(data.from);
    if (!from) throw new Error('from es obligatorio');

    const to = splitAddresses(data.to);
    if (!to.length) throw new Error('to debe incluir al menos un destinatario');

    const cc = splitAddresses(data.cc);
    const subject = ensureString(data.subject);
    if (!subject) throw new Error('subject es obligatorio');

    const text = ensureString(data.text);
    if (!text) throw new Error('text es obligatorio');

    const attachments = normaliseAttachments(data.attachments);

    const body = {
      from,
      to,
      subject,
      text,
      attachments: attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    };
    if (cc.length) body.cc = cc;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let json = null;
    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch (error) {
        console.error('[sendReportEmail] Error parsing response JSON:', error, raw);
      }
    }

    if (!response.ok) {
      const message = json?.error?.message || json?.message || raw || 'Email provider error';
      throw new Error(message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ success: true, id: json?.id || null }),
    };
  } catch (error) {
    console.error('[sendReportEmail] error:', error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: error.message || 'Unknown error' }),
    };
  }
}
