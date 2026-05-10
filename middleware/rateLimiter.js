/**
 * @file middleware/rateLimiter.js
 * @description Rate limiting basat en rols. Cada rol té un màxim de peticions per minut.
 * S'aplica després del middleware auth per tenir accés a req.user.
 */
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

/** Límits de peticions per minut segons el rol de l'usuari. */
const ROLE_LIMITS = {
  super_admin: 1000,
  admin: 500,
  manager: 200,
  user: 100,
  viewer: 50
};

/**
 * Retorna el límit màxim de peticions per als rols donats.
 * Agafa el valor més alt entre tots els rols de l'usuari.
 * @param {string[]} roles - Array de noms de rols.
 * @returns {number} Nombre màxim de peticions per minut.
 */
function getMaxForRoles(roles = []) {
  let max = 50;
  for (const role of roles) {
    const limit = ROLE_LIMITS[role.toLowerCase()] ?? 50;
    if (limit > max) max = limit;
  }
  return max;
}

// Rate limiter per a rutes protegides (req.user ja disponible)
const roleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => getMaxForRoles(req.user?.roles || []),
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too Many Requests",
      message: "Has superat el límit de peticions per minut"
    });
  }
});

// Rate limiter general per rutes públiques (login, register)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too Many Requests",
      message: "Has superat el límit de peticions"
    });
  }
});

module.exports = { roleLimiter, publicLimiter };
