// netlify/functions/generateReport.js
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

// ───────── Utils mínimas (solo lo necesario) ─────────
const normalize = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const formatFechaDDMMYYYY = (iso) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const esInstalacionGEPCO = (direccion = '') => {
  const n = normalize(direccion);
  const a = n.includes('primavera, 1') && n.includes('arganda del rey') && n.includes('madrid');
  const b = n.includes('moratin, 100') && n.includes('sabadell') && n.includes('barcelona');
  return a || b;
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  try {
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) throw new Error('Missing OPENAI_API_KEY');

    const { formador, datos } = JSON.parse(event.body || '{}');
    const idioma = (formador?.idioma || 'ES').toUpperCase();

    // ⬇️ NUEVO: fecha en DD/MM/YYYY y sede resuelta (GEPCO si coincide)
    const fechaFmt = formatFechaDDMMYYYY(datos?.fecha || '');
    const sede = datos?.sede || '-';
    const sedeEsGEPCO = esInstalacionGEPCO(sede);
    const sedeRedactada = sedeEsGEPCO ? `nuestras instalaciones de GEPCO (${sede})` : sede;

    const ctx = `
Deal: ${datos?.cliente || '-'} | CIF: ${datos?.cif || '-'}
Sede: ${datos?.sede || '-'} | Fecha: ${datos?.fecha || '-'}
Formador/a: ${formador?.nombre || '-'} | Idioma: ${idioma}
Sesiones: ${datos?.sesiones || '-'} | Alumnos: ${datos?.alumnos || '-'} | Duración(h): ${datos?.duracion || '-'}

Formación: ${datos?.formacionTitulo || '-'}

Parte teórica:
- ${(datos?.contenidoTeorica || []).join('\n- ')}

Parte práctica:
- ${(datos?.contenidoPractica || []).join('\n- ')}

Valoraciones (1-10) — usar solo cualitativos:
Participación=${datos?.escalas?.participacion ?? 0}, Compromiso=${datos?.escalas?.compromiso ?? 0}, Superación=${datos?.escalas?.superacion ?? 0}

Comentarios:
- Puntos fuertes: ${datos?.comentarios?.c11 || '-'}
- Asistencia: ${datos?.comentarios?.c12 || '-'}
- Puntualidad: ${datos?.comentarios?.c13 || '-'}
- Accidentes: ${datos?.comentarios?.c14 || '-'}
- Formaciones futuras: ${datos?.comentarios?.c15 || '-'}
- Entorno de trabajo: ${datos?.comentarios?.c16 || '-'}
- Materiales: ${datos?.comentarios?.c17 || '-'}
`.trim();

    const system = (idioma === 'EN')
      ? 'You are a technical writer. Write in first person as the trainer, formal and precise. Temperature 0.3. Never show numeric scores.'
      : (idioma === 'CA')
        ? 'Ets un redactor tècnic. Escriu en primera persona com a formador, to formal i precís. Temperatura 0.3. No mostris puntuacions numèriques.'
        : 'Eres un redactor técnico. Escribe en primera persona como el formador, tono formal y preciso. Temperatura 0.3. No muestres puntuaciones numéricas.';

    const prompt = `
Redacta un INFORME TÉCNICO en primera persona (yo) basado en el contexto.
No muestres números de las escalas; interpreta en texto (“participación alta/media/baja”, etc.).

Estructura:
- Introducción breve (qué formación impartí, para quién y cuándo).
- Desarrollo (cómo transcurrió, puntos teóricos y prácticos relevantes).
- Incidencias (asistencia, puntualidad, accidentes si los hubo).
- Evaluación cualitativa (participación, compromiso, superación) sin números.
- Recomendaciones (mejoras del entorno, materiales y/o formaciones futuras).

IMPORTANTE:
- Devuelve **solo** un fragmento HTML **puro** (sin \`\`\`, ni etiquetas <html>/<body>, ni estilos inline).
- Usa únicamente <section>, <h3>, <p>, <ul>, <li>. Nada más.
- La fecha debe aparecer en formato DD/MM/YYYY exactamente así: "${fechaFmt || 'DD/MM/YYYY'}".
- La ubicación de la formación ya viene resuelta. Si la sede corresponde a:
  • C/ Primavera, 1, 28500, Arganda del Rey, Madrid
  • Carrer de Moratín, 100, 08206 Sabadell, Barcelona
  entonces son **nuestras instalaciones** (GEPCO). NO lo atribuyas al cliente.
  Usa exactamente: "${sedeRedactada}" y redacta “en nuestras instalaciones de…”.

Contexto:
${ctx}
`.trim();

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error?.message || 'OpenAI error');

    // Sanitizar si el modelo devolviera fences por error
    let html = json.choices?.[0]?.message?.content || '';
    html = html
      .replace(/^\s*```(?:html)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ html }),
    };
  } catch (err) {
    console.error('[generateReport] error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
