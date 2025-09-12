// netlify/functions/improveReport.js
export const handler = async (event) => {
  try {
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = process.env
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta OPENAI_API_KEY' }) }
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const { dealId, formador, datos, borrador } = body || {}

    const datosGenerales = `
Cliente: ${datos?.cliente || ''}
CIF: ${datos?.cif || ''}
Dirección (Organización): ${datos?.direccionOrg || ''}
Dirección de la formación: ${datos?.sede || ''}
Fecha: ${datos?.fecha || ''}
Sesiones: ${datos?.sesiones || 1}
Alumnos: ${datos?.alumnos || ''}
Duración: ${datos?.duracion || ''} h
Formador/a: ${formador?.nombre || ''}
Formación: ${datos?.formacionTitulo || '(no especificada)'}
`.trim()

    const parteTeorica = (datos?.contenidoTeorica || []).map(i=>`- ${i}`).join('\n')
    const partePractica = (datos?.contenidoPractica || []).map(i=>`- ${i}`).join('\n')

    const valoraciones = `
Participación: ${datos?.escalas?.participacion ?? '-'}
Compromiso: ${datos?.escalas?.compromiso ?? '-'}
Superación: ${datos?.escalas?.superacion ?? '-'}
`.trim()

    const comentarios = [
      ['Puntos fuertes de los alumnos a destacar', datos?.comentarios?.c11],
      ['Incidencias: Referentes a la asistencia', datos?.comentarios?.c12],
      ['Incidencias: Referentes a la Puntualidad', datos?.comentarios?.c13],
      ['Incidencias: Accidentes', datos?.comentarios?.c14],
      ['Recomendaciones: Formaciones Futuras', datos?.comentarios?.c15],
      ['Recomendaciones: Del entorno de Trabajo', datos?.comentarios?.c16],
      ['Recomendaciones: De Materiales', datos?.comentarios?.c17],
    ].filter(([,v]) => v && String(v).trim())

    const systemPrompt = `
Eres un redactor técnico de GEP Group. Escribe en español (o en el idioma indicado) con tono formal técnico (PRL/PCI), preciso, claro y sin florituras. Temperatura baja (estilo sobrio).
Estructura y normas:
1) "Datos generales": copiar EXACTAMENTE como se proporciona (sin reescrituras). Formato lista/definiciones claro.
2) "Contenido de la formación": no reescribir los puntos; muéstralos en dos listas bajo "Parte Teórica" y "Parte Práctica".
3) "Análisis y recomendaciones": redacta un texto técnico que interprete las valoraciones (1–10) y los comentarios del formador. Incluye incidencias, puntos de mejora y recomendaciones futuras. Nada de inventar datos.
4) Devuelve HTML Bootstrap (contenedor <div>) con encabezados h6 y párrafos/listas. No devuelvas <html> ni <body>.
5) Mantén coherencia terminológica PRL/PCI. Evita adjetivos superfluos.
    `.trim()

    const userPrompt = `
### Idioma: ${datos?.idioma || 'ES'}
### Datos generales (copiar tal cual)
${datosGenerales}

### Contenido de la formación (puntos, NO reescribir)
[Parte Teórica]
${parteTeorica || '- (sin puntos)'}
[Parte Práctica]
${partePractica || '- (sin puntos)'}

### Valoraciones del 1 al 10
${valoraciones}

### Comentarios del formador (si los hay)
${comentarios.map(([t,v])=>`- ${t}: ${v}`).join('\n') || '- (sin comentarios)'}

### Pedido
Genera el bloque HTML Bootstrap con 3 secciones:
1) Datos generales (sin cambios)
2) Contenido de la formación (listas teórica/práctica)
3) Análisis y recomendaciones (texto redactado técnicamente a partir de valoraciones y comentarios)
    `.trim()

    // OpenAI Chat Completions
    const base = OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI error', details: errText }) }
    }
    const data = await resp.json()
    const html = data?.choices?.[0]?.message?.content || ''

    return { statusCode: 200, body: JSON.stringify({ html }) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'improveReport error', details: String(e) }) }
  }
}
