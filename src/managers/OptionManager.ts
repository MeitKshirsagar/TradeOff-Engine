/**
 * OptionManager - Handles CRUD operations for comparison options
 * Validates option count (2-5), unique identifiers, and data integrity
 */

import {
  Option,
  Result,
  ValidationError,
  ValidationResult,
  createSuccess,
  createError,
  createValidationError,
} from '../types/core';

export class OptionManager {
  private options: Map<string, Option> = new Map();
  private readonly MIN_OPTIONS = 2;
  private readonly MAX_OPTIONS = 5;

  /**
   * Add a new option to the comparison set
   */
  addOption(option: Option): Result<void, ValidationError> {
    // Validate option structure
    const validation = this.validateOption(option);
    if (!validation.isValid) {
      return createError(validation.errors[0]!);
    }

    // Check if we're at maximum capacity
    if (this.options.size >= this.MAX_OPTIONS) {
      return createError(
        createValidationError(
          'options',
          `Cannot add more than ${this.MAX_OPTIONS} options`,
          'MAX_OPTIONS_EXCEEDED'
        )
      );
    }

    // Check for duplicate ID
    if (this.options.has(option.id)) {
      return createError(
        createValidationError(
          'id',
          `Option with ID '${option.id}' already exists`,
          'DUPLICATE_ID'
        )
      );
    }

    // Add the option
    this.options.set(option.id, { ...option });
    return createSuccess(undefined);
  }

  /**
   * Remove an option from the comparison set
   */
  removeOption(optionId: string): boolean {
    return this.options.delete(optionId);
  }

  /**
   * Update an existing option
   */
  updateOption(optionId: string, updates: Partial<Option>): Result<void, ValidationError> {
    const existingOption = this.options.get(optionId);
    if (!existingOption) {
      return createError(
        createValidationError(
          'id',
          `Option with ID '${optionId}' not found`,
          'OPTION_NOT_FOUND'
        )
      );
    }

    // Create updated option
    const updatedOption: Option = {
      ...existingOption,
      ...updates,
      id: optionId, // Prevent ID changes
    };

    // Validate the updated option
    const validation = this.validateOption(updatedOption);
    if (!validation.isValid) {
      return createError(validation.errors[0]!);
    }

    // Update the option
    this.options.set(optionId, updatedOption);
    return createSuccess(undefined);
  }

  /**
   * Get all options
   */
  getOptions(): Option[] {
    return Array.from(this.options.values());
  }

  /**
   * Get a specific option by ID
   */
  getOption(optionId: string): Option | undefined {
    return this.options.get(optionId);
  }

  /**
   * Get the current number of options
   */
  getOptionCount(): number {
    return this.options.size;
  }

  /**
   * Validate that we have the correct number of options for comparison
   */
  validateOptionCount(): Result<void, ValidationError> {
    const count = this.options.size;

    if (count < this.MIN_OPTIONS) {
      return createError(
        createValidationError(
          'options',
          `Need at least ${this.MIN_OPTIONS} options for comparison, currently have ${count}`,
          'INSUFFICIENT_OPTIONS'
        )
      );
    }

    if (count > this.MAX_OPTIONS) {
      return createError(
        createValidationError(
          'options',
          `Cannot compare more than ${this.MAX_OPTIONS} options, currently have ${count}`,
          'TOO_MANY_OPTIONS'
        )
      );
    }

    return createSuccess(undefined);
  }

  /**
   * Clear all options
   */
  clear(): void {
    this.options.clear();
  }

  /**
   * Check if an option exists
   */
  hasOption(optionId: string): boolean {
    return this.options.has(optionId);
  }

  /**
   * Get all option IDs
   */
  getOptionIds(): string[] {
    return Array.from(this.options.keys());
  }

  /**
   * Validate option structure and data
   */
  private validateOption(option: Option): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!option.id || option.id.trim() === '') {
      errors.push(createValidationError('id', 'Option ID is required', 'MISSING_ID'));
    }

    if (!option.name || option.name.trim() === '') {
      errors.push(createValidationError('name', 'Option name is required', 'MISSING_NAME'));
    }

    // Validate ID format (alphanumeric, underscores, hyphens)
    if (option.id && !/^[a-zA-Z0-9_-]+$/.test(option.id)) {
      errors.push(
        createValidationError(
          'id',
          'Option ID must contain only letters, numbers, underscores, and hyphens',
          'INVALID_ID_FORMAT'
        )
      );
    }

    // Validate scores map
    if (!option.scores || option.scores.size === 0) {
      warnings.push('Option has no scores defined');
    } else {
      // Check for invalid score values
      for (const [constraintId, score] of option.scores.entries()) {
        if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
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

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that all options have scores for the given constraint IDs
   */
  validateScoreCompleteness(constraintIds: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const option of this.options.values()) {
      for (const constraintId of constraintIds) {
        if (!option.scores.has(constraintId)) {
          errors.push(
            createValidationError(
              'scores',
              `Option '${option.name}' missing score for constraint '${constraintId}'`,
              'MISSING_SCORE'
            )
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get summary statistics about the options
   */
  getSummary(): {
    totalOptions: number;
    optionNames: string[];
    constraintsCovered: string[];
    isReadyForComparison: boolean;
  } {
    const optionNames = Array.from(this.options.values()).map(opt => opt.name);
    const constraintsCovered = new Set<string>();
    
    for (const option of this.options.values()) {
      for (const constraintId of option.scores.keys()) {
        constraintsCovered.add(constraintId);
      }
    }

    const countValidation = this.validateOptionCount();

    return {
      totalOptions: this.options.size,
      optionNames,
      constraintsCovered: Array.from(constraintsCovered),
      isReadyForComparison: countValidation.success,
    };
  }
}