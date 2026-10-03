import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { banner } from '../ui'
import { allToLatex, projectToLatex } from '../latex'

const parseTech = (s) => s.split(',').map((t) => t.trim()).filter(Boolean)

function Rich({ text }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
}

function Editor({ project, onClose, onSaved }) {
  const [name, setName] = useState(project?.name || '')
  const [tech, setTech] = useState(project?.tech.join(', ') || '')
  const [bullets, setBullets] = useState(project?.bullets.length ? project.bullets : [''])
  const [link, setLink] = useState(project?.link || '')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const clean = { name: name.trim(), tech: parseTech(tech), bullets: bullets.map((b) => b.trim()).filter(Boolean) }
  const latex = projectToLatex(clean)
  const setBullet = (i, v) => setBullets(bullets.map((b, j) => (j === i ? v : b)))

  async function save(e) {
    e.preventDefault()
    try {
      const body = { ...clean, link: link.trim() }
      if (project) await api.updateProject(project.id, body)
      else await api.createProject(body)
      onSaved()
    } catch (err) {
      setError(err.message)
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(latex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="a-overlay" onClick={onClose}>
      <form className="a-sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="a-form">
          <p className="kicker">{project ? 'Edit entry' : 'New entry'}</p>
          <label className="a-label">Project name
            <input className="a-input a-input-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="WizzOff" required autoFocus />
          </label>
          <label className="a-label">Tech stack <em>comma separated</em>
            <input className="a-input" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Python, Pygame, OpenCV, MediaPipe, Git" />
          </label>
          <div className="a-label">
            <span>Bullets <em>**bold** for metrics</em></span>
            {bullets.map((b, i) => (
              <div key={i} className="a-bullet-row">
                <textarea className="a-input" rows={2} value={b} onChange={(e) => setBullet(i, e.target.value)} aria-label={`Bullet ${i + 1}`} />
                {bullets.length > 1 && (
                  <button type="button" className="a-link" onClick={() => setBullets(bullets.filter((_, j) => j !== i))}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="a-link" onClick={() => setBullets([...bullets, ''])}>+ Add bullet</button>
          </div>
          <label className="a-label">Link <em>optional</em>
            <input className="a-input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://github.com/you/project" />
          </label>
          {error && <p className={banner} role="alert">{error}</p>}
          <div className="a-actions">
            <button type="button" className="a-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="a-btn a-hot">Save entry</button>
          </div>
        </div>

        <div className="a-latex">
          <div className="a-latex-bar">
            <span>resume.tex</span>
            <button type="button" className="a-link" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <pre>{latex}</pre>
        </div>
      </form>
    </div>
  )
}

export default function Projects() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | project
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)

  const load = useCallback(async () => {
    try {
      setItems(await api.listProjects())
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function copy(text, key) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  async function remove(p) {
    if (!window.confirm(`Delete ${p.name}?`)) return
    try {
      await api.deleteProject(p.id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <section className="archive">
      <div className="archive-head">
        <div>
          <p className="kicker">Index of work</p>
          <h2 className="archive-title">Projects<span>.{String(items.length).padStart(2, '0')}</span></h2>
        </div>
        <div className="a-actions">
          {items.length > 0 && (
            <button className="a-btn" onClick={() => copy(allToLatex(items), 'all')}>
              {copied === 'all' ? 'Copied' : 'Copy all as LaTeX'}
            </button>
          )}
          <button className="a-btn a-hot" onClick={() => setEditing('new')}>New entry +</button>
        </div>
      </div>

      {error && <p className={`${banner} mb-4`} role="alert">{error}</p>}

      {items.length === 0 ? (
        <p className="archive-empty">Nothing filed yet. Write each project once, paste it into LaTeX forever.</p>
      ) : (
        <ol className="ledger">
          {items.map((p, i) => (
            <li key={p.id} className="row" style={{ '--i': i }}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="name">{p.name}</h3>
                {p.tech.length > 0 && <p className="tech">{p.tech.join(' / ')}</p>}
                <ul className="bullets">
                  {p.bullets.map((b, j) => <li key={j}><Rich text={b} /></li>)}
                </ul>
                {p.link && <a className="a-link" href={p.link} target="_blank" rel="noreferrer">Open project ↗</a>}
              </div>
              <div className="row-actions">
                <button className="a-link" onClick={() => copy(projectToLatex(p), p.id)}>{copied === p.id ? 'Copied' : 'Copy LaTeX'}</button>
                <button className="a-link" onClick={() => setEditing(p)}>Edit</button>
                <button className="a-link a-danger" onClick={() => remove(p)}>Delete</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <Editor
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </section>
  )
}