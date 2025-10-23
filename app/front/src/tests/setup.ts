import '@testing-library/jest-dom';

// Mock de localStorage avec stockage en mémoire
const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => storage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete storage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach(key => delete storage[key]);
  }),
};

global.localStorage = localStorageMock as any;

// Mock de fetch pour les appels API
global.fetch = jest.fn();

// Mock de console.error pour éviter les warnings dans les tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: useLayoutEffect') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Reset des mocks et du localStorage après chaque test
afterEach(() => {
  jest.clearAllMocks();
  
  // Vider complètement le localStorage
  Object.keys(storage).forEach(key => delete storage[key]);
  
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  (global.fetch as jest.Mock).mockClear();
});