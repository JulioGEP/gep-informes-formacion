import React, { useMemo, useState } from 'react'
import { players as playersData, pairStats as pairStatsData } from '../utils/matchData'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const makePairKey = (ids = []) => {
  const filtered = ids.filter(Boolean)
  if (filtered.length !== 2) return ''
  return [...filtered].sort().join('__')
}

const makeMatchKey = (pairAIds = [], pairBIds = []) => {
  const keyA = makePairKey(pairAIds)
  const keyB = makePairKey(pairBIds)
  if (!keyA || !keyB) return ''
  return [keyA, keyB].sort().join('___')
}

const computeMatchKeyIfComplete = (pairA, pairB) => {
  if (!pairA.every(Boolean) || !pairB.every(Boolean)) return null
  return makeMatchKey(pairA, pairB)
}

const orderPairForForm = (ids, playerMap) => {
  const players = ids.map((id) => playerMap.get(id)).filter(Boolean)
  if (players.length !== 2) return [...ids]
  const drive = players.find((p) => p.preferredSide === 'drive')
  const rev = players.find((p) => p.preferredSide === 'revés')
  if (drive && rev) {
    return [drive.id, rev.id]
  }
  return [...ids]
}

const computePairMetrics = (playerMap, pairStatsMap, pairIds) => {
  const [idA, idB] = pairIds
  const playerA = playerMap.get(idA)
  const playerB = playerMap.get(idB)
  if (!playerA || !playerB) return null

  const pairKey = makePairKey([idA, idB])
  const record = pairStatsMap.get(pairKey)

  const baseLevel = (playerA.rating + playerB.rating) / 2
  const momentum = (playerA.form + playerB.form) / 2
  const reliabilityRaw = (playerA.consistency + playerB.consistency) / 2
  const aggressivenessGap = Math.abs(playerA.aggressiveness - playerB.aggressiveness)
  const aggressivenessBalance = 1 - Math.min(aggressivenessGap, 0.6)
  const defenseCoverage = (playerA.defense + playerB.defense) / 2
  const netCoverage = (playerA.netPlay + playerB.netPlay) / 2
  const sideComplement = playerA.preferredSide === playerB.preferredSide ? 0.68 : 0.96

  const pairMatches = record?.matches ?? Math.round(((playerA.matches + playerB.matches) / 2) * 0.6)
  const pairWinRatio = record ? record.wins / record.matches : (playerA.winRate + playerB.winRate) / 2
  const pairChemistryRaw = record
    ? record.chemistry
    : 0.58 + 0.16 * sideComplement + 0.14 * reliabilityRaw + 0.12 * aggressivenessBalance
  const tieBreakRatio = record?.tieBreakWinRate ?? (playerA.clutch + playerB.clutch) / 2
  const pointsDiff = record?.pointsDiff ?? Math.round((baseLevel - 6.5) * 4)
  const trend = record?.trend ?? (momentum > 0.72 ? 'up' : momentum < 0.58 ? 'down' : 'steady')
  const style = record?.style ?? ((playerA.aggressiveness + playerB.aggressiveness) / 2 > 0.62
    ? 'Ofensiva'
    : defenseCoverage > 0.74
      ? 'Control'
      : 'Equilibrada'
  )

  const synergy = clamp(pairChemistryRaw, 0.45, 0.95)
  const winRate = clamp(pairWinRatio, 0.4, 0.92)
  const tieBreak = clamp(tieBreakRatio, 0.38, 0.9)
  const momentumScore = clamp(momentum, 0.45, 0.9)
  const reliability = clamp(reliabilityRaw, 0.5, 0.92)
  const defenseScore = clamp(defenseCoverage, 0.45, 0.9)
  const netScore = clamp(netCoverage, 0.45, 0.9)
  const experienceScore = clamp(Math.min(pairMatches, 24) / 24, 0.15, 1)
  const aggressivenessScore = clamp((playerA.aggressiveness + playerB.aggressiveness) / 2, 0.4, 0.9)

  const score =
    52 +
    baseLevel * 3.6 +
    momentumScore * 8.5 +
    reliability * 6.4 +
    synergy * 11 +
    winRate * 13.5 +
    tieBreak * 5.2 +
    defenseScore * 4.2 +
    netScore * 3.5 +
    experienceScore * 5 +
    sideComplement * 2.2 +
    aggressivenessBalance * 2.4 +
    Math.min(pointsDiff, 18) * 0.35 +
    aggressivenessScore * 2.1

  const tier =
    score >= 90 ? 'Élite' : score >= 83 ? 'Fuerte' : score >= 76 ? 'Competitiva' : 'En crecimiento'

  const sortedPlayers = [playerA.id, playerB.id].sort()

  return {
    id: pairKey,
    players: sortedPlayers,
    label: `${playerA.name} / ${playerB.name}`,
    score: Number(score.toFixed(1)),
    tier,
    synergy: Number(synergy.toFixed(2)),
    experience: pairMatches,
    winRate: Number(winRate.toFixed(2)),
    tieBreak: Number(tieBreak.toFixed(2)),
    momentum: Number(momentumScore.toFixed(2)),
    reliability: Number(reliability.toFixed(2)),
    style,
    trend,
    baseLevel: Number(baseLevel.toFixed(2)),
    defense: Number(defenseScore.toFixed(2)),
    net: Number(netScore.toFixed(2)),
    sideComplement: Number(sideComplement.toFixed(2)),
    aggressivenessBalance: Number(aggressivenessBalance.toFixed(2)),
    aggressiveness: Number(aggressivenessScore.toFixed(2)),
    record,
  }
}

const evaluateMatch = (pairOne, pairTwo) => {
  if (!pairOne || !pairTwo) return null
  const strong = pairOne.score >= pairTwo.score ? pairOne : pairTwo
  const underdog = strong === pairOne ? pairTwo : pairOne
  const diff = strong.score - underdog.score

  const diffScore = clamp(1 - Math.abs(diff - 5.2) / 7.5, 0, 1)
  const synergyScore = clamp(1 - Math.abs(strong.synergy - underdog.synergy) / 0.5, 0, 1)
  const experienceScore = clamp(1 - Math.abs(strong.experience - underdog.experience) / 18, 0, 1)
  const intensity = (strong.score + underdog.score) / 2
  const intensityScore = clamp((intensity - 62) / 20, 0, 1)
  const underdogMomentum = clamp((underdog.momentum + underdog.winRate) / 2, 0, 1)
  const reliabilityScore = clamp(1 - Math.abs(strong.reliability - underdog.reliability) / 0.45, 0, 1)

  const fairness =
    diffScore * 0.45 +
    synergyScore * 0.15 +
    experienceScore * 0.12 +
    intensityScore * 0.12 +
    underdogMomentum * 0.1 +
    reliabilityScore * 0.06

  const fairnessClamped = clamp(fairness, 0, 1)
  const expectedGames = Math.max(6, Math.round(8 + intensityScore * 4 - (diff - 4.5) * 0.55))

  const narrativeParts = []
  if (diff <= 6) narrativeParts.push('Diferencia de nivel controlada')
  if (underdogMomentum >= 0.6) narrativeParts.push('La pareja aspirante llega en buena forma')
  if (synergyScore >= 0.7) narrativeParts.push('Ambas duplas tienen química compatible')
  if (intensityScore >= 0.6) narrativeParts.push('Se espera un duelo intenso')
  if (!narrativeParts.length) narrativeParts.push('Cruce equilibrado según métricas')

  return {
    strong,
    underdog,
    diff: Number(diff.toFixed(1)),
    intensity: Number(intensity.toFixed(1)),
    fairness: Number(fairnessClamped.toFixed(2)),
    expectedGames,
    diffScore: Number(diffScore.toFixed(2)),
    synergyScore: Number(synergyScore.toFixed(2)),
    experienceScore: Number(experienceScore.toFixed(2)),
    intensityScore: Number(intensityScore.toFixed(2)),
    underdogMomentum: Number(underdogMomentum.toFixed(2)),
    reliabilityScore: Number(reliabilityScore.toFixed(2)),
    narrative: narrativeParts.join('. '),
  }
}

const formatDateTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

const formatTrend = (trend) => {
  if (trend === 'up') return 'En racha'
  if (trend === 'down') return 'A la baja'
  if (trend === 'steady') return 'Estable'
  return trend || '—'
}

const formatStreak = (streak) => {
  if (typeof streak !== 'number' || Number.isNaN(streak)) return '—'
  if (streak > 0) return `+${streak}`
  if (streak < 0) return `${streak}`
  return '0'
}

const renderRecent = (recent = []) => recent.map((res, idx) => (
  <span
    key={idx}
    className={`badge rounded-pill ${res === 'W' ? 'text-bg-success' : 'text-bg-danger'}`}
  >
    {res === 'W' ? 'V' : 'D'}
  </span>
))

export default function MatchPlanner({ onBack }) {
  const playerMap = useMemo(() => {
    const map = new Map()
    playersData.forEach((player) => map.set(player.id, player))
    return map
  }, [])

  const pairStatsMap = useMemo(() => {
    const map = new Map()
    pairStatsData.forEach((pair) => map.set(makePairKey(pair.players), pair))
    return map
  }, [])

  const pairMetrics = useMemo(() => {
    const metrics = []
    for (let i = 0; i < playersData.length; i += 1) {
      for (let j = i + 1; j < playersData.length; j += 1) {
        const pair = computePairMetrics(playerMap, pairStatsMap, [playersData[i].id, playersData[j].id])
        if (pair) metrics.push(pair)
      }
    }
    return metrics
  }, [playerMap, pairStatsMap])

  const pairMetricsMap = useMemo(() => {
    const map = new Map()
    pairMetrics.forEach((pair) => map.set(pair.id, pair))
    return map
  }, [pairMetrics])

  const playersRanking = useMemo(() => [...playersData].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    return b.form - a.form
  }), [])

  const pairsRanking = useMemo(() => [...pairMetrics].sort((a, b) => b.score - a.score), [pairMetrics])

  const [matchForm, setMatchForm] = useState({
    pairA: [null, null],
    pairB: [null, null],
    court: '',
    scheduledAt: '',
    notes: '',
  })
  const [plannedMatches, setPlannedMatches] = useState([])
  const [dismissedMatches, setDismissedMatches] = useState([])
  const [pendingRecommendationKey, setPendingRecommendationKey] = useState(null)

  const candidateMatches = useMemo(() => {
    if (!pairMetrics.length) return []
    const dismissedSet = new Set(dismissedMatches)
    const plannedSet = new Set(plannedMatches.map((match) => match.key))
    const usedKeys = new Set([...dismissedSet, ...plannedSet])

    const sortedPairs = [...pairMetrics].sort((a, b) => b.score - a.score)
    const proposals = []

    outer: for (let i = 0; i < sortedPairs.length; i += 1) {
      const strong = sortedPairs[i]
      for (let j = sortedPairs.length - 1; j >= 0; j -= 1) {
        if (i === j) continue
        const underdog = sortedPairs[j]
        if (strong.players.some((id) => underdog.players.includes(id))) continue

        const evaluation = evaluateMatch(strong, underdog)
        if (!evaluation) continue
        const { diff, fairness } = evaluation
        if (diff < 3.2 || diff > 10.5) continue
        if (fairness < 0.48) continue

        const matchKey = makeMatchKey(strong.players, underdog.players)
        if (!matchKey || usedKeys.has(matchKey)) continue

        proposals.push({
          key: matchKey,
          ...evaluation,
          highlightScore: Math.round(fairness * 100),
        })

        if (proposals.length >= 25) break outer
      }
    }

    proposals.sort((a, b) => {
      if (b.highlightScore !== a.highlightScore) return b.highlightScore - a.highlightScore
      if (a.diff !== b.diff) return a.diff - b.diff
      return b.intensity - a.intensity
    })

    return proposals
  }, [pairMetrics, dismissedMatches, plannedMatches])

  const currentRecommendation = candidateMatches[0] || null

  const selectedPlayersSet = useMemo(() => {
    const ids = [...matchForm.pairA, ...matchForm.pairB].filter(Boolean)
    return new Set(ids)
  }, [matchForm.pairA, matchForm.pairB])

  const pairAKey = matchForm.pairA.every(Boolean) ? makePairKey(matchForm.pairA) : null
  const pairBKey = matchForm.pairB.every(Boolean) ? makePairKey(matchForm.pairB) : null

  const pairAData = pairAKey ? pairMetricsMap.get(pairAKey) : null
  const pairBData = pairBKey ? pairMetricsMap.get(pairBKey) : null
  const evaluation = pairAData && pairBData ? evaluateMatch(pairAData, pairBData) : null

  const matchKey = pairAKey && pairBKey ? makeMatchKey(matchForm.pairA, matchForm.pairB) : null

  const allPlayers = [...matchForm.pairA, ...matchForm.pairB]
  const uniquePlayers = new Set(allPlayers.filter(Boolean))
  const hasAllPlayers = uniquePlayers.size === 4

  const plannedKeySet = useMemo(() => new Set(plannedMatches.map((match) => match.key)), [plannedMatches])
  const alreadyScheduled = matchKey ? plannedKeySet.has(matchKey) : false
  const isMatchReady = Boolean(hasAllPlayers && evaluation && matchKey && !alreadyScheduled)

  const handlePlayerChange = (pairName, index, playerId) => {
    const value = playerId || null
    setMatchForm((prev) => {
      const nextPairA = pairName === 'pairA' ? prev.pairA.map((id, idx) => (idx === index ? value : id)) : prev.pairA
      const nextPairB = pairName === 'pairB' ? prev.pairB.map((id, idx) => (idx === index ? value : id)) : prev.pairB
      const nextForm = { ...prev, pairA: nextPairA, pairB: nextPairB }
      const newKey = computeMatchKeyIfComplete(nextPairA, nextPairB)
      setPendingRecommendationKey((prevKey) => {
        if (!newKey) return null
        return prevKey === newKey ? prevKey : null
      })
      return nextForm
    })
  }

  const handleInputChange = (field, value) => {
    setMatchForm((prev) => ({ ...prev, [field]: value }))
  }

  const acceptRecommendation = () => {
    if (!currentRecommendation) return
    const { strong, underdog, key, narrative } = currentRecommendation
    const orderedStrong = orderPairForForm(strong.players, playerMap)
    const orderedUnderdog = orderPairForForm(underdog.players, playerMap)

    setMatchForm((prev) => ({
      ...prev,
      pairA: orderedStrong,
      pairB: orderedUnderdog,
      notes: narrative
        ? (prev.notes ? `${prev.notes}\nRecomendado: ${narrative}` : `Recomendado: ${narrative}`)
        : prev.notes,
    }))
    setPendingRecommendationKey(key)
    setDismissedMatches((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }

  const skipRecommendation = () => {
    if (!currentRecommendation) return
    setDismissedMatches((prev) => (prev.includes(currentRecommendation.key) ? prev : [...prev, currentRecommendation.key]))
    setPendingRecommendationKey((prev) => (prev === currentRecommendation.key ? null : prev))
  }

  const resetRecommendations = () => {
    setDismissedMatches([])
    setPendingRecommendationKey(null)
  }

  const handleClearForm = () => {
    setMatchForm({ pairA: [null, null], pairB: [null, null], court: '', scheduledAt: '', notes: '' })
    setPendingRecommendationKey(null)
  }

  const handleCreateMatch = (event) => {
    event.preventDefault()
    if (!isMatchReady || !evaluation || !matchKey || !pairAData || !pairBData) return

    if (plannedKeySet.has(matchKey)) {
      alert('Este enfrentamiento ya está planificado.')
      return
    }

    const newMatch = {
      key: matchKey,
      pairA: pairAData,
      pairB: pairBData,
      evaluation,
      court: matchForm.court.trim(),
      scheduledAt: matchForm.scheduledAt,
      notes: matchForm.notes.trim(),
      source: pendingRecommendationKey === matchKey ? 'recomendado' : 'manual',
      createdAt: new Date().toISOString(),
    }

    setPlannedMatches((prev) => [...prev, newMatch])
    setDismissedMatches((prev) => (prev.includes(matchKey) ? prev : [...prev, matchKey]))
    setMatchForm({ pairA: [null, null], pairB: [null, null], court: '', scheduledAt: '', notes: '' })
    setPendingRecommendationKey(null)
  }

  const removeMatch = (key) => {
    setPlannedMatches((prev) => prev.filter((match) => match.key !== key))
    setDismissedMatches((prev) => prev.filter((item) => item !== key))
    setPendingRecommendationKey((prev) => (prev === key ? null : prev))
  }

  return (
    <div className="d-grid gap-4">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <h1 className="h4 mb-1">Planificador de partidos</h1>
          <p className="text-muted mb-0 small">
            Analizamos el rendimiento individual y por parejas para proponer enfrentamientos equilibrados.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          Volver
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Ranking individual</h2>
          <p className="text-muted small">
            Indicadores de nivel, forma y fiabilidad para cada jugador.
          </p>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th scope="col">Jugador</th>
                  <th scope="col">Nivel</th>
                  <th scope="col">Forma</th>
                  <th scope="col">Fiabilidad</th>
                  <th scope="col">Lado preferido</th>
                  <th scope="col">% Victorias</th>
                  <th scope="col">Racha</th>
                </tr>
              </thead>
              <tbody>
                {playersRanking.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <div className="fw-semibold">{player.name}</div>
                      <div className="d-flex gap-1 flex-wrap small mt-1">{renderRecent(player.recent)}</div>
                    </td>
                    <td>{player.rating.toFixed(1)}</td>
                    <td>{Math.round(player.form * 100)}%</td>
                    <td>{Math.round(player.consistency * 100)}%</td>
                    <td className="text-capitalize">{player.preferredSide}</td>
                    <td>{Math.round(player.winRate * 100)}%</td>
                    <td>{formatStreak(player.streak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Rendimiento por parejas</h2>
          <p className="text-muted small">
            Nivel estimado, química y balance de resultados para cada dupla.
          </p>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th scope="col">Pareja</th>
                  <th scope="col">Nivel</th>
                  <th scope="col">Química</th>
                  <th scope="col">% Victorias</th>
                  <th scope="col">Partidos</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {pairsRanking.map((pair) => (
                  <tr key={pair.id}>
                    <td>
                      <div className="fw-semibold">{pair.label}</div>
                      <div className="small text-muted">{pair.tier} · {pair.style}</div>
                    </td>
                    <td>{pair.score}</td>
                    <td>{Math.round(pair.synergy * 100)}%</td>
                    <td>{Math.round(pair.winRate * 100)}%</td>
                    <td>
                      {pair.record
                        ? `${pair.record.wins}-${pair.record.matches - pair.record.wins}`
                        : pair.experience}
                    </td>
                    <td>
                      {pair.record?.pointsDiff !== undefined
                        ? `${pair.record.pointsDiff >= 0 ? '+' : ''}${pair.record.pointsDiff}`
                        : '—'}
                    </td>
                    <td>{formatTrend(pair.trend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card border-primary-subtle">
        <div className="card-body d-grid gap-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h5 mb-0">Recomendación inteligente</h2>
              <small className="text-muted">Algoritmo de equilibrio entre pareja fuerte y aspirante</small>
            </div>
            {candidateMatches.length > 0 && (
              <span className="badge text-bg-primary-subtle text-primary">
                {candidateMatches.length} propuestas
              </span>
            )}
          </div>

          {currentRecommendation ? (
            <>
              <button
                type="button"
                className="btn btn-primary w-100 text-start"
                onClick={acceptRecommendation}
              >
                <div className="text-uppercase small fw-semibold">Siguiente partido recomendado</div>
                <div className="fw-semibold">
                  {currentRecommendation.strong.label}
                  <span className="text-body-secondary"> &nbsp;vs&nbsp; </span>
                  {currentRecommendation.underdog.label}
                </div>
                <div className="small text-body-secondary">
                  Diferencial previsto: {currentRecommendation.diff} pts · Equilibrio estimado: {Math.round(currentRecommendation.fairness * 100)}%
                </div>
              </button>

              <div className="row g-3 small text-muted">
                <div className="col-md-6">
                  <div className="fw-semibold text-primary">Pareja fuerte</div>
                  <div>{currentRecommendation.strong.label}</div>
                  <div>Química {Math.round(currentRecommendation.strong.synergy * 100)}% · Nivel {currentRecommendation.strong.score}</div>
                </div>
                <div className="col-md-6">
                  <div className="fw-semibold text-success">Pareja aspirante</div>
                  <div>{currentRecommendation.underdog.label}</div>
                  <div>Momento {Math.round(currentRecommendation.underdog.momentum * 100)}% · Nivel {currentRecommendation.underdog.score}</div>
                </div>
              </div>

              <div className="text-muted small">{currentRecommendation.narrative}</div>

              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={skipRecommendation}>
                  Ver otra recomendación
                </button>
                {dismissedMatches.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-decoration-none"
                    onClick={resetRecommendations}
                  >
                    Reiniciar sugerencias
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted small mb-0">
              No hay más propuestas disponibles con los datos actuales. Reinicia las sugerencias o crea partidos manualmente.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Crear nuevo partido</h2>
          <p className="text-muted small">
            Selecciona dos parejas. Evita repetir jugadores para mantener la equidad.
          </p>
          <form className="d-grid gap-3" onSubmit={handleCreateMatch}>
            <div className="row g-3">
              {['pairA', 'pairA', 'pairB', 'pairB'].map((pairName, index) => {
                const slotIndex = index % 2
                const label = `${pairName === 'pairA' ? 'Pareja A' : 'Pareja B'} · ${slotIndex === 0 ? 'Jugador 1' : 'Jugador 2'}`
                return (
                  <div className="col-md-3" key={`${pairName}-${slotIndex}`}>
                    <label className="form-label">{label}</label>
                    <select
                      className="form-select"
                      value={matchForm[pairName][slotIndex] || ''}
                      onChange={(e) => handlePlayerChange(pairName, slotIndex, e.target.value || null)}
                    >
                      <option value="">Selecciona jugador</option>
                      {playersData.map((player) => {
                        const isSelected =
                          selectedPlayersSet.has(player.id) && matchForm[pairName][slotIndex] !== player.id
                        return (
                          <option key={player.id} value={player.id} disabled={isSelected}>
                            {player.name} · Nivel {player.rating.toFixed(1)}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )
              })}
            </div>

            {pairAData && (
              <div className="alert alert-light border">
                <div className="fw-semibold">Pareja A: {pairAData.label}</div>
                <div className="small text-muted">
                  Nivel {pairAData.score} · Química {Math.round(pairAData.synergy * 100)}% · Estilo {pairAData.style}
                </div>
              </div>
            )}

            {pairBData && (
              <div className="alert alert-light border">
                <div className="fw-semibold">Pareja B: {pairBData.label}</div>
                <div className="small text-muted">
                  Nivel {pairBData.score} · Química {Math.round(pairBData.synergy * 100)}% · Estilo {pairBData.style}
                </div>
              </div>
            )}

            {evaluation && (
              <div className="alert alert-info">
                <div className="fw-semibold">Balance estimado</div>
                <div className="small">
                  Diferencia prevista: {evaluation.diff} pts · Equilibrio {Math.round(evaluation.fairness * 100)}% · Juegos esperados {evaluation.expectedGames}
                </div>
              </div>
            )}

            {alreadyScheduled && (
              <div className="alert alert-warning py-2 mb-0">
                Este enfrentamiento ya está incluido en la lista de partidos.
              </div>
            )}

            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Pista</label>
                <input
                  className="form-control"
                  value={matchForm.court}
                  onChange={(e) => handleInputChange('court', e.target.value)}
                  placeholder="Ej. 3"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Fecha y hora</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={matchForm.scheduledAt}
                  onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Notas</label>
              <textarea
                className="form-control"
                value={matchForm.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Detalles de interés o recordatorios para el partido"
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={handleClearForm}>
                Limpiar
              </button>
              <button type="submit" className="btn btn-success" disabled={!isMatchReady}>
                Crear partido
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Partidos programados</h2>
          {plannedMatches.length === 0 ? (
            <p className="text-muted small mb-0">Todavía no hay partidos en la lista.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col">Partido</th>
                    <th scope="col">Diferencial</th>
                    <th scope="col">Equilibrio</th>
                    <th scope="col">Juegos</th>
                    <th scope="col">Origen</th>
                    <th scope="col">Notas</th>
                    <th scope="col" className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedMatches.map((match) => (
                    <tr key={match.key}>
                      <td>
                        <div className="fw-semibold">
                          {match.pairA.label}
                          <span className="text-body-secondary"> &nbsp;vs&nbsp; </span>
                          {match.pairB.label}
                        </div>
                        <div className="small text-muted">
                          {match.court ? `Pista ${match.court}` : 'Pista por asignar'}
                          {match.scheduledAt ? ` · ${formatDateTime(match.scheduledAt)}` : ''}
                        </div>
                      </td>
                      <td>{match.evaluation ? `${match.evaluation.diff} pts` : '—'}</td>
                      <td>{match.evaluation ? `${Math.round(match.evaluation.fairness * 100)}%` : '—'}</td>
                      <td>{match.evaluation ? match.evaluation.expectedGames : '—'}</td>
                      <td>
                        <span className={`badge ${match.source === 'recomendado' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                          {match.source === 'recomendado' ? 'Recomendado' : 'Manual'}
                        </span>
                      </td>
                      <td>
                        {match.notes ? (
                          <span className="small text-muted" style={{ whiteSpace: 'pre-line' }}>{match.notes}</span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeMatch(match.key)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
