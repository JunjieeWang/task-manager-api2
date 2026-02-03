/** task-manager-api/models/AuditLog.js */
/**
 * Model d'Auditoria (AuditLog)
 * Registra totes les accions dels usuaris per a seguiment i seguretat
 * 
 * Cada registre conté: qui, què, quan, on i el resultat de l'acció
 */

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // Usuari que ha realitzat l'acció
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Nom de l'usuari (guardem per si l'usuari s'elimina)
    userName: {
      type: String,
      required: true
    },

    // Email de l'usuari
    userEmail: {
      type: String,
      required: true
    },

    // Acció realitzada (format: recurs:acció, ex: tasks:create)
    action: {
      type: String,
      required: [true, "Acció requerida"],
      trim: true
    },

    // Tipus de recurs afectat (task, user, role, permission)
    resourceType: {
      type: String,
      required: true,
      enum: ["task", "user", "role", "permission", "auth", "system"]
    },

    // ID del recurs afectat (si aplica)
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    // Detalls del recurs (per tenir context si s'elimina)
    resourceDetails: {
      type: String,
      default: ""
    },

    // Estat de l'acció
    status: {
      type: String,
      enum: ["success", "error", "denied"],
      required: true
    },

    // Missatge d'error (si status és error o denied)
    errorMessage: {
      type: String,
      default: ""
    },

    // Canvis realitzats (objecte amb abans/després)
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Adreça IP del client
    ipAddress: {
      type: String,
      default: "unknown"
    },

    // User-Agent del navegador/client
    userAgent: {
      type: String,
      default: "unknown"
    },

    // Mètode HTTP (GET, POST, PUT, DELETE)
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      required: true
    },

    // Ruta de l'endpoint
    endpoint: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true // Afegeix createdAt automàticament
  }
);

// Índexs per millorar les cerques
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// Mètode estàtic per crear un registre d'auditoria
auditLogSchema.statics.log = async function({
  user,
  action,
  resourceType,
  resourceId = null,
  resourceDetails = "",
  status,
  errorMessage = "",
  changes = null,
  req
}) {
  return this.create({
    userId: user._id,
    userName: user.name || "Unknown",
    userEmail: user.email,
    action,
    resourceType,
    resourceId,
    resourceDetails,
    status,
    errorMessage,
    changes,
    ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
    userAgent: req.get("User-Agent") || "unknown",
    method: req.method,
    endpoint: req.originalUrl
  });
};

// Mètode estàtic per obtenir estadístiques
auditLogSchema.statics.getStats = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [totalActions, successRate, topActions, topUsers, recentErrors] = await Promise.all([
    // Total d'accions
    this.countDocuments(match),
    
    // Taxa d'èxit
    this.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } }
        }
      },
      {
        $project: {
          rate: { $multiply: [{ $divide: ["$success", "$total"] }, 100] }
        }
      }
    ]),
    
    // Top accions
    this.aggregate([
      { $match: match },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { action: "$_id", count: 1, _id: 0 } }
    ]),
    
    // Top usuaris
    this.aggregate([
      { $match: match },
      { $group: { _id: { id: "$userId", name: "$userName" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { userId: "$_id.id", userName: "$_id.name", count: 1, _id: 0 } }
    ]),
    
    // Errors recents
    this.aggregate([
      { $match: { ...match, status: { $in: ["error", "denied"] } } },
      { $group: { _id: { action: "$action", error: "$errorMessage" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { action: "$_id.action", error: "$_id.error", count: 1, _id: 0 } }
    ])
  ]);

  return {
    totalActions,
    successRate: successRate[0]?.rate?.toFixed(2) || 100,
    topActions,
    topUsers,
    recentErrors
  };
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
