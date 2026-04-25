require('dotenv').config();
const { pool } = require('../src/db');
const readline = require('readline');

/**
 * Script para RESETEAR COMPLETAMENTE la base de datos
 * ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos
 * Úsalo solo cuando quieras empezar de cero con usuarios reales
 */

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('\n⚠️  ═══════════════════════════════════════════════════════════');
    console.log('⚠️  ADVERTENCIA: RESETEO COMPLETO DE BASE DE DATOS');
    console.log('⚠️  ═══════════════════════════════════════════════════════════\n');
    console.log('   Este script eliminará TODOS los datos de la base de datos:');
    console.log('   - Todos los usuarios');
    console.log('   - Todos los torneos');
    console.log('   - Todas las inscripciones');
    console.log('   - Todos los partidos');
    console.log('   - Todos los highlights');
    console.log('   - Todo el historial de ranking\n');
    console.log('   Esta acción es IRREVERSIBLE.\n');

    // Pedir confirmación
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('   Para confirmar, escribe "RESETEAR TODO": ', resolve);
    });
    rl.close();

    if (answer.trim() !== 'RESETEAR TODO') {
      console.log('\n✅ Operación cancelada. No se eliminó ningún dato.\n');
      return;
    }

    console.log('\n🗑️  Eliminando todos los datos...\n');
    await client.query('BEGIN');

    // Eliminar en orden inverso de dependencias
    const tables = [
      'partidos',
      'inscripciones',
      'highlights',
      'ranking_historial',
      'torneos',
      'users'
    ];

    for (const table of tables) {
      const { rowCount } = await client.query(`DELETE FROM ${table}`);
      console.log(`   ✓ ${table}: ${rowCount} registros eliminados`);
    }

    await client.query('COMMIT');
    
    console.log('\n✅ ¡Base de datos reseteada completamente!');
    console.log('   Ahora puedes empezar con datos reales de usuarios.\n');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error durante el reseteo:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
