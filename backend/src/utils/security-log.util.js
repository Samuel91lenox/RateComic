'use strict';

/**
 * Log estructurado de eventos de seguridad.
 * Evita imprimir datos sensibles (tokens, contraseñas, etc.).
 */
function securityLog(event, details = {}) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };

  console.warn('[SECURITY]', JSON.stringify(payload));
}

module.exports = { securityLog };
