// netlify/functions/getDeal.js
const BASE = process.env.PIPEDRIVE_API_URL || 'https://api.pipedrive.com/v1';
const TOKEN = process.env.PIPEDRIVE_API_TOKEN;

const DEAL_DIRECCION_INCOMPANY = '8b2a7570f5ba8aa4754f061cd9dc92fd778376a7';
const ORG_CIF = '6d39d015a33921753410c1bab0b067ca93b8cf2c';

const ALLOWED_ORIGIN = process.env.REPORTS_ALLOWED_ORIGIN || 'https://www.gepservices.es';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization,content-type',
  'Access-Control-Expose-Headers': 'content-type',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  const sharedSecret = process.env.REPORTS_API_TOKEN;
  if (!sharedSecret) {
    console.error('[getDeal] Missing REPORTS_API_TOKEN');
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

  try {
    if (!TOKEN) throw new Error('Missing PIPEDRIVE_API_TOKEN');
    const { dealId } = JSON.parse(event.body || '{}');
    if (!dealId) throw new Error('dealId is required');

    // Deal
    const dealRes = await fetch(`${BASE}/deals/${encodeURIComponent(dealId)}?api_token=${TOKEN}`);
    const dealJson = await dealRes.json();
    if (!dealJson?.success || !dealJson?.data) throw new Error('Deal not found');
    const deal = dealJson.data;

    const orgId = deal.org_id?.value ?? deal.org_id ?? null;
    const personId = deal.person_id?.value ?? deal.person_id ?? null;
    const ownerId = deal.owner_id?.value ?? deal.owner_id ?? null;

    const sede = deal[DEAL_DIRECCION_INCOMPANY] || '';

    // Organización
    let cliente = '', direccionOrg = '', cif = '';
    if (orgId) {
      const orgRes = await fetch(`${BASE}/organizations/${orgId}?api_token=${TOKEN}`);
      const orgJson = await orgRes.json();
      if (orgJson?.success && orgJson?.data) {
        cliente = orgJson.data.name || '';
        direccionOrg = orgJson.data.address || '';
        cif = orgJson.data[ORG_CIF] || '';
      }
    }

    // Persona de contacto
    let contacto = '';
    if (personId) {
      const pRes = await fetch(`${BASE}/persons/${personId}?api_token=${TOKEN}`);
      const pJson = await pRes.json();
      if (pJson?.success && pJson?.data) contacto = pJson.data.name || '';
    }

    // Comercial (preferir owner_name del deal; si no, /users)
    let comercial = deal.owner_name || '';
    if (!comercial && ownerId) {
      const uRes = await fetch(`${BASE}/users/${ownerId}?api_token=${TOKEN}`);
      const uJson = await uRes.json();
      if (uJson?.success && uJson?.data) comercial = uJson.data.name || '';
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ cliente, cif, direccionOrg, sede, contacto, comercial }),
    };
  } catch (err) {
    console.error('[getDeal] error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ error: err.message }) };
  }
}
