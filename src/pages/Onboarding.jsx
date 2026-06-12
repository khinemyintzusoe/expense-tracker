import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'

export default function Onboarding() {
  const { refreshMember, signOut } = useHousehold()
  const [tab, setTab] = useState('create') // create | join
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { error } = tab === 'create'
      ? await supabase.rpc('create_household', { p_name: name, p_display_name: displayName })
      : await supabase.rpc('join_household', { p_code: code.trim().toUpperCase(), p_display_name: displayName })
    if (error) {
      setErr(error.message)
      setBusy(false)
    } else {
      await refreshMember()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8 modal-enter">
        <h1 className="text-xl font-extrabold tracking-tight">Set up your household</h1>
        <p className="mt-1 text-sm text-ink-dim">
          One of you creates the household; the other joins with the invite code shown on the Dashboard.
        </p>
        <div className="mt-5 flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {['create', 'join'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setErr(null) }}
              className={`pressable flex-1 rounded-lg py-1.5 text-sm font-bold ${
                tab === t ? 'bg-brand text-page' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {t === 'create' ? 'Create new' : 'Join with code'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {tab === 'create' ? (
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Household name (e.g. Our Home)" className="field" />
          ) : (
            <input value={code} onChange={(e) => setCode(e.target.value)} required
              placeholder="6-character invite code" className="field uppercase" maxLength={6} />
          )}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
            placeholder="Your name (shown on transactions)" className="field" />
          {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
          <button type="submit" disabled={busy}
            className="pressable w-full rounded-xl bg-brand text-page font-extrabold py-2.5 disabled:opacity-50">
            {busy ? 'Please wait…' : tab === 'create' ? 'Create household' : 'Join household'}
          </button>
        </form>
        <button onClick={signOut} className="pressable mt-4 text-xs font-bold text-ink-faint hover:text-ink">
          Sign out
        </button>
      </div>
    </div>
  )
}
