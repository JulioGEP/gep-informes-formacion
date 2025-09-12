import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer'
import headerImg from '../assets/pdf/header.png'
import footerImg from '../assets/pdf/footer.png'

Font.register({
  family: 'Poppins',
  fonts: [
    { src: '/src/assets/fonts/Poppins-Regular.ttf', fontWeight: 'normal' },
    { src: '/src/assets/fonts/Poppins-SemiBold.ttf', fontWeight: 600 },
    { src: '/src/assets/fonts/Poppins-Bold.ttf', fontWeight: 700 },
  ]
})

const styles = StyleSheet.create({
  page: { paddingTop: 90, paddingBottom: 90, paddingHorizontal: 42, fontFamily: 'Poppins', fontSize: 11, lineHeight: 1.5, color: '#333' },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  h2: { fontSize: 12, fontWeight: 600, marginTop: 10, marginBottom: 6 },
  small: { fontSize: 9, color: '#666' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  col50: { width: '50%', paddingRight: 10, marginBottom: 4 },
  bullet: { marginBottom: 2 },

  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  headerImage: { width: '100%', height: 80 },

  footerWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  footerImage: { width: '100%', height: 80 },

  footerLine: {
    position: 'absolute', bottom: 8, left: 42, right: 42,
    fontSize: 9, color: '#777', flexDirection: 'row', justifyContent: 'space-between'
  },

  // Imágenes de apoyo
  imagesGrid: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' },
  imgCard: { width: '45%', marginRight: '5%', marginBottom: 8, borderWidth: 1, borderColor: '#ddd', padding: 6, borderRadius: 4 },
  img: { width: '100%', height: 160, objectFit: 'cover' },
  imgCaption: { fontSize: 9, marginTop: 4, color: '#555' }
})

function DatosGenerales({ datos, formador, formacionTitulo }) {
  return (
    <View>
      <Text style={styles.h2}>Datos generales</Text>
      <View style={styles.row}>
        <View style={styles.col50}><Text>Cliente: {datos.cliente || '—'}</Text></View>
        <View style={styles.col50}><Text>CIF: {datos.cif || '—'}</Text></View>
        <View style={styles.col50}><Text>Dirección (Organización): {datos.direccionOrg || '—'}</Text></View>
        <View style={styles.col50}><Text>Dirección de la formación: {datos.sede || '—'}</Text></View>
        <View style={styles.col50}><Text>Fecha: {datos.fecha || '—'}</Text></View>
        <View style={styles.col50}><Text>Sesiones: {String(datos.sesiones || '—')}</Text></View>
        <View style={styles.col50}><Text>Alumnos: {String(datos.alumnos || '—')}</Text></View>
        <View style={styles.col50}><Text>Duración: {datos.duracion ? `${datos.duracion} h` : '—'}</Text></View>
        <View style={styles.col50}><Text>Formador/a: {formador.nombre || '—'}</Text></View>
        <View style={styles.col50}><Text>Formación: {formacionTitulo}</Text></View>
      </View>
    </View>
  )
}

function ContenidoFormacion({ datos }) {
  return (
    <View>
      <Text style={styles.h2}>Contenido de la formación</Text>
      <View style={styles.row}>
        <View style={styles.col50}>
          <Text style={{ fontWeight: 600, marginBottom: 2 }}>Parte Teórica</Text>
          {(datos.contenidoTeorica || []).map((li, i) => <Text key={`t-${i}`} style={styles.bullet}>• {li}</Text>)}
        </View>
        <View style={styles.col50}>
          <Text style={{ fontWeight: 600, marginBottom: 2 }}>Parte Práctica</Text>
          {(datos.contenidoPractica || []).map((li, i) => <Text key={`p-${i}`} style={styles.bullet}>• {li}</Text>)}
        </View>
      </View>
    </View>
  )
}

function Analisis({ analysisText, notaLibre }) {
  if (!analysisText && !notaLibre) return null
  return (
    <View>
      <Text style={styles.h2}>Análisis y recomendaciones</Text>
      {(analysisText || '').split('\n').map((p, i) => p.trim() ? <Text key={i} style={{ marginBottom: 6 }}>{p}</Text> : null)}
      {notaLibre ? <Text><Text style={{fontWeight: 600}}>Ajustes finales: </Text>{notaLibre}</Text> : null}
    </View>
  )
}

function ImagenesApoyo({ imagenes }) {
  if (!imagenes || !imagenes.length) return null
  return (
    <View wrap>
      <Text style={styles.h2}>Imágenes de apoyo</Text>
      <View style={styles.imagesGrid}>
        {imagenes.map((img, idx) => (
          <View key={idx} style={styles.imgCard} wrap={false}>
            {/* @react-pdf soporta dataURL (base64) */}
            <Image src={img.dataUrl} style={styles.img} />
            <Text style={styles.imgCaption}>{img.name || `Imagen ${idx+1}`}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default async function PdfReport({ logoUrl, datos, formador, formacionTitulo, analysisText, notaLibre, imagenes }) {
  const Doc = (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerWrap} fixed>
          <Image src={headerImg} style={styles.headerImage} />
        </View>

        <View style={{ marginTop: 6, marginBottom: 8 }}>
          <Text style={styles.h1}>Informes de formación</Text>
          <Text style={styles.small}>GEP Group</Text>
        </View>

        <DatosGenerales datos={datos} formador={formador} formacionTitulo={formacionTitulo} />
        <ContenidoFormacion datos={datos} />
        <Analisis analysisText={analysisText} notaLibre={notaLibre} />
        <ImagenesApoyo imagenes={imagenes} />

        <View style={styles.footerWrap} fixed>
          <Image src={footerImg} style={styles.footerImage} />
        </View>
        <View style={styles.footerLine} fixed>
          <Text>Documento confidencial. Uso interno del cliente y GEP Group. RGPD aplicable.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
  const blob = await pdf(Doc).toBlob()
  return blob
}
