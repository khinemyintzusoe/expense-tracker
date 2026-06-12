import { Routes, Route, Navigate } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { useHousehold } from './context/HouseholdContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Recurring from './pages/Recurring'
import Reports from './pages/Reports'

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-8 modal-enter">
        <h1 className="text-xl font-extrabold tracking-tight">Expense Tracker</h1>
        <p className="mt-3 text-sm text-ink-dim leading-relaxed">
          Supabase is not connected yet. Copy <span className="text-ink font-semibold">.env.example</span> to{' '}
          <span className="text-ink font-semibold">.env</span>, fill in your project URL and anon key,
          then restart the dev server.
        </p>
      </div>
    </div>
  )
}

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-faint text-sm tracking-wide">Loading…</p>
    </div>
  )
}

export default function App() {
  const { session, member, loading } = useHousehold()

  if (!isConfigured) return <SetupNotice />
  if (loading) return <Splash />
  if (!session) return <Login />
  if (!member) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
