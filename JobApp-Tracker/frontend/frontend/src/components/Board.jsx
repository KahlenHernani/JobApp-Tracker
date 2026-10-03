import { useEffect, useRef, useState } from 'react'
import { COLUMNS } from '../constants'

function Lane({ col, index, items, over, setOver, onMove, onOpen }) {
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
      className={`lane rise grid gap-4 border-t border-ink px-2 py-6 transition-colors duration-150 md:grid-cols-[11rem_minmax(0,1fr)] ${
        over ? 'bg-hot/10' : ''
      }`}
      style={{ '--i': index }}
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
      <h2 className="flex items-end gap-4 md:flex-col md:items-start md:gap-2">
        <span className="num">{String(items.length).padStart(2, '0')}</span>
        <span className="flex items-center gap-2 pb-1 font-mono text-xs font-medium uppercase tracking-[0.18em]">
          <span className="size-2.5" style={{ background: col.color }} />
          {col.label}
        </span>
      </h2>

      <div ref={scroller} className="lane-scroll min-w-0 overflow-x-auto pb-3 pr-1 pt-1">
        {ordered.length === 0 ? (
          <p className="grid h-44 place-items-center border border-dashed border-ink/40 font-mono text-xs text-mute">
            Drop an application here
          </p>
        ) : (
          <ul className="flex w-max gap-4">
            {ordered.map((a) => (
              <li key={a.id} className="w-72 shrink-0">
                <button
                  className="flex h-44 w-full cursor-grab flex-col gap-1 border border-ink bg-paper-2 p-4 text-left transition duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--hot)] active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(a.id))}
                  onClick={() => onOpen(a.id)}
                >
                  <strong className="truncate font-display text-xl font-semibold tracking-tight">{a.company}</strong>
                  <span className="line-clamp-2 text-sm text-mute">{a.position}</span>
                  {(a.location || a.job_type) && (
                    <span className="truncate font-mono text-[0.7rem] text-mute">
                      {[a.job_type, a.location].filter(Boolean).join(' / ')}
                    </span>
                  )}
                  {a.deadline && (
                    <span className="mt-auto font-mono text-[0.7rem] font-medium text-hot">Due {a.deadline}</span>
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
    <div className="border-b border-ink">
      {COLUMNS.map((col, i) => (
        <Lane
          key={col.key}
          col={col}
          index={i}
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