import { useEffect, useState } from 'react'
import { api } from '../api'
import { banner, btn, btnDanger, btnGhost, btnPrimary, field, label, overlay, panelCard } from '../ui'

export default function ResumeModal({ onClose }) {
  const [resumes, setResumes] = useState([])
  const [id, setId] = useState(null) // null = new resume
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function pick(r) {
    setId(r ? r.id : null)
    setName(r ? r.name : '')
    setText(r ? r.text : '')
    setError('')
  }

  useEffect(() => {
    api.listResumes()
      .then((list) => { setResumes(list); pick(list[0]); setLoaded(true) })
      .catch((e) => setError(e.message))
  }, [])

  async function upload(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const saved = await api.uploadResume(file)
      setResumes((prev) => [...prev, saved])
      pick(saved) // shows the extracted text so you can clean it up
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    try {
      const saved = id ? await api.updateResume(id, { name, text }) : await api.createResume({ name, text })
      setResumes((prev) => (id ? prev.map((r) => (r.id === id ? saved : r)) : [...prev, saved]))
      setId(saved.id)
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      await api.deleteResume(id)
      const rest = resumes.filter((r) => r.id !== id)
      setResumes(rest)
      pick(rest[0])
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
          <h2 className="font-display text-xl font-extrabold tracking-tight">Your resumes</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Upload a PDF and the text is extracted for you, or paste it by hand. Pick which one to use when you
            write a cover letter from the extension.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {resumes.map((r) => (
            <button key={r.id} type="button" className={r.id === id ? btnPrimary : btn} onClick={() => pick(r)}>
              {r.name}
            </button>
          ))}
          <button type="button" className={btnGhost} onClick={() => pick(null)}>+ New resume</button>
          <label className={`${btn} cursor-pointer`}>
            {uploading ? 'Reading PDF...' : 'Upload PDF'}
            <input type="file" accept="application/pdf" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </div>

        <label className={label}>
          Name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Software internship" required />
        </label>
        <textarea
          className={`${field} font-mono text-xs leading-relaxed`}
          rows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!loaded}
          placeholder="Paste as plain text, or upload a PDF above"
        />
        {error && <p className={banner} role="alert">{error}</p>}
        <div className="flex justify-between gap-2">
          {id ? <button type="button" className={btnDanger} onClick={remove}>Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={onClose}>Close</button>
            <button type="submit" className={btnPrimary}>Save resume</button>
          </div>
        </div>
      </form>
    </div>
  )
}