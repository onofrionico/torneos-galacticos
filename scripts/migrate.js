require('dotenv').config();
const { pool } = require('../src/db');

const migrations = `
  -- Extensión para UUIDs
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Usuarios
  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(100) NOT NULL,
    apellido      VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono      VARCHAR(30),
    rol           VARCHAR(20) NOT NULL DEFAULT 'jugador' CHECK (rol IN ('jugador', 'organizador', 'admin')),
    ranking_pts   INTEGER NOT NULL DEFAULT 0,
    categoria     VARCHAR(10) NOT NULL DEFAULT '5ra' CHECK (categoria IN ('1ra','2da','3ra','4ta','5ta')),
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Torneos
  CREATE TABLE IF NOT EXISTS torneos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('masculino','femenino','mixto','senior')),
    categoria       VARCHAR(10) NOT NULL CHECK (categoria IN ('1ra','2da','3ra','4ta','5ta')),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    lugar           VARCHAR(200),
    max_parejas     INTEGER NOT NULL DEFAULT 16,
    precio_pareja   DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado          VARCHAR(20) NOT NULL DEFAULT 'publicado'
                    CHECK (estado IN ('borrador','publicado','en_curso','finalizado','cancelado')),
    organizador_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    imagen_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Inscripciones (parejas)
  CREATE TABLE IF NOT EXISTS inscripciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
    jugador1_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jugador2_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    jugador2_nombre VARCHAR(200),
    estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','confirmada','cancelada')),
    posicion_final  INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (torneo_id, jugador1_id)
  );

  -- Resultados de partidos
  CREATE TABLE IF NOT EXISTS partidos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
    ronda           VARCHAR(50) NOT NULL,
    pareja1_id      UUID REFERENCES inscripciones(id),
    pareja2_id      UUID REFERENCES inscripciones(id),
    set1_p1         INTEGER, set1_p2 INTEGER,
    set2_p1         INTEGER, set2_p2 INTEGER,
    set3_p1         INTEGER, set3_p2 INTEGER,
    ganador_id      UUID REFERENCES inscripciones(id),
    fecha_partido   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Highlights / Videos
  CREATE TABLE IF NOT EXISTS highlights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    video_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    duracion_seg    INTEGER,
    jugador_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    torneo_id       UUID REFERENCES torneos(id) ON DELETE SET NULL,
    vistas          INTEGER NOT NULL DEFAULT 0,
    visible         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Historial de ranking (snapshot mensual)
  CREATE TABLE IF NOT EXISTS ranking_historial (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jugador_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puntos      INTEGER NOT NULL,
    posicion    INTEGER,
    periodo     VARCHAR(7) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (jugador_id, periodo)
  );

  -- Índices para performance
  CREATE INDEX IF NOT EXISTS idx_torneos_estado     ON torneos(estado);
  CREATE INDEX IF NOT EXISTS idx_torneos_fechas     ON torneos(fecha_inicio, fecha_fin);
  CREATE INDEX IF NOT EXISTS idx_inscripciones_torneo ON inscripciones(torneo_id);
  CREATE INDEX IF NOT EXISTS idx_inscripciones_jugador ON inscripciones(jugador1_id);
  CREATE INDEX IF NOT EXISTS idx_highlights_jugador ON highlights(jugador_id);
  CREATE INDEX IF NOT EXISTS idx_highlights_torneo  ON highlights(torneo_id);

  -- Trigger: actualiza updated_at automáticamente
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_users_updated_at   ON users;
  DROP TRIGGER IF EXISTS trg_torneos_updated_at ON torneos;

  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

  CREATE TRIGGER trg_torneos_updated_at
    BEFORE UPDATE ON torneos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Ejecutando migraciones...');
    await client.query(migrations);
    console.log('✅ Migraciones completadas exitosamente.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
