const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const getToken = () => localStorage.getItem('token')
export const setToken = (t) =>
  t ? localStorage.setItem('token', t) : localStorage.removeItem('token')

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && getToken()) headers.Authorization = `Token ${getToken()}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(firstError(data) || 'Something went wrong.')
    err.status = res.status
    throw err
  }
  return data
}

function firstError(data) {
  if (data.detail) return data.detail
  const [field, msgs] = Object.entries(data)[0] || []
  return field ? `${field}: ${[].concat(msgs)[0]}` : ''
}

export const api = {

  getProfile: () => request('/profile/'),
  saveProfile: (resume_text) => request('/profile/', { method: 'PUT', body: { resume_text } }),
  parseJob: (text) => request('/parse-job/', { method: 'POST', body: { text } }),
  tailor: (id, task) => request(`/applications/${id}/tailor/`, { method: 'POST', body: { task } }),
  login: (username, password) =>
    request('/auth/login/', { method: 'POST', body: { username, password }, auth: false }),
  register: (username, password) =>
    request('/auth/register/', { method: 'POST', body: { username, password }, auth: false }),
  listApplications: () => request('/applications/'),
  createApplication: (body) => request('/applications/', { method: 'POST', body }),
  updateApplication: (id, body) => request(`/applications/${id}/`, { method: 'PATCH', body }),
  deleteApplication: (id) => request(`/applications/${id}/`, { method: 'DELETE' }),
  createInterview: (body) => request('/interviews/', { method: 'POST', body }),
  deleteInterview: (id) => request(`/interviews/${id}/`, { method: 'DELETE' }),
  stats: () => request('/stats/'),
}
