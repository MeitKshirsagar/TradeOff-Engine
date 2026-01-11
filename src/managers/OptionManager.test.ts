/**
 * Tests for OptionManager class
 * Includes both unit tests and property-based tests
 */

import fc from 'fast-check';
import { OptionManager } from './OptionManager';
import { Option, createValidationError } from '../types/core';

describe('OptionManager', () => {
  let manager: OptionManager;

  beforeEach(() => {
    manager = new OptionManager();
  });

  describe('Unit Tests', () => {
    describe('addOption', () => {
      it('should add valid options successfully', () => {
        const option: Option = {
          id: 'opt1',
          name: 'Test Option',
          scores: new Map([['cost', 100]]),
        };

        const result = manager.addOption(option);
        expect(result.success).toBe(true);
        expect(manager.getOptionCount()).toBe(1);
        expect(manager.getOption('opt1')).toEqual(option);
      });

      it('should reject options with duplicate IDs', () => {
        const option1: Option = {
          id: 'opt1',
          name: 'Option 1',
          scores: new Map([['cost', 100]]),
        };
        const option2: Option = {
          id: 'opt1',
          name: 'Option 2',
          scores: new Map([['cost', 200]]),
        };

        manager.addOption(option1);
        const result = manager.addOption(option2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('DUPLICATE_ID');
        }
      });

      it('should reject more than 5 options', () => {
        // Add 5 options
        for (let i = 1; i <= 5; i++) {
          const option: Option = {
            id: `opt${i}`,
            name: `Option ${i}`,
            scores: new Map([['cost', i * 100]]),
          };
          manager.addOption(option);
        }

        // Try to add 6th option
        const sixthOption: Option = {
          id: 'opt6',
          name: 'Option 6',
          scores: new Map([['cost', 600]]),
        };

        const result = manager.addOption(sixthOption);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('MAX_OPTIONS_EXCEEDED');
        }
      });

      it('should reject options with invalid IDs', () => {
        const option: Option = {
          id: 'invalid id!',
          name: 'Test Option',
          scores: new Map([['cost', 100]]),
        };

        const result = manager.addOption(option);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_ID_FORMAT');
        }
      });
    });

    describe('removeOption', () => {
      it('should remove existing options', () => {
        const option: Option = {
          id: 'opt1',
          name: 'Test Option',
          scores: new Map([['cost', 100]]),
        };

        manager.addOption(option);
        expect(manager.getOptionCount()).toBe(1);

        const removed = manager.removeOption('opt1');
        expect(removed).toBe(true);
        expect(manager.getOptionCount()).toBe(0);
        expect(manager.getOption('opt1')).toBeUndefined();
      });

      it('should return false for non-existent options', () => {
        const removed = manager.removeOption('nonexistent');
        expect(removed).toBe(false);
      });
    });

    describe('updateOption', () => {
      it('should update existing options', () => {
        const option: Option = {
          id: 'opt1',
          name: 'Original Name',
          scores: new Map([['cost', 100]]),
        };

        manager.addOption(option);

        const result = manager.updateOption('opt1', {
          name: 'Updated Name',
          description: 'New description',
        });

        expect(result.success).toBe(true);
        const updated = manager.getOption('opt1');
        expect(updated?.name).toBe('Updated Name');
        expect(updated?.description).toBe('New description');
        expect(updated?.id).toBe('opt1'); // ID should not change
      });

      it('should reject updates to non-existent options', () => {
        const result = manager.updateOption('nonexistent', { name: 'New Name' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('OPTION_NOT_FOUND');
        }
      });
    });

    describe('validateOptionCount', () => {
      it('should require at least 2 options', () => {
        const result = manager.validateOptionCount();
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INSUFFICIENT_OPTIONS');
        }
      });

      it('should accept 2-5 options', () => {
        // Add 3 options
        for (let i = 1; i <= 3; i++) {
          const option: Option = {
            id: `opt${i}`,
            name: `Option ${i}`,
            scores: new Map([['cost', i * 100]]),
          };
          manager.addOption(option);
        }

        const result = manager.validateOptionCount();
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Property-Based Tests', () => {
    // Generator for valid option IDs
    const validIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0);

    // Generator for valid options
    const validOptionArb = fc.record({
      id: validIdArb,
      name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      description: fc.option(fc.string(), { nil: undefined }),
      scores: fc.dictionary(
        fc.string({ minLength: 1 }),
        fc.float({ min: 0, max: 1000, noNaN: true })
      ).map(obj => new Map(Object.entries(obj))),
      metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    });

    /**
     * Property 1: Option Management Completeness
     * For any valid option with unique identifier, the system should successfully 
     * store the option with all descriptive information intact and allow subsequent 
     * editing or removal operations.
     * **Feature: option-referee, Property 1: Option Management Completeness**
     * **Validates: Requirements 1.1, 1.4, 1.5**
     */
    it('Property 1: Option Management Completeness', () => {
      fc.assert(
        fc.property(validOptionArb, (option) => {
          const manager = new OptionManager();
          
          // Should successfully add valid option
          const addResult = manager.addOption(option);
          expect(addResult.success).toBe(true);
          
          // Should store all information intact
          const retrieved = manager.getOption(option.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(option.id);
          expect(retrieved?.name).toBe(option.name);
          expect(retrieved?.description).toBe(option.description);
          
          // Should allow editing
          const updateResult = manager.updateOption(option.id, { 
            name: 'Updated Name' 
          });
          expect(updateResult.success).toBe(true);
          
          const updated = manager.getOption(option.id);
          expect(updated?.name).toBe('Updated Name');
          expect(updated?.id).toBe(option.id); // ID should remain unchanged
          
          // Should allow removal
          const removed = manager.removeOption(option.id);
          expect(removed).toBe(true);
          expect(manager.getOption(option.id)).toBeUndefined();
        })
      );
    });

    /**
     * Test that duplicate IDs are always rejected
     */
    it('should always reject duplicate IDs', () => {
      fc.assert(
        fc.property(validOptionArb, validOptionArb, (option1, option2) => {
          // Force same ID
          const duplicateOption = { ...option2, id: option1.id };
          
          const manager = new OptionManager();
          const result1 = manager.addOption(option1);
          const result2 = manager.addOption(duplicateOption);
          
          expect(result1.success).toBe(true);
          expect(result2.success).toBe(false);
          if (!result2.success) {
            expect(result2.error.code).toBe('DUPLICATE_ID');
          }
        })
      );
    });

    /**
     * Test that invalid options are always rejected
     */
    it('should always reject invalid options', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string().filter(s => s.trim() === '' || !/^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string(),
            scores: fc.constant(new Map()),
          }),
          (invalidOption) => {
            const manager = new OptionManager();
            const result = manager.addOption(invalidOption);
            expect(result.success).toBe(false);
          }
        )
      );
    });

    /**
     * Test that the manager maintains consistency across operations
     */
    it('should maintain consistency across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(validOptionArb, { minLength: 1, maxLength: 5 }).map(options => {
            // Ensure unique IDs
            const uniqueOptions = options.map((opt, index) => ({
              ...opt,
              id: `${opt.id}_${index}`,
            }));
            return uniqueOptions;
          }),
          (options) => {
            const manager = new OptionManager();
            
            // Add all options
            for (const option of options) {
              const result = manager.addOption(option);
              expect(result.success).toBe(true);
            }
            
            // Verify count
            expect(manager.getOptionCount()).toBe(options.length);
            
            // Verify all options are retrievable
            for (const option of options) {
              const retrieved = manager.getOption(option.id);
              expect(retrieved).toBeDefined();
              expect(retrieved?.id).toBe(option.id);
            }
            
            // Verify summary is consistent
            const summary = manager.getSummary();
            expect(summary.totalOptions).toBe(options.length);
            expect(summary.optionNames).toHaveLength(options.length);
          }
        )
      );
    });

    /**
     * Property 2: Option Count Validation
     * For any option set, the system should prevent comparison when fewer than 2 options 
     * exist and prevent addition when more than 5 options exist, maintaining the current valid option set.
     * **Feature: option-referee, Property 2: Option Count Validation**
     * **Validates: Requirements 1.2, 1.3**
     */
    it('Property 2: Option Count Validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          (targetCount) => {
            const manager = new OptionManager();
            
            // Try to add targetCount options
            const addedOptions: string[] = [];
            for (let i = 0; i < targetCount; i++) {
              const option: Option = {
                id: `opt_${i}`,
                name: `Option ${i}`,
                scores: new Map([['test', i * 10]]),
              };
              
              const result = manager.addOption(option);
              
              if (i < 5) {
                // Should succeed for first 5 options
                expect(result.success).toBe(true);
                addedOptions.push(option.id);
              } else {
                // Should fail for 6th+ options
                expect(result.success).toBe(false);
                if (!result.success) {
                  expect(result.error.code).toBe('MAX_OPTIONS_EXCEEDED');
                }
              }
            }
            
            // Verify final count is capped at 5
            const finalCount = manager.getOptionCount();
            expect(finalCount).toBeLessThanOrEqual(5);
            expect(finalCount).toBe(Math.min(targetCount, 5));
            
            // Test validation based on count
            const validation = manager.validateOptionCount();
            if (finalCount < 2) {
              expect(validation.success).toBe(false);
              if (!validation.success) {
                expect(validation.error.code).toBe('INSUFFICIENT_OPTIONS');
              }
            } else if (finalCount <= 5) {
              expect(validation.success).toBe(true);
            }
          }
        )
      );
    });
  });
});