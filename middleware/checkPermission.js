/** task-manager-api/middleware/checkPermission.js */
/**
 * Middleware de Verificació de Permisos (checkPermission)
 * 
 * Verifica que l'usuari autenticat tingui el permís necessari
 * per accedir a la ruta
 * 
 * Exemple d'ús: 
 *   checkPermission("tasks:create") - Requereix permís de crear tasques
 *   checkPermission(["tasks:update", "tasks:delete"]) - Requereix qualsevol dels dos
 */

const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

/**
 * Factory function que retorna un middleware de verificació de permisos
 * 
 * @param {string|string[]} requiredPermissions - Permís(os) requerit(s)
 * @param {Object} options - Opcions addicionals
 * @param {boolean} options.requireAll - Si true, requereix TOTS els permisos (AND). Si false, qualsevol (OR)
 * @returns {Function} Middleware d'Express
 */
function checkPermission(requiredPermissions, options = { requireAll: false }) {
  // Convertim a array si és un string
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  return async (req, res, next) => {
    try {
      // Verifiquem que l'usuari estigui autenticat
      if (!req.user) {
        // Registrem intent d'accés sense autenticació
        return next(new ErrorResponse("No autoritzat: cal autenticació", 401));
      }

      // Obtenim l'usuari complet de la base de dades amb els rols
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return next(new ErrorResponse("Usuari no trobat", 404));
      }

      // Obtenim tots els permisos de l'usuari
      const userPermissions = await user.getAllPermissions();
      
      // Guardem els permisos a req.user per ús posterior
      req.user.permissions = userPermissions;

      // Verifiquem si té els permisos necessaris
      let hasPermission;
      
      if (options.requireAll) {
        // Requereix TOTS els permisos (AND)
        hasPermission = permissions.every(p => userPermissions.includes(p));
      } else {
        // Requereix QUALSEVOL dels permisos (OR)
        hasPermission = permissions.some(p => userPermissions.includes(p));
      }

      if (!hasPermission) {
        // Registrem intent d'accés denegat
        await AuditLog.log({
          user: req.user,
          action: permissions.join(", "),
          resourceType: getResourceTypeFromPermission(permissions[0]),
          status: "denied",
          errorMessage: `Permisos requerits: ${permissions.join(", ")}`,
          req
        });

        return next(new ErrorResponse(
          `Accés denegat: necessites el permís '${permissions.join("' o '")}'`,
          403
        ));
      }

      // L'usuari té els permisos, continuem
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware per verificar si l'usuari és admin (té tots els permisos)
 * Útil per rutes que només admins poden accedir
 */
function requireAdmin() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ErrorResponse("No autoritzat", 401));
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return next(new ErrorResponse("Usuari no trobat", 404));
      }

      const roleNames = await user.getRoleNames();
      
      if (!roleNames.includes("admin")) {
        await AuditLog.log({
          user: req.user,
          action: "admin:access",
          resourceType: "system",
          status: "denied",
          errorMessage: "Intent d'accés a ruta d'admin sense permisos",
          req
        });

        return next(new ErrorResponse("Accés denegat: només administradors", 403));
      }

      req.user.isAdmin = true;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Funció auxiliar per extreure el tipus de recurs del nom del permís
 * @param {string} permission - Nom del permís (ex: "tasks:create")
 * @returns {string} Tipus de recurs
 */
function getResourceTypeFromPermission(permission) {
  if (!permission) return "system";
  const [resource] = permission.split(":");
  
  const resourceMap = {
    tasks: "task",
    users: "user",
    roles: "role",
    permissions: "permission",
    audit: "system"
  };
  
  return resourceMap[resource] || "system";
}

module.exports = checkPermission;
module.exports.requireAdmin = requireAdmin;
