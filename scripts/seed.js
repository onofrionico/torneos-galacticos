require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Sembrando datos de ejemplo...');
    await client.query('BEGIN');

    // Usuario admin / organizador
    const hash = await bcrypt.hash('galacticos123', 12);
    const { rows: [admin] } = await client.query(`
      INSERT INTO users (nombre, apellido, email, password_hash, rol, categoria, ranking_pts)
      VALUES ('Admin', 'Galáctico', 'admin@torneosgalacticos.com', $1, 'admin', '1ra', 1000)
      ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, [hash]);

    const { rows: [j1] } = await client.query(`
      INSERT INTO users (nombre, apellido, email, password_hash, rol, categoria, ranking_pts)
      VALUES ('Martín', 'García', 'martin@ejemplo.com', $1, 'jugador', '4ta', 342)
      ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, [hash]);

    const { rows: [j2] } = await client.query(`
      INSERT INTO users (nombre, apellido, email, password_hash, rol, categoria, ranking_pts)
      VALUES ('Lucas', 'Pérez', 'lucas@ejemplo.com', $1, 'jugador', '4ta', 290)
      ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, [hash]);

    // Torneos de ejemplo
    await client.query(`
      INSERT INTO torneos (nombre, descripcion, tipo, categoria, fecha_inicio, fecha_fin, lugar, max_parejas, precio_pareja, estado, organizador_id)
      VALUES
        ('Nebula Open', 'El torneo mixto más esperado del año', 'mixto', '4ta', '2025-02-14', '2025-02-16', 'Club Luján', 32, 5000, 'publicado', $1),
        ('Supernova Master', 'Torneo masculino de alta competencia', 'masculino', '3ra', '2025-02-21', '2025-02-23', 'Club Luján', 24, 6000, 'publicado', $1),
        ('Cosmos Cup', 'Torneo exclusivo femenino', 'femenino', '5ta', '2025-03-07', '2025-03-09', 'Club Luján', 16, 4000, 'publicado', $1),
        ('Galaxia Cup', 'Gran torneo masculino de categoría', 'masculino', '2da', '2025-03-28', '2025-04-01', 'Club Luján', 32, 8000, 'publicado', $1)
      ON CONFLICT DO NOTHING
    `, [admin.id]);

    await client.query('COMMIT');
    console.log('✅ Seed completado.');
    console.log('   admin@torneosgalacticos.com / galacticos123');
    console.log('   martin@ejemplo.com / galacticos123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
