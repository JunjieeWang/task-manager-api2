/** task-manager-api/middleware/auditLog.js */
/**
 * Middleware d'Auditoria (auditLog)
 * Registra automàticament les accions dels usuaris
 * 
 * S'utilitza per registrar:
 * - Totes les accions d'escriptura (POST, PUT, DELETE)
 * - Accions de lectura sensibles (rutes /admin/*)
 * - Canvis de rol/permís
 * - Intents d'accés denegats
 */

const AuditLog = require("../models/AuditLog");

/**
 * Factory function per crear middleware d'auditoria
 * 
 * @param {string} action - Acció a registrar (ex: "tasks:create")
 * @param {string} resourceType - Tipus de recurs ("task", "user", "role", etc.)
 * @param {Object} options - Opcions addicionals
 * @param {Function} options.getResourceId - Funció per obtenir l'ID del recurs de req
 * @param {Function} options.getResourceDetails - Funció per obtenir detalls del recurs
 * @param {Function} options.getChanges - Funció per obtenir els canvis realitzats
 * @returns {Function} Middleware d'Express
 */
function auditLog(action, resourceType, options = {}) {
  return async (req, res, next) => {
    // Guardem la funció original de res.json per interceptar la resposta
    const originalJson = res.json.bind(res);
    
    // Capturem el temps d'inici
    const startTime = Date.now();
    
    // Sobreescrivim res.json per capturar la resposta
    res.json = async function(data) {
      try {
        // Només registrem si hi ha usuari autenticat
        if (req.user) {
          const status = res.statusCode >= 400 ? "error" : "success";
          
          // Obtenim l'ID del recurs si s'ha definit la funció
          let resourceId = null;
          if (options.getResourceId) {
            resourceId = options.getResourceId(req, data);
          } else if (req.params.id) {
            resourceId = req.params.id;
          } else if (data?.data?._id) {
            resourceId = data.data._id;
          } else if (data?.task?._id) {
            resourceId = data.task._id;
          }

          // Obtenim detalls del recurs
          let resourceDetails = "";
          if (options.getResourceDetails) {
            resourceDetails = options.getResourceDetails(req, data);
          }

          // Obtenim els canvis si és una actualització
          let changes = null;
          if (options.getChanges && req.method === "PUT") {
            changes = options.getChanges(req, data);
          } else if (req.method === "PUT" || req.method === "PATCH") {
            // Registrem el body com a canvis si no hi ha funció específica
            changes = { requestBody: req.body };
          }

          // Creem el registre d'auditoria
          await AuditLog.log({
            user: req.user,
            action,
            resourceType,
            resourceId,
            resourceDetails,
            status,
            errorMessage: status === "error" ? (data?.error || data?.message || "") : "",
            changes,
            req
          });
        }
      } catch (err) {
        // No volem que errors d'auditoria bloquegin la resposta
        console.error("Error en auditoria:", err.message);
      }

      // Cridem la funció original
      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware per auditar accessos denegats
 * S'utilitza quan es denega l'accés a una ruta
 */
async function auditDenied(req, action, errorMessage) {
  if (req.user) {
    try {
      await AuditLog.log({
        user: req.user,
        action,
        resourceType: "system",
        status: "denied",
        errorMessage,
        req
      });
    } catch (err) {
      console.error("Error registrant accés denegat:", err.message);
    }
  }
}

/**
 * Middleware per auditar errors
 */
async function auditError(req, action, resourceType, errorMessage) {
  if (req.user) {
    try {
      await AuditLog.log({
        user: req.user,
        action,
        resourceType,
        status: "error",
        errorMessage,
        req
      });
    } catch (err) {
      console.error("Error registrant error:", err.message);
    }
  }
}

/**
 * Middleware genèric que registra totes les peticions d'escriptura
 * Útil per aplicar a tot el router
 */
function auditWriteOperations() {
  return async (req, res, next) => {
    // Només auditem operacions d'escriptura
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return next();
    }

    // Determinem l'acció basada en el mètode i la ruta
    const action = getActionFromRequest(req);
    const resourceType = getResourceTypeFromPath(req.path);

    // Guardem la funció original
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      try {
        if (req.user) {
          await AuditLog.log({
            user: req.user,
            action,
            resourceType,
            resourceId: req.params.id || data?.data?._id || null,
            status: res.statusCode >= 400 ? "error" : "success",
            errorMessage: res.statusCode >= 400 ? (data?.error || data?.message || "") : "",
            changes: req.body,
            req
          });
        }
      } catch (err) {
        console.error("Error en auditoria automàtica:", err.message);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Obté l'acció basada en la petició
 */
function getActionFromRequest(req) {
  const method = req.method.toLowerCase();
  const resource = getResourceTypeFromPath(req.path);
  
  const methodMap = {
    post: "create",
    put: "update",
    patch: "update",
    delete: "delete"
  };
  
  return `${resource}s:${methodMap[method] || method}`;
}

/**
 * Obté el tipus de recurs de la ruta
 */
function getResourceTypeFromPath(path) {
  if (path.includes("/tasks")) return "task";
  if (path.includes("/users")) return "user";
  if (path.includes("/roles")) return "role";
  if (path.includes("/permissions")) return "permission";
  if (path.includes("/auth")) return "auth";
  return "system";
}

module.exports = auditLog;
module.exports.auditDenied = auditDenied;
module.exports.auditError = auditError;
module.exports.auditWriteOperations = auditWriteOperations;
