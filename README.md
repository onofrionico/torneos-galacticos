# 🏸 Torneos Galácticos — Backend

Monolito Node.js + Express + PostgreSQL para la plataforma de torneos de pádel.

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **Base de datos:** PostgreSQL (via `pg`)
- **Auth:** JWT + bcryptjs + Google OAuth 2.0 (Passport)
- **Uploads:** Multer (videos e imágenes)
- **Deploy:** Render (Web Service)

## Estructura

```
torneos-galacticos/
├── src/
│   ├── index.js              # Entry point, configura Express
│   ├── db/index.js           # Pool de conexión PostgreSQL
│   ├── middleware/auth.js    # JWT middleware
│   ├── utils/upload.js       # Configuración Multer
│   └── routes/
│       ├── auth.js           # /api/auth
│       ├── torneos.js        # /api/torneos
│       ├── canchas.js        # /api/canchas
│       ├── inscripciones.js  # /api/inscripciones
│       ├── highlights.js     # /api/highlights
│       └── ranking.js        # /api/ranking
├── scripts/
│   ├── migrate.js            # Crea las tablas
│   └── seed.js               # Datos de ejemplo
├── public/                   # Frontend estático (SPA)
│   └── uploads/              # Videos e imágenes subidas
├── .env.example
└── package.json
```

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo>
cd torneos-galacticos
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET

# 3. Crear tablas
npm run db:migrate

# 4. Cargar datos de ejemplo (opcional)
npm run db:seed

# 5. Arrancar en desarrollo
npm run dev
```

### Configurar Google OAuth (opcional)

Para habilitar el login con Google, seguí las instrucciones en [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md).

Necesitarás agregar estas variables a tu `.env`:
```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

## Deploy en Render

### 1. Base de datos PostgreSQL

1. En Render → **New → PostgreSQL**
2. Elegí el plan Free
3. Copiá la **Internal Database URL** (la vas a usar en el Web Service)

### 2. Web Service

1. **New → Web Service** → conectá tu repositorio de GitHub
2. Configuración:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (o el que tengas)

3. Variables de entorno (en la sección "Environment"):

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | La Internal URL de tu PostgreSQL de Render |
| `JWT_SECRET` | Un string largo y aleatorio |
| `NODE_ENV` | `production` |
| `MAX_FILE_SIZE_MB` | `100` |
| `GOOGLE_CLIENT_ID` | Tu Client ID de Google OAuth (opcional) |
| `GOOGLE_CLIENT_SECRET` | Tu Client Secret de Google OAuth (opcional) |
| `GOOGLE_CALLBACK_URL` | `https://tu-app.onrender.com/api/auth/google/callback` (opcional) |

4. **Disco persistente** (importante para videos):
   - En tu Web Service → **Disks** → Add Disk
   - Mount Path: `/opt/render/project/src/public/uploads`
   - Tamaño: 1GB+ según tu plan
   - Agregar variable: `UPLOADS_DIR=/opt/render/project/src/public/uploads`

5. **Post-deploy:** Ejecutar migraciones una sola vez desde la shell de Render:
   ```bash
   npm run db:migrate
   ```

### 3. Deploy del frontend

Copiá tu `index.html` y assets del frontend al directorio `public/`.
El backend lo sirve automáticamente. En Render **no necesitás un Static Site separado**.

## API Reference

### Auth
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Registro de jugador |
| POST | `/api/auth/login` | — | Login, devuelve JWT |
| GET | `/api/auth/google` | — | Iniciar login con Google OAuth |
| GET | `/api/auth/google/callback` | — | Callback de Google OAuth |
| GET | `/api/auth/me` | ✅ | Perfil del usuario logueado |
| PUT | `/api/auth/me` | ✅ | Actualizar perfil |

### Torneos
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/torneos` | — | Listar torneos (filtros: estado, tipo, categoria) |
| GET | `/api/torneos/:id` | — | Detalle con inscripciones y cancha |
| POST | `/api/torneos` | organizador | Crear torneo (incluye cancha_id) |
| PUT | `/api/torneos/:id` | organizador | Editar torneo |
| DELETE | `/api/torneos/:id` | organizador | Eliminar torneo |
| POST | `/api/torneos/:id/imagen` | organizador | Subir imagen |

### Canchas
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/canchas` | — | Listar canchas (filtros: activa, ciudad, provincia) |
| GET | `/api/canchas/:id` | — | Detalle con torneos asociados |
| POST | `/api/canchas` | organizador | Crear cancha |
| PUT | `/api/canchas/:id` | organizador | Editar cancha |
| DELETE | `/api/canchas/:id` | admin | Eliminar cancha |
| POST | `/api/canchas/:id/imagen` | organizador | Subir imagen |

### Inscripciones
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/inscripciones` | ✅ | Inscribirse a un torneo |
| GET | `/api/inscripciones/mis-inscripciones` | ✅ | Historial del jugador |
| DELETE | `/api/inscripciones/:id` | ✅ | Cancelar inscripción |
| PUT | `/api/inscripciones/:id/resultado` | organizador | Cargar posición final |

### Highlights
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/highlights` | — | Listar highlights públicos |
| GET | `/api/highlights/mis-highlights` | ✅ | Mis highlights |
| POST | `/api/highlights` | ✅ | Subir video (multipart/form-data) |
| POST | `/api/highlights/:id/vista` | — | Registrar vista |
| DELETE | `/api/highlights/:id` | ✅ | Eliminar |

### Ranking
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/ranking` | — | Tabla general (filtro: categoria) |
| GET | `/api/ranking/jugador/:id` | — | Historial completo de un jugador |
| POST | `/api/ranking/snapshot` | admin | Guardar snapshot mensual |

## Usuarios del seed

```
admin@torneosgalacticos.com / galacticos123  (rol: admin)
martin@ejemplo.com / galacticos123           (rol: jugador)
lucas@ejemplo.com / galacticos123            (rol: jugador)
```
