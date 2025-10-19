module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000, // ✅ 15 secondes au lieu de 5
  verbose: true,
  detectOpenHandles: true, // ✅ Détecter les fuites
  forceExit: true // ✅ Forcer la fermeture après les tests
};