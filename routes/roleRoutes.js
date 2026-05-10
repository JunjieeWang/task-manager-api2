/** routes/roleRoutes.js - /api/roles */
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { roleLimiter } = require("../middleware/rateLimiter");
const roleController = require("../controllers/roleController");

router.use(auth);
router.use(roleLimiter);

// GET /api/roles
router.get("/",
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getAllRoles
);

// POST /api/roles
router.post("/",
  checkPermission("roles:manage"),
  roleController.createRole
);

// GET /api/roles/:id/hierarchy  (abans de /:id per evitar conflicte)
router.get("/:id/hierarchy",
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getRoleHierarchy
);

// GET /api/roles/:id/permissions
router.get("/:id/permissions",
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getRoleAllPermissions
);

// GET /api/roles/:id
router.get("/:id",
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getRoleById
);

// PUT /api/roles/:id
router.put("/:id",
  checkPermission("roles:manage"),
  roleController.updateRole
);

// DELETE /api/roles/:id
router.delete("/:id",
  checkPermission("roles:manage"),
  roleController.deleteRole
);

module.exports = router;
