/** routes/authRoutes.js */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require("../middleware/validators/authValidators");
const { handleValidation } = require("../middleware/validators/_common");

const {
  register, login, refresh, logout,
  forgotPassword, resetPassword,
  getMe, updateProfile, changePassword,
  checkPermission, getMyPermissions
} = require("../controllers/authController");

// Públiques
router.post("/register", registerValidation, handleValidation, register);
router.post("/login",    loginValidation,    handleValidation, login);
router.post("/refresh",  refresh);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protegides
router.post("/logout",          auth, logout);
router.get("/me",               auth, getMe);
router.put("/profile",          auth, updateProfileValidation, handleValidation, updateProfile);
router.put("/change-password",  auth, changePasswordValidation, handleValidation, changePassword);
router.post("/check-permission",auth, checkPermission);
router.get("/my-permissions",   auth, getMyPermissions);

module.exports = router;
