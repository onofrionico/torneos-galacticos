const router = require('express').Router();
const { query } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

function normalizeRonda(ronda) {
  if (!ronda) return '';
  return String(ronda).trim();
}

function validateSetValue(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

// GET /api/partidos?torneo_id=... - listar partidos por torneo (público)
router.get('/', async (req, res) => {
  const { torneo_id } = req.query;
  if (!torneo_id) return res.status(400).json({ error: 'torneo_id es requerido' });

  try {
    const { rows } = await query(`
      SELECT
        p.*,
        row_to_json(i1.*) AS pareja1,
        row_to_json(i2.*) AS pareja2
      FROM partidos p
      LEFT JOIN inscripciones i1 ON i1.id = p.pareja1_id
      LEFT JOIN inscripciones i2 ON i2.id = p.pareja2_id
      WHERE p.torneo_id = $1
      ORDER BY
        COALESCE(p.fecha_partido, p.created_at) ASC,
        p.ronda ASC,
        p.created_at ASC
    `, [torneo_id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener partidos' });
  }
});

// POST /api/partidos - crear partido (organizador/admin)
router.post('/', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const { torneo_id, ronda, pareja1_id, pareja2_id, fecha_partido } = req.body;

  if (!torneo_id || !ronda) {
    return res.status(400).json({ error: 'torneo_id y ronda son requeridos' });
  }

  try {
    const { rows: [created] } = await query(`
      INSERT INTO partidos (torneo_id, ronda, pareja1_id, pareja2_id, fecha_partido)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [
      torneo_id,
      normalizeRonda(ronda),
      pareja1_id || null,
      pareja2_id || null,
      fecha_partido || null,
    ]);

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear partido' });
  }
});

// PUT /api/partidos/:id/resultado - cargar/actualizar resultado (organizador/admin)
router.put('/:id/resultado', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const id = req.params.id;
  const {
    set1_p1, set1_p2,
    set2_p1, set2_p2,
    set3_p1, set3_p2,
    ganador_id,
    fecha_partido,
    ronda,
    pareja1_id,
    pareja2_id,
  } = req.body || {};

  try {
    const params = [
      normalizeRonda(ronda),
      pareja1_id || null,
      pareja2_id || null,
      validateSetValue(set1_p1), validateSetValue(set1_p2),
      validateSetValue(set2_p1), validateSetValue(set2_p2),
      validateSetValue(set3_p1), validateSetValue(set3_p2),
      ganador_id || null,
      fecha_partido || null,
      id,
    ];

    const { rows } = await query(`
      UPDATE partidos
      SET
        ronda = COALESCE($1, ronda),
        pareja1_id = COALESCE($2, pareja1_id),
        pareja2_id = COALESCE($3, pareja2_id),
        set1_p1 = $4, set1_p2 = $5,
        set2_p1 = $6, set2_p2 = $7,
        set3_p1 = $8, set3_p2 = $9,
        ganador_id = $10,
        fecha_partido = $11
      WHERE id = $12
      RETURNING *
    `, params);

    if (rows.length === 0) return res.status(404).json({ error: 'Partido no encontrado' });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar resultado' });
  }
});

module.exports = router;
