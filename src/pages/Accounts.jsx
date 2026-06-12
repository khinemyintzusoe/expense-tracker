import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'
import { fmtMoney } from '../lib/format'

const ACCOUNT_TYPES = ['cash', 'bank', 'card', 'wallet', 'other']

export default function Accounts() {
  const { member } = useHousehold()
  const hid = member.household_id
  const [rows, setRows] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [opening, setOpening] = useState('')
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('account_balances').select('*')
      .eq('household_id', hid).order('sort_order')
    setRows(data ?? [])
  }, [hid])

  useEffect(() => { load() }, [load])

  async function add(e) {
    e.preventDefault()
    setErr(null)
    const { error } = await supabase.from('accounts').insert({
      household_id: hid, name: name.trim(), type,
      opening_balance: Number(opening) || 0,
      sort_order: rows.length + 1,
    })
    if (error) { setErr(error.message); return }
    setName(''); setOpening('')
    load()
  }

  async function setArchived(id, value) {
    await supabase.from('accounts').update({ is_archived: value }).eq('id', id)
    load()
  }

  const visible = rows.filter((r) => showArchived || !r.is_archived)

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass-card p-4 grid sm:grid-cols-4 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} required
          placeholder="Account name" className="field" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="field">
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)}
          placeholder="Opening balance (₹)" className="field num" />
        <button type="submit" className="pressable rounded-xl bg-brand text-page font-extrabold py-2">
          Add account
        </button>
        {err && <p className="sm:col-span-4 text-xs font-semibold text-red-400">{err}</p>}
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((a) => (
          <div key={a.account_id} className={`glass-card lift-on-hover p-4 ${a.is_archived ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{a.type}</p>
                <p className="font-bold mt-0.5">{a.name}</p>
              </div>
              <button onClick={() => setArchived(a.account_id, !a.is_archived)}
                className="pressable text-xs font-bold text-ink-faint hover:text-ink">
                {a.is_archived ? 'Restore' : 'Archive'}
              </button>
            </div>
            <p className="num text-xl font-extrabold mt-2">{fmtMoney(a.balance)}</p>
          </div>
        ))}
      </div>

      <button onClick={() => setShowArchived(!showArchived)}
        className="pressable text-xs font-bold text-ink-faint hover:text-ink">
        {showArchived ? 'Hide archived' : 'Show archived'}
      </button>
    </div>
  )
}
