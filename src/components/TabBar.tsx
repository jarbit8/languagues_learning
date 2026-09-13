import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/aprender', label: 'Aprender', icon: '📚' },
  { to: '/examen', label: 'Examen', icon: '📝' },
  { to: '/hablar', label: 'Practicar', icon: '🎯' },
  { to: '/progreso', label: 'Progreso', icon: '📈' }
]

export default function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md gap-1 rounded-[1.75rem] bg-white/80 p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur-xl dark:bg-slate-900/80 dark:shadow-black/50 dark:ring-white/10">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:from-indigo-500/30 dark:to-violet-500/30 dark:text-white'
                  : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-xl leading-none transition ${isActive ? 'scale-110' : 'opacity-60 grayscale'}`}>
                  {t.icon}
                </span>
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
