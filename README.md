# 🤖 WhatsApp Reminder Bot — Railway

Bot de WhatsApp que envía recordatorios automáticos diarios a un grupo,
leyendo los eventos desde `calendar.json`.

---

## 🚀 Deploy en Railway — Paso a paso

### 1. Crear proyecto en Railway

1. Entrá a [railway.app](https://railway.app) y creá un nuevo proyecto.
2. Seleccioná **"Deploy from GitHub repo"** o **"Empty project"**.
3. Si usás GitHub: subí todos los archivos del proyecto a un repositorio y conectalo.

### 2. Configurar variables de entorno en Railway

En el panel de Railway → tu proyecto → **Variables**, agregá:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `TZ` | `America/Argentina/Buenos_Aires` | Zona horaria para el cron |
| `GROUP_ID` | `1234567890-1234567890@g.us` | ID del grupo (ver más abajo) |

### 3. Configurar volumen para persistir la sesión ⚠️ CRÍTICO

Railway no persiste archivos entre deploys por defecto.
Si no configurás un volumen, **el bot pedirá QR en cada redeploy**.

1. En tu proyecto de Railway → **"Add Volume"**.
2. Montalo en la ruta: `/app/.wwebjs_auth`
3. Con esto, la sesión de WhatsApp queda guardada aunque hagas redeploy.

### 4. Primer deploy y escanear QR

1. Hacé deploy. El bot va a arrancar e intentar conectarse.
2. Abrí los **Logs** en tiempo real en Railway.
3. Vas a ver un QR en ASCII en los logs.
4. Abrí WhatsApp en tu celular → **Dispositivos vinculados → Vincular dispositivo**.
5. Escaneá el QR. Tenés ~60 segundos.
6. En los logs verás: `✅ Autenticación exitosa`.
7. Con el volumen configurado, esta sesión dura meses sin re-escanear.

### 5. Obtener el ID del grupo

1. En `index.js`, descomentá el bloque **"MODO DIAGNÓSTICO"** (líneas marcadas).
2. Hacé redeploy.
3. Abrí los logs en Railway.
4. Enviá CUALQUIER mensaje al grupo desde tu celular.
5. En los logs verás algo como:

[Bot] 📨 Mensaje recibido de: 5491112345678-1609459200@g.us | Grupo: Mi Grupo
[Bot] 👉 Copiá este ID: 5491112345678-1609459200@g.us

6. Copiá ese ID.
7. Pegalo en la variable de entorno `GROUP_ID` en Railway.
8. Volvé a comentar el bloque de diagnóstico en `index.js`.
9. Hacé redeploy final.

---

## 📅 Cómo actualizar el calendar.json cada mes

### Opción A: Editar en GitHub + redeploy automático (recomendado)
1. Editá `calendar.json` en tu repositorio de GitHub con las fechas del nuevo mes.
2. Hacé commit y push.
3. Railway detecta el cambio y hace redeploy automáticamente.
4. Como la sesión está en el volumen, el bot **no pide QR de nuevo**.

### Opción B: Editar manualmente en Railway
1. Abrí la terminal de Railway (tab "Shell" en tu servicio).
2. Editá el archivo: `nano calendar.json`
3. Guardá y reiniciá el servicio desde el panel.

### Formato del calendar.json
```json
{
  "YYYY-MM-DD": "Nombre",
  "2026-06-01": "Hernán",
  "2026-06-07": "Irene"
}
```
Solo ponés los días que tienen evento. Los días sin entrada no disparan mensaje.

---

## 🕗 Horario del recordatorio

El cron corre a las **08:00 en la zona horaria configurada en `TZ`**.

Si `TZ=America/Argentina/Buenos_Aires`, el mensaje se envía a las 08:00 ART.

---

## 🔧 Comando de inicio para Railway

Railway detecta automáticamente el script `start` del `package.json`: