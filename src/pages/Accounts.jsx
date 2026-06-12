import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'
import { fmtMoney } from '../lib/format'

const ACCOUNT_TYPES = ['cash', 'bank', 'card', 'wallet', 'other']

export default function Accounts() {
  const { member, members } = useHousehold()
  const hid = member.household_id
  const [rows, setRows] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [owner, setOwner] = useState('') // '' = Joint
  const [opening, setOpening] = useState('')
  const [err, setErr] = useState(null)
  const [edit, setEdit] = useState(null) // { id, name, type, opening, owner }

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
      owner_member_id: owner || null,
      opening_balance: Number(opening) || 0,
      sort_order: rows.length + 1,
    })
    if (error) { setErr(error.message); return }
    setName(''); setOpening(''); setOwner('')
    load()
  }

  function startEdit(a) {
    setErr(null)
    setEdit({
      id: a.account_id,
      name: a.name,
      type: a.type,
      opening: String(a.opening_balance),
      owner: a.owner_member_id ?? '',
    })
  }

  async function saveEdit() {
    setErr(null)
    const { error } = await supabase.from('accounts').update({
      name: edit.name.trim(),
      type: edit.type,
      opening_balance: Number(edit.opening) || 0,
      owner_member_id: edit.owner || null,
    }).eq('id', edit.id)
    if (error) { setErr(error.message); return }
    setEdit(null)
    load()
  }

  async function setArchived(id, value) {
    await supabase.from('accounts').update({ is_archived: value }).eq('id', id)
    load()
  }

  const ownerName = (id) => members.find((m) => m.id === id)?.display_name ?? 'Joint'
  const visible = rows.filter((r) => showArchived || !r.is_archived)

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass-card p-4 grid sm:grid-cols-5 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} required
          placeholder="Account name" className="field sm:col-span-2" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="field">
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="field">
          <option value="">Joint</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
        <input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)}
          placeholder="Opening (AED)" className="field num" />
        <button type="submit" className="pressable sm:col-span-5 rounded-xl bg-brand text-page font-extrabold py-2">
          Add account
        </button>
        {err && <p className="sm:col-span-5 text-xs font-semibold text-red-400">{err}</p>}
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((a) => (
          <div key={a.account_id} className={`glass-card p-4 ${a.is_archived ? 'opacity-50' : ''}`}>
            {edit?.id === a.account_id ? (
              /* ── edit mode ── */
              <div className="space-y-2">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="field" placeholder="Account name" autoFocus />
                <div className="grid grid-cols-2 gap-2">
                  <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} className="field">
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} className="field">
                    <option value="">Joint</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                  </select>
                </div>
                <label className="block text-xs font-bold text-ink-faint">Opening balance (AED)</label>
                <input type="number" step="0.01" value={edit.opening}
                  onChange={(e) => setEdit({ ...edit, opening: e.target.value })} className="field num" />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEdit(null)}
                    className="pressable flex-1 rounded-lg border border-white/10 text-ink-dim text-sm font-bold py-1.5">
                    Cancel
                  </button>
                  <button onClick={saveEdit}
                    className="pressable flex-1 rounded-lg bg-brand text-page text-sm font-extrabold py-1.5">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* ── display mode ── */
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{a.type}</p>
                    <p className="font-bold mt-0.5 truncate">{a.name}</p>
                    <p className="text-xs text-ink-faint mt-0.5">Owner: {ownerName(a.owner_member_id)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button onClick={() => startEdit(a)}
                      className="pressable text-xs font-bold text-brand hover:underline">Edit</button>
                    <button onClick={() => setArchived(a.account_id, !a.is_archived)}
                      className="pressable text-xs font-bold text-ink-faint hover:text-ink">
                      {a.is_archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </div>
                <p className="num text-xl font-extrabold mt-2">{fmtMoney(a.balance)}</p>
              </>
            )}
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
