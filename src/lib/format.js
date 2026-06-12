// Indian-style number formatting: 10,00,000
const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function fmtNum(n) {
  const v = Number(n) || 0
  return Number.isInteger(v) ? inr0.format(v) : inr2.format(v)
}

export function fmtMoney(n) {
  const v = Number(n) || 0
  const sign = v < 0 ? '−' : ''
  return `${sign}₹${fmtNum(Math.abs(v))}`
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayISO() {
  const d = new Date()
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function thisMonth() {
  return todayISO().slice(0, 7) // YYYY-MM
}

export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const pad = (x) => String(x).padStart(2, '0')
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` }
}

export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
