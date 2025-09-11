export async function handler(event) {
  try {
    const dealId = event.queryStringParameters?.dealId
      || (event.body ? JSON.parse(event.body).dealId : null);
    if (!dealId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'dealId requerido' }) };
    }

    const API = process.env.PIPEDRIVE_API_URL || 'https://api.pipedrive.com/v1';
    const TOKEN = process.env.PIPEDRIVE_API_TOKEN;
    if (!TOKEN) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta PIPEDRIVE_API_TOKEN' }) };
    }

    const q = async (path) => {
      const url = `${API}${path}${path.includes('?') ? '&' : '?'}api_token=${TOKEN}`;
      const r = await fetch(url);
      return r.json();
    };

    const dealResp = await q(`/deals/${dealId}`);
    const deal = dealResp?.data;
    if (!deal) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Deal no encontrado' }) };
    }

    const org = deal.org_id ? (await q(`/organizations/${deal.org_id.value || deal.org_id}`))?.data : null;
    const person = deal.person_id ? (await q(`/persons/${deal.person_id.value || deal.person_id}`))?.data : null;
    const owner = deal.user_id ? (await q(`/users/${deal.user_id.value || deal.user_id}`))?.data : null;

    const prodsResp = await q(`/deals/${dealId}/products`);
    const items = prodsResp?.data || [];

    const productosFiltrados = items.filter(it => {
      const p = it.product || {};
      const cat = p.category;
      const code = (p.code || '').toLowerCase();
      return cat === 'Formación' && code.startsWith('form-');
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ deal, organization: org, person, owner, productosFiltrados })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error en getDeal', details: String(e) }) };
  }
}
