// src/pdf/reportPdfmake.js
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import htmlToPdfmake from 'html-to-pdfmake'
import logoImg from '../assets/logo-gep.png'

pdfMake.vfs = pdfFonts.pdfMake.vfs

const htmlKey = (dealId) => `aiHtml:${dealId || 'sin'}`

const toDataURL = async (url) => {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

const bulletList = (items) =>
  (items || [])
    .filter((s) => (s || '').trim())
    .map((s) => ({ text: s.trim(), margin: [0, 2, 0, 2] }))

const kv = (label, value) => ([
  { text: `${label}: `, bold: true }, { text: value || '—' }
])

const chunk = (arr = [], size = 2) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const buildDocDefinition = ({ dealId, datos, formador, imagenes, aiHtml, logoDataUrl }) => {
  const teorica = bulletList(datos?.contenidoTeorica)
  const practica = bulletList(datos?.contenidoPractica)

  // IA: convertir HTML editable a contenido pdfmake (mantiene negritas, listas, etc.)
  const aiContent = aiHtml
    ? htmlToPdfmake(aiHtml, { defaultStyles: { b: { bold: true }, strong: { bold: true }, i: { italics: true } } })
    : null

  // Imágenes en rejilla (2 por fila)
  const imageRows = chunk(imagenes || [], 2).map((row) => ({
    columns: row.map((img) => ({
      stack: [
        { image: img.dataUrl, width: 220, margin: [0, 0, 0, 4] },
        { text: img.name || '', style: 'caption' }
      ],
    })),
    columnGap: 10,
    margin: [0, 6, 0, 6],
  }))

  return {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
      h2: { fontSize: 13, bold: true, margin: [0, 12, 0, 6] },
      small: { fontSize: 9, color: '#666' },
      caption: { fontSize: 8, color: '#666' },
      k: { bold: true }
    },
    header: (currentPage, pageCount) => ({
      columns: [
        { image: logoDataUrl, width: 140 },
        [
          { text: 'Informe de Formación', style: 'h1', margin: [0, 0, 0, 2] },
          { text: 'GEP Group — Formación y Servicios', style: 'small' }
        ],
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', style: 'small' },
      ],
      margin: [40, 20, 40, 10]
    }),
    footer: (currentPage, pageCount) => ({
      text: `GEP Group · ${new Date().toLocaleDateString()}`,
      alignment: 'right',
      margin: [40, 0, 40, 20],
      style: 'small'
    }),
    content: [
      // ===== Datos generales =====
      { text: 'Datos generales', style: 'h2' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Datos del cliente', style: 'k', margin: [0, 0, 0, 6] },
              { columns: kv('Nº Presupuesto', dealId) },
              { columns: kv('Cliente', datos?.cliente) },
              { columns: kv('CIF', datos?.cif) },
              { columns: kv('Dirección fiscal', datos?.direccionOrg) },
              { columns: kv('Dirección de la formación', datos?.sede) },
              { columns: kv('Persona de contacto', datos?.contacto) },
              { columns: kv('Comercial', datos?.comercial) },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Datos del formador', style: 'k', margin: [0, 0, 0, 6] },
              { columns: kv('Formador/a', formador?.nombre) },
              { columns: kv('Fecha', datos?.fecha) },
              { columns: kv('Sesiones', String(datos?.sesiones ?? '')) },
              { columns: kv('Nº de alumnos', String(datos?.alumnos ?? '')) },
              { columns: kv('Duración (h)', String(datos?.duracion ?? '')) },
            ],
          },
        ],
        columnGap: 20
      },

      // ===== Formación realizada =====
      { text: 'Formación realizada', style: 'h2' },
      { columns: kv('Formación', datos?.formacionTitulo) },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Parte Teórica', style: 'k', margin: [0, 6, 0, 6] },
              ...(teorica.length ? [{ ul: teorica.map((x) => x.text) }] : [{ text: '—' }]),
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Parte Práctica', style: 'k', margin: [0, 6, 0, 6] },
              ...(practica.length ? [{ ul: practica.map((x) => x.text) }] : [{ text: '—' }]),
            ]
          }
        ],
        columnGap: 20
      },

      // ===== Valoración y observaciones =====
      { text: 'Valoración y observaciones', style: 'h2' },
      {
        columns: [
          {
            width: '100%',
            table: {
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'Participación', bold: true }, { text: 'Compromiso', bold: true }, { text: 'Superación', bold: true }
                ],
                [
                  { text: String(datos?.escalas?.participacion ?? '—') },
                  { text: String(datos?.escalas?.compromiso ?? '—') },
                  { text: String(datos?.escalas?.superacion ?? '—') },
                ],
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 8]
          }
        ]
      },
      {
        columns: [
          { width: '50%', stack: [
            { text: 'Puntos fuertes', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c11 || '—' }
          ]},
          { width: '50%', stack: [
            { text: 'Asistencia', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c12 || '—' }
          ]},
        ],
        columnGap: 20
      },
      {
        columns: [
          { width: '50%', stack: [
            { text: 'Puntualidad', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c13 || '—' }
          ]},
          { width: '50%', stack: [
            { text: 'Accidentes', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c14 || '—' }
          ]},
        ],
        columnGap: 20
      },
      {
        columns: [
          { width: '33%', stack: [
            { text: 'Formaciones futuras', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c15 || '—' }
          ]},
          { width: '33%', stack: [
            { text: 'Entorno de trabajo', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c16 || '—' }
          ]},
          { width: '33%', stack: [
            { text: 'Materiales', style: 'k', margin: [0, 6, 0, 4] },
            { text: datos?.comentarios?.c17 || '—' }
          ]},
        ],
        columnGap: 20
      },

      // ===== Texto generado por IA (editable) =====
      ...(aiContent ? [
        { text: 'Informe narrativo', style: 'h2' },
        { stack: Array.isArray(aiContent) ? aiContent : [aiContent] }
      ] : []),

      // ===== Imágenes de apoyo =====
      ...(Array.isArray(imagenes) && imagenes.length
        ? [
            { text: 'Imágenes de apoyo', style: 'h2' },
            ...imageRows
          ]
        : []
      ),
    ]
  }
}

export async function generateReportPdfmake(draft) {
  const { dealId, datos, formador, imagenes } = draft || {}
  const logoDataUrl = await toDataURL(logoImg)
  const aiHtml = (() => {
    try { return sessionStorage.getItem(htmlKey(dealId)) || '' } catch { return '' }
  })()

  const docDefinition = buildDocDefinition({
    dealId, datos, formador, imagenes, aiHtml, logoDataUrl
  })

  const fecha = (datos?.fecha || '').slice(0, 10)
  const cliente = (datos?.cliente || '').replace(/[^\w\s\-._]/g, '').trim() || 'Cliente'
  const titulo = (datos?.formacionTitulo || 'Formación').replace(/[^\w\s\-._]/g, '').trim()
  const nombre = `GEP Group – ${dealId || 'SinPresu'} – ${cliente} – ${titulo} – ${fecha || 'fecha'}.pdf`

  pdfMake.createPdf(docDefinition).download(nombre)
}
