/**
 * calendarReader.js
 * Utilidad para leer y parsear el archivo calendar.json.
 * Se usa require() en vez de import para evitar problemas de caché:
 * cada vez que se llama getCalendar(), se borra el caché de require
 * y se vuelve a leer el JSON desde disco. Esto permite que al hacer
 * redeploy en Railway con un calendar.json actualizado, el bot
 * levante los datos nuevos sin reiniciar manualmente.
 */

const path = require('path');

// Ruta absoluta al archivo calendar.json en la raíz del proyecto
const CALENDAR_PATH = path.resolve(__dirname, '..', 'calendar.json');

/**
 * Lee el archivo calendar.json desde disco y lo devuelve como objeto.
 * Borra el caché de require para forzar una lectura fresca cada vez.
 * @returns {Object} - Objeto con fechas como claves y nombres como valores
 */
function getCalendar() {
  try {
    // Eliminar el caché del módulo para forzar re-lectura del archivo
    delete require.cache[require.resolve(CALENDAR_PATH)];
    const calendar = require(CALENDAR_PATH);
    return calendar;
  } catch (error) {
    console.error('[calendarReader] ❌ Error al leer calendar.json:', error.message);
    // Devolver objeto vacío para que el bot no crashee si el JSON está mal
    return {};
  }
}

/**
 * Devuelve el nombre asociado a una fecha en formato "YYYY-MM-DD".
 * Si no hay evento ese día, devuelve null.
 * @param {string} dateString - Fecha en formato "YYYY-MM-DD"
 * @returns {string|null}
 */
function getEventForDate(dateString) {
  const calendar = getCalendar();
  return calendar[dateString] || null;
}

module.exports = { getCalendar, getEventForDate };