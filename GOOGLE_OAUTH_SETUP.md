# Configuración de Google OAuth

## Pasos para configurar Google OAuth en tu aplicación

### 1. Crear un proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. En el menú lateral, ve a **APIs y servicios** > **Credenciales**

### 2. Configurar la pantalla de consentimiento OAuth

1. Haz click en **Pantalla de consentimiento de OAuth**
2. Selecciona **Externo** (para permitir cualquier usuario con cuenta de Google)
3. Completa la información requerida:
   - Nombre de la aplicación: `Torneos Galácticos`
   - Correo electrónico de asistencia al usuario
   - Logo (opcional)
   - Dominios autorizados
4. Agrega los scopes necesarios:
   - `userinfo.email`
   - `userinfo.profile`
5. Guarda y continúa

### 3. Crear credenciales OAuth 2.0

1. Ve a **Credenciales** > **Crear credenciales** > **ID de cliente de OAuth 2.0**
2. Tipo de aplicación: **Aplicación web**
3. Nombre: `Torneos Galácticos Web Client`
4. **Orígenes de JavaScript autorizados**:
   - Para desarrollo: `http://localhost:3000`
   - Para producción: `https://tu-dominio.onrender.com` (o tu dominio personalizado)
5. **URIs de redirección autorizados**:
   - Para desarrollo: `http://localhost:3000/api/auth/google/callback`
   - Para producción: `https://tu-dominio.onrender.com/api/auth/google/callback`
6. Haz click en **Crear**

### 4. Configurar variables de entorno

Después de crear las credenciales, Google te mostrará:
- **ID de cliente** (Client ID)
- **Secreto del cliente** (Client Secret)

Copia estos valores y agregalos a tu archivo `.env`:

```env
GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret-aqui
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**IMPORTANTE**: Para producción en Render, actualiza `GOOGLE_CALLBACK_URL` con tu URL de producción:
```env
GOOGLE_CALLBACK_URL=https://tu-app.onrender.com/api/auth/google/callback
```

### 5. Ejecutar la migración de base de datos

La base de datos necesita actualizarse para soportar OAuth. Ejecuta:

```bash
npm run db:migrate
```

Esto agregará los campos `google_id` y hará que `password_hash` sea opcional.

### 6. Probar la integración

1. Inicia el servidor: `npm run dev`
2. Ve a `http://localhost:3000`
3. Haz click en **Ingresar** o **Registrarme**
4. Haz click en el botón **Continuar con Google**
5. Selecciona tu cuenta de Google
6. Autoriza la aplicación
7. Deberías ser redirigido de vuelta a la aplicación, ya autenticado

## Notas importantes

- **Seguridad**: Nunca compartas tu `GOOGLE_CLIENT_SECRET` públicamente ni lo subas a Git
- **Dominios**: Asegúrate de agregar todos los dominios donde tu app estará disponible (localhost, staging, producción)
- **Usuarios existentes**: Si un usuario ya tiene una cuenta con email/password y luego usa Google OAuth con el mismo email, las cuentas se vincularán automáticamente
- **Nuevos usuarios**: Los usuarios que se registren con Google tendrán nombre y apellido extraídos de su perfil de Google, y su foto de perfil se guardará en `avatar_url`

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que la URL de callback en Google Cloud Console coincida exactamente con la configurada en `GOOGLE_CALLBACK_URL`
- Incluye el protocolo (`http://` o `https://`)
- No incluyas barras finales

### Error: "Esta cuenta usa Google"
- Este mensaje aparece cuando intentas hacer login con email/password en una cuenta que fue creada con Google OAuth
- Usa el botón "Continuar con Google" en su lugar

### El usuario no se crea
- Verifica que los scopes `email` y `profile` estén configurados correctamente
- Revisa los logs del servidor para ver errores específicos
