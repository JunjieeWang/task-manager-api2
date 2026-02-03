/** task-manager-api/middleware/validators/roleValidators.js */
/**
 * Validadors per rols i permisos
 */

const { body } = require("express-validator");
const { handleValidation } = require("./_common");

/**
 * Validació per crear/actualitzar rol
 */
const validateRole = [
  body("name")
    .trim()
    .notEmpty().withMessage("El nom del rol és requerit")
    .isLength({ min: 2, max: 30 }).withMessage("El nom ha de tenir entre 2 i 30 caràcters")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage("El nom només pot contenir lletres, números, guions i guions baixos"),
  
  body("description")
    .trim()
    .notEmpty().withMessage("La descripció és requerida")
    .isLength({ max: 200 }).withMessage("La descripció ha de tenir màxim 200 caràcters"),
  
  body("permissions")
    .optional()
    .isArray().withMessage("Els permisos han de ser un array"),
  
  handleValidation
];

/**
 * Validació per crear/actualitzar permís
 */
const validatePermission = [
  body("name")
    .trim()
    .notEmpty().withMessage("El nom del permís és requerit")
    .matches(/^[a-z]+:[a-z]+$/).withMessage("Format invàlid. Usar: recurs:acció (ex: tasks:create)"),
  
  body("description")
    .trim()
    .notEmpty().withMessage("La descripció és requerida"),
  
  body("category")
    .trim()
    .notEmpty().withMessage("La categoria és requerida")
    .isAlpha().withMessage("La categoria només pot contenir lletres"),
  
  handleValidation
];

/**
 * Validació per assignar rol a usuari
 */
const validateRoleAssignment = [
  body("roleId")
    .notEmpty().withMessage("L'ID del rol és requerit"),
  
  handleValidation
];

module.exports = {
  validateRole,
  validatePermission,
  validateRoleAssignment
};