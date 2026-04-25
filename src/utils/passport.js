const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('../db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// Solo configurar Google OAuth si las credenciales están presentes
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscar usuario existente por google_id
      let { rows } = await query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      
      if (rows.length > 0) {
        // Usuario existente con Google
        return done(null, rows[0]);
      }

      // Buscar por email (para vincular cuenta existente)
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        const { rows: emailRows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        
        if (emailRows.length > 0) {
          // Vincular cuenta existente con Google
          const { rows: [updatedUser] } = await query(
            'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3 RETURNING *',
            [profile.id, profile.photos && profile.photos[0] ? profile.photos[0].value : null, emailRows[0].id]
          );
          return done(null, updatedUser);
        }
      }

      // Crear nuevo usuario
      if (!email) {
        return done(new Error('No se pudo obtener el email de Google'), null);
      }

      const nombre = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'Usuario';
      const apellido = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'Google';
      const avatar_url = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      const { rows: [newUser] } = await query(`
        INSERT INTO users (nombre, apellido, email, google_id, avatar_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [nombre, apellido, email.toLowerCase(), profile.id, avatar_url]);

      done(null, newUser);
    } catch (err) {
      console.error('Error en autenticación con Google:', err);
      done(err, null);
    }
  }
  ));
} else {
  console.log('⚠️  Google OAuth no configurado. Agregá GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET al .env para habilitarlo.');
}

module.exports = passport;
