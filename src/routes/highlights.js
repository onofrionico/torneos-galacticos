const router = require('express').Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { uploadVideo } = require('../utils/upload');

// GET /api/highlights - listar highlights públicos
router.get('/', async (req, res) => {
  const { jugador_id, torneo_id, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['h.visible = true'];
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
      SELECT h.*, t.nombre AS torneo_nombre
      FROM highlights h
      LEFT JOIN torneos t ON t.id = h.torneo_id
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
    const { rows: [highlight] } = await query(`
      INSERT INTO highlights (titulo, descripcion, video_url, jugador_id, torneo_id, duracion_seg)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [titulo, descripcion, videoUrl, req.user.id, torneo_id || null, duracion_seg || null]);

    res.status(201).json(highlight);
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
