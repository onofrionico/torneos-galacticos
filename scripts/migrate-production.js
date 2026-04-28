// Script de migración para producción
// Aplica todas las actualizaciones necesarias a una base de datos existente
require('dotenv').config();
const { query } = require('../src/db');

async function migrateProduction() {
  console.log('🚀 Iniciando migración de producción...\n');

  try {
    // 1. Crear tabla canchas si no existe
    console.log('1️⃣ Creando tabla canchas...');
    await query(`
      CREATE TABLE IF NOT EXISTS canchas (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre          VARCHAR(200) NOT NULL,
        direccion       VARCHAR(300) NOT NULL,
        ciudad          VARCHAR(100),
        provincia       VARCHAR(100),
        telefono        VARCHAR(30),
        email           VARCHAR(255),
        cantidad_canchas INTEGER NOT NULL DEFAULT 1,
        techadas        BOOLEAN NOT NULL DEFAULT false,
        iluminacion     BOOLEAN NOT NULL DEFAULT false,
        vestuarios      BOOLEAN NOT NULL DEFAULT false,
        estacionamiento BOOLEAN NOT NULL DEFAULT false,
        descripcion     TEXT,
        imagen_url      TEXT,
        activa          BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla canchas creada\n');

    // 2. Agregar columna activo a users si no existe
    console.log('2️⃣ Agregando columna activo a users...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true
    `);
    console.log('✅ Columna activo agregada\n');

    // 3. Agregar columna pago_confirmado a inscripciones si no existe
    console.log('3️⃣ Agregando columna pago_confirmado a inscripciones...');
    await query(`
      ALTER TABLE inscripciones 
      ADD COLUMN IF NOT EXISTS pago_confirmado BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Columna pago_confirmado agregada\n');

    // 4. Agregar columnas de aprobación a highlights si no existen
    console.log('4️⃣ Agregando columnas de aprobación a highlights...');
    await query(`
      ALTER TABLE highlights 
      ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado'))
    `);
    await query(`
      ALTER TABLE highlights 
      ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES users(id) ON DELETE SET NULL
    `);
    await query(`
      ALTER TABLE highlights 
      ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ
    `);
    await query(`
      ALTER TABLE highlights 
      ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT
    `);
    console.log('✅ Columnas de aprobación agregadas\n');

    // 5. Marcar highlights existentes como aprobados
    console.log('5️⃣ Actualizando highlights existentes...');
    const { rowCount } = await query(`
      UPDATE highlights 
      SET estado_aprobacion = 'aprobado',
          fecha_aprobacion = created_at
      WHERE estado_aprobacion = 'pendiente'
    `);
    console.log(`✅ ${rowCount} highlights actualizados a estado aprobado\n`);

    // 6. Actualizar constraint de categorías
    console.log('6️⃣ Actualizando constraint de categorías...');
    await query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_categoria_check
    `);
    await query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_categoria_check 
      CHECK (categoria IN ('1ra','2da','3ra','4ta','5ta','6ta','7ma','8va','9na'))
    `);
    console.log('✅ Constraint de categorías actualizado\n');

    // 7. Verificar que todo está correcto
    console.log('7️⃣ Verificando migraciones...');
    
    // Verificar tabla canchas
    const { rows: canchas } = await query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'canchas'
    `);
    console.log(`   Tabla canchas: ${canchas[0].count > 0 ? '✅' : '❌'}`);

    // Verificar columna activo
    const { rows: activo } = await query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'activo'
    `);
    console.log(`   Columna users.activo: ${activo[0].count > 0 ? '✅' : '❌'}`);

    // Verificar columna pago_confirmado
    const { rows: pago } = await query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'inscripciones' AND column_name = 'pago_confirmado'
    `);
    console.log(`   Columna inscripciones.pago_confirmado: ${pago[0].count > 0 ? '✅' : '❌'}`);

    // Verificar columnas de aprobación
    const { rows: aprobacion } = await query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'highlights' AND column_name = 'estado_aprobacion'
    `);
    console.log(`   Columnas highlights.estado_aprobacion: ${aprobacion[0].count > 0 ? '✅' : '❌'}`);

    console.log('\n✅ ¡Migración de producción completada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log('   - Tabla canchas creada');
    console.log('   - Columna activo agregada a users');
    console.log('   - Columna pago_confirmado agregada a inscripciones');
    console.log('   - Columnas de aprobación agregadas a highlights');
    console.log('   - Highlights existentes marcados como aprobados');
    console.log('   - Constraint de categorías actualizado (1ra-9na)');
    
  } catch (err) {
    console.error('\n❌ Error durante la migración:', err.message);
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
}

migrateProduction();
