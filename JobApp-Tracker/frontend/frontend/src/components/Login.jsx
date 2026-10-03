import { useState } from 'react'
import { api, setToken } from '../api'

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
    <main className="login">
      <form onSubmit={submit} className="card-form">
        <h1>{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="banner" role="alert">{error}</p>}
        <button className="btn primary" type="submit">
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </main>
  )
}
