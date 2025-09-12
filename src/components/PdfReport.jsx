import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer'

// (Opcional) si añades las TTF en /src/fonts/… descomenta y registra Poppins.
// Font.register({ family: 'Poppins', fonts: [
//   { src: '/src/fonts/Poppins-Regular.ttf' },
//   { src: '/src/fonts/Poppins-SemiBold.ttf', fontWeight: 600 },
//   { src: '/src/fonts/Poppins-Bold.ttf', fontWeight: 700 }
// ]})
// Mientras tanto, fallback:
const family = 'Helvetica'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 32, paddingHorizontal: 36,
    fontFamily: family, fontSize: 11, lineHeight: 1.5
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logo: { width: 28, height: 28, marginRight: 8 },
  hdrTitle: { fontSize: 12, fontWeight: 700 },
  hdrSub: { fontSize: 9, color: '#666' },
  hr: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginTop: 8, marginBottom: 10 },

  h6: { fontSize: 11, fontWeight: 600, marginBottom: 6, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  col: { width: '50%', paddingRight: 8, marginBottom: 3 },

  ul: { marginTop: 4, marginBottom: 6, paddingLeft: 10 },
  li: { fontSize: 11, marginBottom: 2 },

  p: { marginBottom: 6 },

  footer: {
    position: 'absolute', bottom: 18, left: 36, right: 36,
    fontSize: 9, color: '#777', flexDirection: 'row', justifyContent: 'space-between'
  }
})

function DatosGenerales({ datos, formador, formacionTitulo }) {
  return (
    <View>
      <Text style={styles.h6}>Datos generales</Text>
      <View style={styles.row}>
        <View style={styles.col}><Text>Cliente: {datos.cliente || '—'}</Text></View>
        <View style={styles.col}><Text>CIF: {datos.cif || '—'}</Text></View>
        <View style={styles.col}><Text>Dirección (Organización): {datos.direccionOrg || '—'}</Text></View>
        <View style={styles.col}><Text>Dirección de la formación: {datos.sede || '—'}</Text></View>
        <View style={styles.col}><Text>Fecha: {datos.fecha || '—'}</Text></View>
        <View style={styles.col}><Text>Sesiones: {String(datos.sesiones || '—')}</Text></View>
        <View style={styles.col}><Text>Alumnos: {String(datos.alumnos || '—')}</Text></View>
        <View style={styles.col}><Text>Duración: {datos.duracion ? `${datos.duracion} h` : '—'}</Text></View>
        <View style={styles.col}><Text>Formador/a: {formador.nombre || '—'}</Text></View>
        <View style={styles.col}><Text>Formación: {formacionTitulo}</Text></View>
      </View>
    </View>
  )
}

function ContenidoFormacion({ datos }) {
  return (
    <View>
      <Text style={styles.h6}>Contenido de la formación</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={{ fontWeight: 600, marginBottom: 2 }}>Parte Teórica</Text>
          <View style={styles.ul}>
            {(datos.contenidoTeorica || []).map((li, i) => <Text key={`t-${i}`} style={styles.li}>• {li}</Text>)}
          </View>
        </View>
        <View style={styles.col}>
          <Text style={{ fontWeight: 600, marginBottom: 2 }}>Parte Práctica</Text>
          <View style={styles.ul}>
            {(datos.contenidoPractica || []).map((li, i) => <Text key={`p-${i}`} style={styles.li}>• {li}</Text>)}
          </View>
        </View>
      </View>
    </View>
  )
}

function Analisis({ analysisText, notaLibre }) {
  if (!analysisText && !notaLibre) return null
  return (
    <View>
      <Text style={styles.h6}>Análisis y recomendaciones</Text>
      {(analysisText || '').split('\n').map((p, i) => p.trim() ? <Text key={i} style={styles.p}>{p}</Text> : null)}
      {notaLibre ? <Text style={styles.p}><Text style={{fontWeight: 600}}>Ajustes finales: </Text>{notaLibre}</Text> : null}
    </View>
  )
}

export default async function PdfReport({ logoUrl, datos, formador, formacionTitulo, analysisText, notaLibre }) {
  const Doc = (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Cabecera */}
        <View style={styles.header}>
          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
          <View>
            <Text style={styles.hdrTitle}>Informes de formación</Text>
            <Text style={styles.hdrSub}>GEP Group</Text>
          </View>
        </View>
        <View style={styles.hr} />

        {/* Cuerpo */}
        <DatosGenerales datos={datos} formador={formador} formacionTitulo={formacionTitulo} />
        <ContenidoFormacion datos={datos} />
        <Analisis analysisText={analysisText} notaLibre={notaLibre} />

        {/* Pie */}
        <View style={styles.footer} fixed>
          <Text>Documento confidencial. Uso interno del cliente y GEP Group. RGPD aplicable.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )

  const blob = await pdf(Doc).toBlob()
  return blob
}
