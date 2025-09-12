// Fusiona plantillas base (del JSON del repo) con personalizadas (localStorage)
const LS_KEY = 'customPlantillas:v1'

export function loadCustom() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveCustom(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj || {}))
}

export function getMergedPlantillas(baseJson) {
  const custom = loadCustom()
  // custom: { [titulo]: { teorica:[], practica:[] } }
  return { ...baseJson, ...custom }
}

export function upsertPlantilla(titulo, data) {
  const custom = loadCustom()
  custom[titulo] = {
    teorica: Array.isArray(data.teorica) ? data.teorica : [],
    practica: Array.isArray(data.practica) ? data.practica : [],
  }
  saveCustom(custom)
}

export function deletePlantilla(titulo) {
  const custom = loadCustom()
  if (custom[titulo]) {
    delete custom[titulo]
    saveCustom(custom)
  }
}
