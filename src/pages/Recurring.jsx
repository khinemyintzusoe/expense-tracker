import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'
import { fmtMoney, fmtDate, todayISO } from '../lib/format'

const FREQS = ['daily', 'weekly', 'monthly', 'yearly']

export default function Recurring() {
  const { member } = useHousehold()
  const hid = member.household_id
  const [rules, setRules] = useState([])
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null) // null | object being edited
  const [err, setErr] = useState(null)
  const [logging, setLogging] = useState(null)

  const load = useCallback(async () => {
    const [r, a, c] = await Promise.all([
      supabase.from('recurring_rules').select('*, categories(name), accounts(name)')
        .eq('household_id', hid).order('next_run'),
      supabase.from('accounts').select('*').eq('household_id', hid).eq('is_archived', false).order('sort_order'),
      supabase.from('categories').select('*').eq('household_id', hid).eq('is_archived', false).order('name'),
    ])
    setRules(r.data ?? [])
    setAccounts(a.data ?? [])
    setCategories(c.data ?? [])
  }, [hid])

  useEffect(() => { load() }, [load])

  function blankForm() {
    return {
      type: 'expense', amount: '', account_id: accounts[0]?.id ?? '', category_id: '',
      note: '', frequency: 'monthly', every_n: 1, next_run: todayISO(),
    }
  }

  async function save(e) {
    e.preventDefault()
    setErr(null)
    const row = {
      household_id: hid,
      type: form.type,
      amount: Number(form.amount),
      account_id: form.account_id,
      category_id: form.category_id || null,
      note: form.note.trim() || null,
      frequency: form.frequency,
      every_n: Number(form.every_n) || 1,
      next_run: form.next_run,
      start_date: form.next_run,
    }
    const { error } = await supabase.from('recurring_rules').insert(row)
    if (error) { setErr(error.message); return }
    setForm(null)
    load()
  }

  async function toggle(rule) {
    await supabase.from('recurring_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    load()
  }

  async function remove(id) {
    if (!window.confirm('Delete this recurring rule? Past logged transactions stay.')) return
    await supabase.from('recurring_rules').delete().eq('id', id)
    load()
  }

  async function logNow(rule) {
    setLogging(rule.id)
    const { error } = await supabase.rpc('log_recurring', { p_rule_id: rule.id })
    if (error) setErr(error.message)
    await load()
    setLogging(null)
  }

  const today = todayISO()
  const cats = form ? categories.filter((c) => c.kind === form.type) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-dim">Rent, salary, subscriptions — log them in one tap when due.</p>
        <button onClick={() => setForm(blankForm())}
          className="pressable rounded-xl bg-brand text-page text-sm font-extrabold px-4 py-2 shrink-0">
          Add rule
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="glass-card p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category_id: '' })} className="field">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input type="number" step="0.01" min="0.01" required value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount (₹)" className="field num" />
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Name / note (e.g. Rent)" className="field" />
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="field">
              <option value="" disabled>Account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="field">
              <option value="" disabled>Category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" min="1" value={form.every_n}
                onChange={(e) => setForm({ ...form, every_n: e.target.value })} className="field num w-20" title="Every N" />
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="field">
                {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <input type="date" required value={form.next_run}
              onChange={(e) => setForm({ ...form, next_run: e.target.value })} className="field" title="First due date" />
          </div>
          {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setForm(null)}
              className="pressable flex-1 rounded-xl border border-white/10 text-ink-dim font-bold py-2">Cancel</button>
            <button type="submit" className="pressable flex-1 rounded-xl bg-brand text-page font-extrabold py-2">Save rule</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {rules.map((r) => {
          const due = r.is_active && r.next_run <= today
          return (
            <div key={r.id} className={`glass-card p-4 flex items-center justify-between gap-3 ${due ? 'alert-pulse' : ''} ${!r.is_active ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <p className="font-bold truncate">{r.note || r.categories?.name || 'Recurring'}</p>
                <p className="text-xs text-ink-faint">
                  every {r.every_n > 1 ? `${r.every_n} ` : ''}{r.frequency.replace(/ly$/, r.every_n > 1 ? 's' : 'ly')}
                  {' · '}{r.accounts?.name}{' · next '}{fmtDate(r.next_run)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`num font-extrabold ${r.type === 'income' ? 'text-brand' : ''}`}>{fmtMoney(r.amount)}</span>
                {due && (
                  <button onClick={() => logNow(r)} disabled={logging === r.id}
                    className="pressable rounded-lg bg-brand text-page text-xs font-extrabold px-3 py-1.5 disabled:opacity-50">
                    {logging === r.id ? '…' : 'Log now'}
                  </button>
                )}
                <button onClick={() => toggle(r)} className="pressable text-xs font-bold text-ink-faint hover:text-ink">
                  {r.is_active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => remove(r.id)} className="pressable text-xs font-bold text-ink-faint hover:text-red-400">
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {rules.length === 0 && !form && (
          <p className="glass-card px-4 py-8 text-sm text-ink-faint text-center">No recurring rules yet.</p>
        )}
      </div>
    </div>
  )
}
