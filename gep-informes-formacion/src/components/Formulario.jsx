import { useState } from 'react'
import axios from 'axios'

const DEAL_DIR_INCOMPANY = '8b2a7570f5ba8aa4754f061cd9dc92fd778376a7'
const ORG_CIF = '6d39d015a33921753410c1bab0b067ca93b8cf2c'

export default function Formulario({ onPreview }){
  const [loading, setLoading] = useState(false)
  const [dealId, setDealId] = useState('7164')

  const [formador, setFormador] = useState({ nombre:'', email:'' })
  const [datos, setDatos] = useState({
    fecha: '', alumnos: '', duracion: '',
    sede: '', cliente: '', cif: '', direccionOrg: '', contacto: '', owner: '',
    productos: [],
    idioma: 'ES',
    escalas: { participacion: 8, compromiso: 8, superacion: 8 },
    comentarios: {
      c11:'', c12:'', c13:'', c14:'', c15:'', c16:'', c17:''
    }
  })

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
      alert('Datos de Pipedrive cargados')
    }catch(e){
      console.error(e)
      alert('No se pudo cargar el deal. Puedes continuar y rellenar a mano.')
    }finally{
      setLoading(false)
    }
  }

  const handlePreview = async (e)=>{
    e.preventDefault()

    const payload = {
      dealId,
      formador,
      datos
    }

    try{
      const { data } = await axios.post('/.netlify/functions/generateReport', payload)
      const borrador = data?.borrador || ''
      onPreview({ ...payload, borrador })
    }catch(err){
      console.error(err)
      alert('Error generando borrador. Revisa consola.')
    }
  }

  return (
    <form onSubmit={handlePreview} style={{display:'grid', gap:12}}>
      <fieldset style={{border:'1px solid #eee', padding:12}}>
        <legend>Identificación</legend>
        <label> Nº Presupuesto (Deal ID)
          <input value={dealId} onChange={e=>setDealId(e.target.value)} required />
        </label>
        <button type="button" onClick={fetchDeal} disabled={loading}>Autocompletar desde Pipedrive</button>
      </fieldset>

      <fieldset style={{border:'1px solid #eee', padding:12}}>
        <legend>Datos de la formación</legend>
        <label> Formador
          <input value={formador.nombre} onChange={e=>setFormador({...formador, nombre: e.target.value})} required />
        </label>
        <label> Email formador
          <input type="email" value={formador.email} onChange={e=>setFormador({...formador, email: e.target.value})} required />
        </label>
        <label> Fecha
          <input type="date" value={datos.fecha} onChange={e=>setDatos({...datos, fecha: e.target.value})} required />
        </label>
        <label> Nº alumnos
          <input type="number" value={datos.alumnos} onChange={e=>setDatos({...datos, alumnos: e.target.value})} required />
        </label>
        <label> Duración (h)
          <input type="number" step="0.5" value={datos.duracion} onChange={e=>setDatos({...datos, duracion: e.target.value})} required />
        </label>
        <label> Idioma
          <select value={datos.idioma} onChange={e=>setDatos({...datos, idioma: e.target.value})}>
            <option value="ES">Castellano</option>
            <option value="CA">Català</option>
            <option value="EN">English</option>
          </select>
        </label>
      </fieldset>

      <fieldset style={{border:'1px solid #eee', padding:12}}>
        <legend>Datos cliente (editable)</legend>
        <label> Cliente (Organización)
          <input value={datos.cliente} onChange={e=>setDatos({...datos, cliente: e.target.value})} />
        </label>
        <label> CIF
          <input value={datos.cif} onChange={e=>setDatos({...datos, cif: e.target.value})} />
        </label>
        <label> Dirección (Organización)
          <input value={datos.direccionOrg} onChange={e=>setDatos({...datos, direccionOrg: e.target.value})} />
        </label>
        <label> Sede (Dirección Incompany)
          <input value={datos.sede} onChange={e=>setDatos({...datos, sede: e.target.value})} />
        </label>
        <label> Persona de contacto
          <input value={datos.contacto} onChange={e=>setDatos({...datos, contacto: e.target.value})} />
        </label>
        <label> Owner (comercial)
          <input value={datos.owner} onChange={e=>setDatos({...datos, owner: e.target.value})} />
        </label>
      </fieldset>

      <fieldset style={{border:'1px solid #eee', padding:12}}>
        <legend>Productos (formaciones asociadas)</legend>
        <textarea rows={4} value={datos.productos.map(p=>`${p.product?.code || ''} - ${p.product?.name || ''}`).join('\n')} readOnly></textarea>
      </fieldset>

      <fieldset style={{border:'1px solid #eee', padding:12}}>
        <legend>Valoraciones (8–10)</legend>
        <label> Participación
          <input type="number" min="0" max="10" value={datos.escalas.participacion} onChange={e=>setDatos({...datos, escalas:{...datos.escalas, participacion: Number(e.target.value)}})} />
        </label>
        <label> Compromiso
          <input type="number" min="0" max="10" value={datos.escalas.compromiso} onChange={e=>setDatos({...datos, escalas:{...datos.escalas, compromiso: Number(e.target.value)}})} />
        </label>
        <label> Superación
          <input type="number" min="0" max="10" value={datos.escalas.superacion} onChange={e=>setDatos({...datos, escalas:{...datos.escalas, superacion: Number(e.target.value)}})} />
        </label>
      </fieldset>

      <fieldset style={{border:'1px solid #eee', padding:12}}>
        <legend>Comentarios del formador (opcionales)</legend>
        {['c11','c12','c13','c14','c15','c16','c17'].map(k=> (
          <label key={k}> {k.toUpperCase()}
            <textarea rows={2} value={datos.comentarios[k]} onChange={e=>setDatos({...datos, comentarios:{...datos.comentarios, [k]: e.target.value}})} />
          </label>
        ))}
      </fieldset>

      <div style={{display:'flex', gap:12}}>
        <button type="submit" disabled={loading}>Generar borrador</button>
      </div>
    </form>
  )
}
