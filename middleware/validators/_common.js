/** task-manager-api/middleware/validators/_common.js */
/**
 * Utilitats comunes per als validadors (handleValidation)
 * Processa els resultats de validació d'express-validator
 */

const { validationResult } = require("express-validator");

/**
 * Middleware que comprova els errors de validació
 * S'utilitza com a últim element dels arrays de validació
 * 
 * Si hi ha errors, retorna una resposta 400 amb els detalls
 * Si tot és correcte, passa al següent middleware
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - Funció per passar al següent middleware
 */
function handleValidation(req, res, next) {
  // Obtenim els resultats de la validació
  const result = validationResult(req);
  
  // Si hi ha errors, retornem resposta 400
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: result.array().map((e) => ({ 
        field: e.path,      // Camp amb error
        message: e.msg      // Missatge d'error
      })),
    });
  }
  
  // No hi ha errors, continuem
  next();
}

module.exports = { handleValidation };