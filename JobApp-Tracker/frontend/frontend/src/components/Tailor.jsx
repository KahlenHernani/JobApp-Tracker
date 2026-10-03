import { useState } from 'react'
import { api } from '../api'
import { banner, btn, btnGhost, field, sectionTitle } from '../ui'

const TASKS = [
  { key: 'cover_letter_opening', label: 'Cover letter opening' },
  { key: 'cover_letter', label: 'Full cover letter' },
  { key: 'keywords', label: 'Missing keywords' },
]

export default function Tailor({ app, onChanged }) {
  const [jd, setJd] = useState(app.job_description)
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
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

  async function copy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="grid gap-3">
      <h3 className={sectionTitle}>Job description</h3>
      <textarea
        className={field}
        rows={5}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        onBlur={() => saveJd().catch((e) => setError(e.message))}
        placeholder="Paste the posting here to unlock tailoring"
      />
      <div className="flex flex-wrap gap-2">
        {TASKS.map((t) => (
          <button key={t.key} className={btn} disabled={busy !== null || !jd.trim()} onClick={() => run(t.key)}>
            <span className={busy === t.key ? 'animate-pulse' : ''}>{busy === t.key ? 'Working...' : t.label}</span>
          </button>
        ))}
      </div>
      {error && <p className={banner} role="alert">{error}</p>}
      {result && (
        <>
          <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed dark:border-slate-800 dark:bg-slate-950">
            {result}
          </p>
          <button className={`${btnGhost} justify-self-start`} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </>
      )}
    </section>
  )
}