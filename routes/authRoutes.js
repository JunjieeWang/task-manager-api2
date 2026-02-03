/** task-manager-api/routes/authRoutes.js */

const express = require("express");
const router = express.Router();

// Middlewares
const auth = require("../middleware/auth");
const { 
  registerValidation, 
  loginValidation, 
  updateProfileValidation, 
  changePasswordValidation 
} = require("../middleware/validators/authValidators");
const { handleValidation } = require("../middleware/validators/_common");

// Controladors
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  checkPermission,
  getMyPermissions
} = require("../controllers/authController");

// ============================================
// RUTES PÚBLIQUES (sense autenticació)
// ============================================

/**
 * POST /api/auth/register
 * Registre de nous usuaris
 */
router.post("/register", registerValidation, handleValidation, register);

/**
 * POST /api/auth/login
 * Inici de sessió
 */
router.post("/login", loginValidation, handleValidation, login);

// ============================================
// RUTES PROTEGIDES (requereixen autenticació)
// ============================================

/**
 * GET /api/auth/me
 * Obtenir perfil de l'usuari actual
 */
router.get("/me", auth, getMe);

/**
 * PUT /api/auth/profile
 * Actualitzar perfil de l'usuari
 */
router.put("/profile", auth, updateProfileValidation, handleValidation, updateProfile);

/**
 * PUT /api/auth/change-password
 * Canviar contrasenya
 */
router.put("/change-password", auth, changePasswordValidation, handleValidation, changePassword);

/**
 * POST /api/auth/check-permission
 * Verificar si l'usuari té un permí­s especí­fic
 */
router.post("/check-permission", auth, checkPermission);

/**
 * GET /api/auth/my-permissions
 * Obtenir tots els permisos de l'usuari actual
 */
router.get("/my-permissions", auth, getMyPermissions);

module.exports = router;