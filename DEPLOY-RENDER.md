# 🚀 Migración de Base de Datos en Render

## 🐛 Problema

La base de datos en Render no tiene las nuevas tablas y columnas:
- ❌ Tabla `canchas` no existe
- ❌ Columna `estado_aprobacion` en `highlights` no existe
- ❌ Columna `activo` en `users` no existe
- ❌ Columna `pago_confirmado` en `inscripciones` no existe

## ✅ Solución

Ejecutar el script de migración en producción.

---

## 📋 Opción 1: Desde Render Shell

### 1. Acceder a Render Dashboard
- Ve a https://dashboard.render.com
- Selecciona tu servicio "torneos-galacticos"

### 2. Abrir Shell
- Click en "Shell" en el menú lateral
- Se abrirá una terminal en el servidor

### 3. Ejecutar Migración
```bash
node scripts/migrate-production.js
```

### 4. Verificar Output
Deberías ver:
```
🚀 Iniciando migración de producción...

1️⃣ Creando tabla canchas...
✅ Tabla canchas creada

2️⃣ Agregando columna activo a users...
✅ Columna activo agregada

3️⃣ Agregando columna pago_confirmado a inscripciones...
✅ Columna pago_confirmado agregada

4️⃣ Agregando columnas de aprobación a highlights...
✅ Columnas de aprobación agregadas

5️⃣ Actualizando highlights existentes...
✅ X highlights actualizados a estado aprobado

6️⃣ Actualizando constraint de categorías...
✅ Constraint de categorías actualizado

7️⃣ Verificando migraciones...
   Tabla canchas: ✅
   Columna users.activo: ✅
   Columna inscripciones.pago_confirmado: ✅
   Columnas highlights.estado_aprobacion: ✅

✅ ¡Migración de producción completada exitosamente!
```

### 5. Reiniciar Servicio
- En el dashboard, click en "Manual Deploy" → "Clear build cache & deploy"
- O espera a que se reinicie automáticamente

---

## 📋 Opción 2: Desde Local (Conectando a DB de Render)

### 1. Obtener URL de Conexión
En Render Dashboard:
- Ve a tu PostgreSQL database
- Copia la "External Database URL"

### 2. Crear .env.production Local
```bash
# .env.production
DATABASE_URL=postgresql://usuario:password@host:puerto/database
```

### 3. Ejecutar Migración
```bash
# Usar el .env de producción
node -r dotenv/config scripts/migrate-production.js dotenv_config_path=.env.production
```

---

## 📋 Opción 3: Subir Script y Ejecutar en Deploy

### 1. Agregar Script al Repositorio
```bash
git add scripts/migrate-production.js
git commit -m "feat: script de migración para producción"
git push origin main
```

### 2. Configurar Build Command en Render
En Render Dashboard → Settings → Build & Deploy:

**Build Command:**
```bash
npm install && node scripts/migrate-production.js
```

**Start Command:**
```bash
node src/index.js
```

### 3. Hacer Deploy
- Click en "Manual Deploy"
- La migración se ejecutará automáticamente antes de iniciar el servidor

---

## ⚠️ IMPORTANTE

### Antes de Ejecutar
- ✅ Hacer backup de la base de datos
- ✅ Verificar que el script está en el repositorio
- ✅ Tener acceso a Render Dashboard

### Durante la Ejecución
- ⏳ No interrumpir el proceso
- ⏳ Esperar a que termine completamente
- ⏳ Verificar que todos los pasos muestran ✅

### Después de Ejecutar
- ✅ Verificar que el servidor inicia sin errores
- ✅ Probar funcionalidades en la app
- ✅ Verificar logs en Render

---

## 🧪 Verificar que Funcionó

### 1. Revisar Logs de Render
Deberías ver:
```
🚀 Torneos Galácticos corriendo en puerto 3000
```

Sin errores de:
- "relation canchas does not exist"
- "column estado_aprobacion does not exist"
- "column activo does not exist"

### 2. Probar en la App
- Ir a https://torneos-galacticos.onrender.com
- Login como admin
- Verificar que el botón "⚙️ Admin" aparece
- Click en Admin → Debería cargar sin errores
- Subir un highlight → Debería funcionar
- Ver torneos → Debería cargar sin errores

---

## 🔄 Si Algo Sale Mal

### Error: "permission denied"
- Verificar que tenés permisos de admin en la DB
- Usar la opción 1 (Render Shell) que tiene permisos correctos

### Error: "database connection failed"
- Verificar que la DATABASE_URL es correcta
- Verificar que la DB está activa en Render

### Error: "script not found"
- Verificar que el script está en el repositorio
- Hacer git pull en el servidor
- Verificar la ruta: `scripts/migrate-production.js`

### La migración se ejecutó pero sigue habiendo errores
- Reiniciar el servicio manualmente
- Verificar logs para ver errores específicos
- Ejecutar el script de verificación

---

## 📝 Notas

### ¿Por qué no usar migrate.js?
`migrate.js` hace DROP TABLE, lo que borraría todos los datos.
`migrate-production.js` solo AGREGA lo que falta, preservando datos existentes.

### ¿Es seguro ejecutar varias veces?
Sí, el script usa `IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS`.
Es idempotente (se puede ejecutar múltiples veces sin problemas).

### ¿Afecta a los usuarios?
Hay un downtime mínimo (segundos) mientras se ejecuta.
Recomendado ejecutar en horario de baja actividad.

---

## ✅ Checklist

- [ ] Backup de base de datos realizado
- [ ] Script `migrate-production.js` en el repositorio
- [ ] Acceso a Render Dashboard verificado
- [ ] Migración ejecutada exitosamente
- [ ] Servicio reiniciado
- [ ] Logs verificados (sin errores)
- [ ] App probada (funciona correctamente)
- [ ] Módulo admin accesible
- [ ] Highlights funcionando
- [ ] Torneos cargando

---

## 🎉 Resultado Esperado

Después de ejecutar la migración:

✅ Tabla `canchas` creada
✅ Columna `activo` en `users`
✅ Columna `pago_confirmado` en `inscripciones`
✅ Columnas de aprobación en `highlights`
✅ Constraint de categorías actualizado
✅ Highlights existentes marcados como aprobados
✅ App funcionando sin errores
✅ Módulo admin operativo

**La app en Render estará completamente actualizada!** 🚀
