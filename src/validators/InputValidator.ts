/**
 * InputValidator - Comprehensive input validation system
 * Handles data type validation, range checking, sanitization, and normalization
 */

import {
  Option,
  Constraint,
  ValidationError,
  ValidationResult,
  createValidationError,
} from '../types/core';

export class InputValidator {
  /**
   * Validate and sanitize option data
   */
  static validateOption(option: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if input is an object
    if (!option || typeof option !== 'object') {
      errors.push(createValidationError('option', 'Option must be an object', 'INVALID_TYPE'));
      return { isValid: false, errors, warnings };
    }

    // Validate required fields
    if (!this.isValidString(option.id)) {
      errors.push(createValidationError('id', 'Option ID is required and must be a non-empty string', 'MISSING_ID'));
    } else {
      // Validate ID format
      if (!this.isValidIdentifier(option.id)) {
        errors.push(
          createValidationError(
            'id',
            'Option ID must contain only letters, numbers, underscores, and hyphens',
            'INVALID_ID_FORMAT'
          )
        );
      }
    }

    if (!this.isValidString(option.name)) {
      errors.push(createValidationError('name', 'Option name is required and must be a non-empty string', 'MISSING_NAME'));
    }

    // Validate optional description
    if (option.description !== undefined && !this.isValidString(option.description, true)) {
      errors.push(createValidationError('description', 'Description must be a string if provided', 'INVALID_DESCRIPTION'));
    }

    // Validate scores
    if (!option.scores) {
      warnings.push('Option has no scores defined');
    } else if (!(option.scores instanceof Map)) {
      // Try to convert object to Map
      if (typeof option.scores === 'object') {
        try {
          option.scores = new Map(Object.entries(option.scores));
        } catch (error) {
          errors.push(createValidationError('scores', 'Scores must be a Map or convertible object', 'INVALID_SCORES_TYPE'));
        }
      } else {
        errors.push(createValidationError('scores', 'Scores must be a Map or object', 'INVALID_SCORES_TYPE'));
      }
    }

    // Validate individual scores
    if (option.scores instanceof Map) {
      for (const [constraintId, score] of option.scores.entries()) {
        if (!this.isValidString(constraintId)) {
          errors.push(
            createValidationError(
              'scores',
              `Invalid constraint ID in scores: must be a non-empty string`,
              'INVALID_CONSTRAINT_ID'
            )
          );
        }
        if (!this.isValidNumber(score)) {
          errors.push(
            createValidationError(
              'scores',
              `Invalid score for constraint '${constraintId}': must be a finite number`,
              'INVALID_SCORE'
            )
          );
        }
      }
    }

    // Validate metadata if present
    if (option.metadata !== undefined && (typeof option.metadata !== 'object' || option.metadata === null)) {
      errors.push(createValidationError('metadata', 'Metadata must be an object if provided', 'INVALID_METADATA'));
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate and sanitize constraint data
   */
  static validateConstraint(constraint: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if input is an object
    if (!constraint || typeof constraint !== 'object') {
      errors.push(createValidationError('constraint', 'Constraint must be an object', 'INVALID_TYPE'));
      return { isValid: false, errors, warnings };
    }

    // Validate required fields
    if (!this.isValidString(constraint.id)) {
      errors.push(createValidationError('id', 'Constraint ID is required and must be a non-empty string', 'MISSING_ID'));
    } else {
      // Validate ID format
      if (!this.isValidIdentifier(constraint.id)) {
        errors.push(
          createValidationError(
            'id',
            'Constraint ID must contain only letters, numbers, underscores, and hyphens',
            'INVALID_ID_FORMAT'
          )
        );
      }
    }

    if (!this.isValidString(constraint.name)) {
      errors.push(createValidationError('name', 'Constraint name is required and must be a non-empty string', 'MISSING_NAME'));
    }

    // Validate weight
    if (!this.isValidNumber(constraint.weight) || constraint.weight < 0) {
      errors.push(createValidationError('weight', 'Weight must be a non-negative number', 'INVALID_WEIGHT'));
    }

    // Validate type
    const validTypes = ['cost', 'performance', 'efficiency', 'custom'];
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
    const validDirections = ['maximize', 'minimize'];
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
    if (!constraint.scale || typeof constraint.scale !== 'object') {
      errors.push(createValidationError('scale', 'Scale definition is required and must be an object', 'MISSING_SCALE'));
    } else {
      if (!this.isValidNumber(constraint.scale.min)) {
        errors.push(createValidationError('scale.min', 'Scale minimum must be a number', 'INVALID_SCALE_MIN'));
      }
      if (!this.isValidNumber(constraint.scale.max)) {
        errors.push(createValidationError('scale.max', 'Scale maximum must be a number', 'INVALID_SCALE_MAX'));
      }
      if (this.isValidNumber(constraint.scale.min) && this.isValidNumber(constraint.scale.max)) {
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
      // Validate optional unit and description
      if (constraint.scale.unit !== undefined && typeof constraint.scale.unit !== 'string') {
        errors.push(createValidationError('scale.unit', 'Scale unit must be a string if provided', 'INVALID_SCALE_UNIT'));
      }
      if (constraint.scale.description !== undefined && typeof constraint.scale.description !== 'string') {
        errors.push(createValidationError('scale.description', 'Scale description must be a string if provided', 'INVALID_SCALE_DESCRIPTION'));
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize and normalize option data
   */
  static sanitizeOption(option: any): Option {
    const sanitized: any = {};

    // Handle null/undefined input
    if (!option || typeof option !== 'object') {
      return {
        id: '',
        name: '',
        scores: new Map(),
      } as Option;
    }

    // Sanitize strings
    sanitized.id = this.sanitizeString(option.id);
    sanitized.name = this.sanitizeString(option.name);
    
    if (option.description !== undefined) {
      sanitized.description = this.sanitizeString(option.description);
    }

    // Ensure scores is a Map
    if (option.scores instanceof Map) {
      sanitized.scores = new Map(option.scores);
    } else if (typeof option.scores === 'object' && option.scores !== null) {
      sanitized.scores = new Map(Object.entries(option.scores));
    } else {
      sanitized.scores = new Map();
    }

    // Sanitize scores - only keep valid ones
    const sanitizedScores = new Map();
    for (const [constraintId, score] of sanitized.scores.entries()) {
      const sanitizedId = this.sanitizeString(constraintId);
      const sanitizedScore = this.sanitizeNumber(score);
      if (sanitizedId && sanitizedScore !== null) {
        sanitizedScores.set(sanitizedId, sanitizedScore);
      }
    }
    sanitized.scores = sanitizedScores;

    // Copy metadata if present
    if (option.metadata && typeof option.metadata === 'object') {
      sanitized.metadata = { ...option.metadata };
    }

    return sanitized as Option;
  }

  /**
   * Sanitize and normalize constraint data
   */
  static sanitizeConstraint(constraint: any): Constraint {
    const sanitized: any = {};

    // Handle null/undefined input
    if (!constraint || typeof constraint !== 'object') {
      return {
        id: '',
        name: '',
        weight: 0,
        type: 'custom',
        direction: 'maximize',
        scale: { min: 0, max: 100 },
      } as Constraint;
    }

    // Sanitize strings
    sanitized.id = this.sanitizeString(constraint.id);
    sanitized.name = this.sanitizeString(constraint.name);
    sanitized.type = constraint.type || 'custom';
    sanitized.direction = constraint.direction || 'maximize';

    // Sanitize weight
    const sanitizedWeight = this.sanitizeNumber(constraint.weight);
    sanitized.weight = sanitizedWeight !== null ? Math.max(0, sanitizedWeight) : 0;

    // Sanitize scale
    if (constraint.scale && typeof constraint.scale === 'object') {
      const minVal = this.sanitizeNumber(constraint.scale.min);
      const maxVal = this.sanitizeNumber(constraint.scale.max);
      
      sanitized.scale = {
        min: minVal !== null ? minVal : 0,
        max: maxVal !== null ? maxVal : 100,
      };

      if (constraint.scale.unit !== undefined) {
        sanitized.scale.unit = this.sanitizeString(constraint.scale.unit);
      }
      if (constraint.scale.description !== undefined) {
        sanitized.scale.description = this.sanitizeString(constraint.scale.description);
      }
    } else {
      sanitized.scale = { min: 0, max: 100 };
    }

    return sanitized as Constraint;
  }

  /**
   * Validate array of options
   */
  static validateOptions(options: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(options)) {
      errors.push(createValidationError('options', 'Options must be an array', 'INVALID_TYPE'));
      return { isValid: false, errors, warnings };
    }

    if (options.length < 2) {
      errors.push(createValidationError('options', 'At least 2 options are required', 'INSUFFICIENT_OPTIONS'));
    }

    if (options.length > 5) {
      errors.push(createValidationError('options', 'Maximum 5 options allowed', 'TOO_MANY_OPTIONS'));
    }

    // Validate each option
    const seenIds = new Set<string>();
    options.forEach((option, index) => {
      const validation = this.validateOption(option);
      
      // Add index to error field names
      validation.errors.forEach(error => {
        errors.push({
          ...error,
          field: `options[${index}].${error.field}`,
        });
      });

      validation.warnings.forEach(warning => {
        warnings.push(`Option ${index}: ${warning}`);
      });

      // Check for duplicate IDs
      if (option && option.id) {
        if (seenIds.has(option.id)) {
          errors.push(
            createValidationError(
              `options[${index}].id`,
              `Duplicate option ID: ${option.id}`,
              'DUPLICATE_ID'
            )
          );
        } else {
          seenIds.add(option.id);
        }
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate array of constraints
   */
  static validateConstraints(constraints: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(constraints)) {
      errors.push(createValidationError('constraints', 'Constraints must be an array', 'INVALID_TYPE'));
      return { isValid: false, errors, warnings };
    }

    if (constraints.length === 0) {
      errors.push(createValidationError('constraints', 'At least 1 constraint is required', 'NO_CONSTRAINTS'));
    }

    // Validate each constraint
    const seenIds = new Set<string>();
    constraints.forEach((constraint, index) => {
      const validation = this.validateConstraint(constraint);
      
      // Add index to error field names
      validation.errors.forEach(error => {
        errors.push({
          ...error,
          field: `constraints[${index}].${error.field}`,
        });
      });

      validation.warnings.forEach(warning => {
        warnings.push(`Constraint ${index}: ${warning}`);
      });

      // Check for duplicate IDs
      if (constraint && constraint.id) {
        if (seenIds.has(constraint.id)) {
          errors.push(
            createValidationError(
              `constraints[${index}].id`,
              `Duplicate constraint ID: ${constraint.id}`,
              'DUPLICATE_ID'
            )
          );
        } else {
          seenIds.add(constraint.id);
        }
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Generate descriptive error messages
   */
  static formatValidationErrors(errors: ValidationError[]): string[] {
    return errors.map(error => {
      const fieldName = error.field.replace(/\[(\d+)\]/g, ' $1').replace(/\./g, ' ');
      return `${fieldName}: ${error.message} (${error.code})`;
    });
  }

  /**
   * Check if value is a valid string
   */
  private static isValidString(value: any, allowEmpty: boolean = false): boolean {
    if (typeof value !== 'string') return false;
    return allowEmpty || value.trim().length > 0;
  }

  /**
   * Check if value is a valid number
   */
  private static isValidNumber(value: any): boolean {
    return typeof value === 'number' && isFinite(value) && !isNaN(value);
  }

  /**
   * Check if string is a valid identifier
   */
  private static isValidIdentifier(value: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(value);
  }

  /**
   * Sanitize string input
   */
  private static sanitizeString(value: any): string {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  /**
   * Sanitize number input - returns null for invalid numbers
   */
  private static sanitizeNumber(value: any): number | null {
    if (typeof value === 'number' && isFinite(value) && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (isFinite(parsed) && !isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  /**
   * Validate data completeness between options and constraints
   */
  static validateDataCompleteness(options: Option[], constraints: Constraint[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const constraintIds = new Set(constraints.map(c => c.id));

    // Check that all options have scores for all constraints
    options.forEach((option, optionIndex) => {
      constraintIds.forEach(constraintId => {
        if (!option.scores.has(constraintId)) {
          errors.push(
            createValidationError(
              `options[${optionIndex}].scores`,
              `Missing score for constraint '${constraintId}' in option '${option.name}'`,
              'MISSING_SCORE'
            )
          );
        }
      });

      // Check for scores that don't match any constraint
      option.scores.forEach((score, scoreConstraintId) => {
        if (!constraintIds.has(scoreConstraintId)) {
          warnings.push(
            `Option '${option.name}' has score for unknown constraint '${scoreConstraintId}'`
          );
        }
      });
    });

    return { isValid: errors.length === 0, errors, warnings };
  }
}