require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const passport = require('./utils/passport');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Trust proxy (necesario para Render y otros proxies) ────────────────────
// Esto permite que Express confíe en los headers X-Forwarded-* del proxy
app.set('trust proxy', 1);

// ── Seguridad y CORS ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://www.google.com", "https://*.youtube.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Permite event handlers inline (onclick, etc.)
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://accounts.google.com", "https://*.youtube.com"],
      connectSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://accounts.google.com", "https://*.youtube.com"],
      mediaSrc: ["'self'", "https:", "http:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || true
    : true,
  credentials: true,
}));

// Rate limit global: 200 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá en unos minutos.' },
}));

// Rate limit estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de login. Esperá 15 minutos.' },
});

// ── Parsers ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Archivos estáticos ───────────────────────────────────────────────────────
// Servir uploads (videos, imágenes)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'public', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Servir frontend estático
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, require('./routes/auth'));
app.use('/api/torneos',       require('./routes/torneos'));
app.use('/api/canchas',       require('./routes/canchas'));
app.use('/api/inscripciones', require('./routes/inscripciones'));
app.use('/api/highlights',    require('./routes/highlights'));
app.use('/api/ranking',       require('./routes/ranking'));
app.use('/api/admin',         require('./routes/admin-usuarios'));

// Health check - Render lo usa para detectar que el servicio está vivo
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── SPA fallback: cualquier ruta que no sea /api vuelve al index.html ────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// ── Error handler global ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `El archivo supera el límite permitido` });
  }
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Inicio ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Torneos Galácticos corriendo en puerto ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
