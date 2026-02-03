/** task-manager-api/middleware/errorHandler.js */
/**
 * Middleware de Gestió d'Errors (errorHandler)
 * Centralitza la gestió d'errors de l'aplicació
 * Transforma diferents tipus d'errors en respostes estandarditzades
 */

const ErrorResponse = require("../utils/errorResponse");

/**
 * Middleware per gestionar rutes no trobades (404)
 * S'afegeix després de totes les rutes definides
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - Funció per passar al següent middleware
 */
function notFound(req, res, next) {
  next(new ErrorResponse(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}

/**
 * Middleware global de gestió d'errors
 * Captura tots els errors i retorna una resposta JSON estandarditzada
 * 
 * @param {Error} err - Objecte d'error
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - Funció per passar al següent middleware
 */
function errorHandler(err, req, res, next) {
  // Valors per defecte
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";

  // Gestió d'error de Mongoose: ID inválid (CastError)
  // Passa quan s'intenta buscar per un ID amb format incorrecte
  if (err.name === "CastError") {
    statusCode = 400;
    message = "ID invÃ¡lido";
  }

  // Gestió d'error de Mongoose: error de validació
  // Passa quan les dades no compleixen les validacions de l'esquema
  if (err.name === "ValidationError") {
    statusCode = 400;
    // Combinem tots els missatges de validació
    message = Object.values(err.errors).map((e) => e.message).join(" | ");
  }

  // Gestió d'error de Mongoose: clau duplicada
  // Passa quan s'intenta inserir un valor duplicat en un camp únic (ex: email)
  if (err.code === 11000) {
    statusCode = 400;
    const keys = Object.keys(err.keyValue || {});
    message = `Valor duplicado en: ${keys.join(", ")}`;
  }

  // Enviem la resposta d'error
  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

module.exports = { notFound, errorHandler };