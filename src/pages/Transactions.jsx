import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'
import { fmtMoney, fmtDate, thisMonth, monthRange, monthLabel, shiftMonth } from '../lib/format'
import TxnForm from '../components/TxnForm'
import PersonToggle from '../components/PersonToggle'

export default function Transactions() {
  const { member, members } = useHousehold()
  const hid = member.household_id
  const [who, setWho] = useState('all')
  const [month, setMonth] = useState(thisMonth())
  const [txns, setTxns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [memberNames, setMemberNames] = useState({})
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const { from, to } = monthRange(month)
    const [tx, acc, cat, mem] = await Promise.all([
      supabase.from('transactions')
        .select('*, categories(name), accounts!transactions_account_id_fkey(name), to_acc:accounts!transactions_transfer_account_id_fkey(name)')
        .eq('household_id', hid).gte('txn_date', from).lte('txn_date', to)
        .order('txn_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').eq('household_id', hid).eq('is_archived', false).order('sort_order'),
      supabase.from('categories').select('*').eq('household_id', hid).order('name'),
      supabase.from('household_members').select('user_id, display_name').eq('household_id', hid),
    ])
    setTxns(tx.data ?? [])
    setAccounts(acc.data ?? [])
    setCategories(cat.data ?? [])
    setMemberNames(Object.fromEntries((mem.data ?? []).map((m) => [m.user_id, m.display_name])))
  }, [hid, month])

  useEffect(() => { load() }, [load])

  async function remove(id) {
    if (!window.confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    load()
  }

  const ownerOf = Object.fromEntries(accounts.map((a) => [a.id, a.owner_member_id]))
  const visTxns = txns.filter((t) => who === 'all' || ownerOf[t.account_id] === who)
  const spent = visTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const earned = visTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(shiftMonth(month, -1))}
            className="pressable glass-card px-3 py-1.5 text-sm font-extrabold">‹</button>
          <span className="font-extrabold tracking-tight min-w-36 text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))}
            className="pressable glass-card px-3 py-1.5 text-sm font-extrabold">›</button>
        </div>
        <button onClick={() => setShowForm(true)}
          className="pressable rounded-xl bg-brand text-page text-sm font-extrabold px-4 py-2">
          Add transaction
        </button>
      </div>

      <PersonToggle who={who} setWho={setWho} members={members} />

      <div className="flex gap-4 text-sm">
        <p className="text-ink-dim">Out <span className="num font-extrabold text-ink">{fmtMoney(spent)}</span></p>
        <p className="text-ink-dim">In <span className="num font-extrabold text-brand">{fmtMoney(earned)}</span></p>
        <p className="text-ink-dim">Net <span className="num font-extrabold text-ink">{fmtMoney(earned - spent)}</span></p>
      </div>

      <div className="glass-card divide-y divide-white/5">
        {visTxns.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 group">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">
                {t.type === 'transfer'
                  ? `Transfer · ${t.accounts?.name} → ${t.to_acc?.name}`
                  : t.categories?.name || '—'}
                {t.note ? <span className="text-ink-faint font-semibold"> · {t.note}</span> : null}
              </p>
              <p className="text-xs text-ink-faint">
                {fmtDate(t.txn_date)} · {t.accounts?.name}
                {memberNames[t.created_by] ? ` · by ${memberNames[t.created_by]}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`num font-extrabold ${t.type === 'income' ? 'text-brand' : t.type === 'transfer' ? 'text-ink-dim' : ''}`}>
                {t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}{fmtMoney(t.amount)}
              </span>
              <button onClick={() => remove(t.id)}
                className="pressable text-xs font-bold text-ink-faint hover:text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
        {visTxns.length === 0 && (
          <p className="px-4 py-8 text-sm text-ink-faint text-center">No transactions in {monthLabel(month)}.</p>
        )}
      </div>

      {showForm && (
        <TxnForm
          householdId={hid} accounts={accounts} categories={categories}
          onSaved={() => { setShowForm(false); load() }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
