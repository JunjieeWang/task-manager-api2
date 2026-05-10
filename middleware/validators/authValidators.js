/** task-manager-api/middleware/validators/authValidators.js */
/**
 * Validation rules for authentication and admin user management.
 */

const { body } = require("express-validator");
const { handleValidation } = require("./_common");

const registerValidation = [
  body("email")
    .isEmail().withMessage("Email invalido")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 }).withMessage("Password minimo 6 caracteres"),

  body("name")
    .optional()
    .isLength({ min: 2 }).withMessage("Name minimo 2 caracteres"),

  body("firstName")
    .optional()
    .isLength({ min: 1 }).withMessage("firstName invalido"),

  body("lastName")
    .optional()
    .isLength({ min: 1 }).withMessage("lastName invalido"),

  handleValidation,
];

const loginValidation = [
  body("email")
    .isEmail().withMessage("Email invalido")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password requerido"),

  handleValidation,
];

const updateProfileValidation = [
  body("email")
    .optional()
    .isEmail().withMessage("Email invalido")
    .normalizeEmail(),

  body("name")
    .optional()
    .isLength({ min: 2 }).withMessage("Name minimo 2 caracteres"),

  handleValidation,
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty().withMessage("currentPassword requerido"),

  body("newPassword")
    .isLength({ min: 6 }).withMessage("newPassword minimo 6 caracteres"),

  handleValidation,
];

const adminCreateUserValidation = [
  body("email")
    .isEmail().withMessage("Email invalido")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 }).withMessage("Password minimo 6 caracteres"),

  body("name")
    .optional()
    .isLength({ min: 2 }).withMessage("Name minimo 2 caracteres"),

  body("roles")
    .optional()
    .isArray({ min: 1 }).withMessage("roles ha de ser un array amb almenys un element"),

  body("roles.*")
    .optional()
    .isString().withMessage("Cada rol ha de ser un string"),

  handleValidation,
];

const adminUpdateUserValidation = [
  body("email")
    .optional()
    .isEmail().withMessage("Email invalido")
    .normalizeEmail(),

  body("password")
    .optional()
    .isLength({ min: 6 }).withMessage("Password minimo 6 caracteres"),

  body("name")
    .optional()
    .isLength({ min: 2 }).withMessage("Name minimo 2 caracteres"),

  body("roles")
    .optional()
    .isArray({ min: 1 }).withMessage("roles ha de ser un array amb almenys un element"),

  body("roles.*")
    .optional()
    .isString().withMessage("Cada rol ha de ser un string"),

  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  adminCreateUserValidation,
  adminUpdateUserValidation,
};
