// src/components/Form.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import plantillasBase from '../utils/plantillas.json'
import logoImg from '../assets/logo-gep.png'

const fileToDataURL = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })

const triesKey = (dealId) => `aiAttempts:${dealId || 'sin'}`
const htmlKey  = (dealId) => `aiHtml:${dealId || 'sin'}`

export default function Form({ initial, onNext }) {
  const [dealId, setDealId] = useState(initial?.dealId || '')
  const prevDealIdRef = useRef(dealId)

  const [datos, setDatos] = useState({
    cliente: initial?.datos?.cliente || '',
    cif: initial?.datos?.cif || '',
    direccionOrg: initial?.datos?.direccionOrg || '',
    sede: initial?.datos?.sede || '',
    contacto: initial?.datos?.contacto || '',
    comercial: initial?.datos?.comercial || '',
    formadorNombre: initial?.datos?.formadorNombre || '',
    idioma: initial?.datos?.idioma || 'ES',
    fecha: initial?.datos?.fecha || '',
    sesiones: initial?.datos?.sesiones ?? 1,
    alumnos: initial?.datos?.alumnos || '',
    duracion: initial?.datos?.duracion || '',
    formacionTitulo: initial?.datos?.formacionTitulo || '',
    contenidoTeorica: initial?.datos?.contenidoTeorica || [],
    contenidoPractica: initial?.datos?.contenidoPractica || [],
    escalas: initial?.datos?.escalas || { participacion: 7, compromiso: 7, superacion: 7 },
    comentarios: initial?.datos?.comentarios || { c11:'', c12:'', c13:'', c14:'', c15:'', c16:'', c17:'' },
  })
  const [imagenes, setImagenes] = useState(initial?.imagenes || [])
  const [selTitulo, setSelTitulo] = useState(datos.formacionTitulo || '')
  const [loadingDeal, setLoadingDeal] = useState(false)

  // Reset intentos/HTML al cambiar dealId
  useEffect(() => {
    if (prevDealIdRef.current !== dealId) {
      try {
        localStorage.removeItem(triesKey(prevDealIdRef.current))
        sessionStorage.removeItem(htmlKey(prevDealIdRef.current))
      } catch {}
      prevDealIdRef.current = dealId
    }
  }, [dealId])

  // Cargar plantilla al seleccionar formación
  useEffect(() => {
    if (!selTitulo) return
    const p = plantillasBase[selTitulo]
    setDatos(d => ({
      ...d,
      formacionTitulo: selTitulo,
      contenidoTeorica: p?.teorica || [],
      contenidoPractica: p?.practica || [],
    }))
  }, [selTitulo])

  // Pipedrive
  const rellenarDesdePipedrive = async () => {
    if (!dealId) { alert('Introduce el Nº Presupuesto'); return }
    setLoadingDeal(true)
    try {
      const r = await fetch('/.netlify/functions/getDeal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Error Pipedrive')
      setDatos(d => ({
        ...d,
        cliente: data.cliente ?? d.cliente,
        cif: data.cif ?? d.cif,
        direccionOrg: data.direccionOrg ?? d.direccionOrg,
        sede: data.sede ?? d.sede,
        contacto: data.contacto ?? d.contacto,
        comercial: data.comercial ?? d.comercial,
      }))
    } catch (e) {
      console.error(e); alert('No se ha podido autocompletar desde Pipedrive.')
    } finally { setLoadingDeal(false) }
  }

  // Imágenes
  const addImagenes = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const list = [...imagenes]
    for (const f of files) list.push({ name: f.name, dataUrl: await fileToDataURL(f) })
    setImagenes(list)
    try { sessionStorage.setItem('tmpImages', JSON.stringify(list)) } catch {}
    e.target.value = ''
  }
  const removeImagen = (idx) => {
    const list = imagenes.filter((_, i) => i !== idx)
    setImagenes(list)
    try { sessionStorage.setItem('tmpImages', JSON.stringify(list)) } catch {}
  }

  const onSubmit = (e) => {
    e.preventDefault()
    onNext({ dealId, formador: { nombre: datos.formadorNombre, idioma: datos.idioma }, datos, imagenes })
  }

  const addTeorica = () => setDatos(d => ({ ...d, contenidoTeorica: [...(d.contenidoTeorica||[]), '' ] }))
  const addPractica = () => setDatos(d => ({ ...d, contenidoPractica: [...(d.contenidoPractica||[]), '' ] }))

  const opcionesOrdenadas = useMemo(() =>
    Object.keys(plantillasBase).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}))
  , [])

  return (
    <form className="d-grid gap-4" onSubmit={onSubmit}>
      {/* Header con logo y título */}
      <div
        className="border-bottom d-flex align-items-center gap-3 sticky-top bg-white py-3 my-3"
        style={{ top: 0, zIndex: 10 }}
      >
        <img
          src={logoImg}
          alt="GEP Group"
          style={{ width: 180, height: 52, objectFit: 'contain', display: 'block' }}
        />
        <div className="flex-grow-1">
          <h1 className="h5 mb-0">Informe de Formación</h1>
          <small className="text-muted">GEP Group — Formación y Servicios</small>
        </div>
      </div>

      {/* ===== Cliente + Formador en 2 columnas ===== */}
      <div className="row g-3 align-items-stretch">
        {/* DATOS DEL CLIENTE */}
        <div className="col-md-6 d-flex">
          <div className="card w-100 h-100">
            <div className="card-body">
              <h2 className="h6">Datos del cliente</h2>

              <div className="row g-3 align-items-end">
                <div className="col-7 col-md-6">
                  <label className="form-label">Nº Presupuesto</label>
                  <input className="form-control" value={dealId} onChange={(e)=>setDealId(e.target.value)} />
                </div>
                <div className="col-5 col-md-6">
                  <button type="button" className="btn btn-outline-primary w-100" onClick={rellenarDesdePipedrive} disabled={loadingDeal}>
                    {loadingDeal ? 'Rellenando…' : 'Rellenar'}
                  </button>
                </div>
              </div>

              <div className="row g-3 mt-1">
                <div className="col-md-7">
                  <label className="form-label">Cliente</label>
                  <input className="form-control" value={datos.cliente} onChange={(e)=>setDatos(d=>({...d, cliente:e.target.value}))} />
                </div>
                <div className="col-md-5">
                  <label className="form-label">CIF</label>
                  <input className="form-control" value={datos.cif} onChange={(e)=>setDatos(d=>({...d, cif:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Comercial</label>
                  <input className="form-control" value={datos.comercial} onChange={(e)=>setDatos(d=>({...d, comercial:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Persona de contacto</label>
                  <input className="form-control" value={datos.contacto} onChange={(e)=>setDatos(d=>({...d, contacto:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Dirección fiscal</label>
                  <input className="form-control" value={datos.direccionOrg} onChange={(e)=>setDatos(d=>({...d, direccionOrg:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Dirección formación</label>
                  <input className="form-control" value={datos.sede} onChange={(e)=>setDatos(d=>({...d, sede:e.target.value}))} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DATOS DEL FORMADOR */}
        <div className="col-md-6 d-flex">
          <div className="card w-100 h-100">
            <div className="card-body">
              <h2 className="h6">Datos del formador</h2>

              <div className="row g-3">
                {/* Formador/a */}
                <div className="col-12">
                  <label className="form-label">Formador/a</label>
                  <input className="form-control" value={datos.formadorNombre} onChange={(e)=>setDatos(d=>({...d, formadorNombre:e.target.value}))} />
                </div>

                {/* Idioma del informe */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Idioma del informe</label>
                  <select className="form-select" value={datos.idioma} onChange={(e)=>setDatos(d=>({...d, idioma:e.target.value}))}>
                    <option value="ES">Castellano</option>
                    <option value="CA">Català</option>
                    <option value="EN">English</option>
                  </select>
                </div>

                {/* Nº alumnos (numérico) */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Nº de alumnos</label>
                  <input
                    type="number" min="0" className="form-control"
                    value={datos.alumnos}
                    onChange={(e)=>setDatos(d=>({...d, alumnos:e.target.value}))}
                  />
                </div>

                {/* Duración (numérico) */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Duración (horas)</label>
                  <input
                    type="number" min="0" step="0.5" className="form-control"
                    value={datos.duracion}
                    onChange={(e)=>setDatos(d=>({...d, duracion:e.target.value}))}
                  />
                </div>

                {/* Fecha (sin botón auxiliar) */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date" className="form-control"
                    value={datos.fecha}
                    onChange={(e)=>setDatos(d=>({...d, fecha:e.target.value}))}
                  />
                </div>

                {/* Sesiones */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Sesiones</label>
                  <input
                    type="number" min="1" className="form-control"
                    value={datos.sesiones}
                    onChange={(e)=>setDatos(d=>({...d, sesiones:Number(e.target.value||1)}))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FORMACIÓN ===== */}
      <div>
        <h2 className="h5">Formación realizada</h2>
        <div className="card">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Formación</label>
                <select className="form-select" value={selTitulo} onChange={(e)=>setSelTitulo(e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {opcionesOrdenadas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="row g-4 mt-1">
              <div className="col-md-6">
                <label className="form-label">Parte Teórica</label>
                <div className="d-grid gap-2">
                  {(datos.contenidoTeorica || []).map((v,i)=>(
                    <div className="input-group" key={`t-${i}`}>
                      <input className="form-control" value={v}
                        onChange={(e)=>setDatos(d=>{ const arr=[...(d.contenidoTeorica||[])]; arr[i]=e.target.value; return {...d, contenidoTeorica:arr}; })} />
                      <button type="button" className="btn btn-outline-danger" onClick={()=>setDatos(d=>({...d, contenidoTeorica:d.contenidoTeorica.filter((_,idx)=>idx!==i)}))}>Eliminar</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline-primary" onClick={addTeorica}>Añadir punto</button>
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label">Parte Práctica</label>
                <div className="d-grid gap-2">
                  {(datos.contenidoPractica || []).map((v,i)=>(
                    <div className="input-group" key={`p-${i}`}>
                      <input className="form-control" value={v}
                        onChange={(e)=>setDatos(d=>{ const arr=[...(d.contenidoPractica||[])]; arr[i]=e.target.value; return {...d, contenidoPractica:arr}; })} />
                      <button type="button" className="btn btn-outline-danger" onClick={()=>setDatos(d=>({...d, contenidoPractica:d.contenidoPractica.filter((_,idx)=>idx!==i)}))}>Eliminar</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline-primary" onClick={addPractica}>Añadir punto</button>
                </div>
              </div>
            </div>

            <div className="form-text mt-2">
              Selecciona la formación realizada. Se añadirán sus “Parte teórica” y “Parte práctica” al borrador. Si falta algún punto, añádelo.
            </div>
          </div>
        </div>
      </div>

      {/* ===== VALORACIÓN ===== */}
      <div>
        <h2 className="h5">Valoración</h2>
        <div className="card">
          <div className="card-body">
            {/* Escalas */}
            <div className="row g-3">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text">Participación</span>
                  <input type="number" min="1" max="10" className="form-control"
                    value={datos.escalas.participacion}
                    onChange={(e)=>setDatos(d=>({...d, escalas:{...d.escalas, participacion:Number(e.target.value||0)}}))} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text">Compromiso</span>
                  <input type="number" min="1" max="10" className="form-control"
                    value={datos.escalas.compromiso}
                    onChange={(e)=>setDatos(d=>({...d, escalas:{...d.escalas, compromiso:Number(e.target.value||0)}}))} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text">Superación</span>
                  <input type="number" min="1" max="10" className="form-control"
                    value={datos.escalas.superacion}
                    onChange={(e)=>setDatos(d=>({...d, escalas:{...d.escalas, superacion:Number(e.target.value||0)}}))} />
                </div>
              </div>
            </div>

            {/* Preguntas + Imágenes */}
            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <label className="form-label">Puntos fuertes de los alumnos a destacar</label>
                <textarea className="form-control" value={datos.comentarios.c11}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c11:e.target.value}}))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Incidencias: Referentes a la asistencia</label>
                <textarea className="form-control" value={datos.comentarios.c12}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c12:e.target.value}}))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Incidencias: Referentes a la puntualidad</label>
                <textarea className="form-control" value={datos.comentarios.c13}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c13:e.target.value}}))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Incidencias: Accidentes</label>
                <textarea className="form-control" value={datos.comentarios.c14}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c14:e.target.value}}))} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Recomendaciones: Formaciones futuras</label>
                <textarea className="form-control" value={datos.comentarios.c15}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c15:e.target.value}}))} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Recomendaciones: Del entorno de trabajo</label>
                <textarea className="form-control" value={datos.comentarios.c16}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c16:e.target.value}}))} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Recomendaciones: De materiales</label>
                <textarea className="form-control" value={datos.comentarios.c17}
                  onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c17:e.target.value}}))} />
              </div>

              <div className="col-12">
                <label className="form-label">Imágenes de apoyo (opcional)</label>
                <input type="file" accept="image/*" multiple className="form-control" onChange={addImagenes} />
                {imagenes.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {imagenes.map((img, idx) => (
                      <div key={idx} className="border rounded p-1" style={{ width: 120 }}>
                        <img src={img.dataUrl} alt={img.name} className="img-fluid rounded" />
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <small className="text-truncate" style={{ maxWidth: 80 }} title={img.name}>{img.name}</small>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removeImagen(idx)}>x</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Siguiente */}
      <div className="d-flex justify-content-end">
        <button type="submit" className="btn btn-primary">Siguiente</button>
      </div>
    </form>
  )
}
