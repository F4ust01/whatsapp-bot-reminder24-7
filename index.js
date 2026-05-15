/**
 * index.js
 * Punto de entrada principal del bot de WhatsApp.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { startScheduler } = require('./reminderScheduler');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const GROUP_ID = process.env.GROUP_ID || 'PEGA_AQUI_EL_ID_DEL_GRUPO@g.us';

// ============================================================
// SERVIDOR HTTP PARA VER EL QR EN EL NAVEGADOR
// ============================================================

let qrImageData = null;

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    if (qrImageData) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <title>WhatsApp Bot - QR</title>
            <meta http-equiv="refresh" content="30">
            <style>
              body { display:flex; flex-direction:column; align-items:center;
                     justify-content:center; height:100vh; margin:0;
                     background:#111; color:#fff; font-family:sans-serif; }
              img { width:300px; height:300px; border:8px solid white; border-radius:12px; }
              p { margin-top:20px; font-size:14px; color:#aaa; }
            </style>
          </head>
          <body>
            <h2>📱 Escaneá este QR con WhatsApp</h2>
            <img src="${qrImageData}" />
            <p>La página se refresca automáticamente cada 30 segundos.</p>
            <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
          </body>
        </html>
      `);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <title>WhatsApp Bot</title>
            <meta http-equiv="refresh" content="5">
            <style>
              body { display:flex; align-items:center; justify-content:center;
                     height:100vh; margin:0; background:#111; color:#fff;
                     font-family:sans-serif; }
            </style>
          </head>
          <body>
            <h2>✅ Bot conectado y funcionando — no se necesita QR.</h2>
          </body>
        </html>
      `);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Bot] 🌐 Servidor HTTP corriendo en puerto ${PORT}`);
  console.log(`[Bot] 🌐 Abrí la URL pública de Railway para ver el QR`);
});

// ============================================================
// INICIALIZACIÓN DEL CLIENTE
// ============================================================

// Limpiar el lock del perfil de Chromium si quedó de una sesión anterior
const lockFile = '/tmp/chromium-profile/SingletonLock';
if (fs.existsSync(lockFile)) {
  fs.unlinkSync(lockFile);
  console.log('[Bot] 🧹 Lock de Chromium limpiado.');
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth'
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-background-networking',
      '--user-data-dir=/tmp/chromium-profile'
    ],
    headless: true,
    executablePath: '/usr/bin/chromium'
  }
});

// ============================================================
// EVENTOS DEL CLIENTE
// ============================================================

client.on('qr', async (qr) => {
  console.log('\n[Bot] 📱 QR generado — abrí la URL pública de Railway en el navegador para escanearlo');
  console.log('[Bot] ⚠️  Tenés aprox. 60 segundos para escanear antes de que expire.\n');
  // Mostrar en terminal igual (por si acaso)
  qrcode.generate(qr, { small: true });
  // Convertir a imagen para mostrar en el navegador
  try {
    qrImageData = await QRCode.toDataURL(qr);
    console.log('[Bot] 🌐 QR disponible en el navegador.');
  } catch (e) {
    console.error('[Bot] Error generando imagen QR:', e.message);
  }
});

client.on('authenticated', () => {
  qrImageData = null; // limpiar QR del navegador
  console.log('\n[Bot] ✅ Autenticación exitosa. Sesión guardada en .wwebjs_auth/');
});

client.on('auth_failure', (msg) => {
  console.error('\n[Bot] ❌ Fallo de autenticación:', msg);
  console.error('[Bot] 🔄 Borrá la carpeta .wwebjs_auth/ y hacé redeploy para generar un nuevo QR.');
  process.exit(1);
});

client.on('ready', () => {
  qrImageData = null;
  console.log('\n[Bot] 🚀 Bot listo y conectado a WhatsApp.');
  console.log(`[Bot] 📋 Grupo configurado: ${GROUP_ID}`);
  console.log(`[Bot] 🕗 Hora actual del servidor: ${new Date().toISOString()}`);
  console.log(`[Bot] 🌍 Zona horaria (TZ): ${process.env.TZ || 'UTC (sin TZ configurada)'}`);

  if (!GROUP_ID.endsWith('@g.us')) {
    console.warn('\n[Bot] ⚠️  ADVERTENCIA: El GROUP_ID no parece válido (debe terminar en @g.us).');
    console.warn('[Bot] ⚠️  Activá el modo diagnóstico en index.js para obtener el ID correcto.');
  }

  startScheduler(client, GROUP_ID);
/**
    // ⬇️ BLOQUE DE PRUEBA — borralo después de verificar
  setTimeout(async () => {
    console.log('[Bot] 🧪 Enviando mensaje de prueba...');
    try {
      await client.sendMessage(GROUP_ID, '🧪 Mensaje de prueba — el bot está funcionando correctamente.');
      console.log('[Bot] ✅ Mensaje de prueba enviado.');
    } catch (e) {
      console.error('[Bot] ❌ Error al enviar prueba:', e.message);
    }
  }, 5000); // espera 5 segundos después de conectarse
  // ⬆️ FIN BLOQUE DE PRUEBA
  */
});

client.on('disconnected', (reason) => {
  console.error(`\n[Bot] 🔌 Bot desconectado. Razón: ${reason}`);
  console.error('[Bot] 🔄 Railway reiniciará el proceso. Si el problema persiste, revisá los logs.');
  process.exit(1);
});

// ============================================================
// MODO DIAGNÓSTICO - Para obtener el ID del grupo
// ============================================================

/**
client.on('message', async (msg) => {
  try {
    if (msg.from.endsWith('@g.us')) {
      const chat = await msg.getChat();
      console.log(`[Bot] 📨 Mensaje recibido de: ${msg.from} | Grupo: ${chat.name}`);
      console.log(`[Bot] 👉 Copiá este ID: ${msg.from}`);
    }
  } catch (error) {
    console.error('[Bot] Error en diagnóstico:', error.message);
  }
});
*/

// ============================================================
// MANEJO DE ERRORES GLOBALES
// ============================================================

process.on('uncaughtException', (error) => {
  console.error('\n[Bot] 💥 Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[Bot] 💥 Promesa rechazada no manejada:', reason);
});

// ============================================================
// INICIO
// ============================================================

console.log('='.repeat(60));
console.log('   🤖 WhatsApp Reminder Bot - Iniciando...');
console.log('='.repeat(60));
console.log(`[Bot] 📦 Versión Node.js: ${process.version}`);
console.log(`[Bot] 🕐 Timestamp inicio: ${new Date().toISOString()}`);
console.log('[Bot] 🔄 Inicializando cliente de WhatsApp...\n');

client.initialize();
