/** routes/permissionRoutes.js - /api/permissions */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { roleLimiter } = require("../middleware/rateLimiter");
const permissionController = require("../controllers/permissionController");

router.use(auth);
router.use(roleLimiter);

// GET /api/permissions
router.get("/",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getAllPermissions
);

// GET /api/permissions/categories
router.get("/categories",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getPermissionCategories
);

// GET /api/permissions/:id
router.get("/:id",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getPermissionById
);

// POST /api/permissions
router.post("/",
  checkPermission("permissions:manage"),
  permissionController.createPermission
);

// PUT /api/permissions/:id
router.put("/:id",
  checkPermission("permissions:manage"),
  permissionController.updatePermission
);

// DELETE /api/permissions/:id
router.delete("/:id",
  checkPermission("permissions:manage"),
  permissionController.deletePermission
);

module.exports = router;
