import React, { useState, useEffect } from 'react'
import axios from 'axios'
import plantillasMap from '../utils/plantillas.json' // { clave: { nombre, parte_teorica[], parte_practica[] }, ... }

const DEAL_DIR_INCOMPANY = '8b2a7570f5ba8aa4754f061cd9dc92fd778376a7'
const ORG_CIF = '6d39d015a33921753410c1bab0b067ca93b8cf2c'

export default function Formulario({ onPreview }){
  const [loading, setLoading] = useState(false)
  const [dealId, setDealId] = useState('7164')

  const [formador, setFormador] = useState({ nombre:'' }) // (Quitamos email)
  const [datos, setDatos] = useState({
    fecha: '', alumnos: '', duracion: '', sesiones: 1,   // sesiones añadido
    sede: '', cliente: '', cif: '', direccionOrg: '', contacto: '', owner: '',
    productos: [],
    idioma: 'ES',
    // Cambiamos la etiqueta general de escalas, pero mantenemos 3 métricas (1–10)
    escalas: { participacion: 8, compromiso: 8, superacion: 8 },
    // Renombramos 11–17 como nos pides
    comentarios: {
      c11:'', // Puntos fuertes de los alumnos a destacar
      c12:'', // Incidencias: Referentes a la asistencia
      c13:'', // Incidencias: Referentes a la Puntualidad
      c14:'', // Incidencias: Accidentes
      c15:'', // Recomendaciones: Formaciones Futuras
      c16:'', // Recomendaciones: Del entorno de Trabajo
      c17:''  // Recomendaciones: De Materiales
    },
    // selector de plantillas (por si no vienen productos)
    plantillasSeleccionadas: []
  })

  // Preparamos opciones del selector a partir del JSON de plantillas
  const [opcionesPlantillas, setOpcionesPlantillas] = useState([])
  useEffect(()=>{
    const arr = Object.entries(plantillasMap).map(([key, val]) => ({
      key, titulo: val?.nombre || key
    }))
    setOpcionesPlantillas(arr)
  }, [])

  const fetchDeal = async () => {
    setLoading(true)
    try{
      const { data } = await axios.get('/.netlify/functions/getDeal', { params: { dealId } })
      const d = data?.deal
      const org = data?.organization
      const person = data?.person
      const owner = data?.owner
      const productos = data?.productosFiltrados || []

      setDatos(prev=>({
        ...prev,
        sede: d?.[DEAL_DIR_INCOMPANY] || '',
        cliente: org?.name || '',
        cif: org?.[ORG_CIF] || '',
        direccionOrg: org?.address || '',
        contacto: person?.name || '',
        owner: owner?.name || '',
        productos
      }))
    }catch(e){
      console.error(e)
      alert('No se pudo cargar el presupuesto. Puedes continuar y rellenar a mano.')
    }finally{
      setLoading(false)
    }
  }

  const handlePreview = async (e)=>{
    e.preventDefault()
    const payload = { dealId, formador, datos }
    try{
      const { data } = await axios.post('/.netlify/functions/generateReport', payload)
      const borrador = data?.borrador || ''
      onPreview({ ...payload, borrador })
    }catch(err){
      console.error(err)
      alert('Error generando borrador. Revisa consola.')
    }
  }

  const onChangePlantillas = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value)
    setDatos(prev => ({ ...prev, plantillasSeleccionadas: selected }))
  }

  return (
    <form onSubmit={handlePreview} className="stack">
      <article className="card">
        <h3>Identificación</h3>
        <div className="grid-2">
          <label> Nº Presupuesto
            <input className="full" value={dealId} onChange={e=>setDealId(e.target.value)} required />
          </label>
          <div style={{display:'flex', alignItems:'end'}}>
            <button type="button" onClick={fetchDeal} disabled={loading}>
              {loading ? 'Cargando…' : 'Rellenar'}
            </button>
          </div>
        </div>
      </article>

      <article className="card">
        <h3>Datos de la formación</h3>
        <div className="grid-2">
          <label> Formador/a
            <input className="full"
              value={formador.nombre}
              onChange={e=>setFormador({...formador, nombre: e.target.value})}
              required />
          </label>

          <label> Fecha
            <input className="full" type="date"
              value={datos.fecha}
              onChange={e=>setDatos({...datos, fecha: e.target.value})}
              required />
          </label>

          <label> Nº alumnos
            <input className="full" type="number"
              value={datos.alumnos}
              onChange={e=>setDatos({...datos, alumnos: e.target.value})}
              required />
          </label>

          <label> Duración (h)
            <input className="full" type="number" step="0.5"
              value={datos.duracion}
              onChange={e=>setDatos({...datos, duracion: e.target.value})}
              required />
          </label>

          <label> Sesiones
            <input className="full" type="number" min="1"
              value={datos.sesiones}
              onChange={e=>setDatos({...datos, sesiones: Number(e.target.value)})}
              required />
          </label>

          <label> Idioma
            <select className="full" value={datos.idioma} onChange={e=>setDatos({...datos, idioma: e.target.value})}>
              <option value="ES">Castellano</option>
              <option value="CA">Català</option>
              <option value="EN">English</option>
            </select>
          </label>
        </div>
      </article>

      <article className="card">
        <h3>Datos del cliente</h3>
        <p className="muted">Formato solicitado</p>

        <div className="stack">
          <div>
            <div className="label">Cliente:</div>
            <div>{datos.cliente || <em>(pendiente)</em>}</div>
            <div className="monos">{datos.cif || <em>(CIF)</em>}</div>
            <div>{datos.direccionOrg || <em>(Dirección organización)</em>}</div>
          </div>

          <div className="section-title label">Dirección de la formación</div>
          <div>{datos.sede || <em>(Sede / Dirección Incompany)</em>}</div>

          <div><span className="label">Persona de contacto:</span> {datos.contacto || <em>(pendiente)</em>}</div>
          <div><span className="label">Comercial:</span> {datos.owner || <em>(pendiente)</em>}</div>
        </div>

        <details className="section-title">
          <summary>Editar campos (si es necesario)</summary>
          <div className="grid-2">
            <label> Cliente
              <input className="full" value={datos.cliente} onChange={e=>setDatos({...datos, cliente: e.target.value})} />
            </label>
            <label> CIF
              <input className="full" value={datos.cif} onChange={e=>setDatos({...datos, cif: e.target.value})} />
            </label>
            <label> Dirección (Organización)
              <input className="full" value={datos.direccionOrg} onChange={e=>setDatos({...datos, direccionOrg: e.target.value})} />
            </label>
            <label> Dirección de la formación
              <input className="full" value={datos.sede} onChange={e=>setDatos({...datos, sede: e.target.value})} />
            </label>
            <label> Persona de contacto
              <input className="full" value={datos.contacto} onChange={e=>setDatos({...datos, contacto: e.target.value})} />
            </label>
            <label> Comercial
              <input className="full" value={datos.owner} onChange={e=>setDatos({...datos, owner: e.target.value})} />
            </label>
          </div>
        </details>
      </article>

      <article className="card">
        <h3>Plantillas de formación</h3>
        <p className="muted">
          Selecciona uno o varios títulos. Se añadirán sus “Parte teórica” y “Parte práctica” al borrador.
        </p>
        <label> Elegir plantilla(s)
          <select multiple className="full" value={datos.plantillasSeleccionadas} onChange={onChangePlantillas}>
            {opcionesPlantillas.map(op => (
              <option key={op.key} value={op.key}>{op.titulo}</option>
            ))}
          </select>
        </label>
      </article>

      <article className="card">
        <h3>Valora la formación del 1 al 10</h3>
        <div className="grid-2">
          <label> Participación
            <input className="full" type="number" min="1" max="10"
              value={datos.escalas.participacion}
              onChange={e=>setDatos({...datos, escalas:{...datos.escalas, participacion: Number(e.target.value)}})} />
          </label>
          <label> Compromiso
            <input className="full" type="number" min="1" max="10"
              value={datos.escalas.compromiso}
              onChange={e=>setDatos({...datos, escalas:{...datos.escalas, compromiso: Number(e.target.value)}})} />
          </label>
          <label> Superación
            <input className="full" type="number" min="1" max="10"
              value={datos.escalas.superacion}
              onChange={e=>setDatos({...datos, escalas:{...datos.escalas, superacion: Number(e.target.value)}})} />
          </label>
        </div>
      </article>

      <article className="card">
        <h3>Comentarios del formador</h3>
        <label> Puntos fuertes de los alumnos a destacar
          <textarea value={datos.comentarios.c11}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c11: e.target.value}})} />
        </label>
        <label> Incidencias: Referentes a la asistencia
          <textarea value={datos.comentarios.c12}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c12: e.target.value}})} />
        </label>
        <label> Incidencias: Referentes a la Puntualidad
          <textarea value={datos.comentarios.c13}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c13: e.target.value}})} />
        </label>
        <label> Incidencias: Accidentes
          <textarea value={datos.comentarios.c14}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c14: e.target.value}})} />
        </label>
        <label> Recomendaciones: Formaciones Futuras
          <textarea value={datos.comentarios.c15}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c15: e.target.value}})} />
        </label>
        <label> Recomendaciones: Del entorno de Trabajo
          <textarea value={datos.comentarios.c16}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c16: e.target.value}})} />
        </label>
        <label> Recomendaciones: De Materiales
          <textarea value={datos.comentarios.c17}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c17: e.target.value}})} />
        </label>
      </article>

      <footer className="card">
        <div className="grid-2">
          <button type="submit" disabled={loading}>Generar borrador</button>
          <button type="button" className="secondary" onClick={()=>window.scrollTo({ top: 0, behavior:'smooth' })}>
            Subir arriba
          </button>
        </div>
      </footer>
    </form>
  )
}
