// netlify/functions/generateReport.js
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

const MODEL = 'gpt-4o-mini';

const sanitizeContent = (content = '') =>
  (content || '')
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

const compactText = (value) => {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return str.replace(/\s+/g, ' ').trim();
};

const pickLabel = (idioma, es, ca, en) => {
  if ((idioma || '').toUpperCase() === 'CA') return ca;
  if ((idioma || '').toUpperCase() === 'EN') return en;
  return es;
};

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ensureSection = (html, title) => {
  const trimmed = sanitizeContent(html);
  if (!trimmed) return '';
  if (/<section[\s>]/i.test(trimmed)) return trimmed;

  const hasHtmlTags = /<([a-z][a-z0-9]*)\b[^>]*>/i.test(trimmed);
  if (hasHtmlTags) {
    const body = /<h[1-6][^>]*>/i.test(trimmed) ? trimmed : `<h3>${title}</h3>${trimmed}`;
    return `<section>${body}</section>`;
  }

  const safe = compactText(trimmed);
  if (!safe) return '';
  return `<section><h3>${title}</h3><p>${escapeHtml(safe)}</p></section>`;
};

const callChatCompletion = async ({ apiKey, temperature, messages }) => {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      messages,
    }),
  });

  const raw = await resp.text();
  let json;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch (error) {
    const snippet = raw ? raw.slice(0, 200) : 'cuerpo vacío';
    throw new Error(`OpenAI response parse error (${resp.status}): ${snippet}`);
  }

  if (!resp.ok) throw new Error(json?.error?.message || `OpenAI error ${resp.status}`);
  return sanitizeContent(json?.choices?.[0]?.message?.content || '');
};

const buildSimulacroSystem = (idioma) => {
  const lang = (idioma || 'ES').toUpperCase();
  if (lang === 'EN') {
    return 'You are a technical writer for GEP Group, expert in emergency drills. Reply in first person plural (we) with a formal PRL/PCI emergency tone. Respond only with HTML using <section>, <h3>, <h4>, <p>, <ul>, <li>. Never show numeric scores and never invent data.';
  }
  if (lang === 'CA') {
    return 'Ets un redactor tècnic de GEP Group, expert en auditar simulacres. Respon sempre en primera persona del plural (nosaltres) amb to formal tècnic PRL/PCI i emergències. Respon únicament amb HTML utilitzant <section>, <h3>, <h4>, <p>, <ul>, <li>. No mostris puntuacions numèriques ni inventis dades.';
  }
  return 'Eres un redactor técnico de GEP Group, experto en auditar simulacros. Responde siempre en primera persona plural (nosotros) con tono formal técnico PRL/PCI y emergencias. Devuelve únicamente HTML usando <section>, <h3>, <h4>, <p>, <ul>, <li>. No muestres puntuaciones numéricas ni inventes datos.';
};

async function generarHtmlSimulacro({ apiKey, idioma, datos, formador }) {
  const lang = (idioma || 'ES').toUpperCase();
  const safe = (value) => {
    const text = compactText(value);
    return text === '' ? '-' : text;
  };

  const cronologiaArray = Array.isArray(datos?.cronologia) ? datos.cronologia : [];
  const cronologiaJson = JSON.stringify(cronologiaArray, null, 2);
  const cronologiaListado = cronologiaArray
    .map((c, idx) => {
      const hora = safe(c?.hora);
      const texto = safe(c?.texto);
      return `${idx + 1}. ${hora} — ${texto}`;
    })
    .join('\n');

  const ctx = [
    `Cliente: ${safe(datos?.cliente)}`,
    `CIF: ${safe(datos?.cif)} | Dirección: ${safe(datos?.sede)}`,
    `Auditor: ${safe(formador?.nombre)} | Idioma: ${lang}`,
    `Sesiones: ${safe(datos?.sesiones)} | Duración(h): ${safe(datos?.duracion)}`,
    '',
    'Desarrollo propuesto:',
    safe(datos?.desarrollo),
    '',
    'Cronología declarada:',
    cronologiaListado ? `- ${cronologiaListado.split('\n').join('\n- ')}` : '- Sin cronología registrada',
    '',
    `Valoraciones (1-10): Participación=${datos?.escalas?.participacion ?? 0}, Compromiso=${datos?.escalas?.compromiso ?? 0}, Superación=${datos?.escalas?.superacion ?? 0}`,
    '',
    `Incidencias detectadas: ${safe(datos?.comentarios?.c12)}`,
    `Accidentes: ${safe(datos?.comentarios?.c14)}`,
    `Recomendaciones formaciones: ${safe(datos?.comentarios?.c15)}`,
    `Recomendaciones entorno: ${safe(datos?.comentarios?.c16)}`,
    `Recomendaciones materiales: ${safe(datos?.comentarios?.c17)}`,
    `Observaciones generales: ${safe(datos?.comentarios?.c11)}`,
  ]
    .join('\n')
    .trim();

  const system = buildSimulacroSystem(idioma);

  const participacion = datos?.escalas?.participacion ?? '';
  const compromiso = datos?.escalas?.compromiso ?? '';
  const superacion = datos?.escalas?.superacion ?? '';

  const incidenciasTexto = safe(datos?.comentarios?.c12);
  const accidentesTexto = safe(datos?.comentarios?.c14);
  const observacionesTexto = safe(datos?.comentarios?.c11);
  const recForm = safe(datos?.comentarios?.c15);
  const recEntorno = safe(datos?.comentarios?.c16);
  const recMateriales = safe(datos?.comentarios?.c17);
  const desarrolloOriginal = safe(datos?.desarrollo);

  const desarrolloTitle = pickLabel(idioma, 'DESARROLLO', 'DESENVOLUPAMENT', 'DEVELOPMENT');
  const cronologiaTitle = pickLabel(idioma, 'CRONOLOGÍA', 'CRONOLOGIA', 'TIMELINE');
  const incidenciasTitle = pickLabel(idioma, 'INCIDENCIAS DETECTADAS', 'INCIDÈNCIES DETECTADES', 'DETECTED INCIDENTS');
  const observacionesTitle = pickLabel(idioma, 'OBSERVACIONES', 'OBSERVACIONS', 'OBSERVATIONS');
  const recomendacionesTitle = pickLabel(idioma, 'RECOMENDACIONES', 'RECOMANACIONS', 'RECOMMENDATIONS');

  const sections = [
    {
      title: desarrolloTitle,
      temperature: 0.4,
      instructions: [
        `Genera la sección HTML "${desarrolloTitle}" del informe del simulacro.`,
        '- El primer elemento debe ser un <h3> con el título exacto.',
        `- Contenido original del campo "Desarrollo": "${desarrolloOriginal}". Resúmelo y amplíalo sin copiar literalmente.`,
        '- Describe el escenario, el problema simulado y la respuesta que debíamos ensayar.',
        '- Añade detalles sobre los riesgos principales y qué podía salir mal si no se seguían los procedimientos.',
        '- Redacta en primera persona plural y no inventes datos nuevos.',
      ].join('\n'),
    },
    {
      title: cronologiaTitle,
      temperature: 0.4,
      instructions: [
        `Genera la sección HTML "${cronologiaTitle}" del informe del simulacro.`,
        '- El primer elemento debe ser un <h3> con el título exacto.',
        '- Empieza con un <p> muy breve (máximo dos frases) que contextualice la cronología.',
        '- Luego, crea un subapartado independiente por cada entrada de la cronología original en el mismo orden.',
        '- Cada subapartado debe usar un <section> con un <h4> que combine la hora y un subtítulo orientado al riesgo, seguido de un <p> que detalle lo más relevante y qué podría ocurrir si se gestiona mal.',
        '- Si no hay cronología, incluye un <p> indicando que no se registraron eventos.',
        `Cronología original (JSON):\n${cronologiaJson}`,
      ].join('\n'),
    },
    {
      title: incidenciasTitle,
      temperature: 0.6,
      instructions: [
        `Genera la sección HTML "${incidenciasTitle}".`,
        '- El primer elemento debe ser un <h3> con el título exacto.',
        `- Analiza las incidencias y accidentes registrados: incidencias="${incidenciasTexto}", accidentes="${accidentesTexto}".`,
        '- Explica causas probables, impacto y riesgos de no corregirlas, enlazándolas con la cronología cuando corresponda.',
        '- Redacta varios párrafos o una lista con <ul>/<li> si existen varios puntos críticos.',
        '- Si no hubo incidencias, indica qué controles funcionaron y por qué.',
      ].join('\n'),
    },
    {
      title: observacionesTitle,
      temperature: 0.7,
      instructions: [
        `Genera la sección HTML "${observacionesTitle}".`,
        '- El primer elemento debe ser un <h3> con el título exacto.',
        `- Amplía las observaciones generales (contenido: "${observacionesTexto}") con comentarios técnicos sobre coordinación, participación y tiempos de respuesta.`,
        `- Interpreta las valoraciones numéricas en términos cualitativos (participación=${participacion}, compromiso=${compromiso}, superación=${superacion}) sin mostrar cifras.`,
        '- Desarrolla la reflexión en varios párrafos, añadiendo matices profesionales.',
        '- Si faltan observaciones, explica que no se registraron y justifica la ausencia con los datos disponibles.',
      ].join('\n'),
    },
    {
      title: recomendacionesTitle,
      temperature: 0.7,
      instructions: [
        `Genera la sección HTML "${recomendacionesTitle}".`,
        '- El primer elemento debe ser un <h3> con el título exacto.',
        `- Construye recomendaciones justificadas a partir de: formaciones="${recForm}", entorno="${recEntorno}", materiales="${recMateriales}".`,
        '- Por cada recomendación, justifica por qué es necesaria y qué riesgo mitiga; usa <ul>/<li> si precisas listar acciones.',
        '- Mantén un enfoque proactivo orientado a la mejora continua.',
        '- Si no se propusieron recomendaciones, sugiere un plan mínimo coherente con el contexto sin inventar datos externos.',
      ].join('\n'),
    },
  ];

  const promptContext = `Contexto del simulacro:\n${ctx}`;

  const tasks = sections.map((section) =>
    (async () => {
      const prompt = `${section.instructions}\n\n${promptContext}`;
      const content = await callChatCompletion({
        apiKey,
        temperature: section.temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      });
      return sanitizeContent(content);
    })(),
  );

  const results = await Promise.allSettled(tasks);

  const htmlSections = results
    .map((result, index) => {
      const section = sections[index];

      if (result.status === 'fulfilled') {
        const ensured = ensureSection(result.value, section.title);
        if (ensured) return ensured;
        console.warn(`[generateReport] sección "${section.title}" vacía tras asegurado`);
      } else {
        console.error(`[generateReport] sección "${section.title}"`, result.reason);
      }

      return `<section><h3>${section.title}</h3><p>No se pudo generar esta sección de forma automática.</p></section>`;
    })
    .filter(Boolean);

  return htmlSections.join('\n');
}

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
    const tipo = datos?.tipo || 'formacion';

    const fechaFmt = formatFechaDDMMYYYY(datos?.fecha || '');
    const sede = datos?.sede || '-';
    const sedeEsGEPCO = esInstalacionGEPCO(sede);

    if (tipo === 'simulacro') {
      const html = await generarHtmlSimulacro({ apiKey: API_KEY, idioma, datos, formador });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...cors },
        body: JSON.stringify({ html }),
      };
    }

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
- Si la sede de la formación corresponde a:
  • C/ Primavera, 1, 28500, Arganda del Rey, Madrid
  • Carrer de Moratín, 100, 08206 Sabadell, Barcelona
  entonces son **nuestras instalaciones** (GEPCO).Sino, di que "en sus instalaciones"

Contexto:
${ctx}
`.trim();

    const html = await callChatCompletion({
      apiKey: API_KEY,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });

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
