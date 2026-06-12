import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

const HouseholdContext = createContext(null)

export function HouseholdProvider({ children }) {
  const [session, setSession] = useState(null)
  const [member, setMember] = useState(null) // row from household_members, incl. household_id
  const [members, setMembers] = useState([]) // everyone in the household
  const [loading, setLoading] = useState(isConfigured)

  const loadMember = useCallback(async (sess) => {
    if (!sess) { setMember(null); setMembers([]); return }
    const { data } = await supabase
      .from('household_members')
      .select('*, households(name, invite_code)')
      .eq('user_id', sess.user.id)
      .maybeSingle()
    setMember(data ?? null)
    if (data?.household_id) {
      const { data: mem } = await supabase
        .from('household_members')
        .select('id, user_id, display_name')
        .eq('household_id', data.household_id)
        .order('created_at')
      setMembers(mem ?? [])
    } else {
      setMembers([])
    }
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess)
      await loadMember(sess)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      loadMember(sess)
    })
    return () => subscription.unsubscribe()
  }, [loadMember])

  const refreshMember = useCallback(() => loadMember(session), [loadMember, session])
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return (
    <HouseholdContext.Provider value={{ session, member, members, loading, refreshMember, signOut }}>
      {children}
    </HouseholdContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHousehold() {
  return useContext(HouseholdContext)
}
