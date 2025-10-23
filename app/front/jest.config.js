module.exports = {
  // Environnement de test pour React
  testEnvironment: 'jsdom',
  
  // Fichier de setup exécuté avant les tests
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  
  // Mapping des modules (pour CSS, images, etc.)
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
  },
  
  // Transformation des fichiers TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Patterns de fichiers de test
  testMatch: [
    '**/tests/integration/**/*.test.(ts|tsx)',
  ],
  
  // Couverture de code
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
  ],
  
  // Seuils de couverture
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // Timeout pour les tests (utile pour les tests asynchrones)
  testTimeout: 10000,
  
  // Ignorer certains dossiers
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  
  // Options pour les modules
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Variables d'environnement pour les tests
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
