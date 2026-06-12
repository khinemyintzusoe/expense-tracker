import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'

export default function Categories() {
  const { member } = useHousehold()
  const hid = member.household_id
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState('expense')
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*')
      .eq('household_id', hid).order('name')
    setRows(data ?? [])
  }, [hid])

  useEffect(() => { load() }, [load])

  async function add(e) {
    e.preventDefault()
    setErr(null)
    const { error } = await supabase.from('categories').insert({
      household_id: hid, name: name.trim(), kind,
    })
    if (error) { setErr(error.message); return }
    setName('')
    load()
  }

  async function setArchived(id, value) {
    await supabase.from('categories').update({ is_archived: value }).eq('id', id)
    load()
  }

  const groups = [
    { kind: 'expense', title: 'Expense categories' },
    { kind: 'income', title: 'Income categories' },
  ]

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="glass-card p-4 grid sm:grid-cols-3 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} required
          placeholder="Category name" className="field" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="field">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button type="submit" className="pressable rounded-xl bg-brand text-page font-extrabold py-2">
          Add category
        </button>
        {err && <p className="sm:col-span-3 text-xs font-semibold text-red-400">{err}</p>}
      </form>

      <div className="grid md:grid-cols-2 gap-4">
        {groups.map((g) => (
          <section key={g.kind}>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-dim mb-2">{g.title}</h2>
            <div className="glass-card divide-y divide-white/5">
              {rows.filter((r) => r.kind === g.kind).map((c) => (
                <div key={c.id} className={`flex items-center justify-between px-4 py-2.5 ${c.is_archived ? 'opacity-50' : ''}`}>
                  <span className="font-bold text-sm flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: c.color || '#71717a' }} />
                    {c.name}
                  </span>
                  <button onClick={() => setArchived(c.id, !c.is_archived)}
                    className="pressable text-xs font-bold text-ink-faint hover:text-ink">
                    {c.is_archived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
