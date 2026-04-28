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

    // Canchas de ejemplo
    const { rows: canchas } = await client.query(`
      INSERT INTO canchas (nombre, direccion, ciudad, provincia, telefono, cantidad_canchas, techadas, iluminacion, vestuarios, estacionamiento, descripcion, activa)
      VALUES
        ('Club Luján', 'Av. Libertador 1234', 'Luján', 'Buenos Aires', '02323-123456', 4, true, true, true, true, 'Complejo deportivo con 4 canchas de pádel techadas, iluminación LED, vestuarios completos y amplio estacionamiento.', true),
        ('Padel Center', 'San Martín 567', 'Mercedes', 'Buenos Aires', '02324-234567', 6, false, true, true, true, 'Centro de pádel con 6 canchas al aire libre, todas con iluminación nocturna.', true),
        ('Sport Club', 'Belgrano 890', 'Chivilcoy', 'Buenos Aires', '02346-345678', 3, true, true, false, true, 'Club deportivo con 3 canchas techadas y estacionamiento privado.', true),
        ('Padel Arena', 'Mitre 321', 'Bragado', 'Buenos Aires', '02342-456789', 2, false, false, false, false, 'Canchas al aire libre, ideal para torneos diurnos.', true)
      RETURNING id, nombre
    `);

    // Torneos de ejemplo vinculados a canchas
    await client.query(`
      INSERT INTO torneos (nombre, descripcion, tipo, categoria, fecha_inicio, fecha_fin, lugar, cancha_id, max_parejas, precio_pareja, estado, organizador_id)
      VALUES
        ('Nebula Open', 'El torneo mixto más esperado del año', 'mixto', '4ta', '2025-02-14', '2025-02-16', 'Club Luján', $2, 32, 5000, 'publicado', $1),
        ('Supernova Master', 'Torneo masculino de alta competencia', 'masculino', '3ra', '2025-02-21', '2025-02-23', 'Padel Center', $3, 24, 6000, 'publicado', $1),
        ('Cosmos Cup', 'Torneo exclusivo femenino', 'femenino', '5ta', '2025-03-07', '2025-03-09', 'Sport Club', $4, 16, 4000, 'publicado', $1),
        ('Galaxia Cup', 'Gran torneo masculino de categoría', 'masculino', '2da', '2025-03-28', '2025-04-01', 'Club Luján', $2, 32, 8000, 'publicado', $1)
      ON CONFLICT DO NOTHING
    `, [admin.id, canchas[0].id, canchas[1].id, canchas[2].id]);

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
