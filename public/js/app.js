// ── app.js — lógica principal de la SPA ──────────────────────────────────────

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
  torneos: [],
  canchas: [],
  highlights: [],
  historial: [],
  ranking: [],
  adminUsuarios: { page: 1, limit: 24, q: '', categoria: '', rol: '', activo: '', deuda: '' },
  currentUser: null,
  loading: false,
};

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const debouncedLoadAdminUsuarios = debounce(() => loadAdminUsuarios(), 250);

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

// Alternar entre URL de YouTube y archivo
function toggleVideoInput() {
  const tipo = document.getElementById('hl-tipo-video').value;
  const youtubeGroup = document.getElementById('hl-youtube-group');
  const archivoGroup = document.getElementById('hl-archivo-group');
  const youtubeInput = document.getElementById('hl-youtube-url');
  const archivoInput = document.getElementById('hl-video');
  
  if (tipo === 'youtube') {
    youtubeGroup.style.display = 'block';
    archivoGroup.style.display = 'none';
    youtubeInput.required = true;
    archivoInput.required = false;
  } else {
    youtubeGroup.style.display = 'none';
    archivoGroup.style.display = 'block';
    youtubeInput.required = false;
    archivoInput.required = true;
  }
}

// Extraer ID de video de YouTube desde URL
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Verificar si una URL es de YouTube
function isYouTubeUrl(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

// ── Navegación ────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${id}"]`)?.classList.add('active');

  const loaders = {
    torneos:    loadTorneos,
    canchas:    loadCanchas,
    historial:  loadHistorial,
    highlights: loadHighlights,
    ranking:    loadRanking,
    inicio:     loadInicio,
    admin:      loadAdminUsuarios,
  };
  loaders[id]?.();
  window.scrollTo(0, 0);
}

function syncAdminUsuariosFiltersUI() {
  const q = document.getElementById('admin-q');
  const cat = document.getElementById('admin-cat');
  const rol = document.getElementById('admin-rol');
  const activo = document.getElementById('admin-activo');
  const deuda = document.getElementById('admin-deuda');
  if (q) q.value = state.adminUsuarios.q || '';
  if (cat) cat.value = state.adminUsuarios.categoria || '';
  if (rol) rol.value = state.adminUsuarios.rol || '';
  if (activo) activo.value = state.adminUsuarios.activo || '';
  if (deuda) deuda.value = state.adminUsuarios.deuda || '';
}

function initAdminUsuariosFilters() {
  const q = document.getElementById('admin-q');
  const cat = document.getElementById('admin-cat');
  const rol = document.getElementById('admin-rol');
  const activo = document.getElementById('admin-activo');
  const deuda = document.getElementById('admin-deuda');

  if (q && !q.dataset.bound) {
    q.dataset.bound = '1';
    q.addEventListener('input', () => {
      state.adminUsuarios.q = q.value.trim();
      state.adminUsuarios.page = 1;
      debouncedLoadAdminUsuarios();
    });
  }

  const onChange = () => {
    state.adminUsuarios.categoria = cat ? cat.value : '';
    state.adminUsuarios.rol = rol ? rol.value : '';
    state.adminUsuarios.activo = activo ? activo.value : '';
    state.adminUsuarios.deuda = deuda ? deuda.value : '';
    state.adminUsuarios.page = 1;
    loadAdminUsuarios();
  };

  if (cat && !cat.dataset.bound) {
    cat.dataset.bound = '1';
    cat.addEventListener('change', onChange);
  }
  if (rol && !rol.dataset.bound) {
    rol.dataset.bound = '1';
    rol.addEventListener('change', onChange);
  }
  if (activo && !activo.dataset.bound) {
    activo.dataset.bound = '1';
    activo.addEventListener('change', onChange);
  }
  if (deuda && !deuda.dataset.bound) {
    deuda.dataset.bound = '1';
    deuda.addEventListener('change', onChange);
  }
}

// ── Auth UI ───────────────────────────────────────────────────────────────────
function updateNavAuth() {
  const u = API.auth.currentUser();
  state.currentUser = u;
  const navAuth = document.getElementById('nav-auth');
  const navUser = document.getElementById('nav-user');
  const btnCrearCancha = document.getElementById('btn-crear-cancha');

  if (u) {
    navAuth.style.display = 'none';
    navUser.style.display = 'flex';
    document.getElementById('nav-username').textContent = u.nombre;
    
    // Mostrar botón de crear cancha solo a organizadores/admins
    if (btnCrearCancha && ['organizador', 'admin'].includes(u.rol)) {
      btnCrearCancha.style.display = 'block';
    }
    
    // Mostrar botón de admin solo a administradores
    const navAdminBtn = document.getElementById('nav-admin-btn');
    if (navAdminBtn) {
      navAdminBtn.style.display = u.rol === 'admin' ? 'block' : 'none';
    }
  } else {
    navAuth.style.display = 'flex';
    navUser.style.display = 'none';
    
    // Ocultar botón de admin
    const navAdminBtn = document.getElementById('nav-admin-btn');
    if (navAdminBtn) navAdminBtn.style.display = 'none';
    if (btnCrearCancha) btnCrearCancha.style.display = 'none';
  }
}

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function closeOnOverlay(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────
function loginWithGoogle() {
  window.location.href = '/api/auth/google';
}

// Procesar token de Google OAuth desde URL
function processGoogleCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error');

  if (token) {
    // Guardar token usando las claves correctas (tg_token)
    localStorage.setItem('tg_token', token);
    API.auth.me().then(user => {
      localStorage.setItem('tg_user', JSON.stringify(user));
      updateNavAuth();
      showToast(`¡Bienvenido, ${user.nombre}!`);
      // Limpiar URL
      window.history.replaceState({}, document.title, '/');
    }).catch(err => {
      console.error('Error obteniendo usuario:', err);
      showToast('Error al obtener datos del usuario', 'error');
      localStorage.removeItem('tg_token');
    });
  } else if (error) {
    showToast('Error en autenticación con Google', 'error');
    // Limpiar URL
    window.history.replaceState({}, document.title, '/');
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
    lado_preferencia: document.getElementById('reg-lado-preferencia')?.value,
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
    const libres = parseInt(t.inscripciones_pendientes_sin_pareja || 0);
    document.getElementById('detail-libres').textContent = libres;
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

    const btnSolo = document.getElementById('detail-inscribirse-solo-btn');
    if (btnSolo) {
      btnSolo.disabled = lleno;
      btnSolo.onclick = lleno ? null : async () => {
        if (!API.auth.isLoggedIn()) {
          showToast('Iniciá sesión para inscribirte', 'info');
          openModal('modal-login');
          return;
        }
        btnSolo.disabled = true;
        const prevText = btnSolo.textContent;
        btnSolo.textContent = 'Anotándote...';
        try {
          const resp = await API.inscripciones.inscribirseSolo({ torneo_id: t.id });

          if (resp && resp.requiere_confirmacion && resp.sugerencia?.asumir_lado) {
            const nombre = resp.jugador_esperando?.nombre || 'un jugador';
            const pref = resp.jugador_esperando?.lado_preferencia || '';
            const lado = resp.sugerencia.asumir_lado;
            const confirmar = confirm(`${resp.mensaje || 'Hay un jugador esperando.'}\n\nJugador: ${nombre}${pref ? ` (prefiere ${pref})` : ''}\n\n¿Querés jugar asumiendo ${lado}?`);
            if (!confirmar) {
              showToast('Perfecto, quedás en espera de una pareja complementaria.', 'info');
              closeModal('modal-detalle');
              loadTorneos();
              return;
            }

            const resp2 = await API.inscripciones.inscribirseSolo({ torneo_id: t.id, asumir_lado: lado });
            showToast(resp2.mensaje || 'Listo');
            closeModal('modal-detalle');
            loadTorneos();
            return;
          }

          showToast(resp.mensaje || 'Listo');
          closeModal('modal-detalle');
          loadTorneos();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btnSolo.disabled = false;
          btnSolo.textContent = prevText;
        }
      };
    }

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
  document.getElementById('insc-email').value = '';
  document.getElementById('insc-compañero').value = '';
  document.getElementById('insc-jugador2-id').value = '';
  document.getElementById('insc-resultado-busqueda').style.display = 'none';
  document.getElementById('insc-usuario-encontrado').style.display = 'none';
  document.getElementById('insc-usuario-no-encontrado').style.display = 'none';
  
  // Agregar listener para búsqueda en tiempo real
  const emailInput = document.getElementById('insc-email');
  emailInput.removeEventListener('blur', buscarParejaEmail); // Remover listener anterior
  emailInput.addEventListener('blur', buscarParejaEmail);
  
  openModal('modal-inscripcion');
}

async function buscarParejaEmail() {
  const email = document.getElementById('insc-email').value.trim();
  const resultadoDiv = document.getElementById('insc-resultado-busqueda');
  const encontradoDiv = document.getElementById('insc-usuario-encontrado');
  const noEncontradoDiv = document.getElementById('insc-usuario-no-encontrado');
  const jugador2IdInput = document.getElementById('insc-jugador2-id');
  
  if (!email) {
    resultadoDiv.style.display = 'none';
    jugador2IdInput.value = '';
    return;
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    resultadoDiv.style.display = 'none';
    return;
  }
  
  try {
    const resultado = await API.auth.buscarPorEmail(email);
    resultadoDiv.style.display = 'block';
    
    if (resultado.encontrado) {
      const usuario = resultado.usuario;
      encontradoDiv.style.display = 'block';
      noEncontradoDiv.style.display = 'none';
      document.getElementById('insc-usuario-info').textContent = 
        `${usuario.nombre} ${usuario.apellido} - ${usuario.categoria} categoría`;
      jugador2IdInput.value = usuario.id;
    } else {
      encontradoDiv.style.display = 'none';
      noEncontradoDiv.style.display = 'block';
      jugador2IdInput.value = '';
    }
  } catch (err) {
    console.error('Error buscando usuario:', err);
    resultadoDiv.style.display = 'none';
  }
}

async function handleInscripcion(e) {
  e.preventDefault();
  const torneo_id = document.getElementById('insc-torneo-id').value;
  const jugador2_email = document.getElementById('insc-email').value.trim();
  const jugador2_nombre = document.getElementById('insc-compañero').value.trim();
  const jugador2_id = document.getElementById('insc-jugador2-id').value;
  const btn = document.getElementById('insc-btn');

  // Validar que se haya ingresado email o nombre
  if (!jugador2_email && !jugador2_nombre) {
    showToast('Ingresá el email o nombre de tu compañero/a', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Inscribiendo...';
  try {
    const data = { torneo_id };
    
    if (jugador2_id) {
      data.jugador2_id = jugador2_id;
    } else if (jugador2_email) {
      data.jugador2_email = jugador2_email;
    } else if (jugador2_nombre) {
      data.jugador2_nombre = jugador2_nombre;
    }
    
    const response = await API.inscripciones.inscribirse(data);
    closeModal('modal-inscripcion');
    showToast(response.mensaje || '¡Inscripción confirmada! 🚀');
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
    const [perfil, historial, misHighlights] = await Promise.all([
      API.auth.me(),
      API.inscripciones.mias(),
      API.highlights.mios(),
    ]);

    const campeonatos   = historial.filter(h => h.posicion_final === 1).length;
    const subcampeonatos = historial.filter(h => h.posicion_final === 2).length;
    const terceros      = historial.filter(h => h.posicion_final === 3).length;
    
    const highlightsAprobados = misHighlights.filter(h => h.estado_aprobacion === 'aprobado').length;
    const highlightsPendientes = misHighlights.filter(h => h.estado_aprobacion === 'pendiente').length;
    const highlightsRechazados = misHighlights.filter(h => h.estado_aprobacion === 'rechazado').length;

    document.getElementById('historial-content').innerHTML = `
      <div class="historial-header">
        <div class="avatar-ring">${perfil.nombre[0]}${perfil.apellido[0]}</div>
        <div>
          <div class="player-name">${perfil.nombre} ${perfil.apellido}</div>
          <div class="player-rank">⭐ ${perfil.categoria} Categoría · ${perfil.lado_preferencia ? `🟦 ${perfil.lado_preferencia}` : ''}</div>
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

      <div class="section-title">Mis Highlights</div>
      ${misHighlights.length === 0
        ? '<p class="text-muted">Aún no subiste ningún highlight. <a onclick="showPage(\'highlights\')">¡Subí tu primer video!</a></p>'
        : `<div class="highlights-status">
            <div class="status-item aprobado">
              <div class="status-num">${highlightsAprobados}</div>
              <div class="status-label">✓ Aprobados</div>
            </div>
            ${highlightsPendientes > 0 ? `
              <div class="status-item pendiente">
                <div class="status-num">${highlightsPendientes}</div>
                <div class="status-label">⏳ Pendientes</div>
              </div>
            ` : ''}
            ${highlightsRechazados > 0 ? `
              <div class="status-item rechazado">
                <div class="status-num">${highlightsRechazados}</div>
                <div class="status-label">✗ Rechazados</div>
              </div>
            ` : ''}
          </div>
          <div class="mis-highlights-list">
            ${misHighlights.map(h => `
              <div class="highlight-item ${h.estado_aprobacion}">
                <div class="highlight-item-info">
                  <div class="highlight-item-title">${h.titulo}</div>
                  <div class="highlight-item-meta">
                    ${h.torneo_nombre || 'Sin torneo'} · ${formatDate(h.created_at)}
                    ${h.estado_aprobacion === 'aprobado' ? ` · ${h.vistas} vistas` : ''}
                  </div>
                  ${h.estado_aprobacion === 'rechazado' && h.motivo_rechazo ? `
                    <div class="highlight-item-motivo">Motivo: ${h.motivo_rechazo}</div>
                  ` : ''}
                </div>
                <div class="highlight-item-estado">
                  ${h.estado_aprobacion === 'aprobado' ? '<span class="badge-aprobado">✓ Aprobado</span>' : ''}
                  ${h.estado_aprobacion === 'pendiente' ? '<span class="badge-pendiente">⏳ Pendiente</span>' : ''}
                  ${h.estado_aprobacion === 'rechazado' ? '<span class="badge-rechazado">✗ Rechazado</span>' : ''}
                </div>
              </div>
            `).join('')}
          </div>`
      }

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
  
  // Si es admin, cargar también los pendientes
  const currentUser = API.auth.currentUser();
  if (currentUser && currentUser.rol === 'admin') {
    document.getElementById('admin-highlights-pendientes').style.display = 'block';
    loadHighlightsPendientes();
  } else {
    document.getElementById('admin-highlights-pendientes').style.display = 'none';
  }
  
  try {
    const data = await API.highlights.list();
    state.highlights = data;
    renderHighlights(data);
  } catch (err) {
    document.querySelector('#highlights-grid').innerHTML =
      '<p class="text-muted">Error al cargar highlights.</p>';
  }
}

async function loadHighlightsPendientes() {
  const el = document.querySelector('#highlights-pendientes-grid');
  if (!el) return;
  
  el.innerHTML = '<p class="text-muted">Cargando...</p>';
  
  try {
    const pendientes = await API.highlights.pendientes();
    if (!pendientes.length) {
      el.innerHTML = '<p class="text-muted">No hay highlights pendientes de aprobación</p>';
      return;
    }
    
    el.innerHTML = pendientes.map((h, i) => {
      const isYouTube = isYouTubeUrl(h.video_url);
      const youtubeId = isYouTube ? extractYouTubeId(h.video_url) : null;
      
      return `
      <div class="highlight-card pendiente">
        ${isYouTube && youtubeId ? `
          <div class="highlight-thumb youtube-thumb">
            <img src="https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg" alt="${h.titulo}" />
            <div class="play-btn">▶</div>
          </div>
        ` : `
          <div class="highlight-thumb hl-${(i % 3) + 1}">
            🏸
            <div class="play-btn">▶</div>
          </div>
        `}
        <div class="hl-meta">
          <div class="hl-title">${h.titulo}</div>
          <div class="hl-sub">${h.jugador_nombre} (${h.jugador_email})${h.torneo_nombre ? ' · ' + h.torneo_nombre : ''}</div>
          <div class="hl-views">📅 ${formatDate(h.created_at)}</div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn-confirm" style="flex:1;padding:6px;font-size:12px;" onclick="aprobarHighlight('${h.id}', ${isYouTube}, '${youtubeId || ''}', '${h.video_url}', '${h.titulo.replace(/'/g, "\\'")}')">✓ Aprobar</button>
            <button class="btn-cancel" style="flex:1;padding:6px;font-size:12px;" onclick="rechazarHighlight('${h.id}')">✗ Rechazar</button>
            <button class="btn-cancel" style="padding:6px 12px;font-size:12px;" onclick="openHighlightModal('${h.id}', ${isYouTube}, '${youtubeId || ''}', '${h.video_url}', '${h.titulo.replace(/'/g, "\\'")}')">👁️</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
  } catch (err) {
    el.innerHTML = '<p class="text-muted">Error al cargar highlights pendientes</p>';
  }
}

function renderHighlights(highlights) {
  const el = document.querySelector('#highlights-grid');
  if (!el) return;
  if (!highlights.length) {
    el.innerHTML = '<p class="text-muted">Aún no hay highlights. ¡Sé el primero en subir uno!</p>';
    return;
  }
  el.innerHTML = highlights.map((h, i) => {
    const isYouTube = isYouTubeUrl(h.video_url);
    const youtubeId = isYouTube ? extractYouTubeId(h.video_url) : null;
    
    return `
    <div class="highlight-card" onclick="openHighlightModal('${h.id}', ${isYouTube}, '${youtubeId || ''}', '${h.video_url}', '${h.titulo.replace(/'/g, "\\'")}')">
      ${isYouTube && youtubeId ? `
        <div class="highlight-thumb youtube-thumb">
          <img src="https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg" alt="${h.titulo}" />
          <div class="play-btn">▶</div>
        </div>
      ` : `
        <div class="highlight-thumb hl-${(i % 3) + 1}">
          🏸
          <div class="play-btn">▶</div>
        </div>
      `}
      <div class="hl-meta">
        <div class="hl-title">${h.titulo}</div>
        <div class="hl-sub">${h.jugador_nombre}${h.torneo_nombre ? ' · ' + h.torneo_nombre : ''}</div>
        <div class="hl-views">⚡ ${h.vistas.toLocaleString()} vistas · ${formatDate(h.created_at)}</div>
      </div>
    </div>
  `;
  }).join('');
}

async function registrarVista(id) {
  try { await API.highlights.vista(id); } catch (_) {}
}

// Abrir modal para ver highlight
function openHighlightModal(id, isYouTube, youtubeId, videoUrl, titulo) {
  registrarVista(id);
  
  const modalHTML = `
    <div class="modal-overlay open" id="modal-ver-highlight" onclick="closeOnOverlay(event)">
      <div class="modal" style="max-width:800px;">
        <h3>🎬 ${titulo}</h3>
        <div class="video-container">
          ${isYouTube && youtubeId ? `
            <iframe 
              width="100%" 
              height="450" 
              src="https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          ` : `
            <video controls autoplay style="width:100%;border-radius:var(--radius);">
              <source src="${videoUrl}" type="video/mp4">
              Tu navegador no soporta el elemento de video.
            </video>
          `}
        </div>
        <div class="modal-btns">
          <button class="btn-cancel" onclick="closeHighlightModal()">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal anterior si existe
  const oldModal = document.getElementById('modal-ver-highlight');
  if (oldModal) oldModal.remove();
  
  // Agregar nuevo modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeHighlightModal() {
  const modal = document.getElementById('modal-ver-highlight');
  if (modal) modal.remove();
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
  const tipo        = document.getElementById('hl-tipo-video').value;
  const youtubeUrl  = document.getElementById('hl-youtube-url').value;
  const video       = document.getElementById('hl-video').files[0];

  if (!titulo) {
    showToast('El título es requerido', 'error');
    return;
  }

  if (tipo === 'youtube' && !youtubeUrl) {
    showToast('La URL de YouTube es requerida', 'error');
    return;
  }

  if (tipo === 'archivo' && !video) {
    showToast('El archivo de video es requerido', 'error');
    return;
  }

  // Validar URL de YouTube
  if (tipo === 'youtube') {
    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      showToast('URL de YouTube inválida', 'error');
      return;
    }
  }

  const formData = new FormData();
  formData.append('titulo', titulo);
  if (descripcion) formData.append('descripcion', descripcion);
  if (torneo_id)   formData.append('torneo_id', torneo_id);
  
  if (tipo === 'youtube') {
    formData.append('youtube_url', youtubeUrl);
  } else {
    formData.append('video', video);
  }

  const btn = document.getElementById('hl-btn');
  btn.disabled = true;
  btn.textContent = 'Subiendo...';

  try {
    const response = await API.highlights.subir(formData);
    closeModal('modal-highlight');
    showToast(response.mensaje || '¡Highlight subido con éxito! 🎬');
    loadHighlights();
    // Resetear formulario
    document.getElementById('form-highlight').reset();
    toggleVideoInput();
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

// ── CANCHAS ───────────────────────────────────────────────────────────────────
async function loadCanchas() {
  showLoading('#canchas-grid', 6);
  try {
    const activa = document.getElementById('filter-cancha-activa')?.checked;
    const ciudad = document.getElementById('filter-cancha-ciudad')?.value || '';
    const provincia = document.getElementById('filter-cancha-provincia')?.value || '';
    
    const params = { limit: 50 };
    if (activa !== undefined) params.activa = activa;
    if (ciudad) params.ciudad = ciudad;
    if (provincia) params.provincia = provincia;
    
    const { canchas } = await API.canchas.list(params);
    state.canchas = canchas;
    renderCanchas(canchas);
    
    // Poblar filtros de ciudad y provincia
    const ciudades = [...new Set(canchas.map(c => c.ciudad).filter(Boolean))].sort();
    const provincias = [...new Set(canchas.map(c => c.provincia).filter(Boolean))].sort();
    
    const selCiudad = document.getElementById('filter-cancha-ciudad');
    const selProvincia = document.getElementById('filter-cancha-provincia');
    
    if (selCiudad && ciudades.length) {
      selCiudad.innerHTML = '<option value="">Todas las ciudades</option>' +
        ciudades.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    if (selProvincia && provincias.length) {
      selProvincia.innerHTML = '<option value="">Todas las provincias</option>' +
        provincias.map(p => `<option value="${p}">${p}</option>`).join('');
    }
  } catch (err) {
    document.querySelector('#canchas-grid').innerHTML =
      '<div class="empty-state"><div class="empty-icon">🏟️</div><p>Error al cargar canchas</p></div>';
  }
}

function renderCanchas(canchas) {
  const grid = document.querySelector('#canchas-grid');
  if (!grid) return;
  
  if (!canchas.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏟️</div><p>No se encontraron canchas</p></div>';
    return;
  }
  
  grid.innerHTML = canchas.map(c => {
    const features = [];
    if (c.techadas) features.push({ icon: '🏠', text: 'Techadas' });
    if (c.iluminacion) features.push({ icon: '💡', text: 'Iluminación' });
    if (c.vestuarios) features.push({ icon: '🚿', text: 'Vestuarios' });
    if (c.estacionamiento) features.push({ icon: '🚗', text: 'Estacionamiento' });
    
    const location = [c.ciudad, c.provincia].filter(Boolean).join(', ') || 'Sin ubicación';
    const torneosActivos = c.torneos_activos || 0;
    
    return `
      <div class="cancha-card ${!c.activa ? 'cancha-inactive' : ''}" onclick="verDetalleCancha('${c.id}')">
        <div class="cancha-header">
          <div class="cancha-icon">🏟️</div>
          <div class="cancha-info">
            <div class="cancha-name">${c.nombre}</div>
            <div class="cancha-location">📍 ${location}</div>
          </div>
        </div>
        ${features.length ? `
          <div class="cancha-features">
            ${features.map(f => `<span class="feature-badge">${f.icon} ${f.text}</span>`).join('')}
          </div>
        ` : ''}
        <div class="cancha-stats">
          <div class="cancha-stat">
            <div class="cancha-stat-value">${c.cantidad_canchas}</div>
            <div class="cancha-stat-label">Canchas</div>
          </div>
          <div class="cancha-stat">
            <div class="cancha-stat-value">${torneosActivos}</div>
            <div class="cancha-stat-label">Torneos</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function verDetalleCancha(id) {
  try {
    const cancha = await API.canchas.get(id);
    mostrarDetalleCancha(cancha);
  } catch (err) {
    showToast('Error al cargar detalle de cancha', 'error');
  }
}

function mostrarDetalleCancha(cancha) {
  document.getElementById('cancha-detail-title').textContent = `🏟️ ${cancha.nombre}`;
  
  const features = [];
  if (cancha.techadas) features.push({ icon: '🏠', text: 'Techadas' });
  if (cancha.iluminacion) features.push({ icon: '💡', text: 'Iluminación' });
  if (cancha.vestuarios) features.push({ icon: '🚿', text: 'Vestuarios' });
  if (cancha.estacionamiento) features.push({ icon: '🚗', text: 'Estacionamiento' });
  
  const location = [cancha.direccion, cancha.ciudad, cancha.provincia].filter(Boolean).join(', ');
  const direccionEncoded = encodeURIComponent(location);
  
  let torneosHTML = '';
  if (cancha.torneos && cancha.torneos.length > 0) {
    torneosHTML = `
      <div class="cancha-detail-torneos">
        <h4>Torneos en esta cancha (${cancha.torneos.length})</h4>
        ${cancha.torneos.map(t => `
          <div class="cancha-torneo-item">
            <div class="cancha-torneo-info">
              <div class="cancha-torneo-name">${t.nombre}</div>
              <div class="cancha-torneo-meta">
                ${formatDate(t.fecha_inicio)} - ${formatDate(t.fecha_fin)} · ${t.tipo} · ${t.categoria}
              </div>
            </div>
            <span class="cancha-torneo-badge">${t.estado}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  document.getElementById('cancha-detail-content').innerHTML = `
    <div class="cancha-detail-header">
      <div class="cancha-detail-location">📍 ${location}</div>
      ${cancha.telefono ? `<div class="cancha-detail-location">📞 ${cancha.telefono}</div>` : ''}
      ${cancha.email ? `<div class="cancha-detail-location">✉️ ${cancha.email}</div>` : ''}
    </div>
    
    ${features.length ? `
      <div class="cancha-detail-features">
        ${features.map(f => `<span class="feature-badge">${f.icon} ${f.text}</span>`).join('')}
      </div>
    ` : ''}
    
    <div class="cancha-detail-info">
      <div class="cancha-detail-info-item">
        <label>Cantidad de canchas</label>
        <span>${cancha.cantidad_canchas}</span>
      </div>
      <div class="cancha-detail-info-item">
        <label>Estado</label>
        <span>${cancha.activa ? '✅ Activa' : '❌ Inactiva'}</span>
      </div>
    </div>
    
    ${cancha.descripcion ? `
      <div class="cancha-detail-desc">${cancha.descripcion}</div>
    ` : ''}
    
    <div class="cancha-detail-map">
      <iframe
        width="100%"
        height="100%"
        frameborder="0"
        style="border:0"
        referrerpolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${direccionEncoded}"
        allowfullscreen>
      </iframe>
    </div>
    
    ${torneosHTML}
  `;
  
  openModal('modal-cancha-detalle');
}

function abrirFormCancha(canchaId = null) {
  if (!API.auth.isLoggedIn()) {
    showToast('Iniciá sesión para gestionar canchas', 'info');
    openModal('modal-login');
    return;
  }
  
  const user = API.auth.currentUser();
  if (!['organizador', 'admin'].includes(user.rol)) {
    showToast('Solo organizadores y admins pueden crear canchas', 'error');
    return;
  }
  
  // Resetear formulario
  document.getElementById('form-cancha').reset();
  document.getElementById('cancha-id').value = '';
  document.getElementById('cancha-form-title').textContent = '🏟️ Nueva Cancha';
  document.getElementById('cancha-form-btn').textContent = 'Crear Cancha 🚀';
  
  // Si es edición, cargar datos
  if (canchaId) {
    API.canchas.get(canchaId).then(cancha => {
      document.getElementById('cancha-id').value = cancha.id;
      document.getElementById('cancha-nombre').value = cancha.nombre;
      document.getElementById('cancha-direccion').value = cancha.direccion || '';
      document.getElementById('cancha-ciudad').value = cancha.ciudad || '';
      document.getElementById('cancha-provincia').value = cancha.provincia || '';
      document.getElementById('cancha-telefono').value = cancha.telefono || '';
      document.getElementById('cancha-email').value = cancha.email || '';
      document.getElementById('cancha-cantidad').value = cancha.cantidad_canchas || 1;
      document.getElementById('cancha-techadas').checked = cancha.techadas || false;
      document.getElementById('cancha-iluminacion').checked = cancha.iluminacion || false;
      document.getElementById('cancha-vestuarios').checked = cancha.vestuarios || false;
      document.getElementById('cancha-estacionamiento').checked = cancha.estacionamiento || false;
      document.getElementById('cancha-descripcion').value = cancha.descripcion || '';
      document.getElementById('cancha-activa').checked = cancha.activa !== false;
      
      document.getElementById('cancha-form-title').textContent = '🏟️ Editar Cancha';
      document.getElementById('cancha-form-btn').textContent = 'Guardar Cambios 🚀';
    }).catch(err => {
      showToast('Error al cargar cancha', 'error');
    });
  }
  
  openModal('modal-cancha-form');
}

async function handleGuardarCancha(e) {
  e.preventDefault();
  
  const id = document.getElementById('cancha-id').value;
  const data = {
    nombre: document.getElementById('cancha-nombre').value,
    direccion: document.getElementById('cancha-direccion').value,
    ciudad: document.getElementById('cancha-ciudad').value,
    provincia: document.getElementById('cancha-provincia').value,
    telefono: document.getElementById('cancha-telefono').value,
    email: document.getElementById('cancha-email').value,
    cantidad_canchas: parseInt(document.getElementById('cancha-cantidad').value),
    techadas: document.getElementById('cancha-techadas').checked,
    iluminacion: document.getElementById('cancha-iluminacion').checked,
    vestuarios: document.getElementById('cancha-vestuarios').checked,
    estacionamiento: document.getElementById('cancha-estacionamiento').checked,
    descripcion: document.getElementById('cancha-descripcion').value,
    activa: document.getElementById('cancha-activa').checked,
  };
  
  const btn = document.getElementById('cancha-form-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    if (id) {
      await API.canchas.update(id, data);
      showToast('Cancha actualizada exitosamente', 'success');
    } else {
      await API.canchas.create(data);
      showToast('Cancha creada exitosamente', 'success');
    }
    closeModal('modal-cancha-form');
    loadCanchas();
  } catch (err) {
    showToast(err.message || 'Error al guardar cancha', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Guardar Cambios 🚀' : 'Crear Cancha 🚀';
  }
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
  // Procesar callback de Google OAuth si existe
  processGoogleCallback();
  
  updateNavAuth();
  showPage('inicio');

  // Listeners de formularios
  document.getElementById('form-login')?.addEventListener('submit', handleLogin);
  document.getElementById('form-register')?.addEventListener('submit', handleRegister);
  document.getElementById('form-inscripcion')?.addEventListener('submit', handleInscripcion);
  document.getElementById('form-highlight')?.addEventListener('submit', handleSubirHighlight);
  document.getElementById('form-cancha')?.addEventListener('submit', handleGuardarCancha);

  // Cerrar modales al hacer click en overlay
  document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', closeOnOverlay));

  // Filtros
  document.querySelectorAll('.filter-select').forEach(sel => {
    sel.addEventListener('change', () => {
      if (document.getElementById('page-torneos')?.classList.contains('active')) loadTorneos();
      if (document.getElementById('page-ranking')?.classList.contains('active')) loadRanking();
      if (document.getElementById('page-canchas')?.classList.contains('active')) loadCanchas();
    });
  });
  
  // Filtro checkbox de canchas activas
  document.getElementById('filter-cancha-activa')?.addEventListener('change', () => {
    if (document.getElementById('page-canchas')?.classList.contains('active')) loadCanchas();
  });
});

// ── APROBACIÓN DE HIGHLIGHTS (ADMIN) ──────────────────────────────────────────
async function aprobarHighlight(id, isYouTube, youtubeId, videoUrl, titulo) {
  // Primero mostrar el video para revisión
  const confirmar = confirm(`¿Aprobar el highlight "${titulo}"?\n\nEsto lo hará visible para todos los usuarios.`);
  if (!confirmar) return;
  
  try {
    const response = await API.highlights.aprobar(id);
    showToast(response.mensaje || 'Highlight aprobado correctamente', 'success');
    loadHighlights(); // Recarga tanto pendientes como aprobados
  } catch (err) {
    showToast(err.message || 'Error al aprobar highlight', 'error');
  }
}

async function rechazarHighlight(id) {
  const motivo = prompt('Motivo del rechazo (opcional):');
  if (motivo === null) return; // Usuario canceló
  
  try {
    const response = await API.highlights.rechazar(id, motivo);
    showToast(response.mensaje || 'Highlight rechazado', 'info');
    loadHighlights(); // Recarga tanto pendientes como aprobados
  } catch (err) {
    showToast(err.message || 'Error al rechazar highlight', 'error');
  }
}

// ── ADMINISTRACIÓN DE USUARIOS ────────────────────────────────────────────────
async function loadAdminUsuarios() {
  const currentUser = API.auth.currentUser();
  if (!currentUser || currentUser.rol !== 'admin') {
    document.getElementById('admin-usuarios-grid').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <p>Solo administradores pueden acceder a esta sección</p>
      </div>`;
    return;
  }

  initAdminUsuariosFilters();
  syncAdminUsuariosFiltersUI();

  const el = document.getElementById('admin-usuarios-grid');
  el.innerHTML = '<div class="loading-pulse">Cargando usuarios...</div>';
  const pagerEl = document.getElementById('admin-usuarios-pager');
  if (pagerEl) pagerEl.innerHTML = '';

  try {
    const params = {
      page: state.adminUsuarios.page,
      limit: state.adminUsuarios.limit,
    };
    if (state.adminUsuarios.q) params.q = state.adminUsuarios.q;
    if (state.adminUsuarios.categoria) params.categoria = state.adminUsuarios.categoria;
    if (state.adminUsuarios.rol) params.rol = state.adminUsuarios.rol;
    if (state.adminUsuarios.activo !== '') params.activo = state.adminUsuarios.activo;
    if (state.adminUsuarios.deuda) params.deuda = state.adminUsuarios.deuda;

    const resp = await API.admin.usuarios.listar(params);
    const usuarios = resp.usuarios || [];
    const total = resp.total || 0;
    const page = resp.page || state.adminUsuarios.page;
    const limit = resp.limit || state.adminUsuarios.limit;

    if (!usuarios.length) {
      el.innerHTML = '<p class="text-muted">No hay usuarios registrados</p>';
      if (pagerEl) pagerEl.innerHTML = '';
      return;
    }

    el.innerHTML = usuarios.map(u => `
      <div class="admin-usuario-card ${!u.activo ? 'usuario-inactivo' : ''}">
        <div class="usuario-header">
          <div class="usuario-avatar">${u.nombre[0]}${u.apellido[0]}</div>
          <div class="usuario-info">
            <div class="usuario-nombre">${u.nombre} ${u.apellido}</div>
            <div class="usuario-email">${u.email}</div>
            <div class="usuario-email">${u.lado_preferencia ? `🟦 ${u.lado_preferencia}` : ''}</div>
            <div class="usuario-meta">
              <span class="badge-categoria ${u.categoria.toLowerCase()}">${u.categoria}</span>
              <span class="badge-rol ${u.rol}">${u.rol}</span>
              ${!u.activo ? '<span class="badge-inactivo">Inactivo</span>' : ''}
            </div>
          </div>
        </div>
        
        <div class="usuario-stats">
          <div class="stat-mini">
            <div class="stat-mini-num">${u.ranking_pts}</div>
            <div class="stat-mini-label">Puntos</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-num">${u.total_torneos || 0}</div>
            <div class="stat-mini-label">Torneos</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-num">${u.torneos_ganados || 0}</div>
            <div class="stat-mini-label">Ganados</div>
          </div>
          <div class="stat-mini ${parseInt(u.pagos_pendientes) > 0 ? 'stat-warning' : ''}">
            <div class="stat-mini-num">${u.pagos_pendientes || 0}</div>
            <div class="stat-mini-label">Pagos Pend.</div>
          </div>
        </div>

        <div class="usuario-actions">
          <button class="btn-mini" onclick="verDetalleUsuario('${u.id}')">👁️ Ver Detalle</button>
          <button class="btn-mini" onclick="cambiarCategoriaUsuario('${u.id}', '${u.nombre} ${u.apellido}', '${u.categoria}')">📊 Categoría</button>
          <button class="btn-mini ${u.activo ? 'btn-danger' : 'btn-success'}" onclick="toggleEstadoUsuario('${u.id}', ${u.activo}, '${u.nombre} ${u.apellido}')">
            ${u.activo ? '🚫 Deshabilitar' : '✅ Habilitar'}
          </button>
        </div>
      </div>
    `).join('');

    if (pagerEl) {
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const prevDisabled = page <= 1;
      const nextDisabled = page >= totalPages;
      pagerEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn-mini" ${prevDisabled ? 'disabled' : ''} onclick="adminUsuariosGoToPage(${page - 1})">◀ Anterior</button>
          <div style="color:var(--text-muted);font-size:13px;">Página <strong>${page}</strong> de <strong>${totalPages}</strong> · <strong>${total}</strong> usuarios</div>
          <button class="btn-mini" ${nextDisabled ? 'disabled' : ''} onclick="adminUsuariosGoToPage(${page + 1})">Siguiente ▶</button>
        </div>
      `;
    }
  } catch (err) {
    el.innerHTML = '<p class="text-muted">Error al cargar usuarios</p>';
    showToast(err.message || 'Error al cargar usuarios', 'error');
  }
}

function adminUsuariosGoToPage(page) {
  state.adminUsuarios.page = Math.max(1, parseInt(page, 10) || 1);
  loadAdminUsuarios();
}

async function verDetalleUsuario(id) {
  try {
    const data = await API.admin.usuarios.detalle(id);
    const { usuario, inscripciones, highlights, estadisticas } = data;

    document.getElementById('usuario-detail-title').textContent = 
      `👤 ${usuario.nombre} ${usuario.apellido}`;

    document.getElementById('usuario-detail-content').innerHTML = `
      <div class="usuario-detalle">
        <div class="detalle-section">
          <h4>Información Personal</h4>
          <div class="detalle-grid">
            <div><strong>Email:</strong> ${usuario.email}</div>
            <div><strong>Teléfono:</strong> ${usuario.telefono || 'No especificado'}</div>
            <div><strong>Categoría:</strong> <span class="badge-categoria ${usuario.categoria.toLowerCase()}">${usuario.categoria}</span></div>
            <div><strong>Preferencia:</strong> ${usuario.lado_preferencia || 'No especificado'}</div>
            <div><strong>Rol:</strong> <span class="badge-rol ${usuario.rol}">${usuario.rol}</span></div>
            <div><strong>Puntos Ranking:</strong> ${usuario.ranking_pts}</div>
            <div><strong>Estado:</strong> ${usuario.activo ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>'}</div>
            <div><strong>Registro:</strong> ${formatDate(usuario.created_at)}</div>
          </div>
        </div>

        <div class="detalle-section">
          <h4>Estadísticas</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-box-num">${estadisticas.total_torneos}</div>
              <div class="stat-box-label">Torneos Totales</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-num">${estadisticas.torneos_ganados}</div>
              <div class="stat-box-label">Campeonatos</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-num">${estadisticas.pagos_confirmados}</div>
              <div class="stat-box-label">Pagos OK</div>
            </div>
            <div class="stat-box ${estadisticas.pagos_pendientes > 0 ? 'stat-warning' : ''}">
              <div class="stat-box-num">${estadisticas.pagos_pendientes}</div>
              <div class="stat-box-label">Pagos Pendientes</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-num">${estadisticas.highlights_aprobados}</div>
              <div class="stat-box-label">Highlights</div>
            </div>
          </div>
        </div>

        <div class="detalle-section">
          <h4>Inscripciones (${inscripciones.length})</h4>
          ${inscripciones.length === 0 ? '<p class="text-muted">Sin inscripciones</p>' : `
            <div class="inscripciones-list">
              ${inscripciones.map(i => `
                <div class="inscripcion-item ${!i.pago_confirmado ? 'pago-pendiente' : ''}">
                  <div class="inscripcion-info">
                    <div class="inscripcion-torneo">${i.torneo_nombre}</div>
                    <div class="inscripcion-meta">
                      ${i.compañero_nombre ? `Pareja: ${i.compañero_nombre} · ` : ''}
                      ${formatDate(i.fecha_inicio)}
                      ${i.posicion_final ? ` · Posición: ${i.posicion_final}` : ''}
                    </div>
                  </div>
                  <div class="inscripcion-pago">
                    ${i.pago_confirmado 
                      ? '<span class="badge-pago-ok">✓ Pago OK</span>' 
                      : `<button class="btn-mini btn-success" onclick="confirmarPagoInscripcion('${i.id}')">Confirmar Pago</button>`
                    }
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="detalle-section">
          <h4>Highlights (${highlights.length})</h4>
          ${highlights.length === 0 ? '<p class="text-muted">Sin highlights</p>' : `
            <div class="highlights-mini-list">
              ${highlights.map(h => `
                <div class="highlight-mini-item">
                  <div>${h.titulo}</div>
                  <div class="highlight-mini-meta">
                    ${h.torneo_nombre || 'Sin torneo'} · ${h.vistas} vistas
                    ${h.estado_aprobacion === 'aprobado' ? '<span class="badge-aprobado">✓</span>' : ''}
                    ${h.estado_aprobacion === 'pendiente' ? '<span class="badge-pendiente">⏳</span>' : ''}
                    ${h.estado_aprobacion === 'rechazado' ? '<span class="badge-rechazado">✗</span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    openModal('modal-usuario-detalle');
  } catch (err) {
    showToast(err.message || 'Error al cargar detalle del usuario', 'error');
  }
}

function cambiarCategoriaUsuario(id, nombre, categoriaActual) {
  // Llenar el modal con los datos
  document.getElementById('cat-usuario-nombre').value = nombre;
  document.getElementById('cat-actual').value = categoriaActual;
  document.getElementById('cat-nueva').value = '';
  
  // Abrir modal
  openModal('modal-cambiar-categoria');
  
  // Manejar submit del formulario
  const form = document.getElementById('form-cambiar-categoria');
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const nuevaCategoria = document.getElementById('cat-nueva').value;
    
    if (!nuevaCategoria) {
      showToast('Seleccioná una categoría', 'error');
      return;
    }
    
    if (nuevaCategoria === categoriaActual) {
      showToast('La categoría es la misma', 'info');
      closeModal('modal-cambiar-categoria');
      return;
    }
    
    try {
      const response = await API.admin.usuarios.cambiarCategoria(id, nuevaCategoria);
      showToast(response.mensaje, 'success');
      closeModal('modal-cambiar-categoria');
      loadAdminUsuarios();
    } catch (err) {
      showToast(err.message || 'Error al cambiar categoría', 'error');
    }
  };
}

async function toggleEstadoUsuario(id, estadoActual, nombre) {
  const accion = estadoActual ? 'deshabilitar' : 'habilitar';
  const confirmar = confirm(`¿Seguro que querés ${accion} a ${nombre}?`);
  if (!confirmar) return;

  try {
    const response = await API.admin.usuarios.cambiarEstado(id, !estadoActual);
    showToast(response.mensaje, 'success');
    loadAdminUsuarios();
  } catch (err) {
    showToast(err.message || 'Error al cambiar estado', 'error');
  }
}

async function confirmarPagoInscripcion(inscripcionId) {
  const confirmar = confirm('¿Confirmar el pago de esta inscripción?');
  if (!confirmar) return;

  try {
    const response = await API.admin.inscripciones.confirmarPago(inscripcionId, true);
    showToast(response.mensaje, 'success');
    // Recargar el detalle del usuario si está abierto
    const modal = document.getElementById('modal-usuario-detalle');
    if (modal.classList.contains('open')) {
      // Buscar el ID del usuario desde el título del modal o recargar la lista
      loadAdminUsuarios();
      closeModal('modal-usuario-detalle');
    }
  } catch (err) {
    showToast(err.message || 'Error al confirmar pago', 'error');
  }
}
