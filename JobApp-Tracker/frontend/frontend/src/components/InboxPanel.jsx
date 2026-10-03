import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { COLUMNS } from '../constants'
import { banner, btn, btnGhost, sectionTitle } from '../ui'

const labelOf = (key) => COLUMNS.find((c) => c.key === key)?.label || key

export default function InboxPanel({ onChanged }) {
  const [status, setStatus] = useState(null)
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const s = await api.gmailStatus()
      setStatus(s)
      setItems(s.connected ? await api.gmailSuggestions() : [])
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('gmail')) {
      setNote(p.get('gmail') === 'connected' ? 'Gmail connected. Click Check inbox.' : 'Could not connect Gmail.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    refresh()
  }, [refresh])

  async function connect() {
    try {
      const { url } = await api.gmailConnect()
      window.location.href = url
    } catch (e) {
      setError(e.message)
    }
  }

  async function sync() {
    setBusy(true)
    setError('')
    setNote('')
    try {
      const r = await api.gmailSync()
      setNote(r.created ? `${r.created} new update${r.created > 1 ? 's' : ''} found.` : 'No new updates.')
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function resolve(id, action) {
    try {
      await api.gmailResolve(id, action)
      await refresh()
      if (action === 'accept') onChanged()
    } catch (e) {
      setError(e.message)
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Gmail?')) return
    await api.gmailDisconnect()
    setNote('')
    refresh()
  }

  return (
    <section className="mb-8 grid gap-3 border border-ink bg-paper-2 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className={sectionTitle}>Inbox updates</h3>
        {status?.connected ? (
          <>
            <button className={btn} onClick={sync} disabled={busy}>{busy ? 'Checking...' : 'Check inbox'}</button>
            <button className={btnGhost} onClick={disconnect}>Disconnect</button>
          </>
        ) : (
          status && <button className={btn} onClick={connect}>Connect Gmail</button>
        )}
        {note && <span className="font-mono text-xs text-mute">{note}</span>}
      </div>
      {error && <p className={banner} role="alert">{error}</p>}
      {items.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3 text-sm">
          <div className="min-w-0">
            <strong>{s.company}</strong> <span className="text-mute">{s.position}</span>
            <p className="font-mono text-xs">{labelOf(s.current_status)} → {labelOf(s.suggested_status)}</p>
            <p className="truncate text-mute">{s.subject}</p>
          </div>
          <div className="flex gap-2">
            <button className={btn} onClick={() => resolve(s.id, 'accept')}>Move</button>
            <button className={btnGhost} onClick={() => resolve(s.id, 'dismiss')}>Dismiss</button>
          </div>
        </div>
      ))}
    </section>
  )
}