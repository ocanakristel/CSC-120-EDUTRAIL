// Lightweight compatibility shim for existing frontend that used Supabase.
// This shim redirects common Supabase-style calls to a REST API backend
// (intended to be implemented in Laravel). It keeps the same exported
// functions/shape the app expects so the frontend requires minimal changes.

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_SUPABASE_URL || '/api'

const handleResponse = async (res) => {
  if (!res) return { data: null, error: { message: 'No response' } }
  const contentType = res.headers.get('content-type') || ''
  let json = null
  if (contentType.includes('application/json')) json = await res.json()
  const ok = res.ok
  return {
    data: ok ? json : null,
    error: ok ? null : { message: json?.message || res.statusText || 'Request failed' },
  }
}

class QueryBuilder {
  constructor(table) {
    this.table = table
    this.filters = {}
    this.pendingMethod = null
    this.payload = null
  }

  eq(field, value) {
    this.filters[field] = value
    return this
  }

  async select(columns = '*') {
    const params = new URLSearchParams()
    if (columns && columns !== '*') params.set('select', columns)
    Object.entries(this.filters).forEach(([k, v]) => params.set(k, v))
    const url = `${API_BASE}/${this.table}?${params.toString()}`
    const res = await fetch(url, { credentials: 'include' })
    return handleResponse(res)
  }

  async insert(payload) {
    const url = `${API_BASE}/${this.table}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
    })
    return handleResponse(res)
  }

  update(payload) {
    this.pendingMethod = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.pendingMethod = 'delete'
    return this
  }

  async _execPending() {
    if (this.pendingMethod === 'update') {
      const params = new URLSearchParams()
      Object.entries(this.filters).forEach(([k, v]) => params.set(k, v))
      const url = `${API_BASE}/${this.table}?${params.toString()}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(this.payload),
      })
      return handleResponse(res)
    }

    if (this.pendingMethod === 'delete') {
      const params = new URLSearchParams()
      Object.entries(this.filters).forEach(([k, v]) => params.set(k, v))
      const url = `${API_BASE}/${this.table}?${params.toString()}`
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      })
      return handleResponse(res)
    }

    return { data: null, error: { message: 'No pending method' } }
  }

  // When user calls .select() after chaining update/delete
  async selectAfterPending() {
    const result = await this._execPending()
    return result
  }
}

// Storage shim: expects backend endpoints like POST /api/storage/:bucket/upload
const storage = {
  from(bucket) {
    return {
      async upload(path, file, opts = {}) {
        const url = `${API_BASE}/storage/${bucket}/upload`
        const fd = new FormData()
        fd.append('path', path)
        fd.append('file', file)
        Object.entries(opts || {}).forEach(([k, v]) => fd.append(k, v))
        const res = await fetch(url, { method: 'POST', body: fd, credentials: 'include' })
        return handleResponse(res)
      },

      async getPublicUrl(path) {
        const url = `${API_BASE}/storage/${bucket}/public-url?path=${encodeURIComponent(path)}`
        const res = await fetch(url, { credentials: 'include' })
        return handleResponse(res)
      },
    }
  },
}

const auth = {
  onAuthStateChange(cb) {
    // No real realtime session in this shim. Call once with current session.
    (async () => {
      const session = await auth.getSession().catch(() => ({ data: null }))
      try {
        cb('INITIAL', session.data?.session ?? null)
      } catch (e) {
        /* ignore */
      }
    })()
    return { data: null }
  },

  async getSession() {
    try {
      const res = await fetch(`${API_BASE}/auth/session`, { credentials: 'include' })
      return handleResponse(res)
    } catch (e) {
      return { data: null, error: { message: e.message } }
    }
  },

  async getUser() {
    try {
      const res = await fetch(`${API_BASE}/auth/user`, { credentials: 'include' })
      return handleResponse(res)
    } catch (e) {
      return { data: null, error: { message: e.message } }
    }
  },
}

const supabase = {
  auth,
  from(table) {
    const qb = new QueryBuilder(table)

    // Wrap select so it supports calling select() after update().eq(...).select()
    const origSelect = qb.select.bind(qb)
    qb.select = async (columns) => {
      if (qb.pendingMethod) {
        return qb.selectAfterPending()
      }
      return origSelect(columns)
    }

    return qb
  },
  storage,
}

//Form Action Utils (kept for compatibility)
export const formActionDefault = {
  formProcess: false,
  formStatus: 200,
  formErrorMessage: '',
  formSuccessMessage: '',
}

export const isAuthenticated = async () => {
  const { data, error } = await auth.getSession()
  if (error) {
    console.error('Error getting session:', error.message)
    return false
  }
  return !!data?.session
}

// handle search if null turn to empty string
export const tableSearch = (search) => (search ||= '')

export { supabase }
