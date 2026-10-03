const esc = (s) => s.replace(/([&%$#_{}])/g, '\\$1')

const inline = (s) =>
  s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? `\\textbf{${esc(part)}}` : esc(part))).join('')

export function projectToLatex(p) {
  const head = `{\\textbf{${esc(p.name || 'Project name')}} $|$ \\emph{${p.tech.map(esc).join(', ')}}}{}`
  return [
    '\\resumeProjectHeading',
    `  ${head}`,
    '  \\resumeItemListStart',
    ...p.bullets.map((b) => `    \\resumeItem{${inline(b)}}`),
    '  \\resumeItemListEnd',
  ].join('\n')
}

export const allToLatex = (list) => list.map(projectToLatex).join('\n\n')