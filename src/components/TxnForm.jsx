import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/format'

const TYPES = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
]

export default function TxnForm({ householdId, accounts, categories, onSaved, onClose }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [transferAccountId, setTransferAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [txnDate, setTxnDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const cats = categories.filter((c) => c.kind === type && !c.is_archived)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const row = {
      household_id: householdId,
      type,
      amount: Number(amount),
      account_id: accountId,
      transfer_account_id: type === 'transfer' ? transferAccountId : null,
      category_id: type === 'transfer' ? null : (categoryId || null),
      txn_date: txnDate,
      note: note.trim() || null,
    }
    const { error } = await supabase.from('transactions').insert(row)
    if (error) {
      setErr(error.message)
      setBusy(false)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-enter" onClick={onClose} />
      <form onSubmit={submit} className="glass-card modal-enter relative w-full max-w-md p-6 space-y-3"
        style={{ background: 'rgba(28, 28, 28, 0.97)' }}>
        <h2 className="text-lg font-extrabold tracking-tight">New transaction</h2>
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {TYPES.map((t) => (
            <button key={t.id} type="button"
              onClick={() => { setType(t.id); setCategoryId('') }}
              className={`pressable flex-1 rounded-lg py-1.5 text-sm font-bold ${
                type === t.id ? 'bg-brand text-page' : 'text-ink-dim hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <input type="number" step="0.01" min="0.01" required value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="Amount (AED)" className="field num" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="field">
            <option value="" disabled>{type === 'transfer' ? 'From account' : 'Account'}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {type === 'transfer' ? (
            <select required value={transferAccountId} onChange={(e) => setTransferAccountId(e.target.value)} className="field">
              <option value="" disabled>To account</option>
              {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
              <option value="" disabled>Category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" required value={txnDate} onChange={(e) => setTxnDate(e.target.value)} className="field" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="field" />
        </div>
        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="pressable flex-1 rounded-xl border border-white/10 text-ink-dim font-bold py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="pressable flex-1 rounded-xl bg-brand text-page font-extrabold py-2.5 disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
