import { useCallback, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'
import Login from './components/Login'
import Board from './components/Board'
import ApplicationForm from './components/ApplicationForm'
import DetailPanel from './components/DetailPanel'

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [apps, setApps] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)

  const logout = useCallback(() => {
    setToken(null)
    setAuthed(false)
    setApps([])
  }, [])

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api.listApplications(), api.stats()])
      setApps(list)
      setStats(s)
      setError('')
    } catch (e) {
      if (e.status === 401) logout()
      else setError(e.message)
    }
  }, [logout])

  useEffect(() => {
    if (authed) load()
  }, [authed, load])

  async function moveTo(id, status) {
    const current = apps.find((a) => a.id === id)
    if (!current || current.status === status) return
    // Optimistic update, then refresh from the server (which logs the timeline event).
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    try {
      await api.updateApplication(id, { status })
    } catch (e) {
      setError(e.message)
    }
    load()
  }

  if (!authed) return <Login onDone={() => setAuthed(true)} />

  const open = apps.find((a) => a.id === openId)

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>Applications</h1>
          {stats && (
            <p className="summary">
              {stats.total} tracked · {stats.by_status.interview || 0} interviewing ·{' '}
              {stats.by_status.offer || 0} offers · interview rate {stats.interview_rate}%
              {stats.upcoming_interviews > 0 &&
                ` · ${stats.upcoming_interviews} upcoming interview${stats.upcoming_interviews > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setAdding(true)}>
            Add application
          </button>
          <button className="btn ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {error && <p className="banner" role="alert">{error}</p>}

      {apps.length === 0 && (
        <p className="empty">
          No applications yet. Add the first job you are interested in and drag it across the board as it progresses.
        </p>
      )}

      <Board apps={apps} onMove={moveTo} onOpen={setOpenId} />

      {adding && (
        <ApplicationForm
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            load()
          }}
        />
      )}

      {open && (
        <DetailPanel
          app={open}
          onClose={() => setOpenId(null)}
          onChanged={load}
          onMove={moveTo}
        />
      )}
    </div>
  )
}
