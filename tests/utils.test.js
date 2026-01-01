global.DOMPurify = {
  sanitize: jest.fn((input) => input.replace(/<[^>]*>/g, ''))
};

global.window = {
  web3: {
    eth: {
      accounts: ['0x123']
    }
  }
};

global.localStorage = {
  setItem: jest.fn()
};

global.console = {
  log: jest.fn()
};

const { sanitizeInput, checkRateLimit, auditLog } = require('../assets/js/utils');

describe('sanitizeInput', () => {
  test('should sanitize input to prevent XSS', () => {
    const input = '<script>alert("xss")</script>';
    expect(sanitizeInput(input)).toBe('alert("xss")');
  });

  test('should allow safe text', () => {
    const input = 'safe text';
    expect(sanitizeInput(input)).toBe('safe text');
  });
});

describe('checkRateLimit', () => {
  test('should allow requests within limit', () => {
    expect(checkRateLimit('test')).toBe(true);
  });

  test('should block requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test2');
    }
    expect(checkRateLimit('test2')).toBe(false);
  });
});

// Mock localStorage and console for auditLog
global.localStorage = {
  setItem: jest.fn()
};
global.console = {
  log: jest.fn()
};

describe('auditLog', () => {
  test('should log audit information', () => {
    auditLog('test_action', { detail: 'test' });
    expect(console.log).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalled();
  });
});