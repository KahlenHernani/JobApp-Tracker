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

gmailStatus: () => request('/gmail/status/'),
gmailConnect: () => request('/gmail/connect/'),
gmailSync: () => request('/gmail/sync/', { method: 'POST' }),
gmailSuggestions: () => request('/gmail/suggestions/'),
gmailResolve: (id, action) => request(`/gmail/suggestions/${id}/`, { method: 'POST', body: { action } }),
gmailDisconnect: () => request('/gmail/disconnect/', { method: 'POST' }),


  listProjects: () => request('/projects/'),
  createProject: (body) => request('/projects/', { method: 'POST', body }),
  updateProject: (id, body) => request(`/projects/${id}/`, { method: 'PATCH', body }),
  deleteProject: (id) => request(`/projects/${id}/`, { method: 'DELETE' }),

  listResumes: () => request('/resumes/'),
  createResume: (body) => request('/resumes/', { method: 'POST', body }),
  updateResume: (id, body) => request(`/resumes/${id}/`, { method: 'PATCH', body }),
  deleteResume: (id) => request(`/resumes/${id}/`, { method: 'DELETE' }),
  uploadResume: async (file, name = '') => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    const res = await fetch(`${BASE}/resumes/upload/`, {
      method: 'POST',
      headers: { Authorization: `Token ${getToken()}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(firstError(data) || 'Upload failed.')
      err.status = res.status
      throw err
    }
    return data
  },

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