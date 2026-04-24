const router = require('express').Router();
const { query } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /api/inscripciones - inscribirse a un torneo
router.post('/', authenticate, async (req, res) => {
  const { torneo_id, jugador2_id, jugador2_nombre } = req.body;

  if (!torneo_id) return res.status(400).json({ error: 'torneo_id es requerido' });
  if (!jugador2_id && !jugador2_nombre) {
    return res.status(400).json({ error: 'Indicá el compañero/a (id o nombre)' });
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
      'SELECT id FROM inscripciones WHERE torneo_id = $1 AND jugador1_id = $2',
      [torneo_id, req.user.id]
    );
    if (exists.length > 0) {
      return res.status(409).json({ error: 'Ya estás inscripto en este torneo' });
    }

    const { rows: [inscripcion] } = await query(`
      INSERT INTO inscripciones (torneo_id, jugador1_id, jugador2_id, jugador2_nombre, estado)
      VALUES ($1, $2, $3, $4, 'confirmada')
      RETURNING *
    `, [torneo_id, req.user.id, jugador2_id || null, jugador2_nombre || null]);

    res.status(201).json({ mensaje: '¡Inscripción confirmada!', inscripcion });
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
        COALESCE(u2.nombre || ' ' || u2.apellido, i.jugador2_nombre) AS compañero
      FROM inscripciones i
      JOIN torneos t ON t.id = i.torneo_id
      LEFT JOIN users u2 ON u2.id = i.jugador2_id
      WHERE i.jugador1_id = $1
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
    if (inscripcion.jugador1_id !== req.user.id && req.user.rol !== 'admin') {
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
