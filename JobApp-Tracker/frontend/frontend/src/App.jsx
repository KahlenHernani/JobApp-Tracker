import { useCallback, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'
import Login from './components/Login'
import Board from './components/Board'
import ApplicationForm from './components/ApplicationForm'
import DetailPanel from './components/DetailPanel'
import ResumeModal from './components/ResumeModal'
import { banner, btn, btnGhost, btnPrimary } from './ui'

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [apps, setApps] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
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

  const figures = stats && [
    ['Tracked', stats.total],
    ['Interviewing', stats.by_status.interview || 0],
    ['Offers', stats.by_status.offer || 0],
    ['Interview rate', `${stats.interview_rate}%`],
    ['Upcoming interviews', stats.upcoming_interviews],
  ]

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-6 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Applications</h1>
          {figures && (
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
              {figures.map(([name, value]) => (
                <div key={name}>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{name}</dt>
                  <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="flex gap-2">
          <button className={btnPrimary} onClick={() => setAdding(true)}>Add application</button>
          <button className={btn} onClick={() => setResumeOpen(true)}>Resume</button>
          <button className={btnGhost} onClick={logout}>Log out</button>
        </div>
      </header>

      {error && <p className={`${banner} mb-4`} role="alert">{error}</p>}

      {apps.length === 0 && (
        <div className="mb-6 max-w-lg">
          <p className="font-display text-lg font-bold">Nothing tracked yet.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Add the first job you are interested in, then drag it across the board as it progresses.
          </p>
        </div>
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

      {resumeOpen && <ResumeModal onClose={() => setResumeOpen(false)} />}

      {open && (
        <DetailPanel
          key={open.id}
          app={open}
          onClose={() => setOpenId(null)}
          onChanged={load}
          onMove={moveTo}
        />
      )}
    </div>
  )
}