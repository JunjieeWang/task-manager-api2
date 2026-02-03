/** task-manager-api/controllers/taskController.js */
/**
 * Controlador de Tasques (taskController)
 * Gestiona totes les operacions CRUD de tasques:
 * - Crear tasques
 * - Obtenir tasques (nomÃ©s les de l'usuari autenticat)
 * - Actualitzar tasques
 * - Eliminar tasques
 * - Gestionar imatges
 * - Obtenir estadÃ­stiques
 */

const Task = require("../models/Task");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Crear una nova tasca
 * POST /api/tasks
 * Body: { title, description?, cost?, hours_estimated?, completed?, image? }
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function createTask(req, res, next) {
  try {
    const { title, description, cost, hours_estimated, completed, image } = req.body;

    // Creem la tasca associant-la automÃ ticament a l'usuari autenticat
    const task = await Task.create({
      user: req.user._id,  // Assignem l'usuari actual com a propietari
      title,
      description,
      cost,
      hours_estimated,
      completed,
      image,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir totes les tasques de l'usuari autenticat
 * GET /api/tasks
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function getAllTasks(req, res, next) {
  try {
    // Filtrem per obtenir NOMÃ‰S les tasques de l'usuari autenticat
    const tasks = await Task.find({ user: req.user._id })
      .sort({ createdAt: -1 });  // Ordenem per data de creaciÃ³ (mÃ©s recents primer)
    
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir una tasca per ID
 * GET /api/tasks/:id
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function getTaskById(req, res, next) {
  try {
    // Busquem la tasca per ID I per usuari (verificaciÃ³ de propietat)
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    
    // Si no es troba, pot ser que no existeixi o que no pertanyi a l'usuari
    if (!task) {
      return next(new ErrorResponse("Task no encontrada", 404));
    }
    
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualitzar una tasca
 * PUT /api/tasks/:id
 * Body: { title?, description?, cost?, hours_estimated?, completed?, image? }
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function updateTask(req, res, next) {
  try {
    // Busquem la tasca verificant que pertanyi a l'usuari
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!task) {
      return next(new ErrorResponse("Task no encontrada", 404));
    }

    // Llista de camps que es poden actualitzar
    const allowed = ["title", "description", "cost", "hours_estimated", "completed", "image"];
    
    // Actualitzem nomÃ©s els camps permesos que s'han enviat
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        task[k] = req.body[k];
      }
    }

    // Guardem els canvis
    await task.save();
    
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar una tasca
 * DELETE /api/tasks/:id
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function deleteTask(req, res, next) {
  try {
    // Busquem la tasca verificant que pertanyi a l'usuari
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!task) {
      return next(new ErrorResponse("Task no encontrada", 404));
    }

    // Eliminem la tasca
    await task.deleteOne();
    
    res.json({ success: true, message: "Task eliminada" });
  } catch (err) {
    next(err);
  }
}

/**
 * Pujar/Actualitzar imatge d'una tasca
 * PUT /api/tasks/:id/image
 * Body: { image: "url o base64" }
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function uploadImage(req, res, next) {
  try {
    // Busquem la tasca verificant que pertanyi a l'usuari
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!task) {
      return next(new ErrorResponse("Task no encontrada", 404));
    }

    const { image } = req.body;
    
    // Validem que s'hagi enviat una imatge
    if (!image) {
      return next(new ErrorResponse("image requerido", 400));
    }

    // Actualitzem la imatge
    task.image = String(image);
    await task.save();

    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

/**
 * Restablir/Eliminar imatge d'una tasca
 * PUT /api/tasks/:id/image/reset
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function resetImage(req, res, next) {
  try {
    // Busquem la tasca verificant que pertanyi a l'usuari
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!task) {
      return next(new ErrorResponse("Task no encontrada", 404));
    }

    // Establim la imatge a buit
    task.image = "";
    await task.save();

    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir estadÃ­stiques de les tasques de l'usuari
 * GET /api/tasks/stats
 * 
 * Retorna: total, completades, pendents, cost total, hores totals
 * 
 * @param {Object} req - Objecte request d'Express
 * @param {Object} res - Objecte response d'Express
 * @param {Function} next - FunciÃ³ per passar al segÃ¼ent middleware
 */
async function getTaskStats(req, res, next) {
  try {
    const userId = req.user._id;

    // Comptem el total de tasques de l'usuari
    const total = await Task.countDocuments({ user: userId });
    
    // Comptem les tasques completades
    const completed = await Task.countDocuments({ user: userId, completed: true });
    
    // Calculem les pendents
    const pending = total - completed;

    // Utilitzem agregaciÃ³ per calcular sumes de cost i hores
    const agg = await Task.aggregate([
      // Primer filtrem per usuari
      { $match: { user: userId } },
      // DesprÃ©s agrupem i sumem
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          totalHours: { $sum: "$hours_estimated" },
        },
      },
    ]);

    // Si no hi ha tasques, els totals sÃ³n 0
    const totals = agg[0] || { totalCost: 0, totalHours: 0 };

    res.json({
      success: true,
      stats: { 
        total, 
        completed, 
        pending, 
        totalCost: totals.totalCost, 
        totalHours: totals.totalHours 
      },
    });
  } catch (err) {
    next(err);
  }
}

// Exportem totes les funcions del controlador
module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  uploadImage,
  resetImage,
  getTaskStats,
};