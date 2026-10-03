import { useState } from 'react'
import { api } from '../api'

const TASKS = [
  { key: 'cover_letter_opening', label: 'Cover letter opening' },
  { key: 'cover_letter', label: 'Full cover letter' },
  { key: 'keywords', label: 'Missing keywords' },
]

export default function Tailor({ app, onChanged }) {
  const [jd, setJd] = useState(app.job_description)
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function saveJd() {
    if (jd === app.job_description) return
    await api.updateApplication(app.id, { job_description: jd })
    onChanged()
  }

  async function run(task) {
    setBusy(task)
    setError('')
    setResult('')
    try {
      await saveJd() // the backend reads the saved description, so save first
      const { result } = await api.tailor(app.id, task)
      setResult(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <h3>Job description</h3>
      <textarea
        rows={5}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        onBlur={() => saveJd().catch((e) => setError(e.message))}
        placeholder="Paste the posting here to unlock tailoring"
      />
      <div className="row wrap">
        {TASKS.map((t) => (
          <button key={t.key} className="btn" disabled={busy !== null || !jd.trim()} onClick={() => run(t.key)}>
            {busy === t.key ? 'Working…' : t.label}
          </button>
        ))}
      </div>
      {error && <p className="banner" role="alert">{error}</p>}
      {result && (
        <>
          <p className="result">{result}</p>
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(result)}>Copy</button>
        </>
      )}
    </>
  )
}