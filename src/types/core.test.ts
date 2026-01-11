/**
 * Tests for core type definitions and utility functions
 */

import {
  createSuccess,
  createError,
  createValidationError,
  ValidationError,
  Option,
  Constraint,
} from './core';

describe('Core Types and Utilities', () => {
  describe('Result utilities', () => {
    it('should create successful results', () => {
      const result = createSuccess('test data');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test data');
      }
    });

    it('should create error results', () => {
      const error = createValidationError('field', 'message', 'code');
      const result = createError(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(error);
      }
    });
  });

  describe('ValidationError creation', () => {
    it('should create validation errors with correct structure', () => {
      const error = createValidationError('optionId', 'Invalid option ID', 'INVALID_ID');
      expect(error).toEqual({
        field: 'optionId',
        message: 'Invalid option ID',
        code: 'INVALID_ID',
      });
    });
  });

  describe('Type definitions', () => {
    it('should allow creating valid Option objects', () => {
      const option: Option = {
        id: 'opt1',
        name: 'Test Option',
        description: 'A test option',
        scores: new Map([['cost', 100], ['performance', 85]]),
        metadata: { category: 'test' },
      };

      expect(option.id).toBe('opt1');
      expect(option.name).toBe('Test Option');
      expect(option.scores.get('cost')).toBe(100);
    });

    it('should allow creating valid Constraint objects', () => {
      const constraint: Constraint = {
        id: 'cost',
        name: 'Cost',
        weight: 30,
        type: 'cost',
        direction: 'minimize',
        scale: {
          min: 0,
          max: 1000,
          unit: 'USD',
          description: 'Total cost in US dollars',
        },
      };

      expect(constraint.id).toBe('cost');
      expect(constraint.direction).toBe('minimize');
      expect(constraint.scale.unit).toBe('USD');
    });
  });
});