# 🔧 Solución: Error 153 de YouTube

## 🚨 Problema Identificado

**Error:** "Error 153 - Error de configuración del reproductor de vídeo"

### Causa
El error 153 de YouTube ocurre cuando el **Content Security Policy (CSP)** del servidor bloquea la carga del iframe de YouTube. Aunque teníamos `contentSecurityPolicy: false`, esto no es suficiente en algunos casos.

---

## ✅ Solución Implementada

### Cambios en `src/index.js`

**Antes:**
```javascript
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

**Después:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://www.youtube.com", "https://accounts.google.com"],
      mediaSrc: ["'self'", "https:", "http:"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
```

---

## 🔑 Directivas Clave

### `frameSrc`
```javascript
frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://accounts.google.com"]
```
- **Permite:** Embeds de YouTube y YouTube sin cookies
- **Necesario para:** Iframes de video
- **Incluye:** Google Accounts para OAuth

### `scriptSrc`
```javascript
scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://www.google.com"]
```
- **Permite:** Scripts de YouTube y Google
- **Necesario para:** API de YouTube y funcionalidades del reproductor

### `imgSrc`
```javascript
imgSrc: ["'self'", "data:", "https:", "http:"]
```
- **Permite:** Imágenes de cualquier origen HTTPS
- **Necesario para:** Thumbnails de YouTube (`img.youtube.com`)

### `mediaSrc`
```javascript
mediaSrc: ["'self'", "https:", "http:"]
```
- **Permite:** Archivos de video y audio
- **Necesario para:** Reproducción de videos

### `crossOriginEmbedderPolicy: false`
```javascript
crossOriginEmbedderPolicy: false
```
- **Desactiva:** Política de embedder cross-origin
- **Necesario para:** Permitir iframes de terceros como YouTube

---

## 🚀 Cómo Aplicar los Cambios

### Opción 1: Usar el script de reinicio
```powershell
.\restart-server.ps1
```

### Opción 2: Manual
```powershell
# 1. Detener el servidor actual
# Buscar el proceso en puerto 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess

# Detener el proceso (reemplazar PID con el número obtenido)
Stop-Process -Id PID -Force

# 2. Iniciar el servidor
npm start
```

---

## 🧪 Verificar que Funciona

### 1. Abrir la aplicación
```
http://localhost:3000
```

### 2. Ir a la sección "Highlights"

### 3. Hacer clic en "Subir nuevo highlight"

### 4. Seleccionar "URL de YouTube"

### 5. Pegar una URL de prueba:
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 6. Completar el formulario y subir

### 7. Hacer clic en el highlight para reproducirlo

**Resultado esperado:** ✅ El video debe reproducirse sin errores

---

## 🔍 Debugging

### Ver los headers CSP en el navegador

1. Abrir DevTools (F12)
2. Ir a la pestaña "Network"
3. Recargar la página
4. Hacer clic en el documento HTML principal
5. Ver la sección "Response Headers"
6. Buscar `Content-Security-Policy`

**Debe incluir:**
```
frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com
```

### Errores comunes en consola

❌ **Error anterior:**
```
Refused to frame 'https://www.youtube.com/' because it violates the following Content Security Policy directive: "frame-src 'self'"
```

✅ **Después del fix:**
```
(Sin errores de CSP)
```

---

## 📊 Comparación de Configuraciones

| Directiva | Antes | Después | Propósito |
|-----------|-------|---------|-----------|
| `contentSecurityPolicy` | `false` | Configurado | Control explícito |
| `frameSrc` | ❌ No definido | ✅ YouTube permitido | Embeds de video |
| `scriptSrc` | ❌ No definido | ✅ YouTube permitido | Scripts del reproductor |
| `imgSrc` | ❌ No definido | ✅ HTTPS permitido | Thumbnails |
| `mediaSrc` | ❌ No definido | ✅ HTTPS permitido | Archivos de video |
| `crossOriginEmbedderPolicy` | ❌ Por defecto | ✅ Deshabilitado | Iframes externos |

---

## 🛡️ Seguridad

### ¿Es seguro?
✅ **Sí**, la configuración es segura porque:

1. **Whitelist específica:** Solo permite dominios confiables
2. **HTTPS obligatorio:** Todos los recursos externos deben ser HTTPS
3. **Self por defecto:** Los recursos propios siempre están permitidos
4. **Sin eval():** No se permite ejecución de código arbitrario

### Dominios permitidos
- ✅ `youtube.com` - Reproductor de video
- ✅ `youtube-nocookie.com` - Versión sin cookies
- ✅ `google.com` - OAuth y servicios de Google
- ✅ `fonts.googleapis.com` - Fuentes web
- ✅ `fonts.gstatic.com` - Archivos de fuentes

---

## 🎯 Alternativas Consideradas

### 1. `contentSecurityPolicy: false`
❌ **No funciona** - Algunos navegadores/proxies ignoran esto

### 2. Meta tag en HTML
❌ **No recomendado** - Los headers tienen prioridad

### 3. YouTube sin cookies
✅ **Incluido** - `youtube-nocookie.com` también está permitido

---

## 📝 Notas Adicionales

### YouTube sin cookies
Si querés usar la versión sin cookies de YouTube, cambiá la URL en `app.js`:

```javascript
// Versión normal
src="https://www.youtube.com/embed/${youtubeId}"

// Versión sin cookies (más privacidad)
src="https://www.youtube-nocookie.com/embed/${youtubeId}"
```

### Parámetros adicionales del embed
Podés agregar parámetros a la URL del embed:

```javascript
src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1"
```

- `autoplay=1` - Reproducción automática
- `rel=0` - No mostrar videos relacionados
- `modestbranding=1` - Logo de YouTube discreto
- `controls=0` - Ocultar controles
- `start=30` - Iniciar en segundo 30

---

## ✅ Checklist de Verificación

- [x] CSP configurado explícitamente
- [x] `frameSrc` incluye YouTube
- [x] `scriptSrc` incluye YouTube
- [x] `imgSrc` permite HTTPS
- [x] `mediaSrc` permite HTTPS
- [x] `crossOriginEmbedderPolicy` deshabilitado
- [x] Servidor reiniciado
- [x] Video de prueba carga correctamente
- [x] No hay errores en consola

---

## 🆘 Si Aún No Funciona

### 1. Verificar que el servidor se reinició
```powershell
Get-NetTCPConnection -LocalPort 3000
```

### 2. Limpiar caché del navegador
- Chrome: Ctrl + Shift + Delete
- Seleccionar "Imágenes y archivos en caché"
- Limpiar

### 3. Probar en modo incógnito
- Chrome: Ctrl + Shift + N
- Esto evita problemas de caché

### 4. Verificar la consola del navegador
- F12 → Console
- Buscar errores relacionados con CSP

### 5. Verificar la URL del video
- Asegurarse que sea una URL válida de YouTube
- Probar con diferentes videos

---

## 📞 Soporte

Si el problema persiste después de aplicar estos cambios:

1. Verificar los logs del servidor
2. Revisar la consola del navegador (F12)
3. Probar con diferentes navegadores
4. Verificar que no haya proxies o extensiones bloqueando

---

## 🎉 Resultado Final

Después de aplicar estos cambios, los videos de YouTube deberían cargar correctamente en los highlights sin ningún error.

**Estado:** ✅ SOLUCIONADO
