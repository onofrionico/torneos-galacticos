const router = require('express').Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

// Middleware para verificar que sea admin
function requireAdmin(req, res, next) {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden acceder a este recurso' });
  }
  next();
}

// GET /api/admin/usuarios - Listar todos los usuarios con sus estadísticas
router.get('/usuarios', authenticate, requireAdmin, async (req, res) => {
  try {
    const { q = '', categoria = '', rol = '', activo = '', deuda = '', page = 1, limit = 24 } = req.query;
    const safeLimit = Math.min(parseInt(limit, 10) || 24, 100);
    const safePage = parseInt(page, 10) || 1;
    const offset = (safePage - 1) * safeLimit;

    const conditions = ['1=1'];
    const params = [];

    if (q) {
      params.push(`%${String(q).trim()}%`);
      conditions.push(`(u.nombre ILIKE $${params.length} OR u.apellido ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (categoria) {
      params.push(categoria);
      conditions.push(`u.categoria = $${params.length}`);
    }
    if (rol) {
      params.push(rol);
      conditions.push(`u.rol = $${params.length}`);
    }
    if (activo !== '') {
      const bool = String(activo) === 'true';
      params.push(bool);
      conditions.push(`u.activo = $${params.length}`);
    }

    if (deuda === 'con_deuda') {
      conditions.push(`(
        SELECT COUNT(*)
        FROM inscripciones i_deuda
        WHERE (i_deuda.jugador1_id = u.id OR i_deuda.jugador2_id = u.id)
          AND i_deuda.estado <> 'cancelada'
          AND i_deuda.pago_confirmado = false
      ) > 0`);
    } else if (deuda === 'al_dia') {
      conditions.push(`(
        SELECT COUNT(*)
        FROM inscripciones i_deuda
        WHERE (i_deuda.jugador1_id = u.id OR i_deuda.jugador2_id = u.id)
          AND i_deuda.estado <> 'cancelada'
          AND i_deuda.pago_confirmado = false
      ) = 0`);
    }

    const { rows } = await query(`
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.categoria,
        u.lado_preferencia,
        u.ranking_pts,
        u.activo,
        u.rol,
        u.created_at,
        COUNT(DISTINCT i.id) as total_torneos,
        COUNT(DISTINCT CASE WHEN i.posicion_final = 1 THEN i.id END) as torneos_ganados,
        COUNT(DISTINCT CASE WHEN i.estado <> 'cancelada' AND i.pago_confirmado = true THEN i.id END) as pagos_confirmados,
        COUNT(DISTINCT CASE WHEN i.estado <> 'cancelada' AND i.pago_confirmado = false THEN i.id END) as pagos_pendientes
      FROM users u
      LEFT JOIN inscripciones i ON i.jugador1_id = u.id OR i.jugador2_id = u.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, safeLimit, offset]);

    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*)::int AS total FROM users u WHERE ${conditions.join(' AND ')}`,
      params
    );
    
    res.json({ usuarios: rows, total, page: safePage, limit: safeLimit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/admin/usuarios/:id - Obtener detalle de un usuario
router.get('/usuarios/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Datos del usuario
    const { rows: [usuario] } = await query(`
      SELECT 
        id, nombre, apellido, email, telefono, 
        categoria, lado_preferencia, ranking_pts, activo, rol, created_at
      FROM users 
      WHERE id = $1
    `, [req.params.id]);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Inscripciones del usuario
    const { rows: inscripciones } = await query(`
      SELECT 
        i.*,
        t.nombre as torneo_nombre,
        t.fecha_inicio,
        t.categoria as torneo_categoria,
        u2.nombre || ' ' || u2.apellido as compañero_nombre
      FROM inscripciones i
      JOIN torneos t ON t.id = i.torneo_id
      LEFT JOIN users u2 ON u2.id = CASE 
        WHEN i.jugador1_id = $1 THEN i.jugador2_id 
        ELSE i.jugador1_id 
      END
      WHERE i.jugador1_id = $1 OR i.jugador2_id = $1
      ORDER BY t.fecha_inicio DESC
    `, [req.params.id]);

    // Highlights del usuario
    const { rows: highlights } = await query(`
      SELECT 
        h.id,
        h.titulo,
        h.estado_aprobacion,
        h.vistas,
        h.created_at,
        t.nombre as torneo_nombre
      FROM highlights h
      LEFT JOIN torneos t ON t.id = h.torneo_id
      WHERE h.jugador_id = $1
      ORDER BY h.created_at DESC
    `, [req.params.id]);

    res.json({
      usuario,
      inscripciones,
      highlights,
      estadisticas: {
        total_torneos: inscripciones.length,
        torneos_ganados: inscripciones.filter(i => i.posicion_final === 1).length,
        pagos_confirmados: inscripciones.filter(i => i.pago_confirmado).length,
        pagos_pendientes: inscripciones.filter(i => !i.pago_confirmado).length,
        highlights_aprobados: highlights.filter(h => h.estado_aprobacion === 'aprobado').length,
        highlights_pendientes: highlights.filter(h => h.estado_aprobacion === 'pendiente').length,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalle del usuario' });
  }
});

// PUT /api/admin/usuarios/:id/categoria - Cambiar categoría de usuario
router.put('/usuarios/:id/categoria', authenticate, requireAdmin, async (req, res) => {
  const { categoria } = req.body;
  
  const categoriasValidas = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va', '9na'];
  if (!categoriasValidas.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }

  try {
    const { rows: [usuario] } = await query(`
      UPDATE users 
      SET categoria = $1 
      WHERE id = $2 
      RETURNING id, nombre, apellido, categoria
    `, [categoria, req.params.id]);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ 
      mensaje: `Categoría actualizada a ${categoria}`,
      usuario 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// PUT /api/admin/usuarios/:id/estado - Habilitar/Deshabilitar usuario
router.put('/usuarios/:id/estado', authenticate, requireAdmin, async (req, res) => {
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser true o false' });
  }

  try {
    const { rows: [usuario] } = await query(`
      UPDATE users 
      SET activo = $1 
      WHERE id = $2 
      RETURNING id, nombre, apellido, activo
    `, [activo, req.params.id]);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ 
      mensaje: activo ? 'Usuario habilitado' : 'Usuario deshabilitado',
      usuario 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
});

// PUT /api/admin/usuarios/:id/rol - Cambiar rol de usuario
router.put('/usuarios/:id/rol', authenticate, requireAdmin, async (req, res) => {
  const { rol } = req.body;

  const rolesValidos = ['jugador', 'admin'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  try {
    const { rows: [usuario] } = await query(`
      UPDATE users 
      SET rol = $1 
      WHERE id = $2 
      RETURNING id, nombre, apellido, rol
    `, [rol, req.params.id]);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ 
      mensaje: `Rol actualizado a ${rol}`,
      usuario 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// PUT /api/admin/inscripciones/:id/pago - Confirmar/Rechazar pago de inscripción
router.put('/inscripciones/:id/pago', authenticate, requireAdmin, async (req, res) => {
  const { pago_confirmado } = req.body;

  if (typeof pago_confirmado !== 'boolean') {
    return res.status(400).json({ error: 'El campo pago_confirmado debe ser true o false' });
  }

  try {
    const { rows: [inscripcion] } = await query(`
      UPDATE inscripciones 
      SET pago_confirmado = $1 
      WHERE id = $2 
      RETURNING *
    `, [pago_confirmado, req.params.id]);

    if (!inscripcion) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }

    res.json({ 
      mensaje: pago_confirmado ? 'Pago confirmado' : 'Pago marcado como pendiente',
      inscripcion 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado de pago' });
  }
});

module.exports = router;
