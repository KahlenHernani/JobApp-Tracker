import { useState } from 'react'
import { api } from '../api'
import { COLUMNS } from '../constants'
import Tailor from './Tailor'
import { banner, btn, btnDanger, btnGhost, field, label, sectionTitle } from '../ui'

export default function DetailPanel({ app, onClose, onChanged, onMove }) {
  const [notes, setNotes] = useState(app.notes)
  const [iv, setIv] = useState({ interview_type: '', date: '' })
  const [error, setError] = useState('')

  async function saveNotes() {
    if (notes === app.notes) return
    try {
      await api.updateApplication(app.id, { notes })
      onChanged()
    } catch (e) {
      setError(e.message)
    }
  }

  async function addInterview(e) {
    e.preventDefault()
    try {
      await api.createInterview({
        application: app.id,
        interview_type: iv.interview_type,
        date: new Date(iv.date).toISOString(),
      })
      setIv({ interview_type: '', date: '' })
      onChanged()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${app.company} - ${app.position}?`)) return
    await api.deleteApplication(app.id)
    onClose()
    onChanged()
  }

  const timeline = [...app.events].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  const facts = [
    ['Location', app.location],
    ['Type', app.job_type],
    ['Salary', app.salary],
    ['Deadline', app.deadline],
  ].filter(([, v]) => v)

  return (
    <>
      <div className="fixed inset-0 z-10 bg-slate-950/30" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 right-0 z-20 grid w-full max-w-md content-start gap-5 overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl motion-safe:animate-slide-in dark:border-slate-800 dark:bg-slate-900"
        aria-label={`${app.company} details`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">{app.company}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{app.position}</p>
          </div>
          <button className={btnGhost} onClick={onClose}>Close</button>
        </div>

        <label className={label}>
          Status
          <select className={field} value={app.status} onChange={(e) => onMove(app.id, e.target.value)}>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>

        {(facts.length > 0 || app.application_url) && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {app.application_url && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Posting</dt>
                <dd>
                  <a
                    className="font-medium text-blue-700 underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-400"
                    href={app.application_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open job posting
                  </a>
                </dd>
              </>
            )}
          </dl>
        )}

        <section className="grid gap-3">
          <h3 className={sectionTitle}>Timeline</h3>
          <ol className="grid gap-3 border-l border-slate-200 dark:border-slate-800">
            {timeline.map((ev) => (
              <li key={ev.id} className="relative pl-4 text-sm">
                <span className="absolute -left-[3px] top-1.5 size-1.5 rounded-full bg-slate-400" />
                <time className="mr-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">{ev.date}</time>
                {ev.description}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-3">
          <h3 className={sectionTitle}>Interviews</h3>
          {app.interviews.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No interviews scheduled.</p>
          )}
          <ul className="grid gap-1">
            {app.interviews.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              >
                <span>
                  <span className="font-medium">{i.interview_type}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {' · '}
                    {new Date(i.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </span>
                <button
                  className="text-xs font-semibold text-rose-700 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:text-rose-400"
                  onClick={async () => {
                    await api.deleteInterview(i.id)
                    onChanged()
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={addInterview}>
            <input
              className={field}
              placeholder="Technical interview"
              value={iv.interview_type}
              onChange={(e) => setIv({ ...iv, interview_type: e.target.value })}
              required
              aria-label="Interview type"
            />
            <input
              className={field}
              type="datetime-local"
              value={iv.date}
              onChange={(e) => setIv({ ...iv, date: e.target.value })}
              required
              aria-label="Interview date and time"
            />
            <button className={btn}>Add</button>
          </form>
        </section>

        <Tailor app={app} onChanged={onChanged} />

        <section className="grid gap-3">
          <h3 className={sectionTitle}>Notes</h3>
          <textarea className={field} rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
        </section>

        {error && <p className={banner} role="alert">{error}</p>}
        <button className={btnDanger} onClick={remove}>Delete application</button>
      </aside>
    </>
  )
}