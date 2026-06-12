import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'
import { fmtMoney, fmtDate, thisMonth, monthRange, todayISO } from '../lib/format'
import PersonToggle from '../components/PersonToggle'

export default function Dashboard() {
  const { member, members } = useHousehold()
  const hid = member.household_id
  const [who, setWho] = useState('all')
  const [balances, setBalances] = useState([])
  const [monthTx, setMonthTx] = useState([])
  const [recent, setRecent] = useState([])
  const [due, setDue] = useState([])
  const [logging, setLogging] = useState(null)

  const load = useCallback(async () => {
    const { from, to } = monthRange(thisMonth())
    const [bal, mtx, rec, dueRules] = await Promise.all([
      supabase.from('account_balances').select('*').eq('household_id', hid).eq('is_archived', false),
      supabase.from('transactions').select('type, amount, account_id').eq('household_id', hid).gte('txn_date', from).lte('txn_date', to),
      supabase.from('transactions')
        .select('id, type, amount, note, txn_date, account_id, categories(name), accounts!transactions_account_id_fkey(name)')
        .eq('household_id', hid).order('txn_date', { ascending: false }).order('created_at', { ascending: false }).limit(8),
      supabase.from('recurring_rules').select('*, categories(name)').eq('household_id', hid)
        .eq('is_active', true).lte('next_run', todayISO()),
    ])
    setBalances(bal.data ?? [])
    setMonthTx(mtx.data ?? [])
    setRecent(rec.data ?? [])
    setDue(dueRules.data ?? [])
  }, [hid])

  useEffect(() => { load() }, [load])

  async function logDue(rule) {
    setLogging(rule.id)
    const { error } = await supabase.rpc('log_recurring', { p_rule_id: rule.id })
    if (!error) await load()
    setLogging(null)
  }

  // account_id -> owner_member_id, so we can filter anything by person
  const ownerOf = Object.fromEntries(balances.map((b) => [b.account_id, b.owner_member_id]))
  const mine = (accId) => who === 'all' || ownerOf[accId] === who

  const visBalances = balances.filter((b) => mine(b.account_id))
  const visMonthTx = monthTx.filter((t) => mine(t.account_id))
  const visRecent = recent.filter((t) => mine(t.account_id)).slice(0, 5)

  const totalBalance = visBalances.reduce((s, b) => s + Number(b.balance), 0)
  const spent = visMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const earned = visMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  const stats = [
    { label: 'Total balance', value: totalBalance, grad: 'grad-indigo' },
    { label: 'Spent this month', value: spent, grad: 'grad-amber' },
    { label: 'Earned this month', value: earned, grad: 'grad-emerald' },
    { label: 'Net this month', value: earned - spent, grad: 'grad-slate' },
  ]

  return (
    <div className="space-y-6">
      <PersonToggle who={who} setWho={setWho} members={members} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`stagger-item ${s.grad} rounded-2xl p-4 text-white shadow-lg`}>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">{s.label}</p>
            <p className="num mt-1 text-xl sm:text-2xl font-extrabold">{fmtMoney(s.value)}</p>
          </div>
        ))}
      </div>

      {due.length > 0 && who === 'all' && (
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-dim mb-2">Due now</h2>
          <div className="space-y-2">
            {due.map((r) => (
              <div key={r.id} className="glass-card alert-pulse p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold truncate">{r.note || r.categories?.name || 'Recurring'}</p>
                  <p className="text-xs text-ink-dim">due {fmtDate(r.next_run)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`num font-extrabold ${r.type === 'income' ? 'text-brand' : ''}`}>
                    {fmtMoney(r.amount)}
                  </span>
                  <button
                    onClick={() => logDue(r)} disabled={logging === r.id}
                    className="pressable rounded-lg bg-brand text-page text-xs font-extrabold px-3 py-1.5 disabled:opacity-50"
                  >
                    {logging === r.id ? '…' : 'Log now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-dim">Accounts</h2>
          <Link to="/accounts" className="text-xs font-bold text-brand hover:underline">Manage</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visBalances.sort((a, b) => a.sort_order - b.sort_order).map((b) => (
            <div key={b.account_id} className="glass-card lift-on-hover p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{b.type}</p>
              <p className="font-bold mt-0.5">{b.name}</p>
              <p className="num text-lg font-extrabold mt-1">{fmtMoney(b.balance)}</p>
            </div>
          ))}
          {visBalances.length === 0 && (
            <p className="text-sm text-ink-faint">No accounts here yet — add one under Accounts.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-dim">Recent</h2>
          <Link to="/transactions" className="text-xs font-bold text-brand hover:underline">View all</Link>
        </div>
        <div className="glass-card divide-y divide-white/5">
          {visRecent.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">
                  {t.type === 'transfer' ? 'Transfer' : t.categories?.name || '—'}
                  {t.note ? <span className="text-ink-faint font-semibold"> · {t.note}</span> : null}
                </p>
                <p className="text-xs text-ink-faint">{fmtDate(t.txn_date)} · {t.accounts?.name}</p>
              </div>
              <span className={`num font-extrabold shrink-0 ${t.type === 'income' ? 'text-brand' : t.type === 'transfer' ? 'text-ink-dim' : ''}`}>
                {t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}{fmtMoney(t.amount)}
              </span>
            </div>
          ))}
          {visRecent.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink-faint">Nothing yet — log your first transaction.</p>
          )}
        </div>
      </section>

      <section className="glass-card p-4">
        <p className="text-xs text-ink-faint">
          Invite code for your wife to join: {' '}
          <span className="num font-extrabold text-brand tracking-widest">{member.households?.invite_code}</span>
        </p>
      </section>
    </div>
  )
}
