const router = require('express').Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { uploadVideo } = require('../utils/upload');

// GET /api/highlights - listar highlights públicos (solo aprobados)
router.get('/', async (req, res) => {
  const { jugador_id, torneo_id, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['h.visible = true', "h.estado_aprobacion = 'aprobado'"];
  const params = [];

  if (jugador_id) { params.push(jugador_id); conditions.push(`h.jugador_id = $${params.length}`); }
  if (torneo_id)  { params.push(torneo_id);  conditions.push(`h.torneo_id = $${params.length}`); }

  try {
    params.push(limit, offset);
    const { rows } = await query(`
      SELECT
        h.*,
        u.nombre || ' ' || u.apellido AS jugador_nombre,
        t.nombre AS torneo_nombre
      FROM highlights h
      JOIN users u ON u.id = h.jugador_id
      LEFT JOIN torneos t ON t.id = h.torneo_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY h.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener highlights' });
  }
});

// GET /api/highlights/mis-highlights
router.get('/mis-highlights', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        h.*, 
        t.nombre AS torneo_nombre,
        u.nombre || ' ' || u.apellido AS aprobador_nombre
      FROM highlights h
      LEFT JOIN torneos t ON t.id = h.torneo_id
      LEFT JOIN users u ON u.id = h.aprobado_por
      WHERE h.jugador_id = $1
      ORDER BY h.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus highlights' });
  }
});

// POST /api/highlights - subir highlight
router.post('/', authenticate, (req, res, next) => {
  req.uploadSubdir = 'highlights';
  next();
}, uploadVideo.single('video'), async (req, res) => {
  const { titulo, descripcion, torneo_id, duracion_seg, youtube_url } = req.body;
  if (!titulo) return res.status(400).json({ error: 'El título es requerido' });

  let videoUrl;
  
  // Si se proporciona una URL de YouTube, usarla
  if (youtube_url) {
    videoUrl = youtube_url;
  } else if (req.file) {
    // Si se sube un archivo, usar la ruta del archivo
    videoUrl = `/uploads/highlights/${req.file.filename}`;
  } else {
    return res.status(400).json({ error: 'Debe proporcionar un video o una URL de YouTube' });
  }

  try {
    // Si es admin, aprobar automáticamente. Si es usuario, queda pendiente
    const estadoAprobacion = req.user.rol === 'admin' ? 'aprobado' : 'pendiente';
    const aprobadoPor = req.user.rol === 'admin' ? req.user.id : null;
    const fechaAprobacion = req.user.rol === 'admin' ? new Date() : null;

    const { rows: [highlight] } = await query(`
      INSERT INTO highlights (
        titulo, descripcion, video_url, jugador_id, torneo_id, duracion_seg,
        estado_aprobacion, aprobado_por, fecha_aprobacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      titulo, descripcion, videoUrl, req.user.id, torneo_id || null, duracion_seg || null,
      estadoAprobacion, aprobadoPor, fechaAprobacion
    ]);

    const mensaje = req.user.rol === 'admin' 
      ? 'Highlight publicado correctamente'
      : 'Highlight enviado. Será visible una vez que un administrador lo apruebe';

    res.status(201).json({ highlight, mensaje });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar highlight' });
  }
});

// POST /api/highlights/:id/vista - registrar vista
router.post('/:id/vista', async (req, res) => {
  try {
    await query('UPDATE highlights SET vistas = vistas + 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/highlights/pendientes - listar highlights pendientes de aprobación (solo admin)
router.get('/pendientes', authenticate, async (req, res) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden ver highlights pendientes' });
  }

  try {
    const { rows } = await query(`
      SELECT 
        h.*,
        u.nombre || ' ' || u.apellido AS jugador_nombre,
        u.email AS jugador_email,
        t.nombre AS torneo_nombre
      FROM highlights h
      JOIN users u ON u.id = h.jugador_id
      LEFT JOIN torneos t ON t.id = h.torneo_id
      WHERE h.estado_aprobacion = 'pendiente'
      ORDER BY h.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener highlights pendientes' });
  }
});

// POST /api/highlights/:id/aprobar - aprobar highlight (solo admin)
router.post('/:id/aprobar', authenticate, async (req, res) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden aprobar highlights' });
  }

  try {
    const { rows: [h] } = await query('SELECT * FROM highlights WHERE id = $1', [req.params.id]);
    if (!h) return res.status(404).json({ error: 'Highlight no encontrado' });
    
    if (h.estado_aprobacion === 'aprobado') {
      return res.status(400).json({ error: 'Este highlight ya está aprobado' });
    }

    const { rows: [updated] } = await query(`
      UPDATE highlights 
      SET estado_aprobacion = 'aprobado',
          aprobado_por = $1,
          fecha_aprobacion = NOW(),
          visible = true
      WHERE id = $2
      RETURNING *
    `, [req.user.id, req.params.id]);

    res.json({ mensaje: 'Highlight aprobado correctamente', highlight: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al aprobar highlight' });
  }
});

// POST /api/highlights/:id/rechazar - rechazar highlight (solo admin)
router.post('/:id/rechazar', authenticate, async (req, res) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden rechazar highlights' });
  }

  const { motivo } = req.body;

  try {
    const { rows: [h] } = await query('SELECT * FROM highlights WHERE id = $1', [req.params.id]);
    if (!h) return res.status(404).json({ error: 'Highlight no encontrado' });
    
    if (h.estado_aprobacion === 'rechazado') {
      return res.status(400).json({ error: 'Este highlight ya está rechazado' });
    }

    const { rows: [updated] } = await query(`
      UPDATE highlights 
      SET estado_aprobacion = 'rechazado',
          aprobado_por = $1,
          fecha_aprobacion = NOW(),
          motivo_rechazo = $2,
          visible = false
      WHERE id = $3
      RETURNING *
    `, [req.user.id, motivo || 'Sin motivo especificado', req.params.id]);

    res.json({ mensaje: 'Highlight rechazado', highlight: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al rechazar highlight' });
  }
});

// DELETE /api/highlights/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows: [h] } = await query('SELECT * FROM highlights WHERE id = $1', [req.params.id]);
    if (!h) return res.status(404).json({ error: 'No encontrado' });
    if (h.jugador_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    await query('DELETE FROM highlights WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Highlight eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
