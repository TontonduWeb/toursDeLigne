const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tour-de-ligne-dev-secret-key';

function genererToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifierToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.utilisateur = { id: decoded.id, nom: decoded.nom, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function verifierAdmin(req, res, next) {
  if (!req.utilisateur || req.utilisateur.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

module.exports = { verifierToken, verifierAdmin, genererToken, JWT_SECRET };
