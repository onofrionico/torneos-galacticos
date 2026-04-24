const router = require('express').Router();
const { query } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/ranking - tabla de ranking general
router.get('/', async (req, res) => {
  const { categoria, limit = 50 } = req.query;
  const conditions = ['1=1'];
  const params = [];

  if (categoria) { params.push(categoria); conditions.push(`u.categoria = $${params.length}`); }

  try {
    params.push(limit);
    const { rows } = await query(`
      SELECT
        u.id, u.nombre, u.apellido, u.categoria, u.ranking_pts, u.avatar_url,
        ROW_NUMBER() OVER (ORDER BY u.ranking_pts DESC) AS posicion,
        COUNT(i.id) FILTER (WHERE i.posicion_final = 1) AS campeonatos,
        COUNT(i.id) AS participaciones
      FROM users u
      LEFT JOIN inscripciones i ON i.jugador1_id = u.id AND i.estado = 'confirmada'
      WHERE ${conditions.join(' AND ')} AND u.rol = 'jugador'
      GROUP BY u.id
      ORDER BY u.ranking_pts DESC
      LIMIT $${params.length}
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

// GET /api/ranking/jugador/:id - historial completo de un jugador
router.get('/jugador/:id', async (req, res) => {
  try {
    const { rows: [jugador] } = await query(`
      SELECT id, nombre, apellido, categoria, ranking_pts, avatar_url
      FROM users WHERE id = $1
    `, [req.params.id]);

    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });

    const { rows: historial } = await query(`
      SELECT
        i.*,
        t.nombre AS torneo_nombre, t.tipo, t.categoria AS torneo_categoria,
        t.fecha_inicio, t.fecha_fin,
        COALESCE(u2.nombre || ' ' || u2.apellido, i.jugador2_nombre) AS compañero
      FROM inscripciones i
      JOIN torneos t ON t.id = i.torneo_id
      LEFT JOIN users u2 ON u2.id = i.jugador2_id
      WHERE i.jugador1_id = $1 AND i.estado = 'confirmada'
      ORDER BY t.fecha_inicio DESC
    `, [req.params.id]);

    const stats = {
      campeonatos: historial.filter(h => h.posicion_final === 1).length,
      subcampeonatos: historial.filter(h => h.posicion_final === 2).length,
      terceros: historial.filter(h => h.posicion_final === 3).length,
      participaciones: historial.length,
    };

    res.json({ jugador, historial, stats });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// POST /api/ranking/snapshot - guardar snapshot mensual (admin)
router.post('/snapshot', authenticate, requireRole('admin'), async (req, res) => {
  const periodo = new Date().toISOString().slice(0, 7); // YYYY-MM
  try {
    const { rows } = await query(`
      INSERT INTO ranking_historial (jugador_id, puntos, posicion, periodo)
      SELECT id, ranking_pts,
        ROW_NUMBER() OVER (ORDER BY ranking_pts DESC),
        $1
      FROM users WHERE rol = 'jugador'
      ON CONFLICT (jugador_id, periodo) DO UPDATE
        SET puntos = EXCLUDED.puntos, posicion = EXCLUDED.posicion
      RETURNING *
    `, [periodo]);

    res.json({ mensaje: `Snapshot ${periodo} guardado`, registros: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar snapshot' });
  }
});

module.exports = router;
