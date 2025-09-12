export const handler = async (event) => {
  try {
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = process.env
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta OPENAI_API_KEY' }) }
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const { formador, datos, previousText } = body || {}

    // Bloque "Datos generales" (se copia tal cual en el informe)
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

    const parteTeorica = (datos?.contenidoTeorica || []).map(i=>`- ${i}`).join('\n') || '- (sin puntos)'
    const partePractica = (datos?.contenidoPractica || []).map(i=>`- ${i}`).join('\n') || '- (sin puntos)'

    // Números NO visibles → solo cualitativo
    const valoraciones = {
      participacion: Number(datos?.escalas?.participacion ?? 0),
      compromiso: Number(datos?.escalas?.compromiso ?? 0),
      superacion: Number(datos?.escalas?.superacion ?? 0),
    }

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
Eres un redactor técnico de GEP Group. Escribe en PRIMERA PERSONA SINGULAR (yo), tono formal técnico PRL/PCI, preciso y claro, sin florituras. Temperatura baja.
Reglas:
- No muestres cifras de valoraciones (1–10). Interprétalas solo en lenguaje cualitativo (p. ej., participación alta/media/baja).
- No inventes datos. Usa comentarios del formador como base factual.
- Mantén coherencia terminológica PRL/PCI.
- Devuelve SOLO el TEXTO de la sección "Análisis y recomendaciones" (sin HTML). Párrafos breves.
- Idioma: usa el indicado (ES/CA/EN).
`.trim()

    const userPrompt = `
### Idioma: ${datos?.idioma || 'ES'}
### Formador: ${formador?.nombre || ''}

### Datos generales (contexto, NO reescribir, NO devolver)
${datosGenerales}

### Contenido de la formación (contexto, NO reescribir, NO devolver)
[Parte Teórica]
${parteTeorica}
[Parte Práctica]
${partePractica}

### Valoraciones (contexto para interpretar cualitativamente, NO devolver números)
- Participación: ${valoraciones.participacion}
- Compromiso: ${valoraciones.compromiso}
- Superación: ${valoraciones.superacion}

### Comentarios del formador (contexto)
${comentarios.map(([t,v])=>`- ${t}: ${v}`).join('\n') || '- (sin comentarios)'}

${previousText ? `### Borrador anterior (contexto para mejorar y refinar, NO devolver tal cual)
${previousText}` : ''}

### Tarea
Escribe la sección "Análisis y recomendaciones" en PRIMERA PERSONA, tono técnico. Explica con claridad:
- Qué ha pasado en la formación (síntesis).
- Incidencias observadas.
- Puntos de mejora detectados.
- Recomendaciones futuras (formativas, entorno, materiales) si aplican.

No incluyas encabezados ni listados de datos generales ni puntos teórico/práctico (eso va en otras secciones). Solo redacta la sección solicitada.
`.trim()

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
    const analysisText = (data?.choices?.[0]?.message?.content || '').trim()

    return { statusCode: 200, body: JSON.stringify({ analysisText }) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'improveReport error', details: String(e) }) }
  }
}
