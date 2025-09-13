// src/pdf/reportPdfmake.js
// Carga pdfmake, html-to-pdfmake y fuentes Poppins en runtime desde CDN → cero problemas con Vite/Netlify.

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
  await loadScript(`https://cdn.jsdelivr.net/npm/html-to-pdfmake@${ver}/browser.js`)
  if (!window.htmlToPdfmake) throw new Error('No se pudo cargar html-to-pdfmake')
  return window.htmlToPdfmake
}

// Cargar Poppins (TTF) en pdfMake.vfs y registrar fuentes
async function ensurePoppinsFont(pdfMake) {
  if (pdfMake.fonts && pdfMake.fonts.Poppins) return

  const fetchBase64 = async (url) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  const base = 'https://cdn.jsdelivr.net/gh/google/fonts/ofl/poppins'
  const urls = {
    'Poppins-Regular.ttf': `${base}/Poppins-Regular.ttf`,
    'Poppins-Bold.ttf': `${base}/Poppins-Bold.ttf`,
    'Poppins-Italic.ttf': `${base}/Poppins-Italic.ttf`,
    'Poppins-BoldItalic.ttf': `${base}/Poppins-BoldItalic.ttf`,
  }

  // Crear vfs si no existe
  pdfMake.vfs = pdfMake.vfs || {}

  // Intentar cargar; si falla, seguimos con Roboto por defecto
  try {
    const entries = await Promise.all(
      Object.entries(urls).map(async ([name, url]) => [name, await fetchBase64(url)])
    )
    for (const [name, b64] of entries) pdfMake.vfs[name] = b64
    pdfMake.fonts = {
      ...(pdfMake.fonts || {}),
      Poppins: {
        normal: 'Poppins-Regular.ttf',
        bold: 'Poppins-Bold.ttf',
        italics: 'Poppins-Italic.ttf',
        bolditalics: 'Poppins-BoldItalic.ttf',
      },
    }
  } catch (e) {
    console.warn('No se pudo cargar Poppins, se usará la fuente por defecto.', e)
  }
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

  return {
    pageSize: 'A4',
    pageMargins: [58, 110, 58, 90], // respeta márgenes y header/footer
    defaultStyle: { fontSize: 10, lineHeight: 1.25, font: 'Poppins' }, // <-- Poppins por defecto
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
                      // IZQUIERDA (cliente)
                      {
                        width: '50%',
                        stack: [
                          { columns: kv('Nº Presupuesto', dealId) },
                          { columns: kv('Empresa', datos?.cliente) },
                          { columns: kv('CIF', datos?.cif) },
                          { columns: kv('Dirección fiscal', datos?.direccionOrg) },
                          { columns: kv('Dirección de la formación', datos?.sede) },
                          // (Se mueven "Persona de contacto" y "Comercial" a la derecha)
                        ],
                      },
                      // DERECHA (formador)
                      {
                        width: '50%',
                        stack: [
                          { columns: kv('Formador', formador?.nombre) },
                          { columns: kv('Sesiones', String(datos?.sesiones ?? '')) },
                          { columns: kv('Nº de alumnos', String(datos?.alumnos ?? '')) },
                          { columns: kv('Duración', String(datos?.duracion ?? '')) }, // <-- texto cambiado
                          { columns: kv('Persona de contacto', datos?.contacto) },   // <-- movidos aquí
                          { columns: kv('Comercial', datos?.comercial) },            // <-- movidos aquí
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

      // ===== Formación realizada (sin intertítulos extra)
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

      // ===== Texto IA (sin título "Conclusiones")
      ...(aiContent ? [Array.isArray(aiContent) ? { stack: aiContent } : aiContent] : []),

      // ===== Evaluación Cualitativa (mantener)
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

      // (Eliminado "Incidencias" + "Recomendaciones" como pediste)

      // ===== Imágenes de apoyo (si hay)
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

  // Registrar Poppins (si se puede); si no, seguirá con Roboto por defecto
  await ensurePoppinsFont(pdfMake)

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
