import React, { useEffect, useState } from 'react'
import axios from 'axios'
import plantillasMap from '../utils/plantillas.json'

const DEAL_DIR_INCOMPANY = '8b2a7570f5ba8aa4754f061cd9dc92fd778376a7'
const ORG_CIF = '6d39d015a33921753410c1bab0b067ca93b8cf2c'

export default function Formulario({ onPreview, initial }){
  const [loading, setLoading] = useState(false)
  const [dealId, setDealId] = useState('Número de Presupuesto')

  const [formador, setFormador] = useState({ nombre:'' })
  const [datos, setDatos] = useState({
    fecha: '', alumnos: '', duracion: '', sesiones: 1,
    sede: '', cliente: '', cif: '', direccionOrg: '', contacto: '', owner: '',
    productos: [],
    idioma: 'ES',
    escalas: { participacion: 8, compromiso: 8, superacion: 8 },
    comentarios: { c11:'', c12:'', c13:'', c14:'', c15:'', c16:'', c17:'' },
    formacionKey: '', formacionTitulo: '',
    contenidoTeorica: [], contenidoPractica: [],
    extrasTeorica: '', extrasPractica: ''
  })

  // Si venimos del borrador, recuperamos datos
  useEffect(() => {
    if (initial) {
      setDealId(initial.dealId ?? dealId)
      setFormador(initial.formador ?? { nombre:'' })
      setDatos(prev => ({ ...prev, ...(initial.datos || {}) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.dealId])

  const opcionesFormacion = Object.entries(plantillasMap).map(([key, val]) => ({
    key, titulo: val?.nombre || key, teorica: val?.parte_teorica || [], practica: val?.parte_practica || []
  }))

  const fetchDeal = async () => {
    setLoading(true)
    try{
      const { data } = await axios.get('/.netlify/functions/getDeal', { params: { dealId } })
      const d = data?.deal, org = data?.organization, person = data?.person, owner = data?.owner
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
    }finally{ setLoading(false) }
  }

  const onChangeFormacion = (e) => {
    const key = e.target.value
    const sel = opcionesFormacion.find(o => o.key === key)
    setDatos(prev => ({
      ...prev,
      formacionKey: key,
      formacionTitulo: sel?.titulo || '',
      contenidoTeorica: sel?.teorica || [],
      contenidoPractica: sel?.practica || []
    }))
  }

  // Helpers para editar/eliminar puntos
  const updatePoint = (tipo, idx, value) => {
    setDatos(prev => {
      const arr = [...prev[tipo]]
      arr[idx] = value
      return { ...prev, [tipo]: arr }
    })
  }
  const removePoint = (tipo, idx) => {
    setDatos(prev => {
      const arr = prev[tipo].filter((_, i) => i !== idx)
      return { ...prev, [tipo]: arr }
    })
  }
  const addPoint = (tipo) => {
    setDatos(prev => ({ ...prev, [tipo]: [...prev[tipo], ''] }))
  }

  const handlePreview = async (e)=>{
    e.preventDefault()
    const extraT = datos.extrasTeorica.split('\n').map(s=>s.trim()).filter(Boolean)
    const extraP = datos.extrasPractica.split('\n').map(s=>s.trim()).filter(Boolean)
    const payload = {
      dealId,
      formador,
      datos: {
        ...datos,
        contenidoTeorica: [...(datos.contenidoTeorica||[]), ...extraT],
        contenidoPractica: [...(datos.contenidoPractica||[]), ...extraP]
      }
    }
    try{
      const { data } = await axios.post('/.netlify/functions/generateReport', payload)
      onPreview({ ...payload, borrador: data?.borrador || '' })
    }catch(err){
      console.error(err)
      alert('Error generando borrador. Revisa consola.')
    }
  }

  return (
    <form onSubmit={handlePreview} className="d-grid gap-3">
      {/* Identificación */}
      <div className="card card-soft">
        <div className="card-body">
          <h5 className="card-title">Identificación</h5>
          <div className="row g-3 align-items-end">
            <div className="col-md">
              <label className="form-label">Nº Presupuesto</label>
              <input className="form-control" value={dealId} onChange={e=>setDealId(e.target.value)} required />
            </div>
            <div className="col-md-auto">
              <button type="button" className="btn btn-primary" onClick={fetchDeal} disabled={loading}>
                {loading ? 'Cargando…' : 'Rellenar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 👉 Datos del cliente (AHORA ARRIBA) */}
      <div className="card card-soft">
        <div className="card-body">
          <h5 className="card-title">Datos del cliente</h5>

          <div className="mb-3">
            <div className="fw-semibold">Cliente:</div>
            <div>{datos.cliente || <em>(pendiente)</em>}</div>
            <div className="monos">{datos.cif || <em>(CIF)</em>}</div>
            <div>{datos.direccionOrg || <em>(Dirección organización)</em>}</div>
          </div>

          <div className="mb-3">
            <div className="fw-semibold">Dirección de la formación</div>
            <div>{datos.sede || <em>(Sede / Dirección Incompany)</em>}</div>
          </div>

          <div className="row g-3">
            <div className="col-md">
              <div><span className="fw-semibold">Persona de contacto:</span> {datos.contacto || <em>(pendiente)</em>}</div>
            </div>
            <div className="col-md">
              <div><span className="fw-semibold">Comercial:</span> {datos.owner || <em>(pendiente)</em>}</div>
            </div>
          </div>

          <details className="mt-3">
            <summary className="mb-2">Editar campos (si es necesario)</summary>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Cliente</label>
                <input className="form-control" value={datos.cliente} onChange={e=>setDatos({...datos, cliente: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">CIF</label>
                <input className="form-control" value={datos.cif} onChange={e=>setDatos({...datos, cif: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Dirección (Organización)</label>
                <input className="form-control" value={datos.direccionOrg} onChange={e=>setDatos({...datos, direccionOrg: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Dirección de la formación</label>
                <input className="form-control" value={datos.sede} onChange={e=>setDatos({...datos, sede: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Persona de contacto</label>
                <input className="form-control" value={datos.contacto} onChange={e=>setDatos({...datos, contacto: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Comercial</label>
                <input className="form-control" value={datos.owner} onChange={e=>setDatos({...datos, owner: e.target.value})} />
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Datos de la formación (AHORA DEBAJO) */}
      <div className="card card-soft">
        <div className="card-body">
          <h5 className="card-title">Datos de la formación</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Formador/a</label>
              <input className="form-control" value={formador.nombre}
                     onChange={e=>setFormador({...formador, nombre: e.target.value})} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-control" value={datos.fecha}
                     onChange={e=>setDatos({...datos, fecha: e.target.value})} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sesiones</label>
              <input type="number" min="1" className="form-control" value={datos.sesiones}
                     onChange={e=>setDatos({...datos, sesiones: Number(e.target.value)})} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Nº alumnos</label>
              <input type="number" className="form-control" value={datos.alumnos}
                     onChange={e=>setDatos({...datos, alumnos: e.target.value})} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Duración (h)</label>
              <input type="number" step="0.5" className="form-control" value={datos.duracion}
                     onChange={e=>setDatos({...datos, duracion: e.target.value})} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Idioma</label>
              <select className="form-select" value={datos.idioma} onChange={e=>setDatos({...datos, idioma: e.target.value})}>
                <option value="ES">Castellano</option>
                <option value="CA">Català</option>
                <option value="EN">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Formación realizada y CONTENIDO EDITABLE */}
      <div className="card card-soft">
        <div className="card-body">
          <h5 className="card-title">Formación realizada</h5>
          <p className="text-secondary mb-3">
            Selecciona la formación realizada. Se añadirán sus “Parte teórica” y “Parte práctica” al borrador. Si falta algún punto, añádelo.
          </p>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Formación</label>
              <select className="form-select" value={datos.formacionKey} onChange={onChangeFormacion}>
                <option value="">— Selecciona —</option>
                {opcionesFormacion.map(op => (
                  <option key={op.key} value={op.key}>{op.titulo}</option>
                ))}
              </select>
            </div>
          </div>

          {datos.formacionKey && (
            <div className="mt-3">
              <h6 className="fw-semibold mb-2">Contenido de la formación</h6>

              <div className="row g-4">
                {/* Parte Teórica (editable) */}
                <div className="col-md-6">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-semibold">Parte Teórica</div>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>addPoint('contenidoTeorica')}>Añadir punto</button>
                  </div>
                  <ul className="list-unstyled mt-2">
                    {(datos.contenidoTeorica || []).map((li, idx)=> (
                      <li key={`t-${idx}`} className="d-flex gap-2 align-items-center mb-2">
                        <span>•</span>
                        <input className="form-control" value={li} onChange={e=>updatePoint('contenidoTeorica', idx, e.target.value)} />
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removePoint('contenidoTeorica', idx)}>×</button>
                      </li>
                    ))}
                  </ul>
                  <label className="form-label">Añadir puntos (uno por línea)</label>
                  <textarea className="form-control" value={datos.extrasTeorica}
                            onChange={e=>setDatos({...datos, extrasTeorica: e.target.value})} />
                </div>

                {/* Parte Práctica (editable) */}
                <div className="col-md-6">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-semibold">Parte Práctica</div>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>addPoint('contenidoPractica')}>Añadir punto</button>
                  </div>
                  <ul className="list-unstyled mt-2">
                    {(datos.contenidoPractica || []).map((li, idx)=> (
                      <li key={`p-${idx}`} className="d-flex gap-2 align-items-center mb-2">
                        <span>•</span>
                        <input className="form-control" value={li} onChange={e=>updatePoint('contenidoPractica', idx, e.target.value)} />
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removePoint('contenidoPractica', idx)}>×</button>
                      </li>
                    ))}
                  </ul>
                  <label className="form-label">Añadir puntos (uno por línea)</label>
                  <textarea className="form-control" value={datos.extrasPractica}
                            onChange={e=>setDatos({...datos, extrasPractica: e.target.value})} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Valoraciones */}
      <div className="card card-soft">
        <div className="card-body">
          <h5 className="card-title">Valora la formación del 1 al 10</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Participación</label>
              <input type="number" min="1" max="10" className="form-control"
                value={datos.escalas.participacion}
                onChange={e=>setDatos({...datos, escalas:{...datos.escalas, participacion: Number(e.target.value)}})} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Compromiso</label>
              <input type="number" min="1" max="10" className="form-control"
                value={datos.escalas.compromiso}
                onChange={e=>setDatos({...datos, escalas:{...datos.escalas, compromiso: Number(e.target.value)}})} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Superación</label>
              <input type="number" min="1" max="10" className="form-control"
                value={datos.escalas.superacion}
                onChange={e=>setDatos({...datos, escalas:{...datos.escalas, superacion: Number(e.target.value)}})} />
            </div>
          </div>
        </div>
      </div>

      {/* Comentarios */}
      <div className="card card-soft">
        <div className="card-body">
          <h5 className="card-title">Comentarios del formador</h5>

          <label className="form-label">Puntos fuertes de los alumnos a destacar</label>
          <textarea className="form-control" value={datos.comentarios.c11}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c11: e.target.value}})} />

          <label className="form-label mt-3">Incidencias: Referentes a la asistencia</label>
          <textarea className="form-control" value={datos.comentarios.c12}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c12: e.target.value}})} />

          <label className="form-label mt-3">Incidencias: Referentes a la Puntualidad</label>
          <textarea className="form-control" value={datos.comentarios.c13}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c13: e.target.value}})} />

          <label className="form-label mt-3">Incidencias: Accidentes</label>
          <textarea className="form-control" value={datos.comentarios.c14}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c14: e.target.value}})} />

          <label className="form-label mt-3">Recomendaciones: Formaciones Futuras</label>
          <textarea className="form-control" value={datos.comentarios.c15}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c15: e.target.value}})} />

          <label className="form-label mt-3">Recomendaciones: Del entorno de Trabajo</label>
          <textarea className="form-control" value={datos.comentarios.c16}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c16: e.target.value}})} />

          <label className="form-label mt-3">Recomendaciones: De Materiales</label>
          <textarea className="form-control" value={datos.comentarios.c17}
            onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, c17: e.target.value}})} />
        </div>
      </div>

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-success" disabled={loading}>Generar borrador</button>
      </div>
    </form>
  )
}
