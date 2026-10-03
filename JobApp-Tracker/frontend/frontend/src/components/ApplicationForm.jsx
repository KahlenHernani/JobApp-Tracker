import { useState } from 'react'
import { api } from '../api'
import { banner, btn, btnPrimary, field, label, overlay, panelCard } from '../ui'

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
    <div className={overlay} onClick={onClose}>
      <form
        className={`${panelCard} grid max-h-[90vh] w-full max-w-xl gap-4 overflow-auto p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="font-display text-xl font-extrabold tracking-tight">Add application</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Company<input className={field} value={form.company} onChange={set('company')} required autoFocus /></label>
          <label className={label}>Position<input className={field} value={form.position} onChange={set('position')} required /></label>
          <label className={label}>Location<input className={field} value={form.location} onChange={set('location')} /></label>
          <label className={label}>
            Job type
            <select className={field} value={form.job_type} onChange={set('job_type')}>
              <option value="">Not set</option>
              <option>Internship</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </label>
          <label className={label}>Salary<input className={field} value={form.salary} onChange={set('salary')} placeholder="$32/hr" /></label>
          <label className={label}>Deadline<input className={field} type="date" value={form.deadline} onChange={set('deadline')} /></label>
        </div>
        <label className={label}>Job posting URL<input className={field} type="url" value={form.application_url} onChange={set('application_url')} /></label>
        <label className={label}>Notes<textarea className={field} rows={3} value={form.notes} onChange={set('notes')} /></label>
        {error && <p className={banner} role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>Save application</button>
        </div>
      </form>
    </div>
  )
}