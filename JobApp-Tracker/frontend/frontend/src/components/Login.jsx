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
    <main className="grid min-h-screen lg:grid-cols-[minmax(380px,540px)_1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-14">
        <p className="kicker">JobApp Tracker</p>
        <form onSubmit={submit} className="mt-8 grid gap-5">
          <div>
            <h1 className="archive-title !text-[clamp(3rem,7vw,5rem)]">
              {mode === 'login' ? 'Log in' : 'Sign up'}
              <span>.</span>
            </h1>
            <p className="mt-3 text-mute">
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
            className={`${btnGhost} justify-self-start`}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
          </button>
        </form>
      </div>

      <aside className="hidden flex-col justify-end border-l border-ink bg-[#0d1511] p-14 text-[#e9e3d3] lg:flex">
        <h2 className="max-w-lg font-display text-6xl font-semibold leading-[0.95] tracking-[-0.03em]">
          Every application,
          <br />
          <em className="font-normal text-[#ff6a3d]">one pipeline.</em>
        </h2>
        <ol className="mt-14 grid max-w-lg">
          {COLUMNS.map((c, i) => (
            <li
              key={c.key}
              className="rise flex items-baseline gap-5 border-t border-[#e9e3d3]/25 py-4"
              style={{ '--i': i + 2 }}
            >
              <span className="w-8 font-display text-2xl italic text-[#ff6a3d]">{String(i + 1).padStart(2, '0')}</span>
              <span className="size-2.5 shrink-0" style={{ background: c.color }} />
              <span>
                <span className="block font-display text-xl font-semibold">{c.label}</span>
                <span className="block font-mono text-xs text-[#8d9a8f]">{HINTS[c.key]}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  )
}