const router = require('express').Router();
const { query } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../utils/upload');

// GET /api/canchas - listar canchas (público)
router.get('/', async (req, res) => {
  const { activa, ciudad, provincia, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (activa !== undefined) { 
    params.push(activa === 'true'); 
    conditions.push(`activa = $${params.length}`); 
  }
  if (ciudad) { 
    params.push(ciudad); 
    conditions.push(`ciudad ILIKE $${params.length}`); 
  }
  if (provincia) { 
    params.push(provincia); 
    conditions.push(`provincia ILIKE $${params.length}`); 
  }

  try {
    params.push(limit, offset);
    let rows;
    try {
      ({ rows } = await query(`
        SELECT
          c.*,
          COUNT(t.id) FILTER (WHERE t.estado IN ('publicado', 'en_curso')) AS torneos_activos
        FROM canchas c
        LEFT JOIN torneos t ON t.cancha_id = c.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY c.id
        ORDER BY c.nombre ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params));
    } catch (err) {
      if (err && err.code === '42703' && /cancha_id/i.test(err.message || '')) {
        ({ rows } = await query(`
          SELECT
            c.*,
            0::bigint AS torneos_activos
          FROM canchas c
          WHERE ${conditions.join(' AND ')}
          ORDER BY c.nombre ASC
          LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params));
      } else {
        throw err;
      }
    }

    // Contar total
    const countConditions = conditions.join(' AND ');
    const countParams = params.slice(0, -2);
    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*) AS total FROM canchas WHERE ${countConditions}`,
      countParams
    );

    res.json({ 
      canchas: rows, 
      total: parseInt(total), 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener canchas' });
  }
});

// GET /api/canchas/:id - detalle de cancha (público)
router.get('/:id', async (req, res) => {
  try {
    let rows;
    try {
      ({ rows } = await query(`
        SELECT
          c.*,
          json_agg(
            json_build_object(
              'id', t.id,
              'nombre', t.nombre,
              'fecha_inicio', t.fecha_inicio,
              'fecha_fin', t.fecha_fin,
              'estado', t.estado,
              'tipo', t.tipo,
              'categoria', t.categoria
            ) ORDER BY t.fecha_inicio DESC
          ) FILTER (WHERE t.id IS NOT NULL) AS torneos
        FROM canchas c
        LEFT JOIN torneos t ON t.cancha_id = c.id
        WHERE c.id = $1
        GROUP BY c.id
      `, [req.params.id]));
    } catch (err) {
      if (err && err.code === '42703' && /cancha_id/i.test(err.message || '')) {
        ({ rows } = await query(`
          SELECT
            c.*,
            '[]'::json AS torneos
          FROM canchas c
          WHERE c.id = $1
        `, [req.params.id]));
      } else {
        throw err;
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cancha' });
  }
});

// POST /api/canchas - crear cancha (organizador/admin)
router.post('/', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const {
    nombre, direccion, ciudad, provincia, telefono, email,
    cantidad_canchas = 1, techadas = false, iluminacion = false,
    vestuarios = false, estacionamiento = false, descripcion, activa = true
  } = req.body;

  if (!nombre || !direccion) {
    return res.status(400).json({ error: 'Nombre y dirección son obligatorios' });
  }

  try {
    const { rows: [cancha] } = await query(`
      INSERT INTO canchas
        (nombre, direccion, ciudad, provincia, telefono, email, cantidad_canchas,
         techadas, iluminacion, vestuarios, estacionamiento, descripcion, activa)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      nombre, direccion, ciudad, provincia, telefono, email, cantidad_canchas,
      techadas, iluminacion, vestuarios, estacionamiento, descripcion, activa
    ]);

    res.status(201).json(cancha);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cancha' });
  }
});

// PUT /api/canchas/:id - editar cancha (organizador/admin)
router.put('/:id', authenticate, requireRole('organizador', 'admin'), async (req, res) => {
  const campos = [
    'nombre', 'direccion', 'ciudad', 'provincia', 'telefono', 'email',
    'cantidad_canchas', 'techadas', 'iluminacion', 'vestuarios',
    'estacionamiento', 'descripcion', 'activa'
  ];
  const updates = [];
  const params = [];

  campos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      params.push(req.body[campo]);
      updates.push(`${campo} = $${params.length}`);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Sin campos para actualizar' });
  }

  try {
    params.push(req.params.id);
    const { rows } = await query(`
      UPDATE canchas SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cancha' });
  }
});

// DELETE /api/canchas/:id - eliminar cancha (admin)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Verificar si hay torneos asociados
    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) as count FROM torneos WHERE cancha_id = $1',
      [req.params.id]
    );

    if (parseInt(count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la cancha porque tiene torneos asociados' 
      });
    }

    const { rowCount } = await query(
      'DELETE FROM canchas WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    res.json({ mensaje: 'Cancha eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cancha' });
  }
});

// POST /api/canchas/:id/imagen - subir imagen de la cancha
router.post('/:id/imagen', authenticate, requireRole('organizador', 'admin'), (req, res, next) => {
  req.uploadSubdir = 'canchas';
  next();
}, uploadImage.single('imagen'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió imagen' });
  }
  const imageUrl = `/uploads/canchas/${req.file.filename}`;
  try {
    await query('UPDATE canchas SET imagen_url = $1 WHERE id = $2', [imageUrl, req.params.id]);
    res.json({ imagen_url: imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar imagen' });
  }
});

module.exports = router;
