const API = 'http://127.0.0.1:8000/api'
const TRACKER = 'http://localhost:5173'
const $ = (id) => document.getElementById(id)

async function request(path, { method = 'GET', body } = {}, token, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Token ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.detail || `Request failed (${res.status})`)
      err.status = res.status
      throw err
    }
    return data
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The server took too long to respond. Is it running?')
    if (err instanceof TypeError) throw new Error('Cannot reach the server. Start it with: python manage.py runserver')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const post = (path, body, token, timeoutMs) => request(path, { method: 'POST', body }, token, timeoutMs)

async function readPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({ text: document.body.innerText, url: location.href }),
  })
  return result
}

function makePdf(text) {
  const clean = text
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
    .replace(/\r/g, '').replace(/\t/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')

  const MAX = 86
  const lines = []
  for (const para of clean.split('\n')) {
    if (!para.trim()) { lines.push(''); continue }
    let line = ''
    for (const w of para.split(/\s+/)) {
      if (line && (line + ' ' + w).length > MAX) { lines.push(line); line = w }
      else line = line ? line + ' ' + w : w
    }
    lines.push(line)
  }

  const PER_PAGE = 48
  const pages = []
  for (let i = 0; i < lines.length; i += PER_PAGE) pages.push(lines.slice(i, i + PER_PAGE))
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

  const objs = []
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  const kids = []
  pages.forEach((pl, i) => {
    const pageNum = 4 + i * 2
    const contentNum = pageNum + 1
    kids.push(`${pageNum} 0 R`)
    const stream = 'BT /F1 11 Tf 14 TL 72 740 Td\n' + pl.map((l) => `(${esc(l)}) Tj T*`).join('\n') + '\nET'
    objs[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`
    objs[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  objs[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = []
  for (let n = 1; n < objs.length; n++) {
    offsets[n] = pdf.length
    pdf += `${n} 0 obj\n${objs[n]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function setStatus(kind, title, detail = '') {
  const el = $('status')
  el.hidden = false
  el.className = `status ${kind}`
  el.replaceChildren()
  if (kind === 'loading') {
    const spinner = document.createElement('span')
    spinner.className = 'spinner'
    el.append(spinner)
  }
  const box = document.createElement('div')
  const strong = document.createElement('strong')
  strong.textContent = title
  box.append(strong)
  if (detail) {
    const span = document.createElement('span')
    span.textContent = detail
    box.append(span)
  }
  el.append(box)
}

function clearStatus() {
  $('status').hidden = true
}

async function loadResumes(token) {
  const sel = $('resume')
  try {
    const list = await request('/resumes/', {}, token)
    const { resumeId } = await chrome.storage.local.get('resumeId')
    if (list.length === 0) {
      sel.replaceChildren(new Option('No resumes yet: add one in the tracker', ''))
    } else {
      sel.replaceChildren(...list.map((r) => new Option(r.name, r.id, false, String(r.id) === String(resumeId))))
    }
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      render()
    }
  }
}

async function render() {
  const { token } = await chrome.storage.local.get('token')
  $('login-form').hidden = Boolean(token)
  $('save').hidden = !token
  if (token) loadResumes(token)
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  setStatus('loading', 'Logging in...')
  try {
    const { token } = await post('/auth/login/', { username: $('u').value, password: $('p').value })
    await chrome.storage.local.set({ token })
    clearStatus()
    render()
  } catch (err) {
    setStatus('error', 'Could not log in', err.message)
  }
})

$('logout').addEventListener('click', async () => {
  await chrome.storage.local.remove('token')
  clearStatus()
  render()
})

$('open-tracker').addEventListener('click', () => chrome.tabs.create({ url: TRACKER }))

$('resume').addEventListener('change', (e) => chrome.storage.local.set({ resumeId: e.target.value }))

$('save-btn').addEventListener('click', async () => {
  const btn = $('save-btn')
  btn.disabled = true
  try {
    const { token } = await chrome.storage.local.get('token')
    setStatus('loading', 'Reading page...')
    const page = await readPage()
    setStatus('loading', 'Extracting details...', 'This can take up to a minute')
    const job = await post('/parse-job/', { text: page.text }, token, 90000)
    await post('/applications/', { ...job, application_url: page.url }, token)
    setStatus('success', 'Saved to your tracker', `${job.company} - ${job.position}`)
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      render()
    }
    setStatus('error', 'Could not save this job', err.message)
  } finally {
    btn.disabled = false
  }
})

$('letter-btn').addEventListener('click', async () => {
  const btn = $('letter-btn')
  btn.disabled = true
  try {
    const { token } = await chrome.storage.local.get('token')
    const resume_id = $('resume').value
    if (!resume_id) throw new Error('Add a resume in the tracker first (Resume button).')
    setStatus('loading', 'Reading page...')
    const page = await readPage()
    setStatus('loading', 'Extracting job details...', 'This can take up to a minute')
    const job = await post('/parse-job/', { text: page.text }, token, 90000)
    setStatus('loading', 'Writing cover letter...', 'This can take up to a minute')
    const { letter } = await post('/cover-letter/', {
      resume_id,
      company: job.company,
      position: job.position,
      job_description: job.job_description || page.text.slice(0, 15000),
    }, token, 90000)
    const safe = `${job.company} - ${job.position}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 80)
    download(`Cover Letter - ${safe}.pdf`, makePdf(letter))
    setStatus('success', 'Cover letter downloaded', safe)
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      render()
    }
    setStatus('error', 'Could not write the letter', err.message)
  } finally {
    btn.disabled = false
  }
})


function showRankings(rankings, considered) {
  const list = $('rank')
  list.hidden = false
  list.replaceChildren()
  const pick = (r, btn) => {
    $('resume').value = String(r.id)
    chrome.storage.local.set({ resumeId: String(r.id) })
    list.querySelectorAll('button').forEach((b) => b.classList.remove('chosen'))
    btn.classList.add('chosen')
  }
  rankings.forEach((r, i) => {
    const li = document.createElement('li')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'rank-item'
    const head = document.createElement('strong')
    head.textContent = `${r.score}/100  ${r.name}`
    const why = document.createElement('span')
    why.textContent = r.reason
    btn.append(head, why)
    btn.addEventListener('click', () => pick(r, btn))
    li.append(btn)
    list.append(li)
    if (i === 0) pick(r, btn) // auto-select the best match
  })
  const note = document.createElement('li')
  note.className = 'hint'
  note.textContent = `Compared your ${considered} most recently edited resume${considered > 1 ? 's' : ''}.`
  list.append(note)
}

$('rank-btn').addEventListener('click', async () => {
  const btn = $('rank-btn')
  btn.disabled = true
  try {
    const { token } = await chrome.storage.local.get('token')
    setStatus('loading', 'Reading page...')
    const page = await readPage()
    setStatus('loading', 'Scoring your resumes...', 'This can take up to a minute')
    const { rankings, considered } = await post('/recommend-resume/', { text: page.text }, token, 90000)
    if (!rankings.length) throw new Error('No scores came back. Try again.')
    showRankings(rankings, considered)
    setStatus('success', `Best match: ${rankings[0].name}`, 'Selected for your cover letter')
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      render()
    }
    setStatus('error', 'Could not score resumes', err.message)
  } finally {
    btn.disabled = false
  }
})

render()