/** task-manager-api/controllers/auditController.js */
/**
 * Controlador d'Auditoria (auditController)
 * Gestiona les consultes al registre d'auditoria:
 * - Llistar registres amb filtres
 * - Obtenir detalls d'un registre
 * - Obtenir historial d'un usuari
 * - Obtenir estadístiques
 */

const AuditLog = require("../models/AuditLog");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Obtenir tots els registres d'auditoria
 * GET /api/admin/audit-logs
 * 
 * Query params:
 * - userId: Filtrar per usuari
 * - action: Filtrar per acció
 * - status: Filtrar per estat (success, error, denied)
 * - resourceType: Filtrar per tipus de recurs
 * - startDate: Data d'inici
 * - endDate: Data de fi
 * - page: Número de pàgina (default: 1)
 * - limit: Registres per pàgina (default: 20, max: 100)
 */
async function getAuditLogs(req, res, next) {
  try {
    const {
      userId,
      action,
      status,
      resourceType,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Construïm el filtre
    const filter = {};

    if (userId) {
      filter.userId = userId;
    }

    if (action) {
      // Permet cercar per acció parcial
      filter.action = { $regex: action, $options: "i" };
    }

    if (status) {
      filter.status = status;
    }

    if (resourceType) {
      filter.resourceType = resourceType;
    }

    // Filtre de dates
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Afegim un dia per incloure tot el dia final
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lte = end;
      }
    }

    // Paginació
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Obtenim registres i total
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: logs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir un registre d'auditoria per ID
 * GET /api/admin/audit-logs/:id
 */
async function getAuditLogById(req, res, next) {
  try {
    const log = await AuditLog.findById(req.params.id);

    if (!log) {
      return next(new ErrorResponse("Registre no trobat", 404));
    }

    res.json({
      success: true,
      data: log
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir historial d'activitat d'un usuari
 * GET /api/admin/audit-logs/user/:userId
 */
async function getUserAuditLogs(req, res, next) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments({ userId })
    ]);

    // Obtenim un resum d'activitat
    const summary = await AuditLog.aggregate([
      { $match: { userId: require("mongoose").Types.ObjectId.createFromHexString(userId) } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          lastUsed: { $max: "$createdAt" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      summary,
      data: logs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir estadístiques d'auditoria
 * GET /api/admin/audit-logs/stats
 * 
 * Query params:
 * - startDate: Data d'inici
 * - endDate: Data de fi
 */
async function getAuditStats(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const stats = await AuditLog.getStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir accions recents (últimes 24h)
 * GET /api/admin/audit-logs/recent
 */
async function getRecentActivity(req, res, next) {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const logs = await AuditLog.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Agrupem per hora
    const byHour = {};
    for (const log of logs) {
      const hour = new Date(log.createdAt).getHours();
      if (!byHour[hour]) {
        byHour[hour] = { success: 0, error: 0, denied: 0 };
      }
      byHour[hour][log.status]++;
    }

    res.json({
      success: true,
      count: logs.length,
      byHour,
      data: logs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtenir errors recents
 * GET /api/admin/audit-logs/errors
 */
async function getRecentErrors(req, res, next) {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const errors = await AuditLog.find({
      status: { $in: ["error", "denied"] }
    })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      count: errors.length,
      data: errors
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getUserAuditLogs,
  getAuditStats,
  getRecentActivity,
  getRecentErrors
};
