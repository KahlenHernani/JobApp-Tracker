import { useState } from 'react'
import { api, setToken } from '../api'
import { COLUMNS } from '../constants'
import { banner, btnGhost, btnPrimary, field, label } from '../ui'

const HINTS = {
  saved: 'Roles worth a second look',
  applied: 'Submitted, waiting to hear back',
  interview: 'Screens, technicals, onsites',
  offer: 'Decisions to make',
  rejected: 'Closed out, lessons kept',
}

export default function Login({ onDone }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    try {
      const fn = mode === 'login' ? api.login : api.register
      const { token } = await fn(username, password)
      setToken(token)
      onDone()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(380px,480px)_1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <p className="font-display text-sm font-extrabold tracking-tight">JobApp Tracker</p>
        <form onSubmit={submit} className="mt-10 grid gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {mode === 'login' ? 'Log in' : 'Create your account'}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' ? 'Pick up where your search left off.' : 'Takes ten seconds. No email needed.'}
            </p>
          </div>
          <label className={label}>
            Username
            <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </label>
          <label className={label}>
            Password
            <input
              className={field}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {error && <p className={banner} role="alert">{error}</p>}
          <button className={btnPrimary} type="submit">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
          </button>
        </form>
      </div>

      <aside className="hidden flex-col justify-end border-l border-slate-800 bg-slate-900 p-12 text-slate-100 lg:flex">
        <h2 className="max-w-md font-display text-4xl font-extrabold leading-tight tracking-tight">
          Every application, one pipeline.
        </h2>
        <ol className="mt-10 grid max-w-md gap-4">
          {COLUMNS.map((c, i) => (
            <li key={c.key} className="flex items-baseline gap-4 border-t border-slate-800 pt-4">
              <span className="w-5 text-xs tabular-nums text-slate-500">{String(i + 1).padStart(2, '0')}</span>
              <span className={`size-2 shrink-0 translate-y-px rounded-full ${c.accent}`} />
              <span>
                <span className="block text-sm font-semibold">{c.label}</span>
                <span className="block text-sm text-slate-400">{HINTS[c.key]}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  )
}