# 📋 Sistema de Aprobación de Highlights

## 🎯 Descripción

Se ha implementado un sistema de aprobación para los highlights donde:
- **Usuarios normales:** Sus highlights quedan pendientes de aprobación
- **Administradores:** Pueden subir highlights que se publican automáticamente
- **Administradores:** Pueden aprobar o rechazar highlights pendientes

---

## 🗄️ Cambios en la Base de Datos

### Nuevas Columnas en `highlights`

```sql
estado_aprobacion  VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
                   CHECK (estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado'))
aprobado_por       UUID REFERENCES users(id) ON DELETE SET NULL
fecha_aprobacion   TIMESTAMPTZ
motivo_rechazo     TEXT
```

### Estados Posibles

1. **`pendiente`** - Highlight subido por usuario, esperando aprobación
2. **`aprobado`** - Highlight aprobado por admin, visible para todos
3. **`rechazado`** - Highlight rechazado por admin, no visible

---

## 🔄 Flujo de Trabajo

### Para Usuarios Normales

1. **Subir Highlight**
   - Usuario completa el formulario
   - Sistema guarda con `estado_aprobacion = 'pendiente'`
   - Mensaje: "Highlight enviado. Será visible una vez que un administrador lo apruebe"

2. **Ver Estado**
   - En "Mi Historial" pueden ver:
     - ✓ Highlights aprobados (con vistas)
     - ⏳ Highlights pendientes
     - ✗ Highlights rechazados (con motivo)

### Para Administradores

1. **Subir Highlight**
   - Admin completa el formulario
   - Sistema guarda con `estado_aprobacion = 'aprobado'`
   - Se publica automáticamente
   - Mensaje: "Highlight publicado correctamente"

2. **Ver Pendientes**
   - En la página "Highlights" aparece sección especial
   - "⏳ Highlights Pendientes de Aprobación"
   - Lista todos los highlights con estado pendiente

3. **Aprobar Highlight**
   - Click en botón "✓ Aprobar"
   - Confirmación
   - Se actualiza:
     - `estado_aprobacion = 'aprobado'`
     - `aprobado_por = admin_id`
     - `fecha_aprobacion = NOW()`
     - `visible = true`

4. **Rechazar Highlight**
   - Click en botón "✗ Rechazar"
   - Ingresar motivo (opcional)
   - Se actualiza:
     - `estado_aprobacion = 'rechazado'`
     - `aprobado_por = admin_id`
     - `fecha_aprobacion = NOW()`
     - `motivo_rechazo = motivo`
     - `visible = false`

5. **Vista Previa**
   - Click en botón "👁️"
   - Abre modal con el video
   - Permite revisar antes de aprobar/rechazar

---

## 🔌 API Endpoints

### Nuevos Endpoints

#### `GET /api/highlights/pendientes`
- **Auth:** Admin requerido
- **Descripción:** Lista highlights pendientes de aprobación
- **Response:**
```json
[
  {
    "id": "uuid",
    "titulo": "Video increíble",
    "jugador_nombre": "Juan Pérez",
    "jugador_email": "juan@email.com",
    "torneo_nombre": "Torneo X",
    "video_url": "https://...",
    "created_at": "2026-04-28T...",
    "estado_aprobacion": "pendiente"
  }
]
```

#### `POST /api/highlights/:id/aprobar`
- **Auth:** Admin requerido
- **Descripción:** Aprueba un highlight pendiente
- **Response:**
```json
{
  "mensaje": "Highlight aprobado correctamente",
  "highlight": { ... }
}
```

#### `POST /api/highlights/:id/rechazar`
- **Auth:** Admin requerido
- **Body:** `{ "motivo": "Contenido inapropiado" }`
- **Descripción:** Rechaza un highlight
- **Response:**
```json
{
  "mensaje": "Highlight rechazado",
  "highlight": { ... }
}
```

### Endpoints Modificados

#### `GET /api/highlights`
- **Cambio:** Ahora filtra solo highlights con `estado_aprobacion = 'aprobado'`
- **Público:** Sí

#### `GET /api/highlights/mis-highlights`
- **Cambio:** Incluye información de aprobación
- **Response adicional:**
```json
{
  "estado_aprobacion": "pendiente|aprobado|rechazado",
  "aprobador_nombre": "Admin Name",
  "fecha_aprobacion": "2026-04-28T...",
  "motivo_rechazo": "..."
}
```

#### `POST /api/highlights`
- **Cambio:** Detecta rol del usuario
- **Lógica:**
  - Si `rol === 'admin'` → `estado_aprobacion = 'aprobado'`
  - Si `rol !== 'admin'` → `estado_aprobacion = 'pendiente'`
- **Response:**
```json
{
  "highlight": { ... },
  "mensaje": "Highlight publicado correctamente" // o "Highlight enviado. Será visible..."
}
```

---

## 🎨 Interfaz de Usuario

### Página Highlights (Admin)

```
┌─────────────────────────────────────────┐
│ ⏳ Highlights Pendientes de Aprobación  │
├─────────────────────────────────────────┤
│ [Card con video]                        │
│ Título: "Video increíble"               │
│ Usuario: Juan Pérez (juan@email.com)    │
│ Fecha: 28/04/2026                       │
│ [✓ Aprobar] [✗ Rechazar] [👁️ Ver]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Highlights de la Comunidad              │
│ (Solo highlights aprobados)             │
└─────────────────────────────────────────┘
```

### Mi Historial (Usuario)

```
┌─────────────────────────────────────────┐
│ Mis Highlights                          │
├─────────────────────────────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐           │
│ │  3   │  │  1   │  │  0   │           │
│ │✓ Apro│  │⏳ Pend│  │✗ Rech│           │
│ └──────┘  └──────┘  └──────┘           │
├─────────────────────────────────────────┤
│ ✓ Video 1 - Aprobado                    │
│   Torneo X · 100 vistas                 │
├─────────────────────────────────────────┤
│ ⏳ Video 2 - Pendiente                  │
│   Torneo Y · En revisión                │
├─────────────────────────────────────────┤
│ ✗ Video 3 - Rechazado                   │
│   Motivo: Contenido inapropiado         │
└─────────────────────────────────────────┘
```

---

## 🎨 Estilos Visuales

### Colores por Estado

- **Aprobado:** Verde (`--comet-cyan: #06d6a0`)
- **Pendiente:** Amarillo (`#ffc107`)
- **Rechazado:** Rosa (`--nova-pink: #ff6b9d`)

### Badges

```css
.badge-aprobado  /* Verde con borde */
.badge-pendiente /* Amarillo con borde */
.badge-rechazado /* Rosa con borde */
```

### Cards Pendientes

Los highlights pendientes tienen:
- Borde amarillo más grueso
- Fondo amarillo translúcido
- Botones de acción visibles

---

## 🔒 Seguridad

### Validaciones Backend

1. **Solo admins pueden:**
   - Ver highlights pendientes
   - Aprobar highlights
   - Rechazar highlights

2. **Verificaciones:**
   - `if (req.user.rol !== 'admin')` → 403 Forbidden
   - Estado actual antes de cambiar
   - No se puede aprobar un highlight ya aprobado
   - No se puede rechazar un highlight ya rechazado

### Validaciones Frontend

1. **Visibilidad condicional:**
   - Sección de pendientes solo visible para admins
   - Botones de aprobación solo para admins

2. **Confirmaciones:**
   - Aprobar: `confirm()` antes de ejecutar
   - Rechazar: `prompt()` para motivo

---

## 📊 Casos de Uso

### Caso 1: Usuario Sube Video

```
Usuario → Formulario → Submit
  ↓
Backend verifica rol = 'jugador'
  ↓
INSERT con estado_aprobacion = 'pendiente'
  ↓
Response: "Será visible una vez que un administrador lo apruebe"
  ↓
Usuario ve en "Mi Historial": ⏳ Pendiente
```

### Caso 2: Admin Sube Video

```
Admin → Formulario → Submit
  ↓
Backend verifica rol = 'admin'
  ↓
INSERT con estado_aprobacion = 'aprobado'
  ↓
Response: "Highlight publicado correctamente"
  ↓
Video visible inmediatamente en Highlights
```

### Caso 3: Admin Aprueba Video

```
Admin → Highlights → Ve pendientes
  ↓
Click "👁️ Ver" → Revisa video
  ↓
Click "✓ Aprobar" → Confirma
  ↓
UPDATE estado_aprobacion = 'aprobado'
  ↓
Video ahora visible para todos
  ↓
Usuario ve en "Mi Historial": ✓ Aprobado
```

### Caso 4: Admin Rechaza Video

```
Admin → Highlights → Ve pendientes
  ↓
Click "✗ Rechazar" → Ingresa motivo
  ↓
UPDATE estado_aprobacion = 'rechazado'
  ↓
Video NO visible para nadie
  ↓
Usuario ve en "Mi Historial": ✗ Rechazado
  Motivo: "Contenido inapropiado"
```

---

## 🧪 Pruebas

### Como Usuario Normal

1. Login con: `martin@ejemplo.com` / `galacticos123`
2. Ir a "Highlights"
3. Subir un highlight
4. Verificar mensaje: "Será visible una vez que..."
5. Ir a "Mi Historial"
6. Verificar que aparece como "⏳ Pendiente"
7. Verificar que NO aparece en la lista pública

### Como Admin

1. Login con: `admin@torneosgalacticos.com` / `galacticos123`
2. Ir a "Highlights"
3. Verificar sección "⏳ Highlights Pendientes"
4. Ver highlight pendiente
5. Aprobar o rechazar
6. Verificar que desaparece de pendientes
7. Si aprobado: aparece en lista pública
8. Subir un highlight propio
9. Verificar que se publica automáticamente

---

## 📝 Notas Técnicas

### Migración Automática

La migración se ejecuta automáticamente con:
```bash
node scripts/migrate.js
```

Las columnas se agregan con `IF NOT EXISTS`, por lo que es seguro ejecutar múltiples veces.

### Valores por Defecto

- `estado_aprobacion`: `'pendiente'` por defecto
- `visible`: `true` por defecto (se controla con estado_aprobacion)
- `aprobado_por`: `NULL` hasta que se apruebe/rechace
- `fecha_aprobacion`: `NULL` hasta que se apruebe/rechace

### Índices

No se agregaron índices adicionales, pero se podría considerar:
```sql
CREATE INDEX idx_highlights_estado ON highlights(estado_aprobacion);
```

---

## ✅ Checklist de Implementación

- [x] Migración de base de datos
- [x] Backend: Lógica de aprobación automática para admins
- [x] Backend: Endpoint GET /api/highlights/pendientes
- [x] Backend: Endpoint POST /api/highlights/:id/aprobar
- [x] Backend: Endpoint POST /api/highlights/:id/rechazar
- [x] Backend: Filtro en GET /api/highlights (solo aprobados)
- [x] Backend: Información de aprobación en mis-highlights
- [x] Frontend: API client actualizado
- [x] Frontend: Sección de pendientes (solo admin)
- [x] Frontend: Funciones aprobar/rechazar
- [x] Frontend: Estado en "Mi Historial"
- [x] Frontend: Mensaje diferenciado al subir
- [x] CSS: Estilos para estados
- [x] CSS: Badges de aprobación
- [x] CSS: Cards pendientes destacados

---

## 🚀 Estado

**IMPLEMENTADO Y LISTO PARA USAR** ✅

El sistema está completamente funcional y probado.
