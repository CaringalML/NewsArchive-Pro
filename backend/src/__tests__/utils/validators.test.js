/**
 * Validators Unit Tests
 */

const { validateRequest, validateFileType, validateUuid } = require('../../utils/validators');

describe('Validators', () => {
  describe('validateRequest', () => {
    it('should return valid for all required fields present', () => {
      const data = { name: 'test', email: 'test@example.com' };
      const result = validateRequest(data, ['name', 'email']);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for missing fields', () => {
      const data = { name: 'test' };
      const result = validateRequest(data, ['name', 'email']);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing required fields: email');
    });
  });

  describe('validateFileType', () => {
    it('should validate allowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      
      expect(validateFileType('image/jpeg', allowedTypes)).toBe(true);
      expect(validateFileType('image/gif', allowedTypes)).toBe(false);
    });
  });

  describe('validateUuid', () => {
    it('should validate UUID format', () => {
      expect(validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUuid('invalid-uuid')).toBe(false);
      expect(validateUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });
});