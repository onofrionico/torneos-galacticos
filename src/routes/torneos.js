const router = require('express').Router();
const { query } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../utils/upload');

// GET /api/torneos - listar torneos (público)
router.get('/', async (req, res) => {
  const { estado, tipo, categoria, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (estado) { params.push(estado); conditions.push(`t.estado = $${params.length}`); }
  if (tipo)   { params.push(tipo);   conditions.push(`t.tipo = $${params.length}`); }
  if (categoria) { params.push(categoria); conditions.push(`t.categoria = $${params.length}`); }

  try {
    params.push(limit, offset);
    const { rows } = await query(`
      SELECT
        t.*,
        u.nombre || ' ' || u.apellido AS organizador_nombre,
        COUNT(i.id) FILTER (WHERE i.estado = 'confirmada') AS inscriptos,
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'direccion', c.direccion,
          'ciudad', c.ciudad,
          'provincia', c.provincia
        ) AS cancha
      FROM torneos t
      JOIN users u ON u.id = t.organizador_id
      LEFT JOIN inscripciones i ON i.torneo_id = t.id
      LEFT JOIN canchas c ON c.id = t.cancha_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY t.id, u.nombre, u.apellido, c.id, c.nombre, c.direccion, c.ciudad, c.provincia
      ORDER BY t.fecha_inicio ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Contar total sin limit/offset
    const countConditions = conditions.join(' AND ');
    const countParams = params.slice(0, -2); // Remover limit y offset
    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*) AS total FROM torneos t WHERE ${countConditions}`,
      countParams
    );

    res.json({ torneos: rows, total: parseInt(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener torneos' });
  }
});

// GET /api/torneos/:id - detalle de torneo (público)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        t.*,
        u.nombre || ' ' || u.apellido AS organizador_nombre,
        row_to_json(c.*) AS cancha,
        json_agg(
          json_build_object(
            'id', i.id,
            'estado', i.estado,
            'posicion_final', i.posicion_final,
            'jugador1', json_build_object('id', u1.id, 'nombre', u1.nombre || ' ' || u1.apellido),
            'jugador2_nombre', COALESCE(u2.nombre || ' ' || u2.apellido, i.jugador2_nombre)
          ) ORDER BY i.created_at
        ) FILTER (WHERE i.id IS NOT NULL) AS inscripciones
      FROM torneos t
      JOIN users u ON u.id = t.organizador_id
      LEFT JOIN canchas c ON c.id = t.cancha_id
      LEFT JOIN inscripciones i ON i.torneo_id = t.id
      LEFT JOIN users u1 ON u1.id = i.jugador1_id
      LEFT JOIN users u2 ON u2.id = i.jugador2_id
      WHERE t.id = $1
      GROUP BY t.id, u.nombre, u.apellido, c.id
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Torneo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener torneo' });
  }
});

// POST /api/torneos - crear torneo (organizador/admin)
router.post('/', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const {
    nombre, descripcion, tipo, categoria,
    fecha_inicio, fecha_fin, lugar, cancha_id,
    max_parejas = 16, precio_pareja = 0, estado = 'borrador'
  } = req.body;

  if (!nombre || !tipo || !categoria || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const { rows: [torneo] } = await query(`
      INSERT INTO torneos
        (nombre, descripcion, tipo, categoria, fecha_inicio, fecha_fin, lugar, cancha_id, max_parejas, precio_pareja, estado, organizador_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [nombre, descripcion, tipo, categoria, fecha_inicio, fecha_fin, lugar, cancha_id, max_parejas, precio_pareja, estado, req.user.id]);

    res.status(201).json(torneo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear torneo' });
  }
});

// PUT /api/torneos/:id - editar torneo
router.put('/:id', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const campos = ['nombre','descripcion','tipo','categoria','fecha_inicio','fecha_fin','lugar','cancha_id','max_parejas','precio_pareja','estado'];
  const updates = [];
  const params = [];

  campos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      params.push(req.body[campo]);
      updates.push(`${campo} = $${params.length}`);
    }
  });

  if (updates.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

  try {
    params.push(req.params.id, req.user.id);
    const { rows } = await query(`
      UPDATE torneos SET ${updates.join(', ')}
      WHERE id = $${params.length - 1}
        AND (organizador_id = $${params.length} OR $${params.length} IN (SELECT id FROM users WHERE rol='admin'))
      RETURNING *
    `, params);

    if (rows.length === 0) return res.status(404).json({ error: 'Torneo no encontrado o sin permisos' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar torneo' });
  }
});

// DELETE /api/torneos/:id - eliminar torneo
router.delete('/:id', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM torneos WHERE id = $1 AND organizador_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Torneo no encontrado o sin permisos' });
    res.json({ mensaje: 'Torneo eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar torneo' });
  }
});

// POST /api/torneos/:id/imagen - subir imagen del torneo
router.post('/:id/imagen', authenticate, requireRole('organizador', 'admin'), (req, res, next) => {
  req.uploadSubdir = 'torneos';
  next();
}, uploadImage.single('imagen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const imageUrl = `/uploads/torneos/${req.file.filename}`;
  try {
    await query('UPDATE torneos SET imagen_url = $1 WHERE id = $2', [imageUrl, req.params.id]);
    res.json({ imagen_url: imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar imagen' });
  }
});

module.exports = router;
