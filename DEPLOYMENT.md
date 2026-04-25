# 🚀 Guía de Deployment - Torneos Galácticos

## 📋 Workflow para MVP

### 1️⃣ Deploy Inicial en Producción

```bash
# Ejecutar migraciones
npm run db:migrate

# Poblar con datos de ejemplo para demostrar funcionalidades
npm run db:seed
```

**Credenciales de acceso:**
- Email: `admin@torneosgalacticos.com`
- Password: `galacticos123`

### 2️⃣ Demostrar el MVP

Usa la aplicación con los datos de ejemplo para:
- ✅ Mostrar todas las funcionalidades
- ✅ Hacer demos a usuarios potenciales
- ✅ Validar el producto

**Datos incluidos en el seed:**
- 1 usuario admin
- 2 jugadores de ejemplo
- 4 torneos de diferentes tipos
- Datos de ejemplo básicos

### 3️⃣ Cuando Lleguen Usuarios Reales

Cuando estés listo para empezar con usuarios reales:

```bash
# ⚠️ RESETEAR TODA LA BASE DE DATOS
npm run db:reset
```

Este comando:
1. Te pedirá confirmación (debes escribir "RESETEAR TODO")
2. Eliminará **TODOS** los datos
3. Dejará la base de datos limpia para empezar de cero

Después del reset, los usuarios reales pueden registrarse y usar la aplicación normalmente.

## 🔄 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run db:migrate` | Crea/actualiza el schema de la base de datos |
| `npm run db:seed` | Pobla la BD con datos de ejemplo |
| `npm run db:reset` | **ELIMINA TODOS LOS DATOS** (requiere confirmación) |

## ⚠️ Advertencias Importantes

1. **`db:reset` es irreversible**: Una vez ejecutado, no puedes recuperar los datos
2. **Solo para MVP**: Esta estrategia es ideal para la fase inicial
3. **Backup antes de reset**: Si tienes datos importantes, haz backup antes

## 💡 Estrategia Simple

Esta es la forma más pragmática para un MVP:

1. ✅ **Simple**: No complica el schema con campos temporales
2. ✅ **Directa**: Seed normal → Usar → Reset cuando sea necesario
3. ✅ **Limpia**: Empiezas de cero cuando lleguen usuarios reales

## 🎯 Próximos Pasos

Una vez que tengas usuarios reales y la app esté en uso:

- No uses más `db:reset` (perderías datos reales)
- Implementa backups regulares
- Considera migraciones incrementales para cambios de schema
- Usa `db:seed` solo en desarrollo/staging

## 📞 Soporte

Si necesitas ayuda durante el deployment, revisa:
- `.env.example` para las variables de entorno necesarias
- `render.yaml` para la configuración de Render
- `scripts/migrate.js` para ver el schema completo
