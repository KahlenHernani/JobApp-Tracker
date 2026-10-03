const API = 'http://localhost:8000/api'
const $ = (id) => document.getElementById(id)

async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Token ${token}` }),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.detail || 'Request failed')
    err.status = res.status
    throw err
  }
  return data
}

async function render() {
  const { token } = await chrome.storage.local.get('token')
  $('login-form').hidden = Boolean(token)
  $('save').hidden = !token
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  try {
    const { token } = await post('/auth/login/', { username: $('u').value, password: $('p').value })
    await chrome.storage.local.set({ token })
    $('status').textContent = ''
    render()
  } catch (err) {
    $('status').textContent = err.message
  }
})

$('logout').addEventListener('click', async () => {
  await chrome.storage.local.remove('token')
  render()
})

$('save-btn').addEventListener('click', async () => {
  const status = $('status')
  try {
    const { token } = await chrome.storage.local.get('token')
    status.textContent = 'Reading page…'
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const [{ result: page }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ text: document.body.innerText, url: location.href }),
    })
    status.textContent = 'Extracting details…'
    const job = await post('/parse-job/', { text: page.text }, token)
    await post('/applications/', { ...job, application_url: page.url }, token)
    status.textContent = `Saved: ${job.company} – ${job.position}`
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      render()
    }
    status.textContent = err.message
  }
})

render()