/**
 * @file services/jwtService.js
 * @description Servei centralitzat per a la gestió de tokens JWT.
 * Implementa el sistema de doble token: Access Token (15 min) + Refresh Token (7 dies).
 */
const jwt = require("jsonwebtoken");

const ACCESS_EXPIRES  = "15m";
const REFRESH_EXPIRES = "7d";

function getSecret()        { return process.env.JWT_SECRET; }
function getRefreshSecret() { return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET; }

/**
 * Genera un Access Token JWT per a un usuari.
 * @param {string} userId - ID de l'usuari (ObjectId de MongoDB).
 * @param {string[]} roles - Array de noms de rols de l'usuari.
 * @param {string[]} permissions - Array de noms de permisos efectius.
 * @returns {string} Token JWT signat, vàlid durant 15 minuts.
 */
function generateAccessToken(userId, roles = [], permissions = []) {
  return jwt.sign(
    { userId: String(userId), roles, permissions, tokenType: "access" },
    getSecret(),
    { expiresIn: ACCESS_EXPIRES }
  );
}

/**
 * Genera un Refresh Token JWT per a un usuari.
 * @param {string} userId - ID de l'usuari (ObjectId de MongoDB).
 * @returns {string} Token JWT signat, vàlid durant 7 dies.
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId: String(userId), tokenType: "refresh" },
    getRefreshSecret(),
    { expiresIn: REFRESH_EXPIRES }
  );
}

/**
 * Verifica i decodifica un Access Token.
 * @param {string} token - Token JWT a verificar.
 * @returns {object} Payload decodificat del token.
 * @throws {JsonWebTokenError} Si el token és invàlid o ha expirat.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

/**
 * Verifica i decodifica un Refresh Token.
 * @param {string} token - Token JWT a verificar.
 * @returns {object} Payload decodificat del token.
 * @throws {JsonWebTokenError} Si el token és invàlid o ha expirat.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
