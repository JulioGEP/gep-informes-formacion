import React, { useEffect, useMemo, useState } from 'react'
import plantillasBase from '../utils/plantillas.json'
import { getMergedPlantillas, upsertPlantilla } from '../utils/plantillasStore'

// Utilidad: leer File -> DataURL (para mostrar/mandar a PDF)
const fileToDataURL = (file) => new Promise((res, rej) => {
  const reader = new FileReader()
  reader.onload = () => res(reader.result)
  reader.onerror = rej
  reader.readAsDataURL(file)
})

// (Opcional) reducción simple del tamaño si fuese necesario (aquí lo dejamos directo)

export default function Form({ initial, onNext }) {
  const [dealId, setDealId] = useState(initial?.dealId || '')
  const [formador, setFormador] = useState({
    nombre: initial?.formador?.nombre || '',
    idioma: initial?.formador?.idioma || 'ES',
  })
  const [datos, setDatos] = useState({
    cliente: initial?.datos?.cliente || '',
    cif: initial?.datos?.cif || '',
    direccionOrg: initial?.datos?.direccionOrg || '',
    sede: initial?.datos?.sede || '',
    fecha: initial?.datos?.fecha || '',
    sesiones: initial?.datos?.sesiones || 1,
    alumnos: initial?.datos?.alumnos || '',
    duracion: initial?.datos?.duracion || '',
    escalas: initial?.datos?.escalas || { participacion: 0, compromiso: 0, superacion: 0 },
    comentarios: initial?.datos?.comentarios || { c11: '', c12: '', c13: '', c14: '', c15: '', c16: '', c17: '' },
    formacionTitulo: initial?.datos?.formacionTitulo || '',
    contenidoTeorica: initial?.datos?.contenidoTeorica || [],
    contenidoPractica: initial?.datos?.contenidoPractica || [],
  })

  // Imágenes de apoyo
  const [imagenes, setImagenes] = useState(initial?.imagenes || []) // [{name, dataUrl}]
  // Gestión plantillas
  const [plantillas, setPlantillas] = useState({})
  const [selTitulo, setSelTitulo] = useState(datos.formacionTitulo || '')
  const [showEditor, setShowEditor] = useState(false)
  const [editorTitulo, setEditorTitulo] = useState('')
  const [editorTeorica, setEditorTeorica] = useState([''])
  const [editorPractica, setEditorPractica] = useState([''])
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    const merged = getMergedPlantillas(plantillasBase)
    setPlantillas(merged)
  }, [])

  // Al seleccionar una formación, volcamos los puntos al borrador
  useEffect(() => {
    if (!selTitulo) return
    const p = plantillas[selTitulo]
    if (p) {
      setDatos(d => ({
        ...d,
        formacionTitulo: selTitulo,
        contenidoTeorica: p.teorica || [],
        contenidoPractica: p.practica || [],
      }))
    }
  }, [selTitulo, plantillas])

  const handleAddImagenes = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    // Límite simple de total 100MB aprox (solo indicativo, no bloqueamos duro)
    let list = [...imagenes]
    for (const f of files) {
      const dataUrl = await fileToDataURL(f)
      list.push({ name: f.name, dataUrl })
    }
    setImagenes(list)
    e.target.value = ''
  }

  const removeImagen = (idx) => {
    setImagenes(arr => arr.filter((_, i) => i !== idx))
  }

  const openCrear = () => {
    setEditMode(false)
    setEditorTitulo('')
    setEditorTeorica([''])
    setEditorPractica([''])
    setShowEditor(true)
  }
  const openEditar = () => {
    if (!selTitulo) return
    const p = plantillas[selTitulo] || { teorica: [], practica: [] }
    setEditMode(true)
    setEditorTitulo(selTitulo)
    setEditorTeorica(p.teorica.length ? p.teorica : [''])
    setEditorPractica(p.practica.length ? p.practica : [''])
    setShowEditor(true)
  }

  const addEditorItem = (type) => {
    if (type === 'teorica') setEditorTeorica(a => [...a, ''])
    else setEditorPractica(a => [...a, ''])
  }
  const updateEditorItem = (type, idx, value) => {
    if (type === 'teorica') setEditorTeorica(a => a.map((v, i) => i === idx ? value : v))
    else setEditorPractica(a => a.map((v, i) => i === idx ? value : v))
  }
  const removeEditorItem = (type, idx) => {
    if (type === 'teorica') setEditorTeorica(a => a.filter((_, i) => i !== idx))
    else setEditorPractica(a => a.filter((_, i) => i !== idx))
  }

  const saveEditor = () => {
    const title = editorTitulo.trim()
    if (!title) { alert('Introduce un título de formación'); return }
    const t = editorTeorica.map(s => s.trim()).filter(Boolean)
    const p = editorPractica.map(s => s.trim()).filter(Boolean)
    upsertPlantilla(title, { teorica: t, practica: p })
    const merged = getMergedPlantillas(plantillasBase)
    setPlantillas(merged)
    setSelTitulo(title)
    setShowEditor(false)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    onNext({
      dealId,
      formador,
      datos: {
        ...datos,
        idioma: formador.idioma
      },
      imagenes
    })
  }

  return (
    <form className="d-grid gap-3" onSubmit={onSubmit}>
      {/* Encabezado */}
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="h5 mb-0 d-flex align-items-center gap-2">
          <span>Datos del cliente</span>
        </h2>
        <div className="text-secondary small">Nº Presupuesto</div>
      </div>

      {/* CLIENTE */}
      <div className="card">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Nº Presupuesto</label>
              <input className="form-control" value={dealId} onChange={e=>setDealId(e.target.value)} />
            </div>
            <div className="col-md-5">
              <label className="form-label">Cliente</label>
              <input className="form-control" value={datos.cliente} onChange={e=>setDatos(d=>({...d, cliente:e.target.value}))} />
            </div>
            <div className="col-md-4">
              <label className="form-label">CIF</label>
              <input className="form-control" value={datos.cif} onChange={e=>setDatos(d=>({...d, cif:e.target.value}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Dirección (Organización)</label>
              <input className="form-control" value={datos.direccionOrg} onChange={e=>setDatos(d=>({...d, direccionOrg:e.target.value}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Dirección de la formación (Sede)</label>
              <input className="form-control" value={datos.sede} onChange={e=>setDatos(d=>({...d, sede:e.target.value}))} />
            </div>
          </div>
        </div>
      </div>

      {/* DATOS FORMACIÓN */}
      <div className="card">
        <div className="card-body">
          <h3 className="h6 mb-3">Datos de la formación</h3>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Formador/a</label>
              <input className="form-control" value={formador.nombre} onChange={e=>setFormador(f=>({...f, nombre:e.target.value}))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Idioma</label>
              <select className="form-select" value={formador.idioma} onChange={e=>setFormador(f=>({...f, idioma:e.target.value}))}>
                <option value="ES">Castellano</option>
                <option value="CA">Català</option>
                <option value="EN">English</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-control" value={datos.fecha} onChange={e=>setDatos(d=>({...d, fecha:e.target.value}))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sesiones</label>
              <input type="number" min="1" className="form-control" value={datos.sesiones} onChange={e=>setDatos(d=>({...d, sesiones:Number(e.target.value||1)}))} />
            </div>

            <div className="col-md-3">
              <label className="form-label">Nº de alumnos</label>
              <input className="form-control" value={datos.alumnos} onChange={e=>setDatos(d=>({...d, alumnos:e.target.value}))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Duración (horas)</label>
              <input className="form-control" value={datos.duracion} onChange={e=>setDatos(d=>({...d, duracion:e.target.value}))} />
            </div>

            {/* Selección de formación + botones de crear/editar */}
            <div className="col-md-6">
              <label className="form-label d-flex align-items-center justify-content-between">
                <span>Formación</span>
                <span className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={openCrear}>Subir nueva formación</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={openEditar} disabled={!selTitulo}>Editar formación</button>
                </span>
              </label>
              <select className="form-select" value={selTitulo} onChange={e=>setSelTitulo(e.target.value)}>
                <option value="">— Selecciona —</option>
                {Object.keys(plantillas).sort().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Contenido (editable por si quieren borrar/modificar puntos estándar puntualmente) */}
            <div className="col-12">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Contenido de la formación — Parte Teórica</label>
                  <div className="d-grid gap-2">
                    {(datos.contenidoTeorica || []).map((v, i) => (
                      <div className="input-group" key={`t-${i}`}>
                        <input className="form-control" value={v}
                          onChange={e=>{
                            const val = e.target.value
                            setDatos(d=>{
                              const arr=[...d.contenidoTeorica]; arr[i]=val; return {...d, contenidoTeorica:arr}
                            })
                          }} />
                        <button type="button" className="btn btn-outline-danger" onClick={()=>{
                          setDatos(d=>({...d, contenidoTeorica: d.contenidoTeorica.filter((_,idx)=>idx!==i)}))
                        }}>Eliminar</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline-primary" onClick={()=>{
                      setDatos(d=>({...d, contenidoTeorica:[...(d.contenidoTeorica||[]), '']}))
                    }}>Añadir punto</button>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contenido de la formación — Parte Práctica</label>
                  <div className="d-grid gap-2">
                    {(datos.contenidoPractica || []).map((v, i) => (
                      <div className="input-group" key={`p-${i}`}>
                        <input className="form-control" value={v}
                          onChange={e=>{
                            const val = e.target.value
                            setDatos(d=>{
                              const arr=[...d.contenidoPractica]; arr[i]=val; return {...d, contenidoPractica:arr}
                            })
                          }} />
                        <button type="button" className="btn btn-outline-danger" onClick={()=>{
                          setDatos(d=>({...d, contenidoPractica: d.contenidoPractica.filter((_,idx)=>idx!==i)}))
                        }}>Eliminar</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline-primary" onClick={()=>{
                      setDatos(d=>({...d, contenidoPractica:[...(d.contenidoPractica||[]), '']}))
                    }}>Añadir punto</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Valoraciones cualitativas (1-10 como input, la IA NO mostrará números) */}
            <div className="col-12">
              <label className="form-label">Valora la formación del 1 al 10</label>
              <div className="row g-2">
                <div className="col-md-4">
                  <div className="input-group">
                    <span className="input-group-text">Participación</span>
                    <input type="number" min="1" max="10" className="form-control"
                      value={datos.escalas.participacion}
                      onChange={e=>setDatos(d=>({...d, escalas:{...d.escalas, participacion: Number(e.target.value||0)}}))}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="input-group">
                    <span className="input-group-text">Compromiso</span>
                    <input type="number" min="1" max="10" className="form-control"
                      value={datos.escalas.compromiso}
                      onChange={e=>setDatos(d=>({...d, escalas:{...d.escalas, compromiso: Number(e.target.value||0)}}))}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="input-group">
                    <span className="input-group-text">Superación</span>
                    <input type="number" min="1" max="10" className="form-control"
                      value={datos.escalas.superacion}
                      onChange={e=>setDatos(d=>({...d, escalas:{...d.escalas, superacion: Number(e.target.value||0)}}))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Comentarios 11-17 */}
            <div className="col-md-6">
              <label className="form-label">Puntos fuertes de los alumnos a destacar</label>
              <textarea className="form-control" value={datos.comentarios.c11} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c11:e.target.value}}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Incidencias: Referentes a la asistencia</label>
              <textarea className="form-control" value={datos.comentarios.c12} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c12:e.target.value}}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Incidencias: Referentes a la Puntualidad</label>
              <textarea className="form-control" value={datos.comentarios.c13} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c13:e.target.value}}))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Incidencias: Accidentes</label>
              <textarea className="form-control" value={datos.comentarios.c14} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c14:e.target.value}}))} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Recomendaciones: Formaciones Futuras</label>
              <textarea className="form-control" value={datos.comentarios.c15} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c15:e.target.value}}))} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Recomendaciones: Del entorno de Trabajo</label>
              <textarea className="form-control" value={datos.comentarios.c16} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c16:e.target.value}}))} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Recomendaciones: De Materiales</label>
              <textarea className="form-control" value={datos.comentarios.c17} onChange={e=>setDatos(d=>({...d, comentarios:{...d.comentarios, c17:e.target.value}}))} />
            </div>

            {/* Imágenes de apoyo (al final del formulario) */}
            <div className="col-12">
              <label className="form-label">Imágenes de apoyo (opcional)</label>
              <input type="file" accept="image/*" multiple className="form-control" onChange={handleAddImagenes} />
              {imagenes.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  {imagenes.map((img, idx) => (
                    <div key={idx} className="border rounded p-1" style={{ width: 120 }}>
                      <img src={img.dataUrl} alt={img.name} className="img-fluid rounded" />
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-truncate" style={{maxWidth: 80}} title={img.name}>{img.name}</small>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removeImagen(idx)}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-text">Se añadirán al final del informe bajo “Imágenes de apoyo”.</div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="d-flex justify-content-end gap-2">
        <button type="submit" className="btn btn-primary">Siguiente</button>
      </div>

      {/* MODAL Editor de Formaciones */}
      {showEditor && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editMode ? 'Editar formación' : 'Subir nueva formación'}</h5>
                <button type="button" className="btn-close" onClick={()=>setShowEditor(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Título</label>
                  <input className="form-control" value={editorTitulo} onChange={e=>setEditorTitulo(e.target.value)} />
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Parte Teórica</label>
                    <div className="d-grid gap-2">
                      {editorTeorica.map((v, i) => (
                        <div className="input-group" key={`et-${i}`}>
                          <input className="form-control" value={v} onChange={e=>updateEditorItem('teorica', i, e.target.value)} />
                          <button type="button" className="btn btn-outline-danger" onClick={()=>removeEditorItem('teorica', i)}>Eliminar</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline-primary" onClick={()=>addEditorItem('teorica')}>Añadir punto</button>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Parte Práctica</label>
                    <div className="d-grid gap-2">
                      {editorPractica.map((v, i) => (
                        <div className="input-group" key={`ep-${i}`}>
                          <input className="form-control" value={v} onChange={e=>updateEditorItem('practica', i, e.target.value)} />
                          <button type="button" className="btn btn-outline-danger" onClick={()=>removeEditorItem('practica', i)}>Eliminar</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline-primary" onClick={()=>addEditorItem('practica')}>Añadir punto</button>
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowEditor(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={saveEditor}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEditor && <div className="modal-backdrop fade show" />}
    </form>
  )
}
