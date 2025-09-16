// src/components/Form.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import plantillasBase from '../utils/plantillas.json'
import logoImg from '../assets/logo-nuevo.png'
import { triesKey, htmlKey } from '../utils/keys'

const fileToDataURL = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })

export default function Form({ initial, onNext, title = 'Informe de Formación', onChooseAnother, type = 'formacion' }) {
  const formRef = useRef(null)

  const isSimulacro = type === 'simulacro'
  const isPreventivo = type === 'preventivo'
  const isFormacion = type === 'formacion'

  const [dealId, setDealId] = useState(initial?.dealId || '')
  const prevDealIdRef = useRef(dealId)

  const defaultComentarios = initial?.datos?.comentarios || { c11: '', c12: '', c13: '', c14: '', c15: '', c16: '', c17: '' }
  const defaultPreventivo = initial?.datos?.preventivo || {
    trabajos: initial?.datos?.comentarios?.c11 || '',
    tareas: initial?.datos?.comentarios?.c12 || '',
    observaciones: initial?.datos?.comentarios?.c13 || '',
    incidencias: initial?.datos?.comentarios?.c14 || '',
  }

  const [datos, setDatos] = useState(() => ({
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
    alumnos: initial?.datos?.alumnos || '',      // numérico en UI
    duracion: initial?.datos?.duracion || '',    // numérico en UI
    formacionTitulo: initial?.datos?.formacionTitulo || '',
    contenidoTeorica: initial?.datos?.contenidoTeorica || [],
    contenidoPractica: initial?.datos?.contenidoPractica || [],
    desarrollo: initial?.datos?.desarrollo || '',
    cronologia: initial?.datos?.cronologia || [],
    escalas: initial?.datos?.escalas || { participacion: 7, compromiso: 7, superacion: 7 },
    comentarios: defaultComentarios,
    preventivo: defaultPreventivo,
  }))

  const [imagenes, setImagenes] = useState(initial?.imagenes || [])
  const [selTitulo, setSelTitulo] = useState(isFormacion ? (datos.formacionTitulo || '') : '')
  const [loadingDeal, setLoadingDeal] = useState(false)

  // Reset de intentos/HTML si cambia el dealId
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
    if (!isFormacion || !selTitulo) return
    const p = plantillasBase[selTitulo]
    setDatos(d => ({
      ...d,
      formacionTitulo: selTitulo,
      contenidoTeorica: p?.teorica || [],
      contenidoPractica: p?.practica || [],
    }))
  }, [selTitulo, isFormacion])

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

  // Imágenes (opcional)
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

  // Cronología para simulacros
  const addCrono = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setDatos(d => ({ ...d, cronologia: [...(d.cronologia||[]), { hora: `${hh}:${mm}`, texto: '' }] }))
  }

  const updateCrono = (idx, field, value) => {
    setDatos(d => {
      const arr = [...(d.cronologia || [])]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...d, cronologia: arr }
    })
  }

  const removeCrono = (idx) => setDatos(d => ({ ...d, cronologia: d.cronologia.filter((_, i) => i !== idx) }))

  // Submit con validación nativa + min
  const onSubmit = (e) => {
    e.preventDefault()
    // Deja que el navegador valide los `required`, `min`, etc.
    if (formRef.current && !formRef.current.reportValidity()) return

    // Validación extra saneando números (por si acaso)
    const numOk = (v) => {
      const n = Number(v)
      return Number.isFinite(n) && n > 0
    }

    const numericChecks = [
      { applies: isSimulacro || isFormacion, value: datos.sesiones },
      { applies: isFormacion, value: datos.alumnos },
      { applies: isSimulacro || isFormacion, value: datos.duracion },
    ]

    if (numericChecks.some((check) => check.applies && !numOk(check.value))) {
      alert('Los campos numéricos deben ser mayores que 0.')
      return
    }

    if (!datos.fecha) {
      alert('La fecha es obligatoria.')
      return
    }

    const nextDatos = {
      ...datos,
      tipo: type,
      comentarios: isPreventivo
        ? {
            ...datos.comentarios,
            c11: datos.preventivo?.trabajos || '',
            c12: datos.preventivo?.tareas || '',
            c13: datos.preventivo?.observaciones || '',
            c14: datos.preventivo?.incidencias || '',
            c15: '',
            c16: '',
            c17: '',
          }
        : datos.comentarios,
    }

    onNext({ type, dealId, formador: { nombre: datos.formadorNombre, idioma: datos.idioma }, datos: nextDatos, imagenes })
  }

  const addTeorica = () => setDatos(d => ({ ...d, contenidoTeorica: [...(d.contenidoTeorica||[]), '' ] }))
  const addPractica = () => setDatos(d => ({ ...d, contenidoPractica: [...(d.contenidoPractica||[]), '' ] }))

  const opcionesOrdenadas = useMemo(() =>
    Object.keys(plantillasBase).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}))
  , [])

  const renderContenidoEspecifico = () => {
    if (isSimulacro) {
      return (
        <>
          <h2 className="h5 text-danger">DESARROLLO / INCIDENCIAS / RECOMENDACIONES</h2>
          <div className="mb-3">
            <label className="form-label">Desarrollo</label>
            <textarea className="form-control" required value={datos.desarrollo} onChange={(e)=>setDatos(d=>({...d, desarrollo:e.target.value}))} />
          </div>
          <div>
            <h2 className="h5">Cronología</h2>
            <div className="card"><div className="card-body">
              <label className="form-label">Inicio del Simulacro</label>
              <div className="d-grid gap-2">
                {(datos.cronologia || []).map((p,i)=>(
                  <div className="input-group" key={i}>
                    <input
                      type="time"
                      className="form-control"
                      value={p.hora}
                      required
                      onChange={(e)=>updateCrono(i,'hora',e.target.value)}
                      style={{ flex: '0 0 120px', maxWidth: 120 }}
                    />
                    <input
                      className="form-control"
                      value={p.texto}
                      required
                      onChange={(e)=>updateCrono(i,'texto',e.target.value)}
                      style={{ flex: '1 1 auto', minWidth: 0 }}
                    />
                    <button type="button" className="btn btn-outline-danger" onClick={()=>removeCrono(i)}>Eliminar</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline-primary" onClick={addCrono}>Añadir punto</button>
              </div>
              <div className="form-text mt-2">Añade punto a punto la cronología de lo que sucede en el simulacro</div>
            </div></div>
          </div>
        </>
      )
    }

    if (isPreventivo) {
      const updatePreventivo = (field, value) => {
        setDatos(d => ({
          ...d,
          preventivo: { ...d.preventivo, [field]: value },
        }))
      }

      const sections = [
        { key: 'trabajos', title: 'Trabajos' },
        { key: 'tareas', title: 'Tareas' },
        { key: 'observaciones', title: 'Observaciones' },
        { key: 'incidencias', title: 'Incidencias' },
      ]

      return (
        <section className="d-grid gap-3">
          <h2 className="h5 mb-0">Secciones del informe preventivo</h2>
          <div className="card">
            <div className="card-body d-grid gap-4">
              {sections.map(({ key, title }) => (
                <div key={key} className="d-grid gap-2">
                  <h3 className="h6 text-uppercase text-muted mb-0">{title}</h3>
                  <textarea
                    className="form-control"
                    required
                    rows={10}
                    style={{ minHeight: 200 }}
                    value={datos.preventivo?.[key] || ''}
                    onChange={(e)=>updatePreventivo(key, e.target.value)}
                  />
                </div>
              ))}

              <div className="d-grid gap-2">
                <h3 className="h6 text-uppercase text-muted mb-0">Imágenes de apoyo (opcional)</h3>
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
                <div className="form-text">Se añadirán al final del informe como anexo tras la firma.</div>
              </div>
            </div>
          </div>
        </section>
      )
    }

    return (
      <div>
        <h2 className="h5">Formación realizada</h2>
        <div className="card"><div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Formación</label>
              <select
                className="form-select"
                value={selTitulo}
                required
                onChange={(e)=>setSelTitulo(e.target.value)}
              >
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
        </div></div>
      </div>
    )
  }

  return (
    <form ref={formRef} className="d-grid gap-4" onSubmit={onSubmit}>
      {/* Header con logo y título */}
      <div className="border-bottom d-flex align-items-center gap-3 sticky-top bg-white py-3 my-3" style={{ top: 0, zIndex: 10 }}>
        <img
          src={logoImg}
          alt="GEP Group"
          style={{ width: 180, height: 52, objectFit: 'contain', display: 'block' }}
        />
        <div className="flex-grow-1">
          <h1 className="h5 mb-0">{title}</h1>
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
                  <input className="form-control" value={dealId} required onChange={(e)=>setDealId(e.target.value)} />
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
                  <input className="form-control" value={datos.cliente} required onChange={(e)=>setDatos(d=>({...d, cliente:e.target.value}))} />
                </div>
                <div className="col-md-5">
                  <label className="form-label">CIF</label>
                  <input className="form-control" value={datos.cif} required onChange={(e)=>setDatos(d=>({...d, cif:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Comercial</label>
                  <input className="form-control" value={datos.comercial} required onChange={(e)=>setDatos(d=>({...d, comercial:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Persona de contacto</label>
                  <input className="form-control" value={datos.contacto} required onChange={(e)=>setDatos(d=>({...d, contacto:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Dirección fiscal</label>
                  <input className="form-control" value={datos.direccionOrg} required onChange={(e)=>setDatos(d=>({...d, direccionOrg:e.target.value}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{(isSimulacro || isPreventivo) ? 'Dirección del Simulacro' : 'Dirección de la formación'}</label>
                  <input className="form-control" value={datos.sede} required onChange={(e)=>setDatos(d=>({...d, sede:e.target.value}))} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DATOS DEL FORMADOR / REGISTRO */}
        <div className="col-md-6 d-flex">
          <div className="card w-100 h-100">
            <div className="card-body">
              <h2 className="h6">{isPreventivo ? 'Registro' : (isSimulacro ? 'Datos del auditor' : 'Datos del formador')}</h2>

              <div className="row g-3">
                {/* Formador/a o Auditor/a */}
                <div className="col-12">
                  <label className="form-label">{isPreventivo ? 'Bombero/a' : (isSimulacro ? 'Auditor/a' : 'Formador/a')}</label>
                  <input className="form-control" value={datos.formadorNombre} required onChange={(e)=>setDatos(d=>({...d, formadorNombre:e.target.value}))} />
                </div>

                {/* Idioma del informe */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Idioma del informe</label>
                  <select className="form-select" value={datos.idioma} required onChange={(e)=>setDatos(d=>({...d, idioma:e.target.value}))}>
                    <option value="ES">Castellano</option>
                    <option value="CA">Català</option>
                    <option value="EN">English</option>
                  </select>
                </div>

                {/* Fecha */}
                <div className="col-12 col-md-6">
                  <label className="form-label">{isPreventivo ? 'Fecha ejercicio' : 'Fecha'}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={datos.fecha}
                    required
                    onChange={(e)=>setDatos(d=>({...d, fecha:e.target.value}))}
                  />
                </div>

                {!isPreventivo && (
                  <>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Sesiones</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={datos.sesiones}
                        required
                        onChange={(e)=>setDatos(d=>({...d, sesiones:Number(e.target.value||1)}))}
                      />
                    </div>

                    {!isSimulacro && (
                      <div className="col-12 col-md-6">
                        <label className="form-label">Nº de alumnos</label>
                        <input
                          type="number"
                          min={1}
                          className="form-control"
                          value={datos.alumnos}
                          required={!isSimulacro}
                          onChange={(e)=>setDatos(d=>({...d, alumnos:e.target.value}))}
                        />
                      </div>
                    )}

                    <div className="col-12 col-md-6">
                      <label className="form-label">Duración (horas)</label>
                      <input
                        type="number"
                        min={1}
                        step="0.5"
                        className="form-control"
                        value={datos.duracion}
                        required
                        onChange={(e)=>setDatos(d=>({...d, duracion:e.target.value}))}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderContenidoEspecifico()}

      {!isPreventivo && (
        <div>
          <h2 className="h5">Valoración</h2>
          <div className="card"><div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">Participación</span>
                <input
                  type="number" min={1} max={10} className="form-control" required
                  value={datos.escalas.participacion}
                  onChange={(e)=>setDatos(d=>({...d, escalas:{...d.escalas, participacion:Number(e.target.value||0)}}))}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">Compromiso</span>
                <input
                  type="number" min={1} max={10} className="form-control" required
                  value={datos.escalas.compromiso}
                  onChange={(e)=>setDatos(d=>({...d, escalas:{...d.escalas, compromiso:Number(e.target.value||0)}}))}
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text">Superación</span>
                <input
                  type="number" min={1} max={10} className="form-control" required
                  value={datos.escalas.superacion}
                  onChange={(e)=>setDatos(d=>({...d, escalas:{...d.escalas, superacion:Number(e.target.value||0)}}))}
                />
              </div>
            </div>

            {/* Comentarios */}
            {isSimulacro ? (
              <>
                <div className="col-md-6">
                  <label className="form-label">Incidencias detectadas</label>
                  <textarea className="form-control" required value={datos.comentarios.c12}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c12:e.target.value}}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Incidencias: Accidentes</label>
                  <textarea className="form-control" required value={datos.comentarios.c14}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c14:e.target.value}}))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recomendaciones: Formaciones</label>
                  <textarea className="form-control" required value={datos.comentarios.c15}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c15:e.target.value}}))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recomendaciones: Del entorno de Trabajo</label>
                  <textarea className="form-control" required value={datos.comentarios.c16}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c16:e.target.value}}))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recomendaciones: De Materiales</label>
                  <textarea className="form-control" required value={datos.comentarios.c17}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c17:e.target.value}}))} />
                </div>
                <div className="col-12">
                  <label className="form-label">Observaciones generales</label>
                  <textarea className="form-control" required value={datos.comentarios.c11}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c11:e.target.value}}))} />
                </div>
              </>
            ) : (
              <>
                <div className="col-md-6">
                  <label className="form-label">Puntos fuertes de los alumnos a destacar</label>
                  <textarea className="form-control" required value={datos.comentarios.c11}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c11:e.target.value}}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Incidencias: Referentes a la asistencia</label>
                  <textarea className="form-control" required value={datos.comentarios.c12}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c12:e.target.value}}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Incidencias: Referentes a la puntualidad</label>
                  <textarea className="form-control" required value={datos.comentarios.c13}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c13:e.target.value}}))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Incidencias: Accidentes</label>
                  <textarea className="form-control" required value={datos.comentarios.c14}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c14:e.target.value}}))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recomendaciones: Formaciones Futuras</label>
                  <textarea className="form-control" required value={datos.comentarios.c15}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c15:e.target.value}}))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recomendaciones: Del entorno de Trabajo</label>
                  <textarea className="form-control" required value={datos.comentarios.c16}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c16:e.target.value}}))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Recomendaciones: De Materiales</label>
                  <textarea className="form-control" required value={datos.comentarios.c17}
                    onChange={(e)=>setDatos(d=>({...d, comentarios:{...d.comentarios, c17:e.target.value}}))} />
                </div>
              </>
            )}

            {/* Imágenes (opcional) */}
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
              <div className="form-text">Se añadirán al final del informe bajo “Imágenes de apoyo”.</div>
            </div>
          </div>
        </div></div>
        </div>
      )}

      <div className="d-flex justify-content-between">
        <button type="button" className="btn btn-secondary" onClick={onChooseAnother}>Elegir otro informe</button>
        <button type="submit" className="btn btn-primary">Siguiente</button>
      </div>
    </form>
  )
}
