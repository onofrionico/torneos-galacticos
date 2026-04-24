// ── api.js — cliente central para todos los endpoints ────────────────────────
const API_BASE = '/api';

// Token management
const token = {
  get: () => localStorage.getItem('tg_token'),
  set: (t) => localStorage.setItem('tg_token', t),
  remove: () => localStorage.removeItem('tg_token'),
};

const user = {
  get: () => JSON.parse(localStorage.getItem('tg_user') || 'null'),
  set: (u) => localStorage.setItem('tg_user', JSON.stringify(u)),
  remove: () => localStorage.removeItem('tg_user'),
};

async function request(method, path, body, isFormData = false) {
  const headers = {};
  const tk = token.get();
  if (tk) headers['Authorization'] = `Bearer ${tk}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw { status: res.status, message: data.error || 'Error desconocido' };
  return data;
}

const get  = (path)         => request('GET',    path);
const post = (path, body, isFormData) => request('POST', path, body, isFormData);
const put  = (path, body)   => request('PUT',    path, body);
const del  = (path)         => request('DELETE', path);

// ── Auth ─────────────────────────────────────────────────────────────────────
const auth = {
  register: (data) => post('/auth/register', data),
  login:    (data) => post('/auth/login', data),
  me:       ()     => get('/auth/me'),
  update:   (data) => put('/auth/me', data),

  saveSession(token_, user_) {
    token.set(token_);
    user.set(user_);
  },
  logout() {
    token.remove();
    user.remove();
  },
  isLoggedIn: () => !!token.get(),
  currentUser: () => user.get(),
};

// ── Torneos ──────────────────────────────────────────────────────────────────
const torneos = {
  list:   (params = {}) => get('/torneos?' + new URLSearchParams(params)),
  get:    (id)          => get(`/torneos/${id}`),
  create: (data)        => post('/torneos', data),
  update: (id, data)    => put(`/torneos/${id}`, data),
  remove: (id)          => del(`/torneos/${id}`),
};

// ── Inscripciones ─────────────────────────────────────────────────────────────
const inscripciones = {
  inscribirse: (data)  => post('/inscripciones', data),
  mias:        ()      => get('/inscripciones/mis-inscripciones'),
  cancelar:    (id)    => del(`/inscripciones/${id}`),
  resultado:   (id, posicion_final) => put(`/inscripciones/${id}/resultado`, { posicion_final }),
};

// ── Highlights ────────────────────────────────────────────────────────────────
const highlights = {
  list:   (params = {}) => get('/highlights?' + new URLSearchParams(params)),
  mios:   ()            => get('/highlights/mis-highlights'),
  subir:  (formData)    => post('/highlights', formData, true),
  vista:  (id)          => post(`/highlights/${id}/vista`),
  borrar: (id)          => del(`/highlights/${id}`),
};

// ── Ranking ───────────────────────────────────────────────────────────────────
const ranking = {
  tabla:   (params = {}) => get('/ranking?' + new URLSearchParams(params)),
  jugador: (id)          => get(`/ranking/jugador/${id}`),
};

window.API = { auth, torneos, inscripciones, highlights, ranking, token, user };
