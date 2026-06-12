import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../context/HouseholdContext'
import { fmtMoney, thisMonth, monthRange, monthLabel, shiftMonth } from '../lib/format'

export default function Reports() {
  const { member } = useHousehold()
  const hid = member.household_id
  const [month, setMonth] = useState(thisMonth())
  const [txns, setTxns] = useState([])
  const [trend, setTrend] = useState([])

  const load = useCallback(async () => {
    const { from, to } = monthRange(month)
    const { from: trendFrom } = monthRange(shiftMonth(month, -5))
    const [cur, six] = await Promise.all([
      supabase.from('transactions').select('type, amount, categories(name, color)')
        .eq('household_id', hid).gte('txn_date', from).lte('txn_date', to).neq('type', 'transfer'),
      supabase.from('transactions').select('type, amount, txn_date')
        .eq('household_id', hid).gte('txn_date', trendFrom).lte('txn_date', to).neq('type', 'transfer'),
    ])
    setTxns(cur.data ?? [])

    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
    setTrend(months.map((ym) => {
      const rows = (six.data ?? []).filter((t) => t.txn_date.startsWith(ym))
      return {
        ym,
        out: rows.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
        inn: rows.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      }
    }))
  }, [hid, month])

  useEffect(() => { load() }, [load])

  const spent = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const earned = txns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  const byCat = Object.values(
    txns.filter((t) => t.type === 'expense').reduce((acc, t) => {
      const key = t.categories?.name ?? 'Uncategorised'
      acc[key] ??= { name: key, color: t.categories?.color ?? '#71717a', total: 0 }
      acc[key].total += Number(t.amount)
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const maxTrend = Math.max(1, ...trend.flatMap((m) => [m.out, m.inn]))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(shiftMonth(month, -1))}
          className="pressable glass-card px-3 py-1.5 text-sm font-extrabold">‹</button>
        <span className="font-extrabold tracking-tight min-w-36 text-center">{monthLabel(month)}</span>
        <button onClick={() => setMonth(shiftMonth(month, 1))}
          className="pressable glass-card px-3 py-1.5 text-sm font-extrabold">›</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Spent', value: spent, grad: 'grad-amber' },
          { label: 'Earned', value: earned, grad: 'grad-emerald' },
          { label: 'Net', value: earned - spent, grad: 'grad-slate' },
        ].map((s) => (
          <div key={s.label} className={`stagger-item ${s.grad} rounded-2xl p-4 text-white`}>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">{s.label}</p>
            <p className="num mt-1 text-lg sm:text-2xl font-extrabold">{fmtMoney(s.value)}</p>
          </div>
        ))}
      </div>

      <section className="glass-card p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-dim mb-3">Spend by category</h2>
        <div className="space-y-2.5">
          {byCat.map((c) => (
            <div key={c.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold">{c.name}</span>
                <span className="num font-extrabold">{fmtMoney(c.total)}
                  <span className="text-ink-faint font-semibold text-xs"> · {spent ? Math.round((c.total / spent) * 100) : 0}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${spent ? (c.total / spent) * 100 : 0}%`,
                  background: c.color,
                  transition: 'width 320ms var(--ease-out)',
                }} />
              </div>
            </div>
          ))}
          {byCat.length === 0 && <p className="text-sm text-ink-faint">No expenses this month.</p>}
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-dim mb-3">Last 6 months</h2>
        <div className="flex items-end gap-2 h-36">
          {trend.map((m) => (
            <div key={m.ym} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full flex items-end justify-center gap-1 flex-1">
                <div className="w-2/5 rounded-t bg-white/15" title={`Out ${fmtMoney(m.out)}`}
                  style={{ height: `${(m.out / maxTrend) * 100}%` }} />
                <div className="w-2/5 rounded-t" title={`In ${fmtMoney(m.inn)}`}
                  style={{ height: `${(m.inn / maxTrend) * 100}%`, background: 'var(--brand)', opacity: 0.85 }} />
              </div>
              <span className="text-[10px] font-bold text-ink-faint">
                {monthLabel(m.ym).slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          <span className="inline-block w-2 h-2 rounded-sm bg-white/15 mr-1" />out
          <span className="inline-block w-2 h-2 rounded-sm ml-3 mr-1" style={{ background: 'var(--brand)' }} />in
        </p>
      </section>
    </div>
  )
}
