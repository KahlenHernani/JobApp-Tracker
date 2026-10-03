import { useState } from 'react'
import { COLUMNS } from '../constants'

export default function Board({ apps, onMove, onOpen }) {
  const [overCol, setOverCol] = useState(null)

  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const items = apps.filter((a) => a.status === col.key)
        return (
          <section
            key={col.key}
            className={`column col-${col.key} ${overCol === col.key ? 'over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(col.key)
            }}
            onDragLeave={() => setOverCol(null)}
            onDrop={(e) => {
              e.preventDefault()
              setOverCol(null)
              const id = Number(e.dataTransfer.getData('text/plain'))
              if (id) onMove(id, col.key)
            }}
          >
            <h2>
              {col.label} <span className="count">{items.length}</span>
            </h2>
            <ul>
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    className="card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(a.id))}
                    onClick={() => onOpen(a.id)}
                  >
                    <strong>{a.company}</strong>
                    <span>{a.position}</span>
                    {a.deadline && <em>Due {a.deadline}</em>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
