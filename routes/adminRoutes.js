/** task-manager-api/routes/adminRoutes.js */
/**
 * Rutes d'Administració (adminRoutes) - VERSIÓ T8
 * 
 * CANVIS RESPECTE T7:
 * - Afegides rutes de gestió de rols
 * - Afegides rutes de gestió de permisos
 * - Afegides rutes d'auditoria
 * - Canviat roleCheck per checkPermission
 */

const express = require("express");
const router = express.Router();

// Middlewares
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { requireAdmin } = require("../middleware/checkPermission");
const auditLog = require("../middleware/auditLog");

// Controladors
const adminController = require("../controllers/adminController");
const roleController = require("../controllers/roleController");
const permissionController = require("../controllers/permissionController");
const auditController = require("../controllers/auditController");

// Validadors
const { validateRole, validatePermission } = require("../middleware/validators/roleValidators");

// ============================================
// MIDDLEWARE D'AUTENTICACIÓ PER TOTES LES RUTES
// ============================================
router.use(auth);

// ============================================
// RUTES D'USUARIS
// ============================================

/**
 * GET /api/admin/users
 * Obtenir tots els usuaris
 * Requereix: users:read o users:manage
 */
router.get("/users", 
  checkPermission(["users:read", "users:manage"]),
  auditLog("users:read", "user"),
  adminController.getAllUsers
);

/**
 * GET /api/admin/users/:id
 * Obtenir un usuari per ID
 */
router.get("/users/:id", 
  checkPermission(["users:read", "users:manage"]),
  adminController.getUserById
);

/**
 * DELETE /api/admin/users/:id
 * Eliminar un usuari
 * Requereix: users:manage
 */
router.delete("/users/:id", 
  checkPermission("users:manage"),
  auditLog("users:delete", "user"),
  adminController.deleteUser
);

/**
 * PUT /api/admin/users/:id/role
 * Canviar rol d'un usuari (legacy - compatibilitat T7)
 */
router.put("/users/:id/role", 
  checkPermission("users:manage"),
  auditLog("users:update", "user"),
  adminController.changeUserRole
);

/**
 * POST /api/admin/users/:userId/roles
 * Assignar rol a un usuari
 */
router.post("/users/:userId/roles", 
  checkPermission("roles:manage"),
  auditLog("roles:assign", "user"),
  adminController.assignRoleToUser
);

/**
 * DELETE /api/admin/users/:userId/roles/:roleId
 * Eliminar rol d'un usuari
 */
router.delete("/users/:userId/roles/:roleId", 
  checkPermission("roles:manage"),
  auditLog("roles:remove", "user"),
  adminController.removeRoleFromUser
);

/**
 * GET /api/admin/users/:userId/permissions
 * Obtenir permisos efectius d'un usuari
 */
router.get("/users/:userId/permissions", 
  checkPermission(["users:read", "users:manage"]),
  adminController.getUserPermissions
);

// ============================================
// RUTES DE TASQUES (ADMIN)
// ============================================

/**
 * GET /api/admin/tasks
 * Obtenir totes les tasques
 */
router.get("/tasks", 
  checkPermission(["tasks:read", "users:manage"]),
  auditLog("tasks:read:all", "task"),
  adminController.getAllTasks
);

// ============================================
// RUTES DE ROLS
// ============================================

/**
 * POST /api/admin/roles
 * Crear un nou rol
 */
router.post("/roles", 
  checkPermission("roles:manage"),
  validateRole,
  auditLog("roles:create", "role"),
  roleController.createRole
);

/**
 * GET /api/admin/roles
 * Obtenir tots els rols
 */
router.get("/roles", 
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getAllRoles
);

/**
 * GET /api/admin/roles/:id
 * Obtenir un rol per ID
 */
router.get("/roles/:id", 
  checkPermission(["roles:read", "roles:manage"]),
  roleController.getRoleById
);

/**
 * PUT /api/admin/roles/:id
 * Actualitzar un rol
 */
router.put("/roles/:id", 
  checkPermission("roles:manage"),
  auditLog("roles:update", "role"),
  roleController.updateRole
);

/**
 * DELETE /api/admin/roles/:id
 * Eliminar un rol
 */
router.delete("/roles/:id", 
  checkPermission("roles:manage"),
  auditLog("roles:delete", "role"),
  roleController.deleteRole
);

/**
 * POST /api/admin/roles/:id/permissions
 * Afegir permisos a un rol
 */
router.post("/roles/:id/permissions", 
  checkPermission("roles:manage"),
  auditLog("roles:permissions:add", "role"),
  roleController.addPermissionsToRole
);

/**
 * DELETE /api/admin/roles/:id/permissions
 * Eliminar permisos d'un rol
 */
router.delete("/roles/:id/permissions", 
  checkPermission("roles:manage"),
  auditLog("roles:permissions:remove", "role"),
  roleController.removePermissionsFromRole
);

// ============================================
// RUTES DE PERMISOS
// ============================================

/**
 * POST /api/admin/permissions
 * Crear un nou permís
 */
router.post("/permissions", 
  checkPermission("permissions:manage"),
  validatePermission,
  auditLog("permissions:create", "permission"),
  permissionController.createPermission
);

/**
 * GET /api/admin/permissions
 * Obtenir tots els permisos
 */
router.get("/permissions", 
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getAllPermissions
);

/**
 * GET /api/admin/permissions/categories
 * Obtenir categories de permisos
 */
router.get("/permissions/categories", 
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getPermissionCategories
);

/**
 * GET /api/admin/permissions/:id
 * Obtenir un permís per ID
 */
router.get("/permissions/:id", 
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getPermissionById
);

/**
 * PUT /api/admin/permissions/:id
 * Actualitzar un permís
 */
router.put("/permissions/:id", 
  checkPermission("permissions:manage"),
  auditLog("permissions:update", "permission"),
  permissionController.updatePermission
);

/**
 * DELETE /api/admin/permissions/:id
 * Eliminar un permís
 */
router.delete("/permissions/:id", 
  checkPermission("permissions:manage"),
  auditLog("permissions:delete", "permission"),
  permissionController.deletePermission
);

/**
 * GET /api/admin/permissions/:id/roles
 * Obtenir rols que tenen un permís
 */
router.get("/permissions/:id/roles", 
  checkPermission(["permissions:read", "permissions:manage"]),
  permissionController.getRolesWithPermission
);

// ============================================
// RUTES D'AUDITORIA
// ============================================

/**
 * GET /api/admin/audit-logs
 * Obtenir registres d'auditoria
 */
router.get("/audit-logs", 
  checkPermission("audit:read"),
  auditController.getAuditLogs
);

/**
 * GET /api/admin/audit-logs/stats
 * Obtenir estadístiques d'auditoria
 */
router.get("/audit-logs/stats", 
  checkPermission("audit:read"),
  auditController.getAuditStats
);

/**
 * GET /api/admin/audit-logs/recent
 * Obtenir activitat recent
 */
router.get("/audit-logs/recent", 
  checkPermission("audit:read"),
  auditController.getRecentActivity
);

/**
 * GET /api/admin/audit-logs/errors
 * Obtenir errors recents
 */
router.get("/audit-logs/errors", 
  checkPermission("audit:read"),
  auditController.getRecentErrors
);

/**
 * GET /api/admin/audit-logs/user/:userId
 * Obtenir historial d'un usuari
 */
router.get("/audit-logs/user/:userId", 
  checkPermission("audit:read"),
  auditController.getUserAuditLogs
);

/**
 * GET /api/admin/audit-logs/:id
 * Obtenir un registre per ID
 */
router.get("/audit-logs/:id", 
  checkPermission("audit:read"),
  auditController.getAuditLogById
);

module.exports = router;
