/**
 * Tests for ConstraintManager class
 * Includes both unit tests and property-based tests
 */

import fc from 'fast-check';
import { ConstraintManager } from './ConstraintManager';
import { Constraint, ConstraintType, ConstraintDirection } from '../types/core';

describe('ConstraintManager', () => {
  let manager: ConstraintManager;

  beforeEach(() => {
    manager = new ConstraintManager();
  });

  describe('Unit Tests', () => {
    describe('addConstraint', () => {
      it('should add valid constraints successfully', () => {
        const constraint: Constraint = {
          id: 'cost',
          name: 'Cost',
          weight: 30,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 1000, unit: 'USD' },
        };

        const result = manager.addConstraint(constraint);
        expect(result.success).toBe(true);
        expect(manager.getConstraintCount()).toBe(1);
        expect(manager.getConstraint('cost')).toEqual(expect.objectContaining({
          id: 'cost',
          name: 'Cost',
          type: 'cost',
          direction: 'minimize',
        }));
      });

      it('should reject constraints with duplicate IDs', () => {
        const constraint1: Constraint = {
          id: 'cost',
          name: 'Cost 1',
          weight: 30,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 1000 },
        };
        const constraint2: Constraint = {
          id: 'cost',
          name: 'Cost 2',
          weight: 40,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 2000 },
        };

        manager.addConstraint(constraint1);
        const result = manager.addConstraint(constraint2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('DUPLICATE_ID');
        }
      });

      it('should auto-normalize weights after adding constraints', () => {
        const constraint1: Constraint = {
          id: 'cost',
          name: 'Cost',
          weight: 30,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 1000 },
        };
        const constraint2: Constraint = {
          id: 'performance',
          name: 'Performance',
          weight: 70,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        };

        manager.addConstraint(constraint1);
        manager.addConstraint(constraint2);
        
        // Explicitly normalize
        manager.normalizeWeights();

        const summary = manager.getSummary();
        expect(summary.isNormalized).toBe(true);
        expect(Math.abs(summary.totalWeight - 100)).toBeLessThan(0.01);
      });
    });

    describe('addPredefinedConstraint', () => {
      it('should create constraints from predefined types', () => {
        const result = manager.addPredefinedConstraint('cost1', 'Project Cost', 'cost', 40);
        expect(result.success).toBe(true);

        const constraint = manager.getConstraint('cost1');
        expect(constraint).toBeDefined();
        expect(constraint?.name).toBe('Project Cost');
        expect(constraint?.type).toBe('cost');
        expect(constraint?.direction).toBe('minimize');
      });

      it('should reject unknown predefined types', () => {
        const result = manager.addPredefinedConstraint('unknown', 'Unknown', 'nonexistent', 50);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('UNKNOWN_PREDEFINED_TYPE');
        }
      });

      it('should list available predefined types', () => {
        const types = manager.getPredefinedConstraintTypes();
        expect(types).toContain('cost');
        expect(types).toContain('performance');
        expect(types).toContain('efficiency');
        expect(types.length).toBeGreaterThan(0);
      });
    });

    describe('updateWeight', () => {
      it('should update constraint weights and re-normalize', () => {
        const constraint1: Constraint = {
          id: 'cost',
          name: 'Cost',
          weight: 50,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 1000 },
        };
        const constraint2: Constraint = {
          id: 'performance',
          name: 'Performance',
          weight: 50,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        };

        manager.addConstraint(constraint1);
        manager.addConstraint(constraint2);

        // Update weight
        const result = manager.updateWeight('cost', 80);
        expect(result.success).toBe(true);

        // Check normalization
        const summary = manager.getSummary();
        expect(summary.isNormalized).toBe(true);
      });

      it('should reject invalid weights', () => {
        const constraint: Constraint = {
          id: 'cost',
          name: 'Cost',
          weight: 50,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 1000 },
        };

        manager.addConstraint(constraint);

        const result = manager.updateWeight('cost', -10);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_WEIGHT');
        }
      });
    });

    describe('normalizeWeights', () => {
      it('should normalize weights to sum to 100', () => {
        const constraints: Constraint[] = [
          {
            id: 'cost',
            name: 'Cost',
            weight: 20,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 0, max: 1000 },
          },
          {
            id: 'performance',
            name: 'Performance',
            weight: 30,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 0, max: 100 },
          },
          {
            id: 'efficiency',
            name: 'Efficiency',
            weight: 50,
            type: 'efficiency',
            direction: 'maximize',
            scale: { min: 0, max: 100 },
          },
        ];

        for (const constraint of constraints) {
          manager.addConstraint(constraint);
        }
        
        // Explicitly normalize
        manager.normalizeWeights();

        const summary = manager.getSummary();
        expect(summary.isNormalized).toBe(true);
        expect(Math.abs(summary.totalWeight - 100)).toBeLessThan(0.01);
      });

      it('should handle zero weights by distributing equally', () => {
        const constraints: Constraint[] = [
          {
            id: 'cost',
            name: 'Cost',
            weight: 0,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 0, max: 1000 },
          },
          {
            id: 'performance',
            name: 'Performance',
            weight: 0,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 0, max: 100 },
          },
        ];

        for (const constraint of constraints) {
          manager.addConstraint(constraint);
        }
        
        // Explicitly normalize
        manager.normalizeWeights();

        const allConstraints = manager.getConstraints();
        expect(allConstraints[0]?.weight).toBeCloseTo(50, 1);
        expect(allConstraints[1]?.weight).toBeCloseTo(50, 1);
      });
    });
  });

  describe('Property-Based Tests', () => {
    // Generator for valid constraint IDs
    const validIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0);

    // Generator for valid constraint types
    const constraintTypeArb = fc.constantFrom<ConstraintType>('cost', 'performance', 'efficiency', 'custom');

    // Generator for valid constraint directions
    const constraintDirectionArb = fc.constantFrom<ConstraintDirection>('maximize', 'minimize');

    // Generator for valid constraints
    const validConstraintArb = fc.record({
      id: validIdArb,
      name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      weight: fc.float({ min: 0, max: 1000, noNaN: true }),
      type: constraintTypeArb,
      direction: constraintDirectionArb,
      scale: fc.record({
        min: fc.float({ min: 0, max: 100, noNaN: true }),
        max: fc.float({ min: 101, max: 1000, noNaN: true }),
        unit: fc.option(fc.string(), { nil: undefined }),
        description: fc.option(fc.string(), { nil: undefined }),
      }),
    });

    /**
     * Property 3: Constraint Weight Normalization
     * For any set of constraint weights, the system should normalize them to sum to exactly 100% 
     * and automatically recalculate all scores when weights change.
     * **Feature: option-referee, Property 3: Constraint Weight Normalization**
     * **Validates: Requirements 2.2, 2.4, 3.4**
     */
    it('Property 3: Constraint Weight Normalization', () => {
      fc.assert(
        fc.property(
          fc.array(validConstraintArb, { minLength: 1, maxLength: 10 }).map(constraints => {
            // Ensure unique IDs
            return constraints.map((constraint, index) => ({
              ...constraint,
              id: `${constraint.id}_${index}`,
            }));
          }),
          (constraints) => {
            const manager = new ConstraintManager();
            
            // Add all constraints
            for (const constraint of constraints) {
              const result = manager.addConstraint(constraint);
              expect(result.success).toBe(true);
            }
            
            // Explicitly normalize weights
            manager.normalizeWeights();
            
            // Verify weights are normalized to 100%
            const summary = manager.getSummary();
            expect(summary.isNormalized).toBe(true);
            expect(Math.abs(summary.totalWeight - 100)).toBeLessThan(0.01);
            
            // Test weight updates trigger re-normalization
            if (constraints.length > 0) {
              const firstConstraintId = constraints[0]!.id;
              const newWeight = Math.random() * 100;
              
              const updateResult = manager.updateWeight(firstConstraintId, newWeight);
              expect(updateResult.success).toBe(true);
              
              // Verify still normalized after update
              const updatedSummary = manager.getSummary();
              expect(updatedSummary.isNormalized).toBe(true);
              expect(Math.abs(updatedSummary.totalWeight - 100)).toBeLessThan(0.01);
            }
          }
        )
      );
    });

    /**
     * Test that weight normalization preserves relative proportions
     */
    it('should preserve relative weight proportions during normalization', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: validIdArb,
              weight: fc.float({ min: 1, max: 100, noNaN: true }),
            }),
            { minLength: 2, maxLength: 5 }
          ).map(items => {
            // Ensure unique IDs
            return items.map((item, index) => ({
              ...item,
              id: `${item.id}_${index}`,
            }));
          }),
          (weightSpecs) => {
            const manager = new ConstraintManager();
            
            // Create constraints with specified weights
            const constraints: Constraint[] = weightSpecs.map(spec => ({
              id: spec.id,
              name: `Constraint ${spec.id}`,
              weight: spec.weight,
              type: 'custom',
              direction: 'maximize',
              scale: { min: 0, max: 100 },
            }));
            
            // Calculate original proportions
            const totalOriginalWeight = weightSpecs.reduce((sum, spec) => sum + spec.weight, 0);
            const originalProportions = weightSpecs.map(spec => spec.weight / totalOriginalWeight);
            
            // Add constraints (triggers normalization)
            for (const constraint of constraints) {
              manager.addConstraint(constraint);
            }
            
            // Explicitly normalize to get final weights
            manager.normalizeWeights();
            
            // Verify proportions are preserved
            const normalizedConstraints = manager.getConstraints();
            const normalizedProportions = normalizedConstraints.map(c => c.weight / 100);
            
            for (let i = 0; i < originalProportions.length; i++) {
              expect(normalizedProportions[i]).toBeCloseTo(originalProportions[i]!, 2);
            }
          }
        )
      );
    });

    /**
     * Test that zero weights are handled correctly
     */
    it('should handle zero weights by distributing equally', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (constraintCount) => {
            const manager = new ConstraintManager();
            
            // Add constraints with zero weights
            for (let i = 0; i < constraintCount; i++) {
              const constraint: Constraint = {
                id: `constraint_${i}`,
                name: `Constraint ${i}`,
                weight: 0,
                type: 'custom',
                direction: 'maximize',
                scale: { min: 0, max: 100 },
              };
              manager.addConstraint(constraint);
            }
            
            // Explicitly normalize
            manager.normalizeWeights();
            
            // Verify equal distribution
            const constraints = manager.getConstraints();
            const expectedWeight = 100 / constraintCount;
            
            for (const constraint of constraints) {
              expect(constraint.weight).toBeCloseTo(expectedWeight, 1);
            }
            
            // Verify total is 100%
            const summary = manager.getSummary();
            expect(summary.isNormalized).toBe(true);
          }
        )
      );
    });

    /**
     * Property 4: Constraint Management Flexibility
     * For any constraint definition (predefined or custom), the system should accept 
     * and process the constraint with its importance weight correctly.
     * **Feature: option-referee, Property 4: Constraint Management Flexibility**
     * **Validates: Requirements 2.1, 2.5**
     */
    it('Property 4: Constraint Management Flexibility', () => {
      // Test predefined constraints
      fc.assert(
        fc.property(
          fc.record({
            predefinedType: fc.constantFrom('cost', 'performance', 'efficiency', 'ease-of-use', 'scalability'),
            id: validIdArb,
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            weight: fc.float({ min: 0, max: 100, noNaN: true }),
          }),
          (testCase) => {
            const manager = new ConstraintManager();
            
            // Test predefined constraint creation
            const result = manager.addPredefinedConstraint(
              testCase.id,
              testCase.name,
              testCase.predefinedType,
              testCase.weight
            );
            
            expect(result.success).toBe(true);
            
            const constraint = manager.getConstraint(testCase.id);
            expect(constraint).toBeDefined();
            expect(constraint?.name).toBe(testCase.name);
            expect(constraint?.id).toBe(testCase.id);
            
            // Verify predefined type was applied correctly
            const template = manager.getPredefinedConstraintTemplate(testCase.predefinedType);
            expect(template).toBeDefined();
            expect(constraint?.type).toBe(template?.type);
            expect(constraint?.direction).toBe(template?.direction);
            
            // Verify constraint is accessible
            expect(manager.hasConstraint(testCase.id)).toBe(true);
            expect(manager.getConstraintCount()).toBe(1);
          }
        )
      );

      // Test custom constraints
      fc.assert(
        fc.property(
          validConstraintArb,
          (constraint) => {
            const manager = new ConstraintManager();
            
            // Test custom constraint creation
            const result = manager.addConstraint(constraint);
            expect(result.success).toBe(true);
            
            const retrieved = manager.getConstraint(constraint.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe(constraint.name);
            expect(retrieved?.type).toBe(constraint.type);
            expect(retrieved?.direction).toBe(constraint.direction);
            
            // Verify constraint is accessible
            expect(manager.hasConstraint(constraint.id)).toBe(true);
            expect(manager.getConstraintCount()).toBe(1);
          }
        )
      );
    });

    /**
     * Test that predefined constraint types are comprehensive
     */
    it('should support all documented predefined constraint types', () => {
      const predefinedTypes = manager.getPredefinedConstraintTypes();
      
      // Verify expected types are available
      expect(predefinedTypes).toContain('cost');
      expect(predefinedTypes).toContain('performance');
      expect(predefinedTypes).toContain('efficiency');
      expect(predefinedTypes).toContain('ease-of-use');
      expect(predefinedTypes).toContain('scalability');
      expect(predefinedTypes).toContain('reliability');
      expect(predefinedTypes).toContain('implementation-time');
      
      // Test that each predefined type can be created
      predefinedTypes.forEach((type, index) => {
        const result = manager.addPredefinedConstraint(`test_${index}`, `Test ${type}`, type);
        expect(result.success).toBe(true);
      });
      
      expect(manager.getConstraintCount()).toBe(predefinedTypes.length);
    });

    /**
     * Test constraint CRUD operations
     */
    it('should support full CRUD operations on constraints', () => {
      fc.assert(
        fc.property(
          validConstraintArb,
          (originalConstraint) => {
            const manager = new ConstraintManager();
            
            // Create
            const createResult = manager.addConstraint(originalConstraint);
            expect(createResult.success).toBe(true);
            
            // Read
            const retrieved = manager.getConstraint(originalConstraint.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(originalConstraint.id);
            
            // Update
            const newName = 'Updated Name';
            const updateResult = manager.updateConstraint(originalConstraint.id, { name: newName });
            expect(updateResult.success).toBe(true);
            
            const updated = manager.getConstraint(originalConstraint.id);
            expect(updated?.name).toBe(newName);
            expect(updated?.id).toBe(originalConstraint.id); // ID should not change
            
            // Delete
            const deleted = manager.removeConstraint(originalConstraint.id);
            expect(deleted).toBe(true);
            expect(manager.getConstraint(originalConstraint.id)).toBeUndefined();
            expect(manager.getConstraintCount()).toBe(0);
          }
        )
      );
    });
  });
});