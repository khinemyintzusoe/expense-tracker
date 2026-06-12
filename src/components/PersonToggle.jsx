// Combined | <member> | <member> filter. Hidden until there are 2+ members.
// `who` is 'all' or a household_members.id (matches accounts.owner_member_id).
export default function PersonToggle({ who, setWho, members }) {
  if (!members || members.length < 2) return null
  const opts = [{ id: 'all', label: 'Combined' }, ...members.map((m) => ({ id: m.id, label: m.display_name }))]
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setWho(o.id)}
          className={`pressable rounded-lg px-3 py-1.5 text-sm font-bold whitespace-nowrap ${
            who === o.id ? 'bg-brand text-page' : 'text-ink-dim hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
