import { useState } from 'react'
import { api } from '../api'

const EMPTY = {
  company: '', position: '', location: '', job_type: '', salary: '',
  application_url: '', deadline: '', notes: '',
}

export default function ApplicationForm({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    const body = { ...form }
    if (!body.deadline) delete body.deadline
    try {
      await api.createApplication(body)
      onSaved()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal card-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Add application</h2>
        <div className="grid">
          <label>Company<input value={form.company} onChange={set('company')} required autoFocus /></label>
          <label>Position<input value={form.position} onChange={set('position')} required /></label>
          <label>Location<input value={form.location} onChange={set('location')} /></label>
          <label>
            Job type
            <select value={form.job_type} onChange={set('job_type')}>
              <option value="">Not set</option>
              <option>Internship</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </label>
          <label>Salary<input value={form.salary} onChange={set('salary')} placeholder="$32/hr" /></label>
          <label>Deadline<input type="date" value={form.deadline} onChange={set('deadline')} /></label>
        </div>
        <label>Job posting URL<input type="url" value={form.application_url} onChange={set('application_url')} /></label>
        <label>Notes<textarea rows={3} value={form.notes} onChange={set('notes')} /></label>
        {error && <p className="banner" role="alert">{error}</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save application</button>
        </div>
      </form>
    </div>
  )
}
