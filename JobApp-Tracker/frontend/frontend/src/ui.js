const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-950'

const base = `inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${focus}`

export const btn = `${base} border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800`
export const btnPrimary = `${base} border border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:border-blue-400 dark:hover:bg-blue-400`
export const btnGhost = `${base} border border-transparent text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`
export const btnDanger = `${base} border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950`

export const field =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-blue-400 dark:focus:ring-blue-400/20'

export const label = 'grid gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300'
export const panelCard = 'rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
export const banner =
  'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300'
export const sectionTitle =
  'font-display text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400'
export const overlay =
  'fixed inset-0 z-20 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-[2px]'