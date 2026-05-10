/** routes/userRoutes.js - /api/users */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { roleLimiter } = require("../middleware/rateLimiter");
const adminController = require("../controllers/adminController");

router.use(auth);
router.use(roleLimiter);

// GET /api/users
router.get("/",
  checkPermission(["users:read", "users:manage"]),
  adminController.getAllUsers
);

// GET /api/users/:id
router.get("/:id",
  checkPermission(["users:read", "users:manage"]),
  adminController.getUserById
);

// PUT /api/users/:id
router.put("/:id",
  checkPermission("users:manage"),
  adminController.updateUser
);

// DELETE /api/users/:id
router.delete("/:id",
  checkPermission("users:manage"),
  adminController.deleteUser
);

// GET /api/users/:id/permissions
router.get("/:id/permissions",
  checkPermission(["users:read", "users:manage"]),
  adminController.getUserPermissions
);

module.exports = router;
