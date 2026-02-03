/** task-manager-api/utils/errorResponse.js */
/**
 * Classe ErrorResponse
 * Extensió de la classe Error per crear errors personalitzats amb codi d'estat HTTP
 * 
 * Permet llançar errors amb missatge i statusCode de forma senzilla:
 * throw new ErrorResponse("Missatge d'error", 404);
 */

class ErrorResponse extends Error {
  /**
   * Constructor de ErrorResponse
   * @param {string} message - Missatge d'error
   * @param {number} statusCode - Codi d'estat HTTP (400, 401, 403, 404, 500, etc.)
   */
  constructor(message, statusCode) {
    // Cridem al constructor de la classe pare (Error) amb el missatge
    super(message);
    
    // Afegim la propietat statusCode
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;