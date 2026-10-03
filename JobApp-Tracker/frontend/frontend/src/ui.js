const base =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs font-medium transition duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50'

export const btn = `${base} border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper`
export const btnPrimary = `${base} border border-hot bg-hot text-white hover:border-ink hover:bg-ink hover:text-paper`
export const btnGhost = `${base} border border-transparent text-ink underline decoration-hot underline-offset-4 hover:text-hot`
export const btnDanger = `${base} border border-danger/40 text-danger hover:border-danger hover:bg-danger hover:text-white`

export const field =
  'w-full border border-ink bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-mute transition focus:bg-paper-2'

export const label = 'grid gap-1.5 font-mono text-[0.7rem] font-medium uppercase tracking-widest text-ink'
export const panelCard = 'border border-ink bg-paper-2'
export const banner = 'border border-danger bg-danger/10 px-3 py-2 text-sm text-danger'
export const sectionTitle = 'font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-hot'
export const overlay = 'fixed inset-0 z-20 grid place-items-center bg-[#0d1511]/70 p-4 backdrop-blur-[3px]'