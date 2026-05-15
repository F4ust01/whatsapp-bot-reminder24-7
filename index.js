/**
 * index.js
 * Punto de entrada principal del bot de WhatsApp.
 *
 * Flujo:
 * 1. Inicializa el cliente de whatsapp-web.js con LocalAuth
 *    (para persistir la sesión entre reinicios).
 * 2. Muestra el QR en la terminal para escanear con WhatsApp.
 * 3. Una vez autenticado, inicia el scheduler de recordatorios.
 * 4. Escucha mensajes entrantes (opcional, para comandos manuales).
 * 5. Maneja errores y desconexiones.
 *
 * IMPORTANTE - Sesión persistente en Railway:
 * whatsapp-web.js usa LocalAuth que guarda la sesión en .wwebjs_auth/
 * Railway NO persiste el filesystem entre deploys a menos que uses
 * un volumen. Ver instrucciones en README para configurar el volumen.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { startScheduler } = require('./reminderScheduler');

// ============================================================
// CONFIGURACIÓN - Editá estas variables según tu caso
// ============================================================

/**
 * ID del grupo de WhatsApp al que enviar los recordatorios.
 *
 * ¿Cómo obtener el ID del grupo?
 * 1. Descomentá el bloque "Modo diagnóstico" más abajo (busca DIAGNÓSTICO).
 * 2. Hacé deploy y escaneá el QR.
 * 3. Enviá CUALQUIER mensaje al grupo desde tu celular.
 * 4. En los logs de Railway verás algo como:
 *    [Bot] 📨 Mensaje recibido de: 1234567890-1234567890@g.us | Grupo: Mi Grupo
 * 5. Copiá ese ID (termina en @g.us) y pegalo abajo.
 * 6. Volvé a comentar el bloque de diagnóstico y hacé redeploy.
 */
const GROUP_ID = process.env.GROUP_ID || 'PEGA_AQUI_EL_ID_DEL_GRUPO@g.us';

// ============================================================
// INICIALIZACIÓN DEL CLIENTE
// ============================================================

const client = new Client({
  /**
   * LocalAuth guarda la sesión en el disco (.wwebjs_auth/).
   * En Railway necesitás un volumen montado en /app/.wwebjs_auth
   * para que la sesión persista entre deploys. Ver README.
   */
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth' // carpeta donde se guarda la sesión
  }),

  puppeteer: {
    /**
     * Argumentos necesarios para correr Chromium en entornos
     * sin interfaz gráfica como Railway / Docker / servidores Linux.
     */
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // Evita problemas de memoria en containers
      '--disable-gpu'
    ],
    headless: true // Siempre true en producción
  }
});

// ============================================================
// EVENTOS DEL CLIENTE
// ============================================================

/**
 * Evento: QR generado
 * Se dispara cuando whatsapp-web.js necesita autenticación.
 * Mostrá el QR en la terminal de Railway y escanealo desde tu teléfono.
 */
client.on('qr', (qr) => {
  console.log('\n[Bot] 📱 Escaneá el siguiente QR con WhatsApp (Dispositivos vinculados > Vincular dispositivo):');
  console.log('[Bot] ⚠️  Tenés aprox. 60 segundos para escanear antes de que expire.\n');
  // Muestra el QR en formato ASCII en la terminal
  qrcode.generate(qr, { small: true });
});

/**
 * Evento: Autenticación exitosa
 * La sesión quedó guardada en disco; el próximo inicio no pedirá QR.
 */
client.on('authenticated', () => {
  console.log('\n[Bot] ✅ Autenticación exitosa. Sesión guardada en .wwebjs_auth/');
});

/**
 * Evento: Fallo de autenticación
 * Puede pasar si el token expiró o fue revocado desde el celular.
 */
client.on('auth_failure', (msg) => {
  console.error('\n[Bot] ❌ Fallo de autenticación:', msg);
  console.error('[Bot] 🔄 Borrá la carpeta .wwebjs_auth/ y hacé redeploy para generar un nuevo QR.');
  process.exit(1); // Railway reiniciará el proceso automáticamente
});

/**
 * Evento: Cliente listo
 * El bot está conectado y operativo. Acá arranca el scheduler.
 */
client.on('ready', () => {
  console.log('\n[Bot] 🚀 Bot listo y conectado a WhatsApp.');
  console.log(`[Bot] 📋 Grupo configurado: ${GROUP_ID}`);
  console.log(`[Bot] 🕗 Hora actual del servidor: ${new Date().toISOString()}`);
  console.log(`[Bot] 🌍 Zona horaria (TZ): ${process.env.TZ || 'UTC (sin TZ configurada)'}`);

  // Validación básica del GROUP_ID
  if (!GROUP_ID.endsWith('@g.us')) {
    console.warn('\n[Bot] ⚠️  ADVERTENCIA: El GROUP_ID no parece válido (debe terminar en @g.us).');
    console.warn('[Bot] ⚠️  Activá el modo diagnóstico en index.js para obtener el ID correcto.');
  }

  // Iniciar el scheduler de recordatorios diarios
  startScheduler(client, GROUP_ID);
});

/**
 * Evento: Desconexión
 * El bot se desconectó de WhatsApp. Puede ser por inactividad,
 * cierre de sesión desde el celular, o error de red.
 */
client.on('disconnected', (reason) => {
  console.error(`\n[Bot] 🔌 Bot desconectado. Razón: ${reason}`);
  console.error('[Bot] 🔄 Railway reiniciará el proceso. Si el problema persiste, revisá los logs.');
  process.exit(1); // Railway reiniciará automáticamente
});

// ============================================================
// MODO DIAGNÓSTICO - Para obtener el ID del grupo
// Descomentá este bloque, hacé deploy, enviá un mensaje al grupo,
// copiá el ID de los logs, y volvé a comentarlo.
// ============================================================

/*
client.on('message', async (msg) => {
  try {
    // Solo procesar mensajes de grupos
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

// Captura errores no manejados para que el proceso no muera silenciosamente
process.on('uncaughtException', (error) => {
  console.error('\n[Bot] 💥 Error no capturado:', error);
  // No hacer process.exit() aquí para dar chance al cliente de reconectarse
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

// Iniciar el cliente (dispara el evento 'qr' o 'ready' según haya sesión guardada)
client.initialize();