/** task-manager-api/utils/generateToken.js */
/**
 * Utilitat per generar tokens JWT (generateToken)
 * Crea un token JSON Web Token amb les dades de l'usuari
 */

const jwt = require("jsonwebtoken");

/**
 * Genera un token JWT per un usuari
 * 
 * @param {Object} user - Objecte usuari amb _id, email i role
 * @returns {string} Token JWT signat
 * @throws {Error} Si JWT_SECRET no estÃ  configurat
 */
function generateToken(user) {
  // Obtenim la clau secreta de les variables d'entorn
  const secret = process.env.JWT_SECRET;
  
  // Obtenim el temps d'expiraciÃ³ (per defecte 7 dies)
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  // Validem que existeixi la clau secreta
  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado en .env");
  }

  // Generem i retornem el token
  // El payload contÃ© les dades que estaran disponibles al decodificar el token
  return jwt.sign(
    {
      userId: String(user._id),  // ID de l'usuari
      email: user.email,          // Email de l'usuari
      role: user.role,            // Rol de l'usuari
    },
    secret,       // Clau secreta per signar
    { expiresIn } // Opcions (temps d'expiraciÃ³)
  );
}

module.exports = generateToken;