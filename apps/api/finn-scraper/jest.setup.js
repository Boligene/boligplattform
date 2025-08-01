// Jest setup for BRA extraction tests

// Mock console.log for cleaner test output
global.mockConsole = () => {
  return jest.spyOn(console, 'log').mockImplementation(() => {});
};

// Helper function to restore console
global.restoreConsole = (spy) => {
  if (spy && spy.mockRestore) {
    spy.mockRestore();
  }
};

// Set longer timeout for integration tests
jest.setTimeout(10000);