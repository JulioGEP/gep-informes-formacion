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

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const pickLabel = (idioma, es, ca, en) => {
  const lang = (idioma || '').toUpperCase();
  if (lang === 'CA') return ca;
  if (lang === 'EN') return en;
  return es;
};

const ensureSection = (html, title) => {
  const trimmed = sanitizeContent(html);
  if (!trimmed) return '';
  if (/<section[\s>]/i.test(trimmed)) return trimmed;

  if (/<([a-z][a-z0-9]*)\b[^>]*>/i.test(trimmed)) {
    const needsHeading = !/<h[1-6][^>]*>/i.test(trimmed);
    const body = needsHeading ? `<h3>${title}</h3>${trimmed}` : trimmed;
    return `<section>${body}</section>`;
  }

  const safe = compactText(trimmed);
  return safe ? `<section><h3>${title}</h3><p>${escapeHtml(safe)}</p></section>` : '';
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
    const sedeRedactada = sedeEsGEPCO ? `nuestras instalaciones de GEPCO (${sede})` : sede;

    let html = '';

    if (tipo === 'simulacro') {
      const safe = (value) => {
        const text = compactText(value);
        return text === '' ? '-' : text;
      };

      const cronologiaArray = Array.isArray(datos?.cronologia) ? datos.cronologia : [];
      const cronologiaListado = cronologiaArray
        .map((c, idx) => {
          const hora = safe(c?.hora);
          const texto = safe(c?.texto);
          return `${idx + 1}. ${hora} — ${texto}`;
        })
        .join('\n');

      const ctx = [
        `Cliente: ${safe(datos?.cliente)}`,
        `CIF: ${safe(datos?.cif)} | Dirección: ${safe(sedeRedactada)}`,
        `Auditor: ${safe(formador?.nombre)} | Idioma: ${idioma}`,
        `Sesiones: ${safe(datos?.sesiones)} | Duración(h): ${safe(datos?.duracion)}`,
        '',
        `Desarrollo declarado: ${safe(datos?.desarrollo)}`,
        '',
        'Cronología declarada:',
        cronologiaListado ? cronologiaListado : 'Sin cronología registrada',
        '',
        `Incidencias detectadas: ${safe(datos?.comentarios?.c12)}`,
        `Accidentes: ${safe(datos?.comentarios?.c14)}`,
        `Observaciones generales: ${safe(datos?.comentarios?.c11)}`,
        `Recomendaciones formaciones: ${safe(datos?.comentarios?.c15)}`,
        `Recomendaciones entorno: ${safe(datos?.comentarios?.c16)}`,
        `Recomendaciones materiales: ${safe(datos?.comentarios?.c17)}`,
      ]
        .join('\n')
        .trim();

      const system = buildSimulacroSystem(idioma);
      const cronologiaJson = JSON.stringify(cronologiaArray, null, 2);
      const desarrolloOriginal = safe(datos?.desarrollo);
      const incidenciasTexto = safe(datos?.comentarios?.c12);
      const observacionesTexto = safe(datos?.comentarios?.c11);
      const recForm = safe(datos?.comentarios?.c15);
      const recEntorno = safe(datos?.comentarios?.c16);
      const recMateriales = safe(datos?.comentarios?.c17);

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
            '- El primer nodo debe ser un <h3> con el título exacto.',
            `- Resume y amplía el campo "Desarrollo": "${desarrolloOriginal}" explicando el escenario y el problema que se ensayó.`,
            '- Incluye un breve contexto de la cronología en un único párrafo inicial y destaca los riesgos principales si se ejecuta mal.',
            '- Usa subtítulos con <h4> seguidos de <p> para desarrollar cada idea relevante.',
          ].join('\n'),
        },
        {
          title: cronologiaTitle,
          temperature: 0.4,
          instructions: [
            `Genera la sección HTML "${cronologiaTitle}" del simulacro.`,
            '- Empieza con un <h3> con el título.',
            '- A partir de la cronología declarada crea un bloque por cada punto usando <h4> con la hora y un resumen breve, seguido de un <p> que explique lo sucedido y las consecuencias de ejecutarlo incorrectamente.',
            '- No inventes eventos nuevos, solo reordena o resume los existentes.',
            '- Si no hay cronología registrada, explica en un único párrafo por qué es imprescindible documentarla.',
            `- Cronología en JSON: ${cronologiaJson}`,
          ].join('\n'),
        },
        {
          title: incidenciasTitle,
          temperature: 0.6,
          instructions: [
            `Desarrolla la sección "${incidenciasTitle}" del informe.`,
            '- Introduce el título en <h3> y utiliza <h4> con <p> para cada incidencia relevante.',
            `- Contexto de incidencias detectadas: "${incidenciasTexto}" y accidentes: "${safe(datos?.comentarios?.c14)}".`,
            '- Analiza qué impacto tienen sobre la seguridad y el cumplimiento de los procedimientos.',
            '- Amplía la información con recomendaciones inmediatas sin inventar sucesos.',
          ].join('\n'),
        },
        {
          title: observacionesTitle,
          temperature: 0.7,
          instructions: [
            `Redacta la sección "${observacionesTitle}" en formato HTML.`,
            '- Incluye <h3> y subsecciones con <h4> y <p> para desarrollar cada observación.',
            `- Observaciones aportadas: "${observacionesTexto}".`,
            '- Añade análisis cualitativo sobre el comportamiento del equipo y aspectos organizativos.',
          ].join('\n'),
        },
        {
          title: recomendacionesTitle,
          temperature: 0.7,
          instructions: [
            `Elabora la sección "${recomendacionesTitle}" justificando cada punto.`,
            '- Empieza con <h3> y emplea <h4> con <p> explicativos para cada recomendación.',
            `- Recomendaciones formativas: "${recForm}".`,
            `- Recomendaciones sobre entorno: "${recEntorno}".`,
            `- Recomendaciones sobre materiales: "${recMateriales}".`,
            '- Indica brevemente por qué cada recomendación es necesaria para corregir riesgos detectados.',
          ].join('\n'),
        },
      ];

      const promptContext = `Contexto del simulacro:\n${ctx}`;

      const generated = await Promise.allSettled(
        sections.map(async (section) => {
          const prompt = `${section.instructions}\n\n${promptContext}`;

          const content = await callChatCompletion({
            apiKey: API_KEY,
            temperature: section.temperature,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt },
            ],
          });

          return ensureSection(content, section.title);
        }),
      );

      html = generated
        .map((result, idx) => {
          if (result.status === 'fulfilled' && result.value) return result.value;
          console.error(`[generateReport] sección "${sections[idx].title}"`, result.reason);
          return `<section><h3>${sections[idx].title}</h3><p>No se pudo generar esta sección de forma automática.</p></section>`;
        })
        .filter(Boolean)
        .join('\n');
    } else {
      const ctx = `
Deal: ${datos?.cliente || '-'} | CIF: ${datos?.cif || '-'}
Sede: ${sedeRedactada || '-'} | Fecha: ${datos?.fecha || '-'}
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
        ? 'You are a technical writer. Write in first person as the trainer, formal and precise. Never show numeric scores. Respond using HTML with <section>, <h3>, <p>, <ul>, <li>.'
        : (idioma === 'CA')
          ? 'Ets un redactor tècnic. Escriu en primera persona com a formador, to formal i precís. No mostris puntuacions numèriques. Respon amb HTML utilitzant <section>, <h3>, <p>, <ul>, <li>.'
          : 'Eres un redactor técnico. Escribe en primera persona como el formador, tono formal y preciso. No muestres puntuaciones numéricas. Devuelve HTML usando <section>, <h3>, <p>, <ul>, <li>.';

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
  entonces son **nuestras instalaciones** (GEPCO). Si no, indica "en sus instalaciones".

Contexto:
${ctx}
`.trim();

      html = await callChatCompletion({
        apiKey: API_KEY,
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      });
    }

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
