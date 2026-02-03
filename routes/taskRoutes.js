/** task-manager-api/routes/taskRoutes.js */

const express = require("express");
const router = express.Router();

// Middlewares
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const auditLog = require("../middleware/auditLog");
const { 
  createTaskValidation, 
  updateTaskValidation 
} = require("../middleware/validators/taskValidators");
const { handleValidation } = require("../middleware/validators/_common");

// Controladors
const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  uploadImage,
  resetImage,
  getTaskStats
} = require("../controllers/taskController");

// ============================================
// MIDDLEWARE D'AUTENTICACIÓ PER TOTES LES RUTES
// ============================================
router.use(auth);

// ============================================
// RUTES DE TASQUES
// ============================================

/**
 * GET /api/tasks/stats
 * Obtenir estadístiques de les tasques de l'usuari
 * Requereix: tasks:read
 */
router.get("/stats", 
  checkPermission("tasks:read"),
  getTaskStats
);

/**
 * POST /api/tasks
 * Crear una nova tasca
 * Requereix: tasks:create
 */
router.post("/", 
  checkPermission("tasks:create"),
  createTaskValidation, 
  handleValidation,
  auditLog("tasks:create", "task", {
    getResourceId: (req, data) => data?.task?._id,
    getResourceDetails: (req, data) => data?.task?.title || ""
  }),
  createTask
);

/**
 * GET /api/tasks
 * Obtenir totes les tasques de l'usuari
 * Requereix: tasks:read
 */
router.get("/", 
  checkPermission("tasks:read"),
  getAllTasks
);

/**
 * GET /api/tasks/:id
 * Obtenir una tasca per ID
 * Requereix: tasks:read
 */
router.get("/:id", 
  checkPermission("tasks:read"),
  getTaskById
);

/**
 * PUT /api/tasks/:id
 * Actualitzar una tasca
 * Requereix: tasks:update
 */
router.put("/:id", 
  checkPermission("tasks:update"),
  updateTaskValidation, 
  handleValidation,
  auditLog("tasks:update", "task", {
    getChanges: (req, data) => ({
      requestBody: req.body,
      updatedFields: Object.keys(req.body)
    })
  }),
  updateTask
);

/**
 * DELETE /api/tasks/:id
 * Eliminar una tasca
 * Requereix: tasks:delete
 */
router.delete("/:id", 
  checkPermission("tasks:delete"),
  auditLog("tasks:delete", "task"),
  deleteTask
);

/**
 * PUT /api/tasks/:id/image
 * Pujar/Actualitzar imatge d'una tasca
 * Requereix: tasks:update
 */
router.put("/:id/image", 
  checkPermission("tasks:update"),
  auditLog("tasks:image:update", "task"),
  uploadImage
);

/**
 * PUT /api/tasks/:id/image/reset
 * Restablir imatge d'una tasca
 * Requereix: tasks:update
 */
router.put("/:id/image/reset", 
  checkPermission("tasks:update"),
  auditLog("tasks:image:reset", "task"),
  resetImage
);

module.exports = router;