/**
 * ConstraintManager - Handles constraint definitions and weight management
 * Supports predefined constraint types and custom constraints with automatic weight normalization
 */

import {
  Constraint,
  ConstraintType,
  ConstraintDirection,
  ScaleDefinition,
  Result,
  ValidationError,
  ValidationResult,
  createSuccess,
  createError,
  createValidationError,
} from '../types/core';

export class ConstraintManager {
  private constraints: Map<string, Constraint> = new Map();

  // Predefined constraint types with default configurations
  private readonly PREDEFINED_CONSTRAINTS: Record<string, Partial<Constraint>> = {
    cost: {
      type: 'cost',
      direction: 'minimize',
      scale: { min: 0, max: 10000, unit: 'USD', description: 'Total cost in US dollars' },
    },
    performance: {
      type: 'performance',
      direction: 'maximize',
      scale: { min: 0, max: 100, unit: '%', description: 'Performance score as percentage' },
    },
    efficiency: {
      type: 'efficiency',
      direction: 'maximize',
      scale: { min: 0, max: 100, unit: '%', description: 'Efficiency rating as percentage' },
    },
    'ease-of-use': {
      type: 'custom',
      direction: 'maximize',
      scale: { min: 1, max: 10, description: 'Ease of use rating (1-10 scale)' },
    },
    scalability: {
      type: 'custom',
      direction: 'maximize',
      scale: { min: 1, max: 10, description: 'Scalability rating (1-10 scale)' },
    },
    reliability: {
      type: 'custom',
      direction: 'maximize',
      scale: { min: 0, max: 100, unit: '%', description: 'Reliability percentage' },
    },
    'implementation-time': {
      type: 'cost',
      direction: 'minimize',
      scale: { min: 0, max: 365, unit: 'days', description: 'Implementation time in days' },
    },
  };

  /**
   * Add a new constraint to the evaluation set
   */
  addConstraint(constraint: Constraint): Result<void, ValidationError> {
    // Validate constraint structure
    const validation = this.validateConstraint(constraint);
    if (!validation.isValid) {
      return createError(validation.errors[0]!);
    }

    // Check for duplicate ID
    if (this.constraints.has(constraint.id)) {
      return createError(
        createValidationError(
          'id',
          `Constraint with ID '${constraint.id}' already exists`,
          'DUPLICATE_ID'
        )
      );
    }

    // Add the constraint (don't normalize yet - let caller decide when to normalize)
    this.constraints.set(constraint.id, { ...constraint });
    
    return createSuccess(undefined);
  }

  /**
   * Create a constraint from a predefined type
   */
  addPredefinedConstraint(
    id: string,
    name: string,
    predefinedType: string,
    weight: number = 20
  ): Result<void, ValidationError> {
    const template = this.PREDEFINED_CONSTRAINTS[predefinedType];
    if (!template) {
      return createError(
        createValidationError(
          'type',
          `Unknown predefined constraint type: ${predefinedType}`,
          'UNKNOWN_PREDEFINED_TYPE'
        )
      );
    }

    const constraint: Constraint = {
      id,
      name,
      weight,
      type: template.type || 'custom',
      direction: template.direction || 'maximize',
      scale: template.scale || { min: 0, max: 100 },
    };

    const result = this.addConstraint(constraint);
    if (result.success) {
      // Auto-normalize after adding predefined constraint
      this.normalizeWeights();
    }
    return result;
  }

  /**
   * Update the weight of an existing constraint
   */
  updateWeight(constraintId: string, weight: number): Result<void, ValidationError> {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      return createError(
        createValidationError(
          'id',
          `Constraint with ID '${constraintId}' not found`,
          'CONSTRAINT_NOT_FOUND'
        )
      );
    }

    // Validate weight
    if (typeof weight !== 'number' || isNaN(weight) || weight < 0) {
      return createError(
        createValidationError(
          'weight',
          'Weight must be a non-negative number',
          'INVALID_WEIGHT'
        )
      );
    }

    // Update weight
    constraint.weight = weight;
    this.constraints.set(constraintId, constraint);

    // Auto-normalize weights after update
    this.normalizeWeights();

    return createSuccess(undefined);
  }

  /**
   * Normalize all constraint weights to sum to 100%
   */
  normalizeWeights(): void {
    const constraints = Array.from(this.constraints.values());
    const totalWeight = constraints.reduce((sum, constraint) => sum + constraint.weight, 0);

    if (totalWeight === 0) {
      // If all weights are 0, distribute equally
      const equalWeight = 100 / constraints.length;
      for (const constraint of constraints) {
        constraint.weight = equalWeight;
        this.constraints.set(constraint.id, constraint);
      }
    } else {
      // Normalize to sum to 100
      for (const constraint of constraints) {
        constraint.weight = (constraint.weight / totalWeight) * 100;
        this.constraints.set(constraint.id, constraint);
      }
    }
  }

  /**
   * Remove a constraint
   */
  removeConstraint(constraintId: string): boolean {
    const removed = this.constraints.delete(constraintId);
    if (removed && this.constraints.size > 0) {
      // Re-normalize remaining weights
      this.normalizeWeights();
    }
    return removed;
  }

  /**
   * Update an existing constraint
   */
  updateConstraint(constraintId: string, updates: Partial<Constraint>): Result<void, ValidationError> {
    const existingConstraint = this.constraints.get(constraintId);
    if (!existingConstraint) {
      return createError(
        createValidationError(
          'id',
          `Constraint with ID '${constraintId}' not found`,
          'CONSTRAINT_NOT_FOUND'
        )
      );
    }

    // Create updated constraint
    const updatedConstraint: Constraint = {
      ...existingConstraint,
      ...updates,
      id: constraintId, // Prevent ID changes
    };

    // Validate the updated constraint
    const validation = this.validateConstraint(updatedConstraint);
    if (!validation.isValid) {
      return createError(validation.errors[0]!);
    }

    // Update the constraint
    this.constraints.set(constraintId, updatedConstraint);

    // Re-normalize if weight changed
    if (updates.weight !== undefined) {
      this.normalizeWeights();
    }

    return createSuccess(undefined);
  }

  /**
   * Get all constraints
   */
  getConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Get a specific constraint by ID
   */
  getConstraint(constraintId: string): Constraint | undefined {
    return this.constraints.get(constraintId);
  }

  /**
   * Get constraints as a map of ID to weight (normalized)
   */
  getWeightedConstraints(): Map<string, number> {
    const weightMap = new Map<string, number>();
    for (const constraint of this.constraints.values()) {
      weightMap.set(constraint.id, constraint.weight);
    }
    return weightMap;
  }

  /**
   * Get the current number of constraints
   */
  getConstraintCount(): number {
    return this.constraints.size;
  }

  /**
   * Clear all constraints
   */
  clear(): void {
    this.constraints.clear();
  }

  /**
   * Check if a constraint exists
   */
  hasConstraint(constraintId: string): boolean {
    return this.constraints.has(constraintId);
  }

  /**
   * Get all constraint IDs
   */
  getConstraintIds(): string[] {
    return Array.from(this.constraints.keys());
  }

  /**
   * Get available predefined constraint types
   */
  getPredefinedConstraintTypes(): string[] {
    return Object.keys(this.PREDEFINED_CONSTRAINTS);
  }

  /**
   * Get template for a predefined constraint type
   */
  getPredefinedConstraintTemplate(type: string): Partial<Constraint> | undefined {
    return this.PREDEFINED_CONSTRAINTS[type];
  }

  /**
   * Validate constraint structure and data
   */
  private validateConstraint(constraint: Constraint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!constraint.id || constraint.id.trim() === '') {
      errors.push(createValidationError('id', 'Constraint ID is required', 'MISSING_ID'));
    }

    if (!constraint.name || constraint.name.trim() === '') {
      errors.push(createValidationError('name', 'Constraint name is required', 'MISSING_NAME'));
    }

    // Validate ID format (alphanumeric, underscores, hyphens)
    if (constraint.id && !/^[a-zA-Z0-9_-]+$/.test(constraint.id)) {
      errors.push(
        createValidationError(
          'id',
          'Constraint ID must contain only letters, numbers, underscores, and hyphens',
          'INVALID_ID_FORMAT'
        )
      );
    }

    // Validate weight
    if (typeof constraint.weight !== 'number' || isNaN(constraint.weight) || constraint.weight < 0) {
      errors.push(
        createValidationError(
          'weight',
          'Weight must be a non-negative number',
          'INVALID_WEIGHT'
        )
      );
    }

    // Validate type
    const validTypes: ConstraintType[] = ['cost', 'performance', 'efficiency', 'custom'];
    if (!validTypes.includes(constraint.type)) {
      errors.push(
        createValidationError(
          'type',
          `Type must be one of: ${validTypes.join(', ')}`,
          'INVALID_TYPE'
        )
      );
    }

    // Validate direction
    const validDirections: ConstraintDirection[] = ['maximize', 'minimize'];
    if (!validDirections.includes(constraint.direction)) {
      errors.push(
        createValidationError(
          'direction',
          `Direction must be one of: ${validDirections.join(', ')}`,
          'INVALID_DIRECTION'
        )
      );
    }

    // Validate scale
    if (!constraint.scale) {
      errors.push(createValidationError('scale', 'Scale definition is required', 'MISSING_SCALE'));
    } else {
      if (typeof constraint.scale.min !== 'number' || isNaN(constraint.scale.min)) {
        errors.push(
          createValidationError('scale.min', 'Scale minimum must be a number', 'INVALID_SCALE_MIN')
        );
      }
      if (typeof constraint.scale.max !== 'number' || isNaN(constraint.scale.max)) {
        errors.push(
          createValidationError('scale.max', 'Scale maximum must be a number', 'INVALID_SCALE_MAX')
        );
      }
      if (constraint.scale.min >= constraint.scale.max) {
        errors.push(
          createValidationError(
            'scale',
            'Scale minimum must be less than maximum',
            'INVALID_SCALE_RANGE'
          )
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get summary statistics about the constraints
   */
  getSummary(): {
    totalConstraints: number;
    constraintNames: string[];
    totalWeight: number;
    isNormalized: boolean;
    predefinedCount: number;
    customCount: number;
  } {
    const constraints = Array.from(this.constraints.values());
    const totalWeight = constraints.reduce((sum, c) => sum + c.weight, 0);
    const predefinedCount = constraints.filter(c => c.type !== 'custom').length;
    const customCount = constraints.filter(c => c.type === 'custom').length;

    return {
      totalConstraints: constraints.length,
      constraintNames: constraints.map(c => c.name),
      totalWeight: Math.round(totalWeight * 100) / 100, // Round to 2 decimal places
      isNormalized: Math.abs(totalWeight - 100) < 0.01, // Allow small floating point errors
      predefinedCount,
      customCount,
    };
  }

  /**
   * Validate that constraints are ready for scoring
   */
  validateForScoring(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (this.constraints.size === 0) {
      errors.push(
        createValidationError(
          'constraints',
          'At least one constraint is required for scoring',
          'NO_CONSTRAINTS'
        )
      );
    }

    const summary = this.getSummary();
    if (!summary.isNormalized) {
      warnings.push('Constraint weights are not normalized to 100%');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}