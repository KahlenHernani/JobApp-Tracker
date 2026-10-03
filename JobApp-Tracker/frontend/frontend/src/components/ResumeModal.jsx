import { useEffect, useState } from 'react'
import { api } from '../api'

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
    <div className="overlay" onClick={onClose}>
      <form className="modal card-form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>Your resume</h2>
        <p className="muted">Paste it as plain text. It is only used for cover letters and keyword checks.</p>
        <textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} disabled={!loaded} />
        {error && <p className="banner" role="alert">{error}</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save resume</button>
        </div>
      </form>
    </div>
  )
}