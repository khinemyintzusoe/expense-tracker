import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const fn = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error, data } = await fn
    if (error) {
      setMsg({ kind: 'error', text: error.message })
    } else if (mode === 'signup' && !data.session) {
      setMsg({ kind: 'ok', text: 'Account created. Check your email to confirm, then sign in.' })
      setMode('signin')
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8 modal-enter">
        <h1 className="text-2xl font-extrabold tracking-tight">Expense Tracker</h1>
        <p className="mt-1 text-sm text-ink-dim">
          {mode === 'signin' ? 'Sign in to your household.' : 'Create your account.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="field" autoComplete="email"
          />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="field"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {msg && (
            <p className={`text-xs font-semibold ${msg.kind === 'error' ? 'text-red-400' : 'text-brand'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="submit" disabled={busy}
            className="pressable w-full rounded-xl bg-brand text-page font-extrabold py-2.5 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null) }}
          className="pressable mt-4 text-xs font-bold text-ink-dim hover:text-ink"
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
