export async function handler(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { dealId, formador, datos } = body || {};

    const interpret = (n)=> n >= 8 ? 'alta' : (n >= 4 ? 'media' : 'baja');
    const interpretaciones = [
      `Participación: ${interpret(datos?.escalas?.participacion)}; observaciones: ${datos?.comentarios?.c11 || '—'}`,
      `Compromiso: ${interpret(datos?.escalas?.compromiso)}; observaciones: ${datos?.comentarios?.c12 || '—'}`,
      `Superación: ${interpret(datos?.escalas?.superacion)}; observaciones: ${datos?.comentarios?.c13 || '—'}`
    ].join('\n');

    const formaciones = (datos?.productos||[])
      .map(p=>`- ${p.product?.code || ''} · ${p.product?.name || ''}`).join('\n');

    const idioma = (datos?.idioma || 'ES');
    const base = {
      ES: {
        titulo: 'Informe de formación',
        resumen:
`Cliente: ${datos?.cliente || ''} (CIF: ${datos?.cif || ''})
Sede: ${datos?.sede || ''}
Fecha: ${datos?.fecha || ''}
Alumnos: ${datos?.alumnos || ''}
Duración: ${datos?.duracion || ''} h
Formador: ${formador?.nombre || ''}`,
        guia: 'Redacta con estilo formal técnico (PCI/PRL), preciso, sin florituras. Tono objetivo y claro. Estructura en secciones.'
      },
      CA: {
        titulo: 'Informe de formació',
        resumen:
`Client: ${datos?.cliente || ''} (CIF: ${datos?.cif || ''})
Seu: ${datos?.sede || ''}
Data: ${datos?.fecha || ''}
Alumnes: ${datos?.alumnos || ''}
Durada: ${datos?.duracion || ''} h
Formador/a: ${formador?.nombre || ''}`,
        guia: 'Redacta amb estil formal tècnic (PCI/PRL), precís i sense floritures. To objectiu i clar. Estructura en seccions.'
      },
      EN: {
        titulo: 'Training report',
        resumen:
`Client: ${datos?.cliente || ''} (VAT: ${datos?.cif || ''})
Site: ${datos?.sede || ''}
Date: ${datos?.fecha || ''}
Trainees: ${datos?.alumnos || ''}
Duration: ${datos?.duracion || ''} h
Trainer: ${formador?.nombre || ''}`,
        guia: 'Write in a formal technical tone (fire safety/OSH), precise, no fluff. Objective and clear. Structure into sections.'
      }
    }[idioma];

    const seedTexto = `# ${base.titulo}

${base.resumen}

## Alcance y objetivos
Formaciones vinculadas al deal ${dealId}:
${formaciones || '- (no especificadas)'}

## Valoración del grupo
${interpretaciones}

## Observaciones del formador
${[datos?.comentarios?.c14,datos?.comentarios?.c15,datos?.comentarios?.c16,datos?.comentarios?.c17].filter(Boolean).join('\n')}

## Desarrollo y contenidos
(Sección a completar a partir de las plantillas de Parte Teórica / Parte Práctica según los productos form-*).

## Recomendaciones
- Consolidar buenas prácticas observadas.
- Reforzar contenidos con mayor incidencia operativa.

## Clausulado legal
Documento confidencial. Uso interno del cliente y GEP Group. Tratamiento de datos conforme al RGPD y normativa aplicable.`;

    return { statusCode: 200, body: JSON.stringify({ borrador: seedTexto }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error en generateReport', details: String(e) }) };
  }
}
