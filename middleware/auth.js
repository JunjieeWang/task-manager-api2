/** middleware/auth.js */
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const ErrorResponse = require("../utils/errorResponse");

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return next(new ErrorResponse("No autoritzat: falta token", 401));
    }

    const token = header.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next(new ErrorResponse("JWT_SECRET no configurat", 500));
    }

    // Verificar signatura i expiració
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      if (e.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, error: "Token expired", code: "TOKEN_EXPIRED" });
      }
      return next(new ErrorResponse("No autoritzat: token invàlid", 401));
    }

    // Comprovar blacklist
    const blacklisted = await TokenBlacklist.findOne({ token });
    if (blacklisted) {
      return next(new ErrorResponse("No autoritzat: token revocat", 401));
    }

    // Carregar usuari amb rols i permisos
    const user = await User.findById(decoded.userId).populate({
      path: "roles",
      populate: { path: "permissions", select: "name" }
    });

    if (!user) {
      return next(new ErrorResponse("No autoritzat: usuari no existeix", 401));
    }

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

    // Afegir permisos delegats actius
    try {
      const DelegatedPermission = require("../models/DelegatedPermission");
      const delegated = await DelegatedPermission.find({
        toUserId: user._id,
        status: "active",
        expiresAt: { $gt: new Date() }
      });
      for (const d of delegated) {
        permissions.add(d.permission);
      }
    } catch (_) { /* model pot no existir durant arrencada */ }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      roles: roleNames,
      permissions: Array.from(permissions),
      role: user.role,
      isAdmin: roleNames.includes("admin") || roleNames.includes("super_admin")
    };

    req.token = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return next();

    const token = header.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();

    try {
      const decoded = jwt.verify(token, secret);
      const blacklisted = await TokenBlacklist.findOne({ token });
      if (blacklisted) return next();

      const user = await User.findById(decoded.userId).populate({
        path: "roles",
        populate: { path: "permissions", select: "name" }
      });

      if (user) {
        const permissions = new Set();
        const roleNames = [];
        for (const role of user.roles) {
          roleNames.push(role.name);
          if (role.permissions) {
            for (const perm of role.permissions) permissions.add(perm.name);
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
        req.token = token;
      }
    } catch (_) { /* token invàlid o expirat, continuem */ }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
