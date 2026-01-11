/**
 * Tests for InputValidator class
 * Includes both unit tests and property-based tests
 */

import fc from 'fast-check';
import { InputValidator } from './InputValidator';
import { Option, Constraint } from '../types/core';

describe('InputValidator', () => {
  describe('Unit Tests', () => {
    describe('validateOption', () => {
      it('should validate correct options', () => {
        const validOption = {
          id: 'opt1',
          name: 'Test Option',
          description: 'A test option',
          scores: new Map([['cost', 100], ['performance', 85]]),
          metadata: { category: 'test' },
        };

        const result = InputValidator.validateOption(validOption);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject options with invalid IDs', () => {
        const invalidOption = {
          id: 'invalid id!',
          name: 'Test Option',
          scores: new Map([['cost', 100]]),
        };

        const result = InputValidator.validateOption(invalidOption);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_ID_FORMAT')).toBe(true);
      });

      it('should reject options with missing required fields', () => {
        const invalidOption = {
          id: '',
          name: '',
          scores: new Map(),
        };

        const result = InputValidator.validateOption(invalidOption);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
        expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
      });

      it('should reject options with invalid scores', () => {
        const invalidOption = {
          id: 'opt1',
          name: 'Test Option',
          scores: new Map([['cost', NaN], ['performance', 85]]),
        };

        const result = InputValidator.validateOption(invalidOption);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_SCORE')).toBe(true);
      });

      it('should convert object scores to Map', () => {
        const optionWithObjectScores = {
          id: 'opt1',
          name: 'Test Option',
          scores: { cost: 100, performance: 85 },
        };

        const result = InputValidator.validateOption(optionWithObjectScores);
        expect(result.isValid).toBe(true);
        expect(optionWithObjectScores.scores instanceof Map).toBe(true);
      });
    });

    describe('validateConstraint', () => {
      it('should validate correct constraints', () => {
        const validConstraint = {
          id: 'cost',
          name: 'Cost',
          weight: 30,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 1000, unit: 'USD' },
        };

        const result = InputValidator.validateConstraint(validConstraint);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject constraints with invalid types', () => {
        const invalidConstraint = {
          id: 'test',
          name: 'Test',
          weight: 30,
          type: 'invalid',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        };

        const result = InputValidator.validateConstraint(invalidConstraint);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
      });

      it('should reject constraints with invalid scale ranges', () => {
        const invalidConstraint = {
          id: 'test',
          name: 'Test',
          weight: 30,
          type: 'custom',
          direction: 'maximize',
          scale: { min: 100, max: 50 }, // min > max
        };

        const result = InputValidator.validateConstraint(invalidConstraint);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_SCALE_RANGE')).toBe(true);
      });
    });

    describe('sanitizeOption', () => {
      it('should sanitize and normalize option data', () => {
        const dirtyOption = {
          id: '  opt1  ',
          name: '  Test Option  ',
          description: '  A test  ',
          scores: { cost: '100', performance: 85.5 },
          metadata: { test: true },
        };

        const sanitized = InputValidator.sanitizeOption(dirtyOption);
        expect(sanitized.id).toBe('opt1');
        expect(sanitized.name).toBe('Test Option');
        expect(sanitized.description).toBe('A test');
        expect(sanitized.scores instanceof Map).toBe(true);
        expect(sanitized.scores.get('cost')).toBe(100);
        expect(sanitized.scores.get('performance')).toBe(85.5);
      });

      it('should handle invalid scores gracefully', () => {
        const dirtyOption = {
          id: 'opt1',
          name: 'Test Option',
          scores: { cost: 'invalid', performance: NaN, valid: 100 },
        };

        const sanitized = InputValidator.sanitizeOption(dirtyOption);
        expect(sanitized.scores.has('cost')).toBe(false); // Invalid string score removed
        expect(sanitized.scores.has('performance')).toBe(false); // NaN removed
        expect(sanitized.scores.get('valid')).toBe(100); // Valid score kept
        expect(sanitized.scores.size).toBe(1); // Only valid score remains
      });
    });

    describe('validateOptions', () => {
      it('should validate arrays of options', () => {
        const options = [
          { id: 'opt1', name: 'Option 1', scores: new Map([['cost', 100]]) },
          { id: 'opt2', name: 'Option 2', scores: new Map([['cost', 200]]) },
        ];

        const result = InputValidator.validateOptions(options);
        expect(result.isValid).toBe(true);
      });

      it('should reject arrays with too few options', () => {
        const options = [
          { id: 'opt1', name: 'Option 1', scores: new Map([['cost', 100]]) },
        ];

        const result = InputValidator.validateOptions(options);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INSUFFICIENT_OPTIONS')).toBe(true);
      });

      it('should reject arrays with duplicate IDs', () => {
        const options = [
          { id: 'opt1', name: 'Option 1', scores: new Map([['cost', 100]]) },
          { id: 'opt1', name: 'Option 2', scores: new Map([['cost', 200]]) },
        ];

        const result = InputValidator.validateOptions(options);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
      });
    });

    describe('validateDataCompleteness', () => {
      it('should validate that options have scores for all constraints', () => {
        const options: Option[] = [
          {
            id: 'opt1',
            name: 'Option 1',
            scores: new Map([['cost', 100], ['performance', 85]]),
          },
          {
            id: 'opt2',
            name: 'Option 2',
            scores: new Map([['cost', 200]]), // Missing performance score
          },
        ];

        const constraints: Constraint[] = [
          {
            id: 'cost',
            name: 'Cost',
            weight: 50,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 0, max: 1000 },
          },
          {
            id: 'performance',
            name: 'Performance',
            weight: 50,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 0, max: 100 },
          },
        ];

        const result = InputValidator.validateDataCompleteness(options, constraints);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'MISSING_SCORE')).toBe(true);
      });
    });
  });

  describe('Property-Based Tests', () => {
    // Generator for invalid option data
    const invalidOptionArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.record({
        id: fc.oneof(fc.constant(''), fc.constant(null), fc.integer()),
        name: fc.oneof(fc.constant(''), fc.constant(null), fc.integer()),
        scores: fc.oneof(fc.constant(null), fc.string(), fc.integer()),
      }),
      fc.record({
        id: fc.string().filter(s => !/^[a-zA-Z0-9_-]+$/.test(s) || s.length === 0),
        name: fc.string({ minLength: 1 }),
        scores: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.constant(NaN), fc.constant(Infinity))),
      })
    );

    // Generator for invalid constraint data
    const invalidConstraintArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.record({
        id: fc.oneof(fc.constant(''), fc.constant(null)),
        name: fc.oneof(fc.constant(''), fc.constant(null)),
        weight: fc.oneof(fc.constant(-1), fc.constant(NaN), fc.string()),
        type: fc.string().filter(s => !['cost', 'performance', 'efficiency', 'custom'].includes(s)),
        direction: fc.string().filter(s => !['maximize', 'minimize'].includes(s)),
        scale: fc.oneof(
          fc.constant(null),
          fc.record({
            min: fc.oneof(fc.constant(NaN), fc.string()),
            max: fc.oneof(fc.constant(NaN), fc.string()),
          }),
          fc.record({
            min: fc.integer({ min: 50, max: 100 }),
            max: fc.integer({ min: 0, max: 49 }), // min > max
          })
        ),
      })
    );

    /**
     * Property 6: Data Validation and Error Handling
     * For any input data (valid or invalid), the system should validate data types and ranges, 
     * provide descriptive error messages for invalid inputs, handle missing data gracefully, 
     * and maintain system stability.
     * **Feature: option-referee, Property 6: Data Validation and Error Handling**
     * **Validates: Requirements 6.1, 6.2, 6.4**
     */
    it('Property 6: Data Validation and Error Handling', () => {
      // Test that invalid options are always rejected with descriptive errors
      fc.assert(
        fc.property(invalidOptionArb, (invalidOption) => {
          const result = InputValidator.validateOption(invalidOption);
          
          // Should always reject invalid input
          expect(result.isValid).toBe(false);
          
          // Should provide descriptive error messages
          expect(result.errors.length).toBeGreaterThan(0);
          result.errors.forEach(error => {
            expect(error.field).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.code).toBeDefined();
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);
          });
          
          // Should maintain system stability (no exceptions thrown)
          expect(() => InputValidator.formatValidationErrors(result.errors)).not.toThrow();
        })
      );

      // Test that invalid constraints are always rejected with descriptive errors
      fc.assert(
        fc.property(invalidConstraintArb, (invalidConstraint) => {
          const result = InputValidator.validateConstraint(invalidConstraint);
          
          // Should always reject invalid input
          expect(result.isValid).toBe(false);
          
          // Should provide descriptive error messages
          expect(result.errors.length).toBeGreaterThan(0);
          result.errors.forEach(error => {
            expect(error.field).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.code).toBeDefined();
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);
          });
          
          // Should maintain system stability
          expect(() => InputValidator.formatValidationErrors(result.errors)).not.toThrow();
        })
      );
    });

    /**
     * Test that sanitization always produces valid output
     */
    it('should always produce valid output from sanitization', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (input) => {
            // Sanitization should never throw exceptions
            expect(() => InputValidator.sanitizeOption(input)).not.toThrow();
            expect(() => InputValidator.sanitizeConstraint(input)).not.toThrow();
            
            const sanitizedOption = InputValidator.sanitizeOption(input);
            const sanitizedConstraint = InputValidator.sanitizeConstraint(input);
            
            // Sanitized output should have expected structure
            expect(typeof sanitizedOption.id).toBe('string');
            expect(typeof sanitizedOption.name).toBe('string');
            expect(sanitizedOption.scores instanceof Map).toBe(true);
            
            expect(typeof sanitizedConstraint.id).toBe('string');
            expect(typeof sanitizedConstraint.name).toBe('string');
            expect(typeof sanitizedConstraint.weight).toBe('number');
            expect(sanitizedConstraint.weight).toBeGreaterThanOrEqual(0);
            expect(sanitizedConstraint.scale).toBeDefined();
            expect(typeof sanitizedConstraint.scale.min).toBe('number');
            expect(typeof sanitizedConstraint.scale.max).toBe('number');
          }
        )
      );
    });

    /**
     * Test that validation is consistent
     */
    it('should provide consistent validation results', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (input) => {
            // Multiple validations of the same input should produce identical results
            const result1 = InputValidator.validateOption(input);
            const result2 = InputValidator.validateOption(input);
            
            expect(result1.isValid).toBe(result2.isValid);
            expect(result1.errors.length).toBe(result2.errors.length);
            expect(result1.warnings.length).toBe(result2.warnings.length);
            
            // Error codes should be consistent
            const codes1 = result1.errors.map(e => e.code).sort();
            const codes2 = result2.errors.map(e => e.code).sort();
            expect(codes1).toEqual(codes2);
          }
        )
      );
    });

    /**
     * Test array validation edge cases
     */
    it('should handle array validation edge cases', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.array(fc.anything(), { minLength: 0, maxLength: 10 })
          ),
          (input) => {
            // Should never throw exceptions
            expect(() => InputValidator.validateOptions(input as any)).not.toThrow();
            expect(() => InputValidator.validateConstraints(input as any)).not.toThrow();
            
            const optionResult = InputValidator.validateOptions(input as any);
            const constraintResult = InputValidator.validateConstraints(input as any);
            
            // Should always return validation result structure
            expect(typeof optionResult.isValid).toBe('boolean');
            expect(Array.isArray(optionResult.errors)).toBe(true);
            expect(Array.isArray(optionResult.warnings)).toBe(true);
            
            expect(typeof constraintResult.isValid).toBe('boolean');
            expect(Array.isArray(constraintResult.errors)).toBe(true);
            expect(Array.isArray(constraintResult.warnings)).toBe(true);
          }
        )
      );
    });

    /**
     * Property 7: Data Normalization
     * For any input data format, the system should sanitize and normalize the data 
     * to ensure consistent processing regardless of input format.
     * **Feature: option-referee, Property 7: Data Normalization**
     * **Validates: Requirements 6.3, 6.5**
     */
    it('Property 7: Data Normalization', () => {
      // Test that normalization produces consistent output structure
      fc.assert(
        fc.property(
          fc.anything(),
          (input) => {
            const sanitizedOption = InputValidator.sanitizeOption(input);
            const sanitizedConstraint = InputValidator.sanitizeConstraint(input);
            
            // Normalized options should always have consistent structure
            expect(typeof sanitizedOption.id).toBe('string');
            expect(typeof sanitizedOption.name).toBe('string');
            expect(sanitizedOption.scores instanceof Map).toBe(true);
            
            // All scores in the map should be valid numbers
            for (const [constraintId, score] of sanitizedOption.scores.entries()) {
              expect(typeof constraintId).toBe('string');
              expect(constraintId.length).toBeGreaterThan(0);
              expect(typeof score).toBe('number');
              expect(isFinite(score)).toBe(true);
              expect(isNaN(score)).toBe(false);
            }
            
            // Normalized constraints should always have consistent structure
            expect(typeof sanitizedConstraint.id).toBe('string');
            expect(typeof sanitizedConstraint.name).toBe('string');
            expect(typeof sanitizedConstraint.weight).toBe('number');
            expect(sanitizedConstraint.weight).toBeGreaterThanOrEqual(0);
            expect(isFinite(sanitizedConstraint.weight)).toBe(true);
            
            // Scale should be properly structured
            expect(sanitizedConstraint.scale).toBeDefined();
            expect(typeof sanitizedConstraint.scale.min).toBe('number');
            expect(typeof sanitizedConstraint.scale.max).toBe('number');
            expect(isFinite(sanitizedConstraint.scale.min)).toBe(true);
            expect(isFinite(sanitizedConstraint.scale.max)).toBe(true);
            
            // Type and direction should be valid values
            expect(['cost', 'performance', 'efficiency', 'custom']).toContain(sanitizedConstraint.type);
            expect(['maximize', 'minimize']).toContain(sanitizedConstraint.direction);
          }
        )
      );
    });

    /**
     * Test that normalization handles different input formats consistently
     */
    it('should normalize different input formats to consistent output', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.oneof(fc.string(), fc.integer().map(n => n.toString())),
            name: fc.oneof(fc.string(), fc.integer().map(n => n.toString())),
            scores: fc.oneof(
              // Map format
              fc.dictionary(fc.string(), fc.float({ noNaN: true })).map(obj => new Map(Object.entries(obj))),
              // Object format
              fc.dictionary(fc.string(), fc.float({ noNaN: true })),
              // Array format (should be ignored)
              fc.array(fc.tuple(fc.string(), fc.float({ noNaN: true })))
            ),
          }),
          (input) => {
            const sanitized1 = InputValidator.sanitizeOption(input);
            const sanitized2 = InputValidator.sanitizeOption(input);
            
            // Multiple normalizations should produce identical results
            expect(sanitized1.id).toBe(sanitized2.id);
            expect(sanitized1.name).toBe(sanitized2.name);
            expect(sanitized1.scores.size).toBe(sanitized2.scores.size);
            
            // Scores should be identical
            for (const [key, value] of sanitized1.scores.entries()) {
              expect(sanitized2.scores.has(key)).toBe(true);
              expect(sanitized2.scores.get(key)).toBe(value);
            }
          }
        )
      );
    });

    /**
     * Test that string sanitization is consistent
     */
    it('should consistently sanitize string inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.string().map(s => `  ${s}  `), // With whitespace
            fc.string().map(s => `\t${s}\n`), // With tabs and newlines
            fc.integer().map(n => n.toString()),
            fc.float().map(n => n.toString()),
            fc.constant(null),
            fc.constant(undefined),
            fc.boolean()
          ),
          (input) => {
            const option1 = { id: input, name: input, scores: {} };
            const option2 = { id: input, name: input, scores: {} };
            
            const sanitized1 = InputValidator.sanitizeOption(option1);
            const sanitized2 = InputValidator.sanitizeOption(option2);
            
            // Should produce identical results
            expect(sanitized1.id).toBe(sanitized2.id);
            expect(sanitized1.name).toBe(sanitized2.name);
            
            // Sanitized strings should be trimmed and consistent
            expect(typeof sanitized1.id).toBe('string');
            expect(typeof sanitized1.name).toBe('string');
            
            // Should not have leading/trailing whitespace
            expect(sanitized1.id).toBe(sanitized1.id.trim());
            expect(sanitized1.name).toBe(sanitized1.name.trim());
          }
        )
      );
    });

    /**
     * Test that number sanitization handles various formats
     */
    it('should consistently sanitize number inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.float({ noNaN: true }),
            fc.integer(),
            fc.float({ noNaN: true }).map(n => n.toString()),
            fc.integer().map(n => n.toString()),
            fc.string().filter(s => isNaN(parseFloat(s))), // Invalid number strings
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity)
          ),
          (input) => {
            const constraint1 = { 
              id: 'test', 
              name: 'Test', 
              weight: input, 
              type: 'custom', 
              direction: 'maximize',
              scale: { min: input, max: input }
            };
            
            const sanitized = InputValidator.sanitizeConstraint(constraint1);
            
            // Weight should always be a valid non-negative number
            expect(typeof sanitized.weight).toBe('number');
            expect(isFinite(sanitized.weight)).toBe(true);
            expect(isNaN(sanitized.weight)).toBe(false);
            expect(sanitized.weight).toBeGreaterThanOrEqual(0);
            
            // Scale values should always be valid numbers
            expect(typeof sanitized.scale.min).toBe('number');
            expect(typeof sanitized.scale.max).toBe('number');
            expect(isFinite(sanitized.scale.min)).toBe(true);
            expect(isFinite(sanitized.scale.max)).toBe(true);
            expect(isNaN(sanitized.scale.min)).toBe(false);
            expect(isNaN(sanitized.scale.max)).toBe(false);
          }
        )
      );
    });
  });
});