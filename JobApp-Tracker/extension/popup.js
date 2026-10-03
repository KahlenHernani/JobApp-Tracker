const API = 'http://127.0.0.1:8000/api'
const TRACKER = 'http://localhost:5173'
const $ = (id) => document.getElementById(id)

async function post(path, body, token, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Token ${token}` }),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.detail || `Request failed (${res.status})`)
      err.status = res.status
      throw err
    }
    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Is it running?')
    }
    if (err instanceof TypeError) {
      throw new Error('Cannot reach the server. Start it with: python manage.py runserver')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
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

async function render() {
  const { token } = await chrome.storage.local.get('token')
  $('login-form').hidden = Boolean(token)
  $('save').hidden = !token
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

$('save-btn').addEventListener('click', async () => {
  const btn = $('save-btn')
  btn.disabled = true
  try {
    const { token } = await chrome.storage.local.get('token')
    setStatus('loading', 'Reading page...')
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const [{ result: page }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ text: document.body.innerText, url: location.href }),
    })
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

render()