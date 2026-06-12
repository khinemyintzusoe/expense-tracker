import { NavLink, Outlet } from 'react-router-dom'
import { useHousehold } from '../context/HouseholdContext'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/categories', label: 'Categories' },
  { to: '/recurring', label: 'Recurring' },
  { to: '/reports', label: 'Reports' },
]

export default function Layout() {
  const { member, signOut } = useHousehold()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-page/80" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="font-extrabold tracking-tight text-ink">Expense Tracker</span>
              <span className="text-xs text-ink-faint truncate hidden sm:inline">
                {member?.households?.name}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-ink-dim hidden sm:inline">{member?.display_name}</span>
              <button
                onClick={signOut}
                className="pressable text-xs font-bold text-ink-dim hover:text-ink px-3 py-1.5 rounded-lg border border-white/10"
              >
                Sign out
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `pressable whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ` +
                  (isActive
                    ? 'text-page bg-brand'
                    : 'text-ink-dim hover:text-ink hover:bg-white/5')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
