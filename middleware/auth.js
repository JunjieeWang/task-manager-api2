/** task-manager-api/middleware/auth.js */
/**
 * Middleware d'Autenticació (auth) - VERSIÓ T8
 * Verifica que la petició contingui un token JWT vàlid
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Middleware per verificar l'autenticació via JWT
 */
async function auth(req, res, next) {
  try {
    // Obtenim el header Authorization
    const header = req.headers.authorization;

    // Verifiquem que existeixi i tingui el format correcte
    if (!header || !header.startsWith("Bearer ")) {
      return next(new ErrorResponse("No autoritzat: falta token", 401));
    }

    // Extraiem el token
    const token = header.split(" ")[1];
    
    // Obtenim la clau secreta
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      return next(new ErrorResponse("JWT_SECRET no configurat", 500));
    }

    // Verifiquem el token
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return next(new ErrorResponse("No autoritzat: token invàlid o expirat", 401));
    }

    // Busquem l'usuari amb els seus rols i permisos
    const user = await User.findById(decoded.userId)
      .populate({
        path: "roles",
        populate: {
          path: "permissions",
          select: "name"
        }
      });
    
    if (!user) {
      return next(new ErrorResponse("No autoritzat: usuari no existeix", 401));
    }

    // Recollim tots els permisos de tots els rols
    const permissions = new Set();
    const roleNames = [];
    
    for (const role of user.roles) {
      roleNames.push(role.name);
      if (role.permissions) {
        for (const perm of role.permissions) {
          permissions.add(perm.name);
        }
      }
    }

    // Afegim les dades de l'usuari a req.user
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      roles: roleNames,                    // NOU: Array de noms de rols
      permissions: Array.from(permissions), // NOU: Array de permisos
      role: user.role,                     // Legacy: per compatibilitat
      isAdmin: roleNames.includes("admin") // NOU: Flag d'admin
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Middleware opcional que NO requereix autenticació però
 * carrega l'usuari si el token existeix
 */
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      // No hi ha token, continuem sense usuari
      return next();
    }

    const token = header.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.userId)
        .populate({
          path: "roles",
          populate: {
            path: "permissions",
            select: "name"
          }
        });

      if (user) {
        const permissions = new Set();
        const roleNames = [];
        
        for (const role of user.roles) {
          roleNames.push(role.name);
          if (role.permissions) {
            for (const perm of role.permissions) {
              permissions.add(perm.name);
            }
          }
        }

        req.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          roles: roleNames,
          permissions: Array.from(permissions),
          role: user.role,
          isAdmin: roleNames.includes("admin")
        };
      }
    } catch (e) {
      // Token invàlid, continuem sense usuari
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
