import React from 'react'
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer'
import headerPng from '../assets/pdf/header.png'
import footerPng from '../assets/pdf/footer.png'

const styles = StyleSheet.create({
  page: { paddingTop: 80, paddingBottom: 80, paddingHorizontal: 40, fontSize: 10, lineHeight: 1.45 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 70 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  h1: { fontSize: 16, marginBottom: 6 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  col: { flex: 1 },
  box: { marginBottom: 8 },
  listItem: { marginLeft: 10, marginBottom: 2 },
  imgThumb: { width: 180, height: 120, objectFit: 'cover', marginRight: 8, marginBottom: 8, borderRadius: 4 }
})
const Label = ({ children }) => <Text style={{ fontWeight: 700 }}>{children}</Text>

export default function PdfReport({ dealId, formador, datos, imagenes, aiText }) {
  const paragraphs = (aiText || '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {headerPng ? <Image style={styles.header} src={headerPng} /> : null}
        {footerPng ? <Image style={styles.footer} src={footerPng} /> : null}

        <View style={styles.box}><Text style={styles.h1}>Informe de formación</Text></View>

        <View style={styles.box}>
          <Text style={styles.h2}>Datos generales</Text>
          <View style={styles.row}>
            <View style={styles.col}><Label>Nº Presupuesto: </Label><Text>{dealId || '—'}</Text></View>
            <View style={styles.col}><Label>Cliente: </Label><Text>{datos?.cliente || '—'}</Text></View>
            <View style={styles.col}><Label>CIF: </Label><Text>{datos?.cif || '—'}</Text></View>
          </View>
          <View style={styles.row}><View style={styles.col}><Label>Dirección (Organización): </Label><Text>{datos?.direccionOrg || '—'}</Text></View></View>
          <View style={styles.row}><View style={styles.col}><Label>Dirección de la formación (Sede): </Label><Text>{datos?.sede || '—'}</Text></View></View>
          <View style={styles.row}>
            <View style={styles.col}><Label>Persona de contacto: </Label><Text>{datos?.contacto || '—'}</Text></View>
            <View style={styles.col}><Label>Comercial: </Label><Text>{datos?.comercial || '—'}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Label>Formador/a: </Label><Text>{formador?.nombre || '—'} ({formador?.idioma || 'ES'})</Text></View>
            <View style={styles.col}><Label>Fecha: </Label><Text>{datos?.fecha || '—'}</Text></View>
            <View style={styles.col}><Label>Sesiones: </Label><Text>{String(datos?.sesiones ?? '—')}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Label>Nº de alumnos: </Label><Text>{datos?.alumnos || '—'}</Text></View>
            <View style={styles.col}><Label>Duración (h): </Label><Text>{datos?.duracion || '—'}</Text></View>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.h2}>Formación realizada</Text>
          <Text><Label>Formación: </Label>{datos?.formacionTitulo || '—'}</Text>
          <View style={{ marginTop: 6 }}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>Parte Teórica</Text>
            {(datos?.contenidoTeorica || []).map((p, i) => (<Text key={`t-${i}`} style={styles.listItem}>• {p}</Text>))}
          </View>
          <View style={{ marginTop: 6 }}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>Parte Práctica</Text>
            {(datos?.contenidoPractica || []).map((p, i) => (<Text key={`p-${i}`} style={styles.listItem}>• {p}</Text>))}
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.h2}>Valoración y observaciones</Text>
          <View style={styles.row}>
            <View style={styles.col}><Label>Participación: </Label><Text>{String(datos?.escalas?.participacion ?? '—')}</Text></View>
            <View style={styles.col}><Label>Compromiso: </Label><Text>{String(datos?.escalas?.compromiso ?? '—')}</Text></View>
            <View style={styles.col}><Label>Superación: </Label><Text>{String(datos?.escalas?.superacion ?? '—')}</Text></View>
          </View>
          <View style={{ marginTop: 4 }}>
            <Text><Label>Puntos fuertes: </Label>{datos?.comentarios?.c11 || '—'}</Text>
            <Text><Label>Asistencia: </Label>{datos?.comentarios?.c12 || '—'}</Text>
            <Text><Label>Puntualidad: </Label>{datos?.comentarios?.c13 || '—'}</Text>
            <Text><Label>Accidentes: </Label>{datos?.comentarios?.c14 || '—'}</Text>
            <Text><Label>Formaciones futuras: </Label>{datos?.comentarios?.c15 || '—'}</Text>
            <Text><Label>Entorno de trabajo: </Label>{datos?.comentarios?.c16 || '—'}</Text>
            <Text><Label>Materiales: </Label>{datos?.comentarios?.c17 || '—'}</Text>
          </View>
        </View>

        {paragraphs.length > 0 && (
          <View style={styles.box}>
            <Text style={styles.h2}>Redacción mejorada</Text>
            {paragraphs.map((p, i) => <Text key={i} style={{ marginBottom: 3 }}>{p}</Text>)}
          </View>
        )}

        {Array.isArray(imagenes) && imagenes.length > 0 && (
          <View style={styles.box}>
            <Text style={styles.h2}>Imágenes de apoyo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {imagenes.map((img, i) => (<Image key={i} src={img.dataUrl} style={styles.imgThumb} />))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  )
}
