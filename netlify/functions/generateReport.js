export async function handler(event) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { dealId, formador, datos } = body || {};

    const interpret = (n)=> n >= 8 ? 'alta' : (n >= 4 ? 'media' : 'baja');
    const interpretaciones = [
      `Participación: ${interpret(datos?.escalas?.participacion)}.`,
      `Compromiso: ${interpret(datos?.escalas?.compromiso)}.`,
      `Superación: ${interpret(datos?.escalas?.superacion)}.`
    ].join('\n');

    // Mostrar las plantillas seleccionadas como títulos de formación (si no hay productos filtrados)
    const titulosPlantillas = (datos?.plantillasSeleccionadas || []).join(', ');

    // Productos form-* (si los hubiera)
    const formacionesProductos = (datos?.productos||[])
      .map(p=>`- ${p.product?.code || ''} · ${p.product?.name || ''}`)
      .join('\n');

    const idioma = (datos?.idioma || 'ES');
    const base = {
      ES: {
        titulo: 'Informe de formación',
        resumen:
`Cliente: ${datos?.cliente || ''}
CIF: ${datos?.cif || ''}
Dirección (Organización): ${datos?.direccionOrg || ''}
Dirección de la formación: ${datos?.sede || ''}
Fecha: ${datos?.fecha || ''}
Sesiones: ${datos?.sesiones || 1}
Alumnos: ${datos?.alumnos || ''}
Duración: ${datos?.duracion || ''} h
Formador/a: ${formador?.nombre || ''}`,
        guia: 'Redacta con estilo formal técnico (PCI/PRL), preciso, sin florituras. Tono objetivo y claro. Estructura en secciones.'
      },
      CA: {
        titulo: 'Informe de formació',
        resumen:
`Client: ${datos?.cliente || ''}
CIF: ${datos?.cif || ''}
Adreça (Organització): ${datos?.direccionOrg || ''}
Adreça de la formació: ${datos?.sede || ''}
Data: ${datos?.fecha || ''}
Sessions: ${datos?.sesiones || 1}
Alumnes: ${datos?.alumnos || ''}
Durada: ${datos?.duracion || ''} h
Formador/a: ${formador?.nombre || ''}`,
        guia: 'Redacta amb estil formal tècnic (PCI/PRL), precís i sense floritures. To objectiu i clar. Estructura en seccions.'
      },
      EN: {
        titulo: 'Training report',
        resumen:
`Client: ${datos?.cliente || ''}
VAT: ${datos?.cif || ''}
Address (Organization): ${datos?.direccionOrg || ''}
Training address: ${datos?.sede || ''}
Date: ${datos?.fecha || ''}
Sessions: ${datos?.sesiones || 1}
Trainees: ${datos?.alumnos || ''}
Duration: ${datos?.duracion || ''} h
Trainer: ${formador?.nombre || ''}`,
        guia: 'Write in a formal technical tone (fire safety/OSH), precise, no fluff. Objective and clear. Structure into sections.'
      }
    }[idioma];

    // Bloque de “Desarrollo y contenidos”: productos form-* o, si no hay, los títulos de plantillas seleccionadas
    const bloqueFormaciones =
      (formacionesProductos && formacionesProductos.length > 0)
      ? `Formaciones (productos del presupuesto):
${formacionesProductos}`
      : (titulosPlantillas
          ? `Formaciones (selección manual de plantillas):
- ${titulosPlantillas.split(',').join('\n- ')}`
          : '- (no especificadas)'
        );

    // Comentarios renombrados
    const comentariosLargos = [
      ['Puntos fuertes de los alumnos a destacar', datos?.comentarios?.c11],
      ['Incidencias: Referentes a la asistencia', datos?.comentarios?.c12],
      ['Incidencias: Referentes a la Puntualidad', datos?.comentarios?.c13],
      ['Incidencias: Accidentes', datos?.comentarios?.c14],
      ['Recomendaciones: Formaciones Futuras', datos?.comentarios?.c15],
      ['Recomendaciones: Del entorno de Trabajo', datos?.comentarios?.c16],
      ['Recomendaciones: De Materiales', datos?.comentarios?.c17],
    ].filter(([,v]) => v && String(v).trim().length > 0)
     .map(([t,v]) => `- ${t}: ${v}`)
     .join('\n');

    const seedTexto = `# ${base.titulo}

${base.resumen}

## Alcance y objetivos
Presupuesto (Nº): ${dealId}
${bloqueFormaciones}

## Valora la formación del 1 al 10
${interpretaciones}

## Observaciones y recomendaciones del formador
${comentariosLargos || '- Sin observaciones adicionales.'}

## Desarrollo y contenidos
(Se completará automáticamente con “Parte teórica / Parte práctica” según la plantilla de cada formación en versiones posteriores. Para esta versión, se incorporan los elementos seleccionados en el formulario).

## Clausulado legal
Documento confidencial. Uso interno del cliente y GEP Group. Tratamiento de datos conforme al RGPD y normativa aplicable.`;

    return { statusCode: 200, body: JSON.stringify({ borrador: seedTexto }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error en generateReport', details: String(e) }) };
  }
}
