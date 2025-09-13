// src/pdf/reportPdfmake.js
// Carga pdfmake y html-to-pdfmake en runtime desde CDN → cero problemas con Vite/Netlify

import headerImg from '../assets/pdf/header.png'
import footerImg from '../assets/pdf/footer.png'

const htmlKey = (dealId) => `aiHtml:${dealId || 'sin'}`

// ---------- utils ----------
const toDataURL = async (url) => {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })

async function ensurePdfMake() {
  if (window.pdfMake?.createPdf) return window.pdfMake
  const ver = '0.2.12'
  await loadScript(`https://cdn.jsdelivr.net/npm/pdfmake@${ver}/build/pdfmake.min.js`)
  await loadScript(`https://cdn.jsdelivr.net/npm/pdfmake@${ver}/build/vfs_fonts.js`)
  if (!window.pdfMake?.createPdf) throw new Error('No se pudo cargar pdfmake')
  return window.pdfMake
}

async function ensureHtmlToPdfMake() {
  if (window.htmlToPdfmake) return window.htmlToPdfmake
  const ver = '2.5.5'
  // UMD para navegador
  await loadScript(`https://cdn.jsdelivr.net/npm/html-to-pdfmake@${ver}/browser.js`)
  if (!window.htmlToPdfmake) throw new Error('No se pudo cargar html-to-pdfmake')
  return window.htmlToPdfmake
}

const bullet = (items) =>
  (items || [])
    .filter((s) => (s || '').trim())
    .map((s) => s.trim())

const kv = (label, value) => [{ text: `${label}: `, bold: true }, { text: value || '—' }]

const chunk = (arr = [], size = 2) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const stripHtml = (html) =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

// ---------- docDefinition ----------
const buildDocDefinition = ({
  dealId,
  datos,
  formador,
  imagenes,
  aiContent,            // <- ya convertido con html-to-pdfmake
  headerDataUrl,
  footerDataUrl,
}) => {
  const teorica = bullet(datos?.contenidoTeorica)
  const practica = bullet(datos?.contenidoPractica)

  const imageRows = chunk(imagenes || [], 2).map((row) => ({
    columns: row.map((img) => ({
      stack: [
        { image: img.dataUrl, width: 220, margin: [0, 0, 0, 4] },
        { text: img.name || '', style: 'caption' },
      ],
    })),
    columnGap: 10,
    margin: [0, 6, 0, 6],
  }))

  const incidenciasBlocks = [
    { title: 'Asistencia', text: datos?.comentarios?.c12 },
    { title: 'Puntualidad', text: datos?.comentarios?.c13 },
    { title: 'Accidentes', text: datos?.comentarios?.c14 },
  ].filter((x) => (x.text || '').trim())

  const recomendacionesBlocks = [
    { title: 'Formaciones futuras', text: datos?.comentarios?.c15 },
    { title: 'Entorno de trabajo', text: datos?.comentarios?.c16 },
    { title: 'Materiales', text: datos?.comentarios?.c17 },
  ].filter((x) => (x.text || '').trim())

  return {
    pageSize: 'A4',
    pageMargins: [58, 110, 58, 90], // respeta márgenes y header/footer
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
      h2: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] },
      h3: { fontSize: 11, bold: true, margin: [0, 10, 0, 4] },
      small: { fontSize: 9, color: '#666' },
      caption: { fontSize: 8, color: '#666' },
      k: { bold: true },
    },

    header: () => ({
      image: headerDataUrl,
      width: 479,
      alignment: 'center',
      margin: [0, 18, 0, 0],
    }),
    footer: () => ({
      image: footerDataUrl,
      width: 479,
      alignment: 'center',
      margin: [0, 0, 0, 18],
    }),

    content: [
      // ===== Título + fecha
      {
        columns: [
          {
            text: [
              { text: 'INFORME FORMACIÓN: ', style: 'h1' },
              { text: datos?.formacionTitulo || '—', color: '#E1062C', bold: true, fontSize: 16 },
            ],
          },
        ],
        margin: [0, 0, 0, 4],
      },
      {
        text: [
          { text: 'Fecha de la formación: ', bold: true },
          { text: datos?.fecha || '—' },
        ],
        margin: [0, 0, 0, 6],
      },

      // ===== Bloque gris: DATOS GENERALES
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: 'Datos generales', style: 'h3', margin: [0, 0, 0, 6] },
                  {
                    columns: [
                      {
                        width: '50%',
                        stack: [
                          { columns: kv('Nº Presupuesto', dealId) },
                          { columns: kv('Empresa', datos?.cliente) },
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
                          { columns: kv('Formador', formador?.nombre) },
                          { columns: kv('Sesiones', String(datos?.sesiones ?? '')) },
                          { columns: kv('Nº de alumnos', String(datos?.alumnos ?? '')) },
                          { columns: kv('Duración (h)', String(datos?.duracion ?? '')) },
                        ],
                      },
                    ],
                    columnGap: 20,
                  },
                ],
                fillColor: '#F3F3F3',
                margin: [8, 8, 8, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 8, 0, 0],
      },

      // ===== Desarrollo de la Formación (Formación realizada)
      { text: 'Informe Técnico de Formación', style: 'h2' },
      { text: '—', color: '#666' },

      { text: 'Desarrollo de la Formación', style: 'h2' },
      { text: 'Formación realizada', style: 'h3' },
      { columns: kv('Formación', datos?.formacionTitulo) },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Teórica', style: 'k', margin: [0, 6, 0, 6] },
              ...(teorica.length ? [{ ul: teorica }] : [{ text: '—' }]),
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Práctica', style: 'k', margin: [0, 6, 0, 6] },
              ...(practica.length ? [{ ul: practica }] : [{ text: '—' }]),
            ],
          },
        ],
        columnGap: 20,
      },

      // ===== Conclusiones (IA, sin fondo)
      { text: 'Conclusiones', style: 'h2' },
      ...(aiContent ? [Array.isArray(aiContent) ? { stack: aiContent } : aiContent] : [{ text: '—' }]),

      // ===== Incidencias
      { text: 'Incidencias', style: 'h2' },
      ...(([
        { title: 'Asistencia', text: datos?.comentarios?.c12 },
        { title: 'Puntualidad', text: datos?.comentarios?.c13 },
        { title: 'Accidentes', text: datos?.comentarios?.c14 },
      ].filter((x) => (x.text || '').trim())
        .map((b) => ({ stack: [{ text: b.title, style: 'k' }, { text: b.text }], margin: [0, 4, 0, 4] })))
        || [{ text: '—' }]
      ),

      // ===== Evaluación Cualitativa
      { text: 'Evaluación Cualitativa', style: 'h2' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { text: 'Participación', bold: true },
              { text: 'Compromiso', bold: true },
              { text: 'Superación', bold: true },
            ],
            [
              { text: String(datos?.escalas?.participacion ?? '—') },
              { text: String(datos?.escalas?.compromiso ?? '—') },
              { text: String(datos?.escalas?.superacion ?? '—') },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      },

      // ===== Recomendaciones
      { text: 'Recomendaciones', style: 'h2' },
      ...(([
        { title: 'Formaciones futuras', text: datos?.comentarios?.c15 },
        { title: 'Entorno de trabajo', text: datos?.comentarios?.c16 },
        { title: 'Materiales', text: datos?.comentarios?.c17 },
      ].filter((x) => (x.text || '').trim())
        .map((b) => ({ stack: [{ text: b.title, style: 'k' }, { text: b.text }], margin: [0, 4, 0, 4] })))
        || [{ text: '—' }]
      ),

      // ===== Imágenes de apoyo
      ...(Array.isArray(imagenes) && imagenes.length
        ? [{ text: 'Imágenes de apoyo', style: 'h2' }, ...imageRows]
        : []),

      // ===== Firma
      { text: 'Atentamente,', margin: [0, 18, 0, 2] },
      { text: 'Jaime', style: 'k' },
      { text: 'Responsable de formaciones', color: '#E1062C', margin: [0, 2, 0, 0] },
    ],
  }
}

// ---------- API usada por Preview.jsx ----------
export async function generateReportPdfmake(draft) {
  const { dealId, datos, formador, imagenes } = draft || {}

  const [pdfMake, htmlToPdfmake, headerDataUrl, footerDataUrl] = await Promise.all([
    ensurePdfMake(),
    ensureHtmlToPdfMake(),
    toDataURL(headerImg),
    toDataURL(footerImg),
  ])

  const aiHtml = (() => {
    try { return sessionStorage.getItem(htmlKey(dealId)) || '' } catch { return '' }
  })()

  // Convertir IA HTML → estructura pdfmake
  let aiContent = null
  try {
    aiContent = htmlToPdfmake(aiHtml, {
      defaultStyles: {
        b: { bold: true },
        strong: { bold: true },
        i: { italics: true },
      },
    })
  } catch {
    const plain = stripHtml(aiHtml)
    aiContent = plain ? { text: plain } : null
  }

  const docDefinition = buildDocDefinition({
    dealId, datos, formador, imagenes, aiContent, headerDataUrl, footerDataUrl,
  })

  const fecha = (datos?.fecha || '').slice(0, 10)
  const cliente = (datos?.cliente || '').replace(/[^\w\s\-._]/g, '').trim() || 'Cliente'
  const titulo = (datos?.formacionTitulo || 'Formación').replace(/[^\w\s\-._]/g, '').trim()
  const nombre = `GEP Group – ${dealId || 'SinPresu'} – ${cliente} – ${titulo} – ${fecha || 'fecha'}.pdf`

  pdfMake.createPdf(docDefinition).download(nombre)
}
