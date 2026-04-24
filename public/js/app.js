// ── app.js — lógica principal de la SPA ──────────────────────────────────────

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
  torneos: [],
  highlights: [],
  historial: [],
  ranking: [],
  currentUser: null,
  loading: false,
};

// ── Utilidades UI ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const icons = { success: '✅', error: '❌', info: '⚡' };
  t.textContent = `${icons[type] || '⚡'} ${msg}`;
  t.className = `toast toast-${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

function showLoading(selector, rows = 3) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = Array(rows).fill(`
    <div class="skeleton-card">
      <div class="skeleton h-20 mb-8"></div>
      <div class="skeleton h-12 mb-6 w-60"></div>
      <div class="skeleton h-10 w-40"></div>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

// ── Navegación ────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${id}"]`)?.classList.add('active');

  const loaders = {
    torneos:    loadTorneos,
    historial:  loadHistorial,
    highlights: loadHighlights,
    ranking:    loadRanking,
    inicio:     loadInicio,
  };
  loaders[id]?.();
  window.scrollTo(0, 0);
}

// ── Auth UI ───────────────────────────────────────────────────────────────────
function updateNavAuth() {
  const u = API.auth.currentUser();
  state.currentUser = u;
  const navAuth = document.getElementById('nav-auth');
  const navUser = document.getElementById('nav-user');

  if (u) {
    navAuth.style.display = 'none';
    navUser.style.display = 'flex';
    document.getElementById('nav-username').textContent = u.nombre;
  } else {
    navAuth.style.display = 'flex';
    navUser.style.display = 'none';
  }
}

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function closeOnOverlay(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
}

// ── Login / Registro ──────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  try {
    const { token, user } = await API.auth.login({ email, password });
    API.auth.saveSession(token, user);
    updateNavAuth();
    closeModal('modal-login');
    showToast(`¡Bienvenido, ${user.nombre}!`);
    showPage('inicio');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const data = {
    nombre:    document.getElementById('reg-nombre').value,
    apellido:  document.getElementById('reg-apellido').value,
    email:     document.getElementById('reg-email').value,
    password:  document.getElementById('reg-password').value,
    telefono:  document.getElementById('reg-telefono').value,
    categoria: document.getElementById('reg-categoria').value,
  };
  const btn = document.getElementById('reg-btn');
  btn.disabled = true;
  btn.textContent = 'Registrando...';
  try {
    const { token, user } = await API.auth.register(data);
    API.auth.saveSession(token, user);
    updateNavAuth();
    closeModal('modal-register');
    showToast('¡Cuenta creada! Bienvenido/a al universo galáctico 🚀');
    showPage('inicio');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
  }
}

function handleLogout() {
  API.auth.logout();
  updateNavAuth();
  showToast('Sesión cerrada', 'info');
  showPage('inicio');
}

// ── INICIO ────────────────────────────────────────────────────────────────────
async function loadInicio() {
  try {
    const { torneos } = await API.torneos.list({ estado: 'publicado', limit: 3 });
    renderTorneoCards('#inicio-torneos', torneos, true);

    const rankingData = await API.ranking.tabla({ limit: 3 });
    renderMiniRanking(rankingData);
  } catch (err) {
    console.error('Error cargando inicio:', err);
  }
}

function renderMiniRanking(jugadores) {
  const el = document.getElementById('mini-ranking');
  if (!el) return;
  if (!jugadores.length) { el.innerHTML = '<p class="text-muted">Sin datos aún.</p>'; return; }
  el.innerHTML = jugadores.map((j, i) => `
    <div class="ranking-row">
      <span class="rank-pos ${i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze'}">${i + 1}</span>
      <div class="rank-info">
        <span class="rank-name">${j.nombre} ${j.apellido}</span>
        <span class="rank-cat">${j.categoria} · ${j.campeonatos} 🏆</span>
      </div>
      <span class="rank-pts">${j.ranking_pts} pts</span>
    </div>
  `).join('');
}

// ── TORNEOS ───────────────────────────────────────────────────────────────────
async function loadTorneos() {
  showLoading('#torneos-grid', 4);
  try {
    const tipo      = document.getElementById('filter-tipo')?.value || '';
    const categoria = document.getElementById('filter-cat')?.value  || '';
    const estado    = document.getElementById('filter-estado')?.value || 'publicado';
    const params    = {};
    if (tipo)      params.tipo      = tipo;
    if (categoria) params.categoria = categoria;
    if (estado)    params.estado    = estado;

    const { torneos } = await API.torneos.list(params);
    state.torneos = torneos;
    renderTorneoCards('#torneos-grid', torneos, false);
  } catch (err) {
    document.querySelector('#torneos-grid').innerHTML =
      '<p class="text-muted">Error al cargar torneos. Intentá de nuevo.</p>';
  }
}

function renderTorneoCards(selector, torneos, mini) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (!torneos.length) {
    el.innerHTML = '<p class="text-muted">No hay torneos disponibles.</p>';
    return;
  }
  el.innerHTML = torneos.map(t => torneoCardHTML(t, mini)).join('');
}

function torneoCardHTML(t, mini) {
  const inscriptos = parseInt(t.inscriptos || 0);
  const pctFill    = pct(inscriptos, t.max_parejas);
  const lleno      = inscriptos >= t.max_parejas;
  const catClass   = { mixto: 'cat-gold', femenino: 'cat-cyan', masculino: 'cat-pink', senior: 'cat-gold' }[t.tipo] || 'cat-gold';

  return `
    <div class="tournament-card" onclick="openTorneoDetail('${t.id}')">
      <div class="card-header">
        <span class="card-category ${catClass}">${t.tipo}</span>
        <div class="card-title">${t.nombre}</div>
        <div class="card-date">${formatDate(t.fecha_inicio)} – ${formatDate(t.fecha_fin)}${t.lugar ? ' · ' + t.lugar : ''}</div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <div class="meta-item"><strong>${t.max_parejas}</strong>Parejas</div>
          <div class="meta-item"><strong>${inscriptos}/${t.max_parejas}</strong>Inscriptos</div>
          <div class="meta-item"><strong>${t.categoria}</strong>Categoría</div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pctFill}%"></div></div>
        ${!mini ? `<button class="inscribirse-btn ${lleno ? 'full' : 'available'}"
          onclick="event.stopPropagation(); ${lleno ? '' : `iniciarInscripcion('${t.id}','${t.nombre}')`}"
          ${lleno ? 'disabled' : ''}>
          ${lleno ? 'Cupo Completo' : 'Inscribirme'}
        </button>` : ''}
      </div>
    </div>
  `;
}

async function openTorneoDetail(id) {
  try {
    const t = await API.torneos.get(id);
    const inscriptos = (t.inscripciones || []).length;
    const lleno = inscriptos >= t.max_parejas;

    document.getElementById('detail-title').textContent  = t.nombre;
    document.getElementById('detail-tipo').textContent   = t.tipo;
    document.getElementById('detail-cat').textContent    = t.categoria;
    document.getElementById('detail-fechas').textContent = `${formatDate(t.fecha_inicio)} – ${formatDate(t.fecha_fin)}`;
    document.getElementById('detail-lugar').textContent  = t.lugar || 'A confirmar';
    document.getElementById('detail-precio').textContent = t.precio_pareja > 0 ? `$${t.precio_pareja.toLocaleString('es-AR')}` : 'Gratis';
    document.getElementById('detail-cupos').textContent  = `${inscriptos} / ${t.max_parejas}`;
    document.getElementById('detail-desc').textContent   = t.descripcion || '';

    const inscList = document.getElementById('detail-inscripciones');
    inscList.innerHTML = (t.inscripciones || []).map(i => `
      <div class="insc-row">
        <span>${i.jugador1?.nombre || ''}</span>
        <span class="text-muted"> & ${i.jugador2_nombre || '—'}</span>
        ${i.posicion_final ? `<span class="pos-badge">#${i.posicion_final}</span>` : ''}
      </div>
    `).join('') || '<p class="text-muted">Aún no hay inscripciones.</p>';

    const btn = document.getElementById('detail-inscribirse-btn');
    btn.disabled   = lleno;
    btn.textContent = lleno ? 'Cupo completo' : 'Inscribirme en este torneo';
    btn.className  = `btn-confirm ${lleno ? 'full' : ''}`;
    btn.onclick    = lleno ? null : () => { closeModal('modal-detalle'); iniciarInscripcion(t.id, t.nombre); };

    openModal('modal-detalle');
  } catch (err) {
    showToast('Error al cargar el torneo', 'error');
  }
}

// ── INSCRIPCIÓN ───────────────────────────────────────────────────────────────
function iniciarInscripcion(torneoId, torneoNombre) {
  if (!API.auth.isLoggedIn()) {
    showToast('Iniciá sesión para inscribirte', 'info');
    openModal('modal-login');
    return;
  }
  document.getElementById('insc-torneo-nombre').textContent = torneoNombre;
  document.getElementById('insc-torneo-id').value = torneoId;
  document.getElementById('insc-compañero').value  = '';
  openModal('modal-inscripcion');
}

async function handleInscripcion(e) {
  e.preventDefault();
  const torneo_id      = document.getElementById('insc-torneo-id').value;
  const jugador2_nombre = document.getElementById('insc-compañero').value;
  const btn = document.getElementById('insc-btn');

  btn.disabled = true;
  btn.textContent = 'Inscribiendo...';
  try {
    await API.inscripciones.inscribirse({ torneo_id, jugador2_nombre });
    closeModal('modal-inscripcion');
    showToast('¡Inscripción confirmada! 🚀');
    loadTorneos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar inscripción 🚀';
  }
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
async function loadHistorial() {
  if (!API.auth.isLoggedIn()) {
    document.getElementById('historial-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌌</div>
        <p>Iniciá sesión para ver tu historial galáctico</p>
        <button class="cta-btn cta-primary" onclick="openModal('modal-login')">Iniciar sesión</button>
      </div>`;
    return;
  }

  document.getElementById('historial-content').innerHTML = '<div class="loading-pulse">Cargando historial...</div>';

  try {
    const [perfil, historial] = await Promise.all([
      API.auth.me(),
      API.inscripciones.mias(),
    ]);

    const campeonatos   = historial.filter(h => h.posicion_final === 1).length;
    const subcampeonatos = historial.filter(h => h.posicion_final === 2).length;
    const terceros      = historial.filter(h => h.posicion_final === 3).length;

    document.getElementById('historial-content').innerHTML = `
      <div class="historial-header">
        <div class="avatar-ring">${perfil.nombre[0]}${perfil.apellido[0]}</div>
        <div>
          <div class="player-name">${perfil.nombre} ${perfil.apellido}</div>
          <div class="player-rank">⭐ ${perfil.categoria} Categoría</div>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="font-family:'Orbitron',sans-serif;font-size:1.4rem;color:var(--star-gold);">${perfil.ranking_pts}</div>
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Pts. Ranking</div>
        </div>
      </div>

      <div class="section-title">Logros</div>
      <div class="trophies-row">
        <div class="trophy-chip"><span class="trophy-icon">🏆</span><div class="trophy-info"><strong>${campeonatos} Campeonatos</strong>Torneos ganados</div></div>
        <div class="trophy-chip"><span class="trophy-icon">🥈</span><div class="trophy-info"><strong>${subcampeonatos} Subcampeonatos</strong></div></div>
        <div class="trophy-chip"><span class="trophy-icon">🎾</span><div class="trophy-info"><strong>${historial.length} Participaciones</strong></div></div>
        ${campeonatos > 0 ? '<div class="trophy-chip"><span class="trophy-icon">🚀</span><div class="trophy-info"><strong>Galáctico</strong>Campeón activo</div></div>' : ''}
      </div>

      <div class="section-title">Historial de Torneos</div>
      ${historial.length === 0
        ? '<p class="text-muted">Aún no participaste en ningún torneo. ¡Inscribite!</p>'
        : `<div class="timeline">${historial.map(h => timelineItemHTML(h)).join('')}</div>`
      }
    `;
  } catch (err) {
    showToast('Error al cargar historial', 'error');
  }
}

function timelineItemHTML(h) {
  const pos = h.posicion_final;
  const badge = pos === 1 ? 'pos-1" >🥇 Campeón'
              : pos === 2 ? 'pos-2" >🥈 Finalista'
              : pos === 3 ? 'pos-3" >🥉 3er Puesto'
              : pos       ? 'pos-other">Top ' + pos
              : 'pos-other">En curso';
  return `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-top">
        <span class="timeline-tournament">${h.torneo_nombre}</span>
        <span class="position-badge ${badge}</span>
      </div>
      <div class="timeline-date">
        ${formatDate(h.fecha_inicio)} · ${h.tipo} · ${h.torneo_categoria}
        ${h.compañero ? '· Pareja: ' + h.compañero : ''}
      </div>
    </div>
  `;
}

// ── HIGHLIGHTS ────────────────────────────────────────────────────────────────
async function loadHighlights() {
  showLoading('#highlights-grid', 3);
  try {
    const data = await API.highlights.list();
    state.highlights = data;
    renderHighlights(data);
  } catch (err) {
    document.querySelector('#highlights-grid').innerHTML =
      '<p class="text-muted">Error al cargar highlights.</p>';
  }
}

function renderHighlights(highlights) {
  const el = document.querySelector('#highlights-grid');
  if (!el) return;
  if (!highlights.length) {
    el.innerHTML = '<p class="text-muted">Aún no hay highlights. ¡Sé el primero en subir uno!</p>';
    return;
  }
  el.innerHTML = highlights.map((h, i) => `
    <div class="highlight-card" onclick="registrarVista('${h.id}')">
      <div class="highlight-thumb hl-${(i % 3) + 1}">
        🏸
        <div class="play-btn">▶</div>
      </div>
      <div class="hl-meta">
        <div class="hl-title">${h.titulo}</div>
        <div class="hl-sub">${h.jugador_nombre}${h.torneo_nombre ? ' · ' + h.torneo_nombre : ''}</div>
        <div class="hl-views">⚡ ${h.vistas.toLocaleString()} vistas · ${formatDate(h.created_at)}</div>
      </div>
    </div>
  `).join('');
}

async function registrarVista(id) {
  try { await API.highlights.vista(id); } catch (_) {}
}

async function handleSubirHighlight(e) {
  e.preventDefault();
  if (!API.auth.isLoggedIn()) {
    showToast('Iniciá sesión para subir highlights', 'info');
    return;
  }
  const titulo      = document.getElementById('hl-titulo').value;
  const descripcion = document.getElementById('hl-desc').value;
  const torneo_id   = document.getElementById('hl-torneo').value;
  const video       = document.getElementById('hl-video').files[0];

  if (!titulo || !video) {
    showToast('El título y el video son requeridos', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('video', video);
  formData.append('titulo', titulo);
  if (descripcion) formData.append('descripcion', descripcion);
  if (torneo_id)   formData.append('torneo_id', torneo_id);

  const btn = document.getElementById('hl-btn');
  btn.disabled = true;
  btn.textContent = 'Subiendo...';

  try {
    await API.highlights.subir(formData);
    closeModal('modal-highlight');
    showToast('¡Highlight subido con éxito! 🎬');
    loadHighlights();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subir Highlight 🚀';
  }
}

function abrirSubirHighlight() {
  if (!API.auth.isLoggedIn()) {
    showToast('Iniciá sesión para subir highlights', 'info');
    openModal('modal-login');
    return;
  }
  // Cargar torneos en el select
  API.torneos.list({ limit: 50 }).then(({ torneos }) => {
    const sel = document.getElementById('hl-torneo');
    sel.innerHTML = '<option value="">Sin torneo asociado</option>' +
      torneos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  }).catch(() => {});
  openModal('modal-highlight');
}

// ── RANKING ───────────────────────────────────────────────────────────────────
async function loadRanking() {
  document.querySelector('#ranking-tabla').innerHTML = '<div class="loading-pulse">Cargando ranking...</div>';
  try {
    const categoria = document.getElementById('filter-ranking-cat')?.value || '';
    const params    = { limit: 50 };
    if (categoria) params.categoria = categoria;
    const data = await API.ranking.tabla(params);
    state.ranking = data;
    renderRanking(data);
  } catch (err) {
    document.querySelector('#ranking-tabla').innerHTML =
      '<p class="text-muted">Error al cargar ranking.</p>';
  }
}

function renderRanking(jugadores) {
  const el = document.querySelector('#ranking-tabla');
  if (!el) return;
  if (!jugadores.length) { el.innerHTML = '<p class="text-muted">Sin datos.</p>'; return; }
  el.innerHTML = `
    <div class="ranking-table">
      <div class="ranking-header-row">
        <span>#</span><span>Jugador</span><span>Cat.</span><span>🏆</span><span>Pts</span>
      </div>
      ${jugadores.map(j => `
        <div class="ranking-row ${j.posicion <= 3 ? 'top-' + j.posicion : ''}">
          <span class="rank-pos ${j.posicion === 1 ? 'gold' : j.posicion === 2 ? 'silver' : j.posicion === 3 ? 'bronze' : ''}">${j.posicion}</span>
          <div class="rank-info">
            <span class="rank-name">${j.nombre} ${j.apellido}</span>
            <span class="rank-cat">${j.participaciones} torneos</span>
          </div>
          <span class="rank-badge-cat">${j.categoria}</span>
          <span class="rank-camp">${j.campeonatos}</span>
          <span class="rank-pts">${j.ranking_pts}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  showPage('inicio');

  // Listeners de formularios
  document.getElementById('form-login')?.addEventListener('submit', handleLogin);
  document.getElementById('form-register')?.addEventListener('submit', handleRegister);
  document.getElementById('form-inscripcion')?.addEventListener('submit', handleInscripcion);
  document.getElementById('form-highlight')?.addEventListener('submit', handleSubirHighlight);

  // Cerrar modales al hacer click en overlay
  document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', closeOnOverlay));

  // Filtros
  document.querySelectorAll('.filter-select').forEach(sel => {
    sel.addEventListener('change', () => {
      if (document.getElementById('page-torneos')?.classList.contains('active')) loadTorneos();
      if (document.getElementById('page-ranking')?.classList.contains('active')) loadRanking();
    });
  });
});
