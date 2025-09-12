import React, { useState } from 'react'
import Form from './components/Form.jsx'
import Preview from './components/Preview.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './main.css'


export default function App() {
  const [view, setView] = useState('form') // 'form' | 'preview'
  const [draft, setDraft] = useState(null)

  const goPreview = (data) => { setDraft(data); setView('preview') }
  const goForm = () => { setView('form') }

  return (
    <div className="container py-4">
      <header className="d-flex align-items-center mb-4">
        <img src="/logo-gris-GEP-Group.png" alt="GEP Group" height="28" className="me-2" />
        <h1 className="h5 mb-0">Informes de formación</h1>
      </header>

      {view === 'form' && <Form initial={draft} onNext={goPreview} />}
      {view === 'preview' && <Preview draft={draft} onBack={goForm} />}
    </div>
  )
}
