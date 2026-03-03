const { genererToken } = require('../../middleware/auth');

function getAdminToken() {
  return genererToken({ id: 1, nom: 'Matthieu', role: 'admin' });
}

function getVendeurToken(nom = 'Alice') {
  return genererToken({ id: 99, nom, role: 'vendeur' });
}

module.exports = { getAdminToken, getVendeurToken };
