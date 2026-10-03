import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from './api'
import Login from './components/Login'
import Board from './components/Board'
import ApplicationForm from './components/ApplicationForm'
import DetailPanel from './components/DetailPanel'
import ResumeModal from './components/ResumeModal'
import Projects from './components/Projects'
import { banner, btn, btnGhost, btnPrimary, field } from './ui'
import InboxPanel from './components/InboxPanel'

const TABS = [
  ['pipeline', 'Pipeline'],
  ['projects', 'Projects'],
]

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [view, setView] = useState('pipeline')
  const [apps, setApps] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [openId, setOpenId] = useState(null)


  const [query, setQuery] = useState('')
const [jobType, setJobType] = useState('')
const [due, setDue] = useState('')

const filtered = useMemo(() => {
  const q = query.trim().toLowerCase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const week = new Date(today)
  week.setDate(week.getDate() + 7)

  return apps.filter((a) => {
    if (q && ![a.company, a.position, a.location, a.notes].some((v) => (v || '').toLowerCase().includes(q))) {
      return false
    }
    if (jobType && a.job_type !== jobType) return false
    if (due) {
      if (!a.deadline) return false
      const d = new Date(`${a.deadline}T00:00:00`)
      if (due === 'week' && !(d >= today && d <= week)) return false
      if (due === 'missed' && !(d < today && a.status === 'saved')) return false
    }
    return true
  })
}, [apps, query, jobType, due])

const filtering = Boolean(query || jobType || due)

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
    ['Upcoming', stats.upcoming_interviews],
  ]

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-6 sm:px-10">
      <nav className="mb-12 flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-ink pb-3" aria-label="Sections">
        <span className="kicker">JobApp Tracker</span>
        {TABS.map(([key, name], i) => (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-current={view === key ? 'page' : undefined}
            className={`font-display text-lg font-semibold tracking-tight transition ${
              view === key
                ? 'text-ink underline decoration-hot decoration-2 underline-offset-8'
                : 'text-mute hover:text-ink'
            }`}
          >
            <span className="mr-2 font-mono text-[0.65rem] font-medium text-hot">{`0${i + 1}`}</span>
            {name}
          </button>
        ))}
        <button className={`${btnGhost} ml-auto`} onClick={logout}>Log out</button>
      </nav>

      {view === 'projects' ? (
        <Projects />
      ) : (
        <>
          <header className="mb-10 grid gap-8">
            <div className="archive-head !mb-0">
              <div>
                <p className="kicker">Your search, in motion</p>
                <h1 className="archive-title">
                  Pipeline<span>.{String(stats?.total ?? 0).padStart(2, '0')}</span>
                </h1>
              </div>
              <div className="flex gap-2">
                <button className={btnPrimary} onClick={() => setAdding(true)}>Add application +</button>
                <button className={btn} onClick={() => setResumeOpen(true)}>Resume</button>
              </div>
            </div>

            {figures && (
              <dl className="flex flex-wrap border-y border-ink">
                {figures.map(([name, value], i) => (
                  <div
                    key={name}
                    className="rise min-w-[9rem] flex-1 border-l border-rule py-4 pl-5 pr-4 first:border-l-0 first:pl-0"
                    style={{ '--i': i }}
                  >
                    <dt className="kicker !text-mute">{name}</dt>
                    <dd className="mt-1 font-display text-5xl font-semibold tabular-nums leading-none tracking-tight">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mb-6 flex flex-wrap items-center gap-2">
  <input
    className={`${field} !w-72`}
    type="search"
    placeholder="Search company, role, location, notes"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    aria-label="Search applications"
  />
  <select className={`${field} !w-auto`} value={jobType} onChange={(e) => setJobType(e.target.value)} aria-label="Job type">
    <option value="">All types</option>
    <option>Internship</option>
    <option>Full-time</option>
    <option>Part-time</option>
    <option>Contract</option>
  </select>
  <select className={`${field} !w-auto`} value={due} onChange={(e) => setDue(e.target.value)} aria-label="Deadline">
    <option value="">Any deadline</option>
    <option value="week">Due in 7 days</option>
    <option value="missed">Missed (still Saved)</option>
  </select>
  {filtering && (
    <button className={btnGhost} onClick={() => { setQuery(''); setJobType(''); setDue('') }}>Clear</button>
  )}
  <span className="ml-auto font-mono text-xs text-mute">{filtered.length} of {apps.length}</span>
</div>
          </header>

          {error && <p className={`${banner} mb-4`} role="alert">{error}</p>}

          {apps.length === 0 && (
            <p className="mb-8 max-w-lg font-display text-2xl italic leading-snug">
              Nothing tracked yet. Add the first job you are interested in, then drag it across the board as it
              progresses.
            </p>
          )}

          <InboxPanel onChanged={load} />
          <Board apps={filtered} onMove={moveTo} onOpen={setOpenId} />
        </>
      )}

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