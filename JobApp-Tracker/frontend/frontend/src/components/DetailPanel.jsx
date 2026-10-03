import { useState } from 'react'
import { api } from '../api'
import { COLUMNS } from '../constants'
import Tailor from './Tailor'

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
    if (!window.confirm(`Delete ${app.company} – ${app.position}?`)) return
    await api.deleteApplication(app.id)
    onClose()
    onChanged()
  }

  const timeline = [...app.events].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)

  return (
    <aside className="panel" aria-label={`${app.company} details`}>
      <div className="row between">
        <div>
          <h2>{app.company}</h2>
          <p className="muted">{app.position}</p>
        </div>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </div>

      <label>
        Status
        <select value={app.status} onChange={(e) => onMove(app.id, e.target.value)}>
          {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>

      <dl className="facts">
        {app.location && (<><dt>Location</dt><dd>{app.location}</dd></>)}
        {app.job_type && (<><dt>Type</dt><dd>{app.job_type}</dd></>)}
        {app.salary && (<><dt>Salary</dt><dd>{app.salary}</dd></>)}
        {app.deadline && (<><dt>Deadline</dt><dd>{app.deadline}</dd></>)}
        {app.application_url && (
          <><dt>Posting</dt><dd><a href={app.application_url} target="_blank" rel="noreferrer">Open job posting</a></dd></>
        )}
      </dl>

      <h3>Timeline</h3>
      <ol className="timeline">
        {timeline.map((ev) => (
          <li key={ev.id}><time>{ev.date}</time> {ev.description}</li>
        ))}
      </ol>

      <h3>Interviews</h3>
      {app.interviews.length === 0 && <p className="muted">No interviews scheduled.</p>}
      <ul className="plain">
        {app.interviews.map((i) => (
          <li key={i.id}>
            {i.interview_type} · {new Date(i.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            <button className="link" onClick={async () => { await api.deleteInterview(i.id); onChanged() }}>Remove</button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={addInterview}>
        <input
          placeholder="Technical interview"
          value={iv.interview_type}
          onChange={(e) => setIv({ ...iv, interview_type: e.target.value })}
          required
          aria-label="Interview type"
        />
        <input
          type="datetime-local"
          value={iv.date}
          onChange={(e) => setIv({ ...iv, date: e.target.value })}
          required
          aria-label="Interview date and time"
        />
        <button className="btn">Add</button>
      </form>
      
      <Tailor app={app} onChanged={onChanged} />

      <h3>Notes</h3>
      <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />

      {error && <p className="banner" role="alert">{error}</p>}
      <button className="btn danger" onClick={remove}>Delete application</button>
    </aside>
  )
}
