/** task-manager-api/middleware/validators/taskValidators.js */
/**
 * Validadors de Tasques (taskValidators)
 * Defineix les regles de validaciÃ³ per a les rutes de tasques
 * Utilitza express-validator per validar i sanititzar dades d'entrada
 */

const { body } = require("express-validator");
const { handleValidation } = require("./_common");

/**
 * Validació per crear una tasca
 * - title: obligatori, mí­nim 2 carácters
 * - description: opcional, máxim 500 carácters
 * - cost: opcional, ha de ser numèric
 * - hours_estimated: opcional, ha de ser numèric
 * - completed: opcional, ha de ser booleà 
 * - image: opcional, ha de ser string
 */
const createTaskValidation = [
  body("title")
    .notEmpty().withMessage("title requerido")
    .isLength({ min: 2 }).withMessage("title mÃ­nimo 2"),
  
  body("description")
    .optional()
    .isLength({ max: 500 }).withMessage("description mÃ¡ximo 500"),
  
  body("cost")
    .optional()
    .isNumeric().withMessage("cost debe ser numÃ©rico"),
  
  body("hours_estimated")
    .optional()
    .isNumeric().withMessage("hours_estimated debe ser numÃ©rico"),
  
  body("completed")
    .optional()
    .isBoolean().withMessage("completed debe ser boolean"),
  
  body("image")
    .optional()
    .isString().withMessage("image debe ser string"),
  
  handleValidation,
];

/**
 * Validació per actualitzar una tasca
 * Tots els camps són opcionals
 */
const updateTaskValidation = [
  body("title")
    .optional()
    .isLength({ min: 2 }).withMessage("title mÃ­nimo 2"),
  
  body("description")
    .optional()
    .isLength({ max: 500 }).withMessage("description mÃ¡ximo 500"),
  
  body("cost")
    .optional()
    .isNumeric().withMessage("cost debe ser numÃ©rico"),
  
  body("hours_estimated")
    .optional()
    .isNumeric().withMessage("hours_estimated debe ser numÃ©rico"),
  
  body("completed")
    .optional()
    .isBoolean().withMessage("completed debe ser boolean"),
  
  body("image")
    .optional()
    .isString().withMessage("image debe ser string"),
  
  handleValidation,
];

module.exports = { createTaskValidation, updateTaskValidation };