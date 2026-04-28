# 🏟️ Gestión de Canchas

## Descripción

El sistema de gestión de canchas permite registrar y administrar los complejos deportivos donde se realizan los torneos de pádel. Cada cancha puede tener múltiples torneos asociados y contiene información detallada sobre sus instalaciones.

## Modelo de Datos

### Tabla `canchas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `nombre` | VARCHAR(200) | Nombre del complejo |
| `direccion` | VARCHAR(300) | Dirección completa |
| `ciudad` | VARCHAR(100) | Ciudad |
| `provincia` | VARCHAR(100) | Provincia |
| `telefono` | VARCHAR(30) | Teléfono de contacto |
| `email` | VARCHAR(255) | Email de contacto |
| `cantidad_canchas` | INTEGER | Número de canchas disponibles |
| `techadas` | BOOLEAN | Si las canchas están techadas |
| `iluminacion` | BOOLEAN | Si tienen iluminación nocturna |
| `vestuarios` | BOOLEAN | Si tienen vestuarios |
| `estacionamiento` | BOOLEAN | Si tienen estacionamiento |
| `descripcion` | TEXT | Descripción detallada |
| `imagen_url` | TEXT | URL de la imagen del complejo |
| `activa` | BOOLEAN | Si la cancha está activa |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |

### Relación con Torneos

Los torneos tienen un campo `cancha_id` (UUID, nullable) que referencia a la tabla `canchas`. Esta relación permite:

- Vincular torneos a canchas específicas
- Ver todos los torneos realizados en una cancha
- Obtener información detallada de la cancha al consultar un torneo

## API Endpoints

### GET `/api/canchas`

Lista todas las canchas con filtros opcionales.

**Query Parameters:**
- `activa` (boolean): Filtrar por estado activo/inactivo
- `ciudad` (string): Filtrar por ciudad (case-insensitive)
- `provincia` (string): Filtrar por provincia (case-insensitive)
- `page` (number): Número de página (default: 1)
- `limit` (number): Resultados por página (default: 20)

**Respuesta:**
```json
{
  "canchas": [
    {
      "id": "uuid",
      "nombre": "Club Luján",
      "direccion": "Av. Libertador 1234",
      "ciudad": "Luján",
      "provincia": "Buenos Aires",
      "telefono": "02323-123456",
      "email": null,
      "cantidad_canchas": 4,
      "techadas": true,
      "iluminacion": true,
      "vestuarios": true,
      "estacionamiento": true,
      "descripcion": "Complejo deportivo con 4 canchas...",
      "imagen_url": "/uploads/canchas/imagen.jpg",
      "activa": true,
      "torneos_activos": 2,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

### GET `/api/canchas/:id`

Obtiene el detalle de una cancha específica con todos sus torneos asociados.

**Respuesta:**
```json
{
  "id": "uuid",
  "nombre": "Club Luján",
  "direccion": "Av. Libertador 1234",
  "ciudad": "Luján",
  "provincia": "Buenos Aires",
  "telefono": "02323-123456",
  "cantidad_canchas": 4,
  "techadas": true,
  "iluminacion": true,
  "vestuarios": true,
  "estacionamiento": true,
  "descripcion": "Complejo deportivo...",
  "imagen_url": "/uploads/canchas/imagen.jpg",
  "activa": true,
  "torneos": [
    {
      "id": "uuid",
      "nombre": "Nebula Open",
      "fecha_inicio": "2025-02-14",
      "fecha_fin": "2025-02-16",
      "estado": "publicado",
      "tipo": "mixto",
      "categoria": "4ta"
    }
  ]
}
```

### POST `/api/canchas`

Crea una nueva cancha. Requiere autenticación con rol `organizador` o `admin`.

**Body:**
```json
{
  "nombre": "Nuevo Club",
  "direccion": "Calle 123",
  "ciudad": "Mercedes",
  "provincia": "Buenos Aires",
  "telefono": "02324-123456",
  "email": "info@nuevoclub.com",
  "cantidad_canchas": 3,
  "techadas": false,
  "iluminacion": true,
  "vestuarios": true,
  "estacionamiento": false,
  "descripcion": "Descripción del complejo",
  "activa": true
}
```

**Campos obligatorios:**
- `nombre`
- `direccion`

### PUT `/api/canchas/:id`

Actualiza una cancha existente. Requiere autenticación con rol `organizador` o `admin`.

**Body:** Cualquier campo del modelo (excepto `id`, `created_at`, `updated_at`)

### DELETE `/api/canchas/:id`

Elimina una cancha. Requiere autenticación con rol `admin`.

**Restricción:** No se puede eliminar una cancha que tenga torneos asociados.

### POST `/api/canchas/:id/imagen`

Sube una imagen para la cancha. Requiere autenticación con rol `organizador` o `admin`.

**Content-Type:** `multipart/form-data`

**Body:**
- `imagen` (file): Archivo de imagen

**Respuesta:**
```json
{
  "imagen_url": "/uploads/canchas/filename.jpg"
}
```

## Integración con Torneos

Al crear o editar un torneo, se puede especificar el campo `cancha_id`:

```json
{
  "nombre": "Torneo de Verano",
  "tipo": "mixto",
  "categoria": "4ta",
  "fecha_inicio": "2025-03-01",
  "fecha_fin": "2025-03-03",
  "cancha_id": "uuid-de-la-cancha",
  ...
}
```

Al consultar un torneo (`GET /api/torneos/:id`), se incluye automáticamente toda la información de la cancha asociada:

```json
{
  "id": "uuid",
  "nombre": "Torneo de Verano",
  "cancha": {
    "id": "uuid",
    "nombre": "Club Luján",
    "direccion": "Av. Libertador 1234",
    "ciudad": "Luján",
    "provincia": "Buenos Aires",
    "telefono": "02323-123456",
    "cantidad_canchas": 4,
    "techadas": true,
    "iluminacion": true,
    ...
  },
  ...
}
```

## Casos de Uso

### 1. Listar canchas disponibles
```bash
GET /api/canchas?activa=true
```

### 2. Buscar canchas en una ciudad
```bash
GET /api/canchas?ciudad=Luján
```

### 3. Ver detalle de una cancha con sus torneos
```bash
GET /api/canchas/uuid-de-la-cancha
```

### 4. Crear un torneo en una cancha específica
```bash
POST /api/torneos
{
  "nombre": "Nuevo Torneo",
  "cancha_id": "uuid-de-la-cancha",
  ...
}
```

### 5. Filtrar canchas con características específicas
En el frontend, puedes filtrar las canchas obtenidas por sus características:
```javascript
const canchasTechadas = canchas.filter(c => c.techadas);
const chanchasConEstacionamiento = canchas.filter(c => c.estacionamiento);
```

## Migraciones

La tabla de canchas se crea automáticamente al ejecutar:
```bash
npm run db:migrate
```

El script de seed (`npm run db:seed`) incluye 4 canchas de ejemplo con diferentes características.

## Notas de Implementación

- Las canchas tienen una relación **opcional** con torneos (un torneo puede no tener cancha asignada)
- La eliminación de una cancha está protegida si tiene torneos asociados
- El campo `activa` permite desactivar canchas sin eliminarlas
- Las imágenes se almacenan en `/public/uploads/canchas/`
- Los índices en `cancha_id` y `activa` optimizan las consultas frecuentes
