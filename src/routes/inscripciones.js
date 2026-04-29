const router = require('express').Router();
const { query } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

function normalizePref(pref) {
  if (!pref) return 'ambos';
  const p = String(pref).toLowerCase();
  if (p === 'drive' || p === 'reves' || p === 'ambos') return p;
  return 'ambos';
}

function oppositeSide(side) {
  return side === 'drive' ? 'reves' : 'drive';
}

function resolvePairSides(waitingPref, currentPref, forcedCurrentSide) {
  const w = normalizePref(waitingPref);
  const c = normalizePref(currentPref);

  if (forcedCurrentSide) {
    const f = forcedCurrentSide;
    const waitingSide = oppositeSide(f);

    if (w !== 'ambos' && w !== waitingSide) {
      return { ok: false, reason: 'waiting_cannot_switch', suggestedCurrentSide: null };
    }
    return { ok: true, waitingSide, currentSide: f, forced: true };
  }

  if (w === 'ambos' && c === 'ambos') {
    return { ok: true, waitingSide: 'drive', currentSide: 'reves', forced: false };
  }

  if (w === 'ambos' && (c === 'drive' || c === 'reves')) {
    return { ok: true, waitingSide: oppositeSide(c), currentSide: c, forced: false };
  }

  if (c === 'ambos' && (w === 'drive' || w === 'reves')) {
    return { ok: true, waitingSide: w, currentSide: oppositeSide(w), forced: false };
  }

  if ((w === 'drive' || w === 'reves') && (c === 'drive' || c === 'reves')) {
    if (w !== c) return { ok: true, waitingSide: w, currentSide: c, forced: false };
    return { ok: false, reason: 'same_side', suggestedCurrentSide: oppositeSide(w) };
  }

  return { ok: true, waitingSide: 'drive', currentSide: 'reves', forced: false };
}

// POST /api/inscripciones - inscribirse a un torneo
router.post('/', authenticate, async (req, res) => {
  const { torneo_id, jugador2_id, jugador2_nombre, jugador2_email } = req.body;

  if (!torneo_id) return res.status(400).json({ error: 'torneo_id es requerido' });
  if (!jugador2_id && !jugador2_email && !jugador2_nombre) {
    return res.status(400).json({ error: 'Indicá el email o nombre del compañero/a' });
  }

  try {
    // Verificar que el torneo existe y está publicado
    const { rows: [torneo] } = await query(
      `SELECT t.*, COUNT(i.id) FILTER (WHERE i.estado='confirmada') AS inscriptos
       FROM torneos t LEFT JOIN inscripciones i ON i.torneo_id = t.id
       WHERE t.id = $1 GROUP BY t.id`,
      [torneo_id]
    );

    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (torneo.estado !== 'publicado') {
      return res.status(409).json({ error: 'El torneo no está aceptando inscripciones' });
    }
    if (parseInt(torneo.inscriptos) >= torneo.max_parejas) {
      return res.status(409).json({ error: 'El torneo ya está completo' });
    }

    // Verificar que no esté ya inscripto
    const { rows: exists } = await query(
      "SELECT id FROM inscripciones WHERE torneo_id = $1 AND estado IN ('pendiente','confirmada') AND (jugador1_id = $2 OR jugador2_id = $2)",
      [torneo_id, req.user.id]
    );
    if (exists.length > 0) {
      return res.status(409).json({ error: 'Ya estás inscripto en este torneo' });
    }

    let finalJugador2Id = jugador2_id;
    let finalJugador2Nombre = jugador2_nombre;
    let mensajeAdicional = '';

    // Si se proporcionó email, buscar al usuario
    if (jugador2_email) {
      const { rows: usuarioEncontrado } = await query(
        'SELECT id, nombre, apellido FROM users WHERE email = $1',
        [jugador2_email.toLowerCase()]
      );

      if (usuarioEncontrado.length > 0) {
        // Usuario encontrado, usar su ID
        finalJugador2Id = usuarioEncontrado[0].id;
        finalJugador2Nombre = `${usuarioEncontrado[0].nombre} ${usuarioEncontrado[0].apellido}`;
      } else {
        // Usuario no encontrado, enviar email de invitación
        // TODO: Implementar envío de email de confirmación
        mensajeAdicional = ` Se enviará un email de confirmación a ${jugador2_email} para que se registre.`;
        finalJugador2Nombre = jugador2_email; // Guardar el email temporalmente
      }
    }

    const { rows: [inscripcion] } = await query(`
      INSERT INTO inscripciones (torneo_id, jugador1_id, jugador2_id, jugador2_nombre, estado)
      VALUES ($1, $2, $3, $4, 'confirmada')
      RETURNING *
    `, [torneo_id, req.user.id, finalJugador2Id || null, finalJugador2Nombre || null]);

    res.status(201).json({ 
      mensaje: '¡Inscripción confirmada!' + mensajeAdicional, 
      inscripcion,
      requiere_confirmacion: jugador2_email && !finalJugador2Id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar inscripción' });
  }
});

// POST /api/inscripciones/solo - inscribirse sin pareja (queda en espera o arma pareja)
router.post('/solo', authenticate, async (req, res) => {
  const { torneo_id, asumir_lado } = req.body;
  if (!torneo_id) return res.status(400).json({ error: 'torneo_id es requerido' });

  try {
    // Verificar que el torneo existe y está publicado
    const { rows: [torneo] } = await query(
      `SELECT t.*, COUNT(i.id) FILTER (WHERE i.estado='confirmada') AS inscriptos
       FROM torneos t LEFT JOIN inscripciones i ON i.torneo_id = t.id
       WHERE t.id = $1 GROUP BY t.id`,
      [torneo_id]
    );

    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (torneo.estado !== 'publicado') {
      return res.status(409).json({ error: 'El torneo no está aceptando inscripciones' });
    }
    if (parseInt(torneo.inscriptos) >= torneo.max_parejas) {
      return res.status(409).json({ error: 'El torneo ya está completo' });
    }

    // Verificar que no esté ya inscripto (como jugador1 o jugador2)
    const { rows: exists } = await query(
      "SELECT id FROM inscripciones WHERE torneo_id = $1 AND estado IN ('pendiente','confirmada') AND (jugador1_id = $2 OR jugador2_id = $2)",
      [torneo_id, req.user.id]
    );
    if (exists.length > 0) {
      return res.status(409).json({ error: 'Ya estás inscripto en este torneo' });
    }

    // Buscar un jugador esperando (FIFO)
    const { rows: waiting } = await query(
      `SELECT id, jugador1_id
       FROM inscripciones
       WHERE torneo_id = $1
         AND estado = 'pendiente'
         AND jugador2_id IS NULL
         AND jugador1_id <> $2
       ORDER BY created_at ASC
       LIMIT 1`,
      [torneo_id, req.user.id]
    );

    if (waiting.length > 0) {
      const waitingId = waiting[0].id;

      const { rows: [waitingUser] } = await query(
        'SELECT nombre, apellido, lado_preferencia FROM users WHERE id = $1',
        [waiting[0].jugador1_id]
      );
      const { rows: [currentUser] } = await query(
        'SELECT lado_preferencia FROM users WHERE id = $1',
        [req.user.id]
      );

      const forcedSide = asumir_lado && (asumir_lado === 'drive' || asumir_lado === 'reves') ? asumir_lado : null;
      const sides = resolvePairSides(waitingUser?.lado_preferencia, currentUser?.lado_preferencia, forcedSide);

      if (!sides.ok) {
        if (sides.reason === 'same_side') {
          return res.json({
            requiere_confirmacion: true,
            mensaje: 'Hay un jugador esperando, pero ambos prefieren el mismo lado. ¿Querés asumir el lado complementario para jugar ya?',
            sugerencia: { asumir_lado: sides.suggestedCurrentSide },
            jugador_esperando: {
              nombre: waitingUser ? `${waitingUser.nombre} ${waitingUser.apellido}` : 'Jugador',
              lado_preferencia: normalizePref(waitingUser?.lado_preferencia),
            },
          });
        }

        return res.status(409).json({ error: 'No se puede emparejar respetando las preferencias del jugador en espera' });
      }

      const { rows: [paired] } = await query(
        `UPDATE inscripciones
         SET jugador2_id = $1, estado = 'confirmada', jugador1_lado = $3, jugador2_lado = $4
         WHERE id = $2
         RETURNING *`,
        [req.user.id, waitingId, sides.waitingSide, sides.currentSide]
      );

      return res.status(201).json({
        mensaje: '¡Pareja armada! Tu inscripción quedó confirmada.',
        inscripcion: paired,
        emparejado: true,
      });
    }

    const { rows: [enEspera] } = await query(
      `INSERT INTO inscripciones (torneo_id, jugador1_id, jugador2_id, jugador2_nombre, estado)
       VALUES ($1, $2, NULL, NULL, 'pendiente')
       RETURNING *`,
      [torneo_id, req.user.id]
    );

    return res.status(201).json({
      mensaje: '¡Listo! Quedaste en espera de una pareja.',
      inscripcion: enEspera,
      emparejado: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar inscripción' });
  }
});

// GET /api/inscripciones/mis-inscripciones - historial del jugador
router.get('/mis-inscripciones', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        i.*,
        t.nombre AS torneo_nombre,
        t.tipo AS torneo_tipo,
        t.categoria AS torneo_categoria,
        t.fecha_inicio, t.fecha_fin, t.lugar,
        t.estado AS torneo_estado,
        CASE
          WHEN i.jugador1_id = $1 THEN COALESCE(u2.nombre || ' ' || u2.apellido, i.jugador2_nombre)
          ELSE (u1.nombre || ' ' || u1.apellido)
        END AS compañero
      FROM inscripciones i
      JOIN torneos t ON t.id = i.torneo_id
      LEFT JOIN users u1 ON u1.id = i.jugador1_id
      LEFT JOIN users u2 ON u2.id = i.jugador2_id
      WHERE (i.jugador1_id = $1 OR i.jugador2_id = $1)
      ORDER BY t.fecha_inicio DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// DELETE /api/inscripciones/:id - cancelar inscripción
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows: [inscripcion] } = await query(
      'SELECT * FROM inscripciones WHERE id = $1', [req.params.id]
    );
    if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada' });
    if (inscripcion.jugador1_id !== req.user.id && inscripcion.jugador2_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    await query(
      "UPDATE inscripciones SET estado = 'cancelada' WHERE id = $1",
      [req.params.id]
    );
    res.json({ mensaje: 'Inscripción cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar inscripción' });
  }
});

// PUT /api/inscripciones/:id/resultado - cargar posición final (organizador/admin)
router.put('/:id/resultado', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const { posicion_final } = req.body;
  if (!posicion_final) return res.status(400).json({ error: 'posicion_final requerida' });

  try {
    const { rows: [inscripcion] } = await query(`
      UPDATE inscripciones SET posicion_final = $1 WHERE id = $2 RETURNING *
    `, [posicion_final, req.params.id]);

    // Actualizar ranking del jugador según posición
    const puntos = posicion_final === 1 ? 100 : posicion_final === 2 ? 60 : posicion_final === 3 ? 40 : 20;
    await query(
      'UPDATE users SET ranking_pts = ranking_pts + $1 WHERE id = $2',
      [puntos, inscripcion.jugador1_id]
    );
    if (inscripcion.jugador2_id) {
      await query(
        'UPDATE users SET ranking_pts = ranking_pts + $1 WHERE id = $2',
        [puntos, inscripcion.jugador2_id]
      );
    }

    res.json({ mensaje: 'Resultado cargado y ranking actualizado', inscripcion });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar resultado' });
  }
});

module.exports = router;
