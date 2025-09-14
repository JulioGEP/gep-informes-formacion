import React from 'react'

export default function Home({ onSelect }) {
  return (
    <div className="d-grid gap-4">
      <div
        className="border-bottom d-flex align-items-center gap-3 sticky-top bg-white py-3 my-3"
        style={{ top: 0, zIndex: 10 }}
      >
        <div
          style={{
            width: 180,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          GEP Group
        </div>
        <div className="flex-grow-1">
          <h1 className="h5 mb-0">Informes GEP</h1>
          <small className="text-muted">GEP Group — Formación y Servicios</small>
        </div>
      </div>

      <p className="lead">¿Qué tipo de informe necesitas hacer?</p>
      <div className="d-grid gap-2">
        <button className="btn btn-primary" onClick={() => onSelect('formacion')}>Informe de Formación</button>
        <button className="btn btn-primary" onClick={() => onSelect('simulacro')}>Informe de Simulacro</button>
        <button className="btn btn-primary" onClick={() => onSelect('preventivo')}>Informe de Preventivo</button>
      </div>
    </div>
  )
}
