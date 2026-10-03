import { useEffect, useRef, useState } from 'react'
import { COLUMNS } from '../constants'

function Lane({ col, items, over, setOver, onMove, onOpen }) {
  const scroller = useRef(null)

  // Oldest on the left, newest on the right (higher id = created later).
  const ordered = [...items].sort((a, b) => a.id - b.id)

  // Keep the newest card in view when cards are added to or removed from the lane.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ left: el.scrollWidth })
  }, [items.length])

  return (
    <section
      className={`grid min-h-64 gap-3 rounded-lg border p-4 transition-colors duration-150 md:grid-cols-[9rem_minmax(0,1fr)] ${
        over
          ? 'border-blue-600/50 bg-white dark:border-blue-400/50 dark:bg-slate-900'
          : 'border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/40'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(col.key)
      }}
      onDragLeave={(e) => {
        // Ignore leave events fired when moving between children of the same lane.
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(null)
        const id = Number(e.dataTransfer.getData('text/plain'))
        if (id) onMove(id, col.key)
      }}
    >
      <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-slate-600 md:flex-col md:items-start md:gap-1 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${col.accent}`} />
          {col.label}
        </span>
        <span className="font-display text-2xl font-extrabold tabular-nums normal-case tracking-tight text-slate-900 dark:text-slate-100">
          {items.length}
        </span>
      </h2>

      <div ref={scroller} className="min-w-0 overflow-x-auto pb-2">
        {ordered.length === 0 ? (
          <p className="grid h-44 place-items-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Drop an application here
          </p>
        ) : (
          <ul className="flex w-max gap-3">
            {ordered.map((a) => (
              <li key={a.id} className="w-72 shrink-0">
                <button
                  className="flex h-44 w-full cursor-grab flex-col gap-1 rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-blue-600/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.99] active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-400/60 dark:focus-visible:ring-blue-400"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(a.id))}
                  onClick={() => onOpen(a.id)}
                >
                  <strong className="truncate font-display text-base font-bold">{a.company}</strong>
                  <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{a.position}</span>
                  {(a.location || a.job_type) && (
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {[a.job_type, a.location].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {a.deadline && (
                    <em className="mt-auto text-xs font-medium not-italic text-amber-700 dark:text-amber-400">
                      Due {a.deadline}
                    </em>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default function Board({ apps, onMove, onOpen }) {
  const [overCol, setOverCol] = useState(null)

  return (
    <div className="grid gap-4">
      {COLUMNS.map((col) => (
        <Lane
          key={col.key}
          col={col}
          items={apps.filter((a) => a.status === col.key)}
          over={overCol === col.key}
          setOver={setOverCol}
          onMove={onMove}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}