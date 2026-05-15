import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Génère un token JWT signé
 * @param {object} payload - données à encoder (id, email)
 */
export const generateToken = (payload) => {
  if (!SECRET) throw new Error('JWT_SECRET non défini');
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

/**
 * Vérifie et décode un token JWT
 * @param {string} token
 * @returns {object} payload décodé
 */
export const verifyToken = (token) => {
  if (!SECRET) throw new Error('JWT_SECRET non défini');
  return jwt.verify(token, SECRET);
};
