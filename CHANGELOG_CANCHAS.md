# Changelog - Funcionalidad de Canchas

## Fecha: 2026-04-28

### ✨ Nueva Funcionalidad: Gestión de Canchas

Se implementó un sistema completo para gestionar canchas de pádel donde se realizan los torneos.

### 📝 Cambios Realizados

#### 1. Base de Datos

**Archivo:** `scripts/migrate.js`

- ✅ Nueva tabla `canchas` con los siguientes campos:
  - Información básica: nombre, dirección, ciudad, provincia
  - Contacto: teléfono, email
  - Características: cantidad_canchas, techadas, iluminacion, vestuarios, estacionamiento
  - Metadata: descripción, imagen_url, activa
  - Timestamps: created_at, updated_at

- ✅ Modificación tabla `torneos`:
  - Nuevo campo `cancha_id` (UUID, nullable) con foreign key a `canchas`
  - Permite vincular torneos con canchas específicas

- ✅ Índices agregados:
  - `idx_torneos_cancha` en `torneos(cancha_id)`
  - `idx_canchas_activa` en `canchas(activa)`

- ✅ Trigger `trg_canchas_updated_at` para actualizar automáticamente `updated_at`

#### 2. API Backend

**Archivo nuevo:** `src/routes/canchas.js`

Endpoints implementados:

- `GET /api/canchas` - Listar canchas con filtros (activa, ciudad, provincia)
  - Incluye contador de torneos activos por cancha
  - Paginación configurable

- `GET /api/canchas/:id` - Detalle de cancha
  - Incluye lista completa de torneos asociados

- `POST /api/canchas` - Crear cancha (organizador/admin)
  - Validación de campos obligatorios

- `PUT /api/canchas/:id` - Editar cancha (organizador/admin)
  - Actualización parcial de campos

- `DELETE /api/canchas/:id` - Eliminar cancha (admin)
  - Protección: no permite eliminar si tiene torneos asociados

- `POST /api/canchas/:id/imagen` - Subir imagen (organizador/admin)
  - Almacenamiento en `/uploads/canchas/`

**Archivo modificado:** `src/index.js`

- ✅ Registrada ruta `/api/canchas`

#### 3. Integración con Torneos

**Archivo modificado:** `src/routes/torneos.js`

- ✅ `GET /api/torneos` - Ahora incluye información básica de la cancha
  - Campos: id, nombre, dirección, ciudad, provincia

- ✅ `GET /api/torneos/:id` - Incluye objeto completo de la cancha
  - Todos los detalles de la cancha asociada

- ✅ `POST /api/torneos` - Acepta campo `cancha_id`
  - Permite asignar cancha al crear torneo

- ✅ `PUT /api/torneos/:id` - Permite actualizar `cancha_id`
  - Cambiar o asignar cancha a torneo existente

#### 4. Datos de Ejemplo

**Archivo modificado:** `scripts/seed.js`

- ✅ 4 canchas de ejemplo:
  - Club Luján (4 canchas techadas, completo)
  - Padel Center (6 canchas al aire libre)
  - Sport Club (3 canchas techadas)
  - Padel Arena (2 canchas básicas)

- ✅ Torneos vinculados a canchas específicas

#### 5. Documentación

**Archivos modificados/creados:**

- ✅ `README.md` - Actualizado con:
  - Ruta `/api/canchas` en estructura del proyecto
  - Tabla completa de endpoints de canchas
  - Actualización de endpoints de torneos

- ✅ `CANCHAS.md` - Documentación completa:
  - Modelo de datos detallado
  - Ejemplos de uso de la API
  - Casos de uso comunes
  - Integración con torneos

### 🔄 Migración

Para aplicar los cambios en una base de datos existente:

```bash
npm run db:migrate
```

Para cargar datos de ejemplo:

```bash
npm run db:seed
```

### 📊 Estructura de Respuestas

#### Listado de Canchas
```json
{
  "canchas": [...],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

#### Detalle de Cancha
```json
{
  "id": "uuid",
  "nombre": "Club Luján",
  "direccion": "...",
  "torneos": [...]
}
```

#### Torneo con Cancha
```json
{
  "id": "uuid",
  "nombre": "Nebula Open",
  "cancha": {
    "id": "uuid",
    "nombre": "Club Luján",
    "direccion": "...",
    ...
  }
}
```

### 🔐 Permisos

- **Público**: Ver canchas y sus detalles
- **Organizador/Admin**: Crear y editar canchas
- **Admin**: Eliminar canchas (con restricciones)

### ⚠️ Notas Importantes

1. La relación torneo-cancha es **opcional** (nullable)
2. No se puede eliminar una cancha con torneos asociados
3. Las imágenes se guardan en `/public/uploads/canchas/`
4. El campo `activa` permite desactivar sin eliminar
5. Todos los triggers y constraints están implementados

### 🎯 Próximos Pasos Sugeridos

Para el frontend, considerar implementar:

1. Vista de listado de canchas con filtros
2. Página de detalle de cancha con mapa
3. Selector de cancha al crear/editar torneos
4. Badges visuales para características (techadas, iluminación, etc.)
5. Galería de imágenes de canchas
