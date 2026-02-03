/** task-manager-api/middleware/validators/authValidators.js */
/**
 * Validadors d'Autenticació (authValidators)
 * Defineix les regles de validació per a les rutes d'autenticació
 * Utilitza express-validator per validar i sanititzar dades d'entrada
 */

const { body } = require("express-validator");
const { handleValidation } = require("./_common");

/**
 * Validació per al registre d'usuaris
 * - email: obligatori, ha de ser un email vàlid
 * - password: obligatori, mínim 6 caràcters
 * - name: opcional, mínim 2 caràcters si s'envia
 */
const registerValidation = [
  body("email")
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),  // Sanititza l'email (minúscules, elimina punts en gmail, etc.)
  
  body("password")
    .isLength({ min: 6 }).withMessage("Password mínimo 6 caracteres"),
  
  body("name")
    .optional()  // El camp és opcional
    .isLength({ min: 2 }).withMessage("Name mínimo 2 caracteres"),
  
  handleValidation,  // Processa els errors de validació
];

/**
 * Validació per al login
 * - email: obligatori, ha de ser un email vàlid
 * - password: obligatori, no pot estar buit
 */
const loginValidation = [
  body("email")
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),
  
  body("password")
    .notEmpty().withMessage("Password requerido"),
  
  handleValidation,
];

/**
 * Validació per actualitzar el perfil
 * - email: opcional, ha de ser un email vàlid si s'envia
 * - name: opcional, mínim 2 caràcters si s'envia
 */
const updateProfileValidation = [
  body("email")
    .optional()
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),
  
  body("name")
    .optional()
    .isLength({ min: 2 }).withMessage("Name mínimo 2 caracteres"),
  
  handleValidation,
];

/**
 * Validació per canviar la contrasenya
 * - currentPassword: obligatori, no pot estar buit
 * - newPassword: obligatori, mínim 6 caràcters
 */
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty().withMessage("currentPassword requerido"),
  
  body("newPassword")
    .isLength({ min: 6 }).withMessage("newPassword mínimo 6 caracteres"),
  
  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
};