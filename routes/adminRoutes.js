/** task-manager-api/routes/adminRoutes.js */

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const auditLog = require("../middleware/auditLog");

const adminController = require("../controllers/adminController");
const roleController = require("../controllers/roleController");
const permissionController = require("../controllers/permissionController");
const auditController = require("../controllers/auditController");

const {
  validateRole,
  validatePermission,
  validateRoleAssignment,
} = require("../middleware/validators/roleValidators");
const {
  adminCreateUserValidation,
  adminUpdateUserValidation,
} = require("../middleware/validators/authValidators");

router.use(auth);

router.post("/users",
  checkPermission("users:manage"),
  adminCreateUserValidation,
  auditLog("users:create", "user"),
  adminController.createUser
);

router.get("/users",
  checkPermission(["users:read", "users:manage"]),
  auditLog("users:read", "user"),
  adminController.getAllUsers
);

router.get("/users/:id",
  checkPermission(["users:read", "users:manage"]),
  adminController.getUserById
);

router.put("/users/:id",
  checkPermission("users:manage"),
  adminUpdateUserValidation,
  auditLog("users:update", "user"),
  adminController.updateUser
);

router.delete("/users/:id",
  checkPermission("users:manage"),
  auditLog("users:delete", "user"),
  adminController.deleteUser
);

router.put("/users/:id/role",
  checkPermission("users:manage"),
  auditLog("users:update", "user"),
  adminController.changeUserRole
);

router.post("/users/:userId/roles",
  checkPermission("roles:manage"),
  validateRoleAssignment,
  auditLog("roles:assign", "user"),
  adminController.assignRoleToUser
);

router.delete("/users/:userId/roles/:roleId",
  checkPermission("roles:manage"),
  auditLog("roles:remove", "user"),
  adminController.removeRoleFromUser
);

router.get("/users/:userId/permissions",
  checkPermission(["users:read", "users:manage"]),
  adminController.getUserPermissions
);

router.get("/tasks",
  checkPermission("users:manage"),
  auditLog("tasks:read:all", "task"),
  adminController.getAllTasks
);

router.post("/roles",
  checkPermission("roles:manage"),
  validateRole,
  auditLog("roles:create", "role"),
  roleController.createRole
);

router.get("/roles",
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getAllRoles
);

router.get("/roles/:id",
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getRoleById
);

router.put("/roles/:id",
  checkPermission("roles:manage"),
  auditLog("roles:update", "role"),
  roleController.updateRole
);

router.delete("/roles/:id",
  checkPermission("roles:manage"),
  auditLog("roles:delete", "role"),
  roleController.deleteRole
);

router.post("/roles/:id/permissions",
  checkPermission("roles:manage"),
  auditLog("roles:permissions:add", "role"),
  roleController.addPermissionsToRole
);

router.delete("/roles/:id/permissions",
  checkPermission("roles:manage"),
  auditLog("roles:permissions:remove", "role"),
  roleController.removePermissionsFromRole
);

router.post("/permissions",
  checkPermission("permissions:manage"),
  validatePermission,
  auditLog("permissions:create", "permission"),
  permissionController.createPermission
);

router.get("/permissions",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getAllPermissions
);

router.get("/permissions/categories",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getPermissionCategories
);

router.get("/permissions/:id",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getPermissionById
);

router.put("/permissions/:id",
  checkPermission("permissions:manage"),
  auditLog("permissions:update", "permission"),
  permissionController.updatePermission
);

router.delete("/permissions/:id",
  checkPermission("permissions:manage"),
  auditLog("permissions:delete", "permission"),
  permissionController.deletePermission
);

router.get("/permissions/:id/roles",
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getRolesWithPermission
);

router.get("/audit-logs",
  checkPermission("audit:read"),
  auditController.getAuditLogs
);

router.get("/audit-logs/stats",
  checkPermission("audit:read"),
  auditController.getAuditStats
);

router.get("/audit-logs/recent",
  checkPermission("audit:read"),
  auditController.getRecentActivity
);

router.get("/audit-logs/errors",
  checkPermission("audit:read"),
  auditController.getRecentErrors
);

router.get("/audit-logs/user/:userId",
  checkPermission("audit:read"),
  auditController.getUserAuditLogs
);

router.get("/audit-logs/:id",
  checkPermission("audit:read"),
  auditController.getAuditLogById
);

module.exports = router;
