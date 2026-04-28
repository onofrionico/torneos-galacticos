# ⚙️ Módulo de Administración de Usuarios

## 🎯 Descripción

Módulo completo para que los administradores puedan gestionar usuarios del sistema. Permite ver estadísticas, cambiar categorías, habilitar/deshabilitar usuarios y gestionar pagos de inscripciones.

---

## ✨ Funcionalidades

### 📊 Vista General de Usuarios

**Acceso:** Solo administradores

**Información mostrada por usuario:**
- ✅ Nombre completo y email
- ✅ Categoría actual (1ra, 2da, 3ra, 4ta, 5ta, 6ta, 7ma, 8va, 9na)
- ✅ Rol (admin/jugador)
- ✅ Estado (activo/inactivo)
- ✅ Puntos de ranking
- ✅ Total de torneos participados
- ✅ Torneos ganados
- ✅ Pagos pendientes (destacado en rojo si > 0)

### 👁️ Detalle de Usuario

**Información completa:**

1. **Información Personal**
   - Email
   - Teléfono
   - Categoría
   - Rol
   - Puntos de ranking
   - Estado (activo/inactivo)
   - Fecha de registro

2. **Estadísticas**
   - Torneos totales
   - Campeonatos ganados
   - Pagos confirmados
   - Pagos pendientes
   - Highlights aprobados

3. **Inscripciones**
   - Lista completa de inscripciones
   - Torneo, pareja, fecha
   - Estado de pago (confirmado/pendiente)
   - Posición final (si terminó)
   - Botón para confirmar pago

4. **Highlights**
   - Lista de highlights subidos
   - Título, torneo, vistas
   - Estado de aprobación

### 🔧 Acciones Disponibles

#### 1. Cambiar Categoría
- Modal con select dropdown: 1ra, 2da, 3ra, 4ta, 5ta, 6ta, 7ma, 8va, 9na
- Solo permite valores válidos (no texto libre)
- Muestra categoría actual
- Actualización inmediata
- Confirmación visual

#### 2. Habilitar/Deshabilitar Usuario
- Toggle de estado activo
- Confirmación antes de ejecutar
- Los usuarios inactivos se muestran con opacidad reducida

#### 3. Confirmar Pagos
- Desde el detalle del usuario
- Marcar inscripciones como pagas
- Actualización en tiempo real

---

## 🔌 API Endpoints

### `GET /api/admin/usuarios`
**Auth:** Admin requerido

**Descripción:** Lista todos los usuarios con estadísticas

**Response:**
```json
[
  {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@email.com",
    "telefono": "+54911...",
    "categoria": "5ta",
    "ranking_pts": 150,
    "activo": true,
    "rol": "jugador",
    "created_at": "2026-01-15T...",
    "total_torneos": 5,
    "torneos_ganados": 1,
    "pagos_confirmados": 4,
    "pagos_pendientes": 1
  }
]
```

### `GET /api/admin/usuarios/:id`
**Auth:** Admin requerido

**Descripción:** Obtiene detalle completo de un usuario

**Response:**
```json
{
  "usuario": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@email.com",
    "telefono": "+54911...",
    "categoria": "5ta",
    "ranking_pts": 150,
    "activo": true,
    "rol": "jugador",
    "created_at": "2026-01-15T..."
  },
  "inscripciones": [
    {
      "id": "uuid",
      "torneo_nombre": "Torneo Galáctico",
      "fecha_inicio": "2026-05-01",
      "categoria": "2da",
      "compañero_nombre": "Pedro García",
      "pago_confirmado": true,
      "posicion_final": 2
    }
  ],
  "highlights": [
    {
      "id": "uuid",
      "titulo": "Punto increíble",
      "estado_aprobacion": "aprobado",
      "vistas": 150,
      "created_at": "2026-04-20T...",
      "torneo_nombre": "Torneo X"
    }
  ],
  "estadisticas": {
    "total_torneos": 5,
    "torneos_ganados": 1,
    "pagos_confirmados": 4,
    "pagos_pendientes": 1,
    "highlights_aprobados": 3,
    "highlights_pendientes": 0
  }
}
```

### `PUT /api/admin/usuarios/:id/categoria`
**Auth:** Admin requerido

**Body:**
```json
{
  "categoria": "3ra"
}
```

**Categorías válidas:** 1ra, 2da, 3ra, 4ta, 5ta, 6ta, 7ma, 8va, 9na

**Response:**
```json
{
  "mensaje": "Categoría actualizada a 3ra",
  "usuario": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "categoria": "3ra"
  }
}
```

### `PUT /api/admin/usuarios/:id/estado`
**Auth:** Admin requerido

**Body:**
```json
{
  "activo": false
}
```

**Response:**
```json
{
  "mensaje": "Usuario deshabilitado",
  "usuario": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "activo": false
  }
}
```

### `PUT /api/admin/usuarios/:id/rol`
**Auth:** Admin requerido

**Body:**
```json
{
  "rol": "admin"
}
```

**Roles válidos:** jugador, admin

**Response:**
```json
{
  "mensaje": "Rol actualizado a admin",
  "usuario": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": "admin"
  }
}
```

### `PUT /api/admin/inscripciones/:id/pago`
**Auth:** Admin requerido

**Body:**
```json
{
  "pago_confirmado": true
}
```

**Response:**
```json
{
  "mensaje": "Pago confirmado",
  "inscripcion": {
    "id": "uuid",
    "pago_confirmado": true
  }
}
```

---

## 🎨 Interfaz de Usuario

### Página Principal (Admin)

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Administración de Usuarios                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────┐  ┌──────────────────┐             │
│ │ JP               │  │ MG               │             │
│ │ Juan Pérez       │  │ María González   │             │
│ │ juan@email.com   │  │ maria@email.com  │             │
│ │ [5ta]            │  │ [3ra]            │             │
│ │ [jugador]        │  │ [admin]          │             │
│ │                  │  │                  │             │
│ │ 150 pts | 5 T    │  │ 300 pts | 12 T   │             │
│ │ 1 ganado | 1 PP  │  │ 5 ganados | 0 PP │             │
│ │                  │  │                  │             │
│ │ [👁️ Ver Detalle] │  │ [👁️ Ver Detalle] │             │
│ │ [📊 Categoría]   │  │ [📊 Categoría]   │             │
│ │ [🚫 Deshabilitar]│  │ [🚫 Deshabilitar]│             │
│ └──────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Modal de Detalle

```
┌─────────────────────────────────────────────────────────┐
│ 👤 Juan Pérez                                      [X]  │
├─────────────────────────────────────────────────────────┤
│ INFORMACIÓN PERSONAL                                     │
│ Email: juan@email.com    Teléfono: +54911...           │
│ Categoría: [5ta]         Rol: [jugador]                │
│ Puntos: 150              Estado: [Activo]              │
│ Registro: 15/01/2026                                    │
│                                                          │
│ ESTADÍSTICAS                                            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │  5  │ │  1  │ │  4  │ │  1  │ │  3  │               │
│ │Torn.│ │Camp.│ │Pagos│ │Pend.│ │High.│               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                          │
│ INSCRIPCIONES (5)                                       │
│ ┌────────────────────────────────────────────┐          │
│ │ Torneo Galáctico                           │          │
│ │ Pareja: Pedro García · 01/05/2026          │          │
│ │ Posición: 2                    [✓ Pago OK] │          │
│ └────────────────────────────────────────────┘          │
│ ┌────────────────────────────────────────────┐          │
│ │ Copa Estelar                               │          │
│ │ Pareja: Luis Martínez · 15/05/2026         │          │
│ │                        [Confirmar Pago] ⚠️ │          │
│ └────────────────────────────────────────────┘          │
│                                                          │
│ HIGHLIGHTS (3)                                          │
│ Punto increíble · Torneo X · 150 vistas [✓]            │
│ Remate ganador · Copa Y · 80 vistas [✓]                │
│                                                          │
│                                        [Cerrar]          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Estilos Visuales

### Badges de Categoría
Degradado de colores según nivel (1ra más alta → 9na más baja):
- **1ra-2da:** Verde (`--comet-cyan`) - Categorías altas
- **3ra-4ta:** Amarillo (`#ffc107`) - Categorías medias-altas
- **5ta:** Naranja (`#ff9800`) - Categoría media
- **6ta-7ma:** Rosa (`--nova-pink`) - Categorías medias-bajas
- **8va-9na:** Púrpura (`--nebula-purple`) - Categorías bajas

### Badges de Rol
- **Admin:** Rosa con borde
- **Jugador:** Verde con borde

### Estados
- **Activo:** Verde
- **Inactivo:** Rosa + opacidad reducida
- **Pago OK:** Verde
- **Pago Pendiente:** Amarillo con fondo destacado

### Indicadores
- **Pagos pendientes > 0:** Número en rojo
- **Usuario inactivo:** Card con opacidad .6

---

## 🔒 Seguridad

### Validaciones Backend

1. **Middleware `requireAdmin`**
   ```javascript
   if (req.user.rol !== 'admin') {
     return res.status(403).json({ error: 'Solo administradores...' });
   }
   ```

2. **Validaciones de datos**
   - Categorías: Solo valores permitidos
   - Roles: Solo 'jugador' o 'admin'
   - Estado: Solo boolean

3. **Protección de endpoints**
   - Todos los endpoints requieren autenticación
   - Todos los endpoints verifican rol de admin

### Validaciones Frontend

1. **Visibilidad condicional**
   - Botón "Admin" solo visible para admins
   - Página solo accesible para admins

2. **Confirmaciones**
   - Cambiar estado: `confirm()` antes de ejecutar
   - Confirmar pago: `confirm()` antes de ejecutar

---

## 📊 Casos de Uso

### Caso 1: Admin revisa usuarios con pagos pendientes

```
Admin → Login → Click "⚙️ Admin"
  ↓
Sistema carga lista de usuarios
  ↓
Admin ve usuarios con "Pagos Pend." en rojo
  ↓
Click "👁️ Ver Detalle" en usuario
  ↓
Modal muestra inscripciones pendientes
  ↓
Click "Confirmar Pago"
  ↓
Pago marcado como confirmado
  ↓
Estadística actualizada
```

### Caso 2: Admin cambia categoría de usuario

```
Admin → Página Admin → Click "📊 Categoría"
  ↓
Prompt muestra categoría actual y opciones
  ↓
Admin ingresa nueva categoría
  ↓
Sistema valida categoría
  ↓
UPDATE en base de datos
  ↓
Toast de confirmación
  ↓
Card actualizada con nueva categoría
```

### Caso 3: Admin deshabilita usuario

```
Admin → Página Admin → Click "🚫 Deshabilitar"
  ↓
Confirm: "¿Seguro que querés deshabilitar a Juan Pérez?"
  ↓
Admin confirma
  ↓
UPDATE activo = false
  ↓
Card se muestra con opacidad reducida
  ↓
Botón cambia a "✅ Habilitar"
```

---

## 🧪 Cómo Probar

### 1. Login como Admin

```
Email: admin@torneosgalacticos.com
Password: galacticos123
```

### 2. Acceder al Módulo

- Click en botón "⚙️ Admin" en el nav
- Deberías ver la lista de todos los usuarios

### 3. Probar Funcionalidades

**Ver Detalle:**
- Click en "👁️ Ver Detalle" de cualquier usuario
- Verificar que se muestra toda la información

**Cambiar Categoría:**
- Click en "📊 Categoría"
- Ingresar nueva categoría (ej: "Avanzado")
- Verificar que se actualiza

**Deshabilitar Usuario:**
- Click en "🚫 Deshabilitar"
- Confirmar
- Verificar que el card se muestra con opacidad reducida

**Confirmar Pago:**
- Abrir detalle de usuario con pagos pendientes
- Click en "Confirmar Pago"
- Verificar que cambia a "✓ Pago OK"

---

## 📁 Archivos Creados/Modificados

### Backend
- ✅ `src/routes/admin-usuarios.js` - Rutas de administración
- ✅ `src/index.js` - Registro de ruta `/api/admin`

### Frontend
- ✅ `public/js/api.js` - Cliente API con endpoints de admin
- ✅ `public/js/app.js` - Funciones de administración
- ✅ `public/index.html` - Página y modal de admin
- ✅ `public/css/style.css` - Estilos del módulo

### Documentación
- ✅ `MODULO-ADMIN-USUARIOS.md` - Este archivo

---

## 🚀 Características Destacadas

### ✨ UX/UI
- **Diseño consistente** con el resto de la aplicación
- **Feedback visual** inmediato en todas las acciones
- **Badges coloridos** para categorías y estados
- **Hover effects** en cards y botones
- **Responsive** - se adapta a diferentes tamaños de pantalla

### ⚡ Performance
- **Carga eficiente** con una sola query JOIN
- **Actualización optimista** en el frontend
- **Sin recargas innecesarias** de página

### 🔐 Seguridad
- **Doble validación** (frontend + backend)
- **Confirmaciones** antes de acciones destructivas
- **Acceso restringido** solo a admins

---

## 📝 Mejoras Futuras (Opcionales)

1. **Filtros y búsqueda**
   - Filtrar por categoría
   - Buscar por nombre/email
   - Ordenar por diferentes campos

2. **Exportación de datos**
   - Exportar lista de usuarios a CSV
   - Reportes de pagos pendientes

3. **Historial de cambios**
   - Log de cambios de categoría
   - Quién habilitó/deshabilitó usuarios

4. **Notificaciones**
   - Email al usuario cuando se confirma su pago
   - Email cuando cambia su categoría

5. **Estadísticas agregadas**
   - Total de usuarios activos/inactivos
   - Distribución por categoría
   - Gráficos de pagos

---

## ✅ Estado

**IMPLEMENTADO Y FUNCIONANDO** ✅

El módulo está completamente operativo y listo para usar en producción.

**Servidor corriendo en:** http://localhost:3000
