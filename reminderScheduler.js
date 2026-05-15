/**
 * reminderScheduler.js
 * Módulo encargado de programar el envío automático de recordatorios.
 * Usa node-cron para ejecutar una tarea todos los días a las 08:00 (hora Argentina).
 *
 * IMPORTANTE: En Railway, la timezone por defecto es UTC.
 * Si querés que el cron corra a las 08:00 hora Argentina (ART = UTC-3),
 * configurá la variable de entorno TZ=America/Argentina/Buenos_Aires en Railway,
 * o bien ajustá el cron a las 11:00 UTC (que equivale a las 08:00 ART).
 * En este archivo se usa la variable TZ si está disponible.
 */

const cron = require('node-cron');
const { getEventForDate } = require('./utils/calendarReader');

/**
 * Devuelve la fecha actual en formato "YYYY-MM-DD",
 * teniendo en cuenta la zona horaria del servidor.
 * @returns {string}
 */
function getTodayString() {
  const now = new Date();
  // toLocaleDateString no siempre es confiable en Node; usamos toISOString con ajuste
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Inicia el scheduler de recordatorios.
 * @param {Client} client - Instancia del cliente de whatsapp-web.js ya autenticado
 * @param {string} groupId - ID del grupo de WhatsApp donde enviar los mensajes
 */
function startScheduler(client, groupId) {
  console.log('[Scheduler] ✅ Iniciando scheduler de recordatorios...');
  console.log(`[Scheduler] 🕗 Tarea programada: todos los días a las 18:30 (zona horaria: ${process.env.TZ || 'UTC'})`);

  /**
   * Expresión cron: "0 8 * * *"
   * ┌───────────── minuto (0)
   * │ ┌───────────── hora (8)
   * │ │ ┌───────────── día del mes (*)
   * │ │ │ ┌───────────── mes (*)
   * │ │ │ │ ┌───────────── día de la semana (*)
   * │ │ │ │ │
   * 0 8 * * *
   *
   * Si Railway está en UTC y querés 08:00 ART (UTC-3), cambiá "8" por "11"
   */
  cron.schedule('0 8 * * *', async () => {
    console.log(`\n[Scheduler] 🔔 Ejecutando tarea de recordatorio - ${new Date().toISOString()}`);

    const today = getTodayString();
    console.log(`[Scheduler] 📅 Fecha de hoy: ${today}`);

    // Buscar si hay evento en el calendar.json para hoy
    const personName = getEventForDate(today);

    if (!personName) {
      console.log(`[Scheduler] ℹ️ No hay evento registrado para hoy (${today}). No se enviará mensaje.`);
      return;
    }

    console.log(`[Scheduler] 📌 Evento encontrado: "${personName}" para el día ${today}`);

    // Construir el mensaje a enviar al grupo
    const message = `🔔 *Recordatorio del día*\n\n📅 Fecha: ${today}\n👤 Hoy le toca a: *${personName}*\n\n¡Que no se olvide! 💪`;

    try {
      // Enviar el mensaje al grupo
      await client.sendMessage(groupId, message);
      console.log(`[Scheduler] ✅ Mensaje enviado exitosamente al grupo ${groupId}`);
    } catch (error) {
      console.error(`[Scheduler] ❌ Error al enviar mensaje al grupo ${groupId}:`, error.message);
    }
  }, {
    // Usar la zona horaria definida en la variable de entorno TZ, o UTC por defecto
    timezone: process.env.TZ || 'UTC'
  });

  console.log('[Scheduler] ✅ Scheduler iniciado correctamente.');
}

module.exports = { startScheduler };
