const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const passport = require('../utils/passport');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, apellido, email, password, telefono, categoria = '5ta', lado_preferencia = 'ambos' } = req.body;

  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ error: 'Nombre, apellido, email y contraseña son requeridos' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const { rows: [user] } = await query(`
      INSERT INTO users (nombre, apellido, email, password_hash, telefono, categoria, lado_preferencia)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nombre, apellido, email, rol, categoria, lado_preferencia, ranking_pts, created_at
    `, [nombre.trim(), apellido.trim(), email.toLowerCase(), password_hash, telefono, categoria, lado_preferencia]);

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = rows[0];
    
    // Si el usuario no tiene password_hash, significa que usa Google OAuth
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Esta cuenta usa Google. Por favor ingresá con Google.' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, nombre, apellido, email, telefono, rol, categoria, lado_preferencia, ranking_pts, avatar_url, created_at
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/me - actualizar perfil
router.put('/me', authenticate, async (req, res) => {
  const { nombre, apellido, telefono, lado_preferencia } = req.body;
  try {
    const { rows: [user] } = await query(`
      UPDATE users SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
        telefono = COALESCE($3, telefono), lado_preferencia = COALESCE($4, lado_preferencia)
      WHERE id = $5
      RETURNING id, nombre, apellido, email, telefono, rol, categoria, lado_preferencia, ranking_pts, avatar_url
    `, [nombre, apellido, telefono, lado_preferencia, req.user.id]);

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/buscar-por-email?email=xxx - buscar usuario por email (autenticado)
router.get('/buscar-por-email', authenticate, async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    const { rows } = await query(`
      SELECT id, nombre, apellido, email, categoria
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    if (rows.length === 0) {
      return res.json({ encontrado: false });
    }

    res.json({ encontrado: true, usuario: rows[0] });
  } catch (err) {
    console.error('Error buscando usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/google - Iniciar autenticación con Google (solo si está configurado)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      session: false
    })
  );

  // GET /api/auth/google/callback - Callback de Google
  router.get('/google/callback',
    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/?error=google_auth_failed'
    }),
    (req, res) => {
      try {
        // Generar JWT para el usuario autenticado
        const token = jwt.sign(
          { id: req.user.id, email: req.user.email, rol: req.user.rol },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Redirigir al frontend con el token
        res.redirect(`/?token=${token}`);
      } catch (err) {
        console.error('Error generando token:', err);
        res.redirect('/?error=token_generation_failed');
      }
    }
  );
} else {
  // Rutas de fallback si Google OAuth no está configurado
  router.get('/google', (req, res) => {
    res.status(503).json({ error: 'Google OAuth no está configurado en este servidor' });
  });
  
  router.get('/google/callback', (req, res) => {
    res.redirect('/?error=google_oauth_not_configured');
  });
}

module.exports = router;
