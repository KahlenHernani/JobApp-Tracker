import { useEffect, useState } from 'react'
import { api } from '../api'
import { banner, btn, btnPrimary, field, overlay, panelCard } from '../ui'

export default function ResumeModal({ onClose }) {
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getProfile()
      .then((p) => { setText(p.resume_text); setLoaded(true) })
      .catch((e) => setError(e.message))
  }, [])

  async function save(e) {
    e.preventDefault()
    try {
      await api.saveProfile(text)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={overlay} onClick={onClose}>
      <form
        className={`${panelCard} grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-auto p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
      >
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">Your resume</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Paste it as plain text. It is only used for cover letters and keyword checks.
          </p>
        </div>
        <textarea className={`${field} font-mono text-xs leading-relaxed`} rows={16} value={text} onChange={(e) => setText(e.target.value)} disabled={!loaded} />
        {error && <p className={banner} role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>Save resume</button>
        </div>
      </form>
    </div>
  )
}