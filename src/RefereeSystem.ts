/**
 * RefereeSystem - Main API for the Option Referee comparison tool
 * 
 * This is the primary interface that wires together all components:
 * - OptionManager for managing comparison options
 * - ConstraintManager for managing evaluation criteria
 * - TOPSISEngine for multi-criteria scoring
 * - TradeOffAnalyzer for generating insights
 * - ReportGenerator for creating comprehensive reports
 * - ConfigurationManager for user preferences
 */

import { OptionManager } from './managers/OptionManager';
import { ConstraintManager } from './managers/ConstraintManager';
import { ConfigurationManager } from './managers/ConfigurationManager';
import { InputValidator } from './validators/InputValidator';
import { TOPSISEngine } from './engines/TOPSISEngine';
import { TradeOffAnalyzer } from './analyzers/TradeOffAnalyzer';
import { ReportGenerator } from './generators/ReportGenerator';
import {
  Option,
  Constraint,
  ComparisonReport,
  ScoringResult,
  TradeOffAnalysis,
  ValidationError,
  Result,
  createSuccess,
  createError,
  createValidationError,
} from './types/core';

export interface ComparisonRequest {
  options: Option[];
  constraints: Constraint[];
  reportFormat?: 'json' | 'markdown' | 'html';
}

export interface ComparisonResult {
  report: ComparisonReport;
  exportedReport?: string;
}

export class RefereeSystem {
  private optionManager: OptionManager;
  private constraintManager: ConstraintManager;
  private configurationManager: ConfigurationManager;
  private inputValidator: InputValidator;
  private topsisEngine: TOPSISEngine;
  private tradeOffAnalyzer: TradeOffAnalyzer;
  private reportGenerator: ReportGenerator;

  constructor() {
    this.optionManager = new OptionManager();
    this.constraintManager = new ConstraintManager();
    this.configurationManager = new ConfigurationManager();
    this.inputValidator = new InputValidator();
    this.topsisEngine = new TOPSISEngine();
    this.tradeOffAnalyzer = new TradeOffAnalyzer();
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Initialize the system with configuration
   */
  async initialize(configKey?: string): Promise<Result<void, ValidationError>> {
    try {
      // Load configuration
      const configResult = await this.configurationManager.loadConfiguration(configKey);
      if (!configResult.success) {
        return configResult;
      }

      return createSuccess(undefined);
    } catch (error) {
      return createError(
        createValidationError(
          'initialization',
          `System initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INIT_ERROR'
        )
      );
    }
  }

  /**
   * Perform a complete comparison analysis
   */
  async performComparison(request: ComparisonRequest): Promise<Result<ComparisonResult, ValidationError>> {
    try {
      // Step 1: Validate input
      const validationResult = this.validateComparisonRequest(request);
      if (!validationResult.isValid) {
        return createError(validationResult.errors[0]!);
      }

      // Step 2: Set up options and constraints
      const setupResult = await this.setupComparison(request.options, request.constraints);
      if (!setupResult.success) {
        return setupResult;
      }

      // Step 3: Perform TOPSIS scoring
      const scoringResult = this.topsisEngine.calculateScores(request.options, request.constraints);
      if (!scoringResult.success) {
        return createError(
          createValidationError(
            'scoring',
            `Scoring failed: ${scoringResult.error.message}`,
            'SCORING_ERROR'
          )
        );
      }

      // Step 4: Perform trade-off analysis
      const analysisResult = this.tradeOffAnalyzer.analyzeTradeOffs(
        scoringResult.data,
        request.options,
        request.constraints
      );
      if (!analysisResult.success) {
        return createError(
          createValidationError(
            'analysis',
            `Trade-off analysis failed: ${analysisResult.error.message}`,
            'ANALYSIS_ERROR'
          )
        );
      }

      // Step 5: Generate comprehensive report
      const reportResult = this.reportGenerator.generateReport(
        scoringResult.data,
        analysisResult.data,
        request.options,
        request.constraints
      );
      if (!reportResult.success) {
        return createError(
          createValidationError(
            'report',
            `Report generation failed: ${reportResult.error.message}`,
            'REPORT_ERROR'
          )
        );
      }

      // Step 6: Export report in requested format
      const result: ComparisonResult = {
        report: reportResult.data,
      };
      
      if (request.reportFormat) {
        result.exportedReport = this.exportReport(reportResult.data, request.reportFormat);
      }

      return createSuccess(result);
    } catch (error) {
      return createError(
        createValidationError(
          'comparison',
          `Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'COMPARISON_ERROR'
        )
      );
    }
  }

  /**
   * Quick comparison with minimal setup
   */
  async quickCompare(
    options: Option[],
    constraints: Constraint[]
  ): Promise<Result<ComparisonResult, ValidationError>> {
    return this.performComparison({
      options,
      constraints,
      reportFormat: 'html',
    });
  }

  /**
   * Get available preset configurations
   */
  getPresetConfigurations() {
    return this.configurationManager.getPresetConfigurations();
  }

  /**
   * Apply preset configuration
   */
  applyPresetConfiguration(presetId: string): Result<Constraint[], ValidationError> {
    const preset = this.configurationManager.getPresetConfiguration(presetId);
    if (!preset) {
      return createError(
        createValidationError(
          'preset',
          `Preset configuration '${presetId}' not found`,
          'PRESET_NOT_FOUND'
        )
      );
    }

    return createSuccess([...preset.constraints]);
  }

  /**
   * Add option to the comparison
   */
  addOption(option: Option): Result<void, ValidationError> {
    return this.optionManager.addOption(option);
  }

  /**
   * Remove option from the comparison
   */
  removeOption(optionId: string): Result<void, ValidationError> {
    const result = this.optionManager.removeOption(optionId);
    if (result) {
      return createSuccess(undefined);
    } else {
      return createError(
        createValidationError(
          'option',
          `Option '${optionId}' not found`,
          'OPTION_NOT_FOUND'
        )
      );
    }
  }

  /**
   * Update existing option
   */
  updateOption(optionId: string, updates: Partial<Option>): Result<void, ValidationError> {
    return this.optionManager.updateOption(optionId, updates);
  }

  /**
   * Get all options
   */
  getOptions(): Option[] {
    return this.optionManager.getOptions();
  }

  /**
   * Add constraint to the comparison
   */
  addConstraint(constraint: Constraint): Result<void, ValidationError> {
    return this.constraintManager.addConstraint(constraint);
  }

  /**
   * Update constraint weight
   */
  updateConstraintWeight(constraintId: string, weight: number): Result<void, ValidationError> {
    return this.constraintManager.updateWeight(constraintId, weight);
  }

  /**
   * Get all constraints with normalized weights
   */
  getConstraints(): Constraint[] {
    return this.constraintManager.getConstraints();
  }

  /**
   * Clear all options and constraints
   */
  reset(): void {
    this.optionManager = new OptionManager();
    this.constraintManager = new ConstraintManager();
  }

  /**
   * Get user preferences
   */
  getUserPreferences() {
    return this.configurationManager.getUserPreferences();
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: any): Result<void, ValidationError> {
    return this.configurationManager.updateUserPreferences(preferences);
  }

  /**
   * Save current configuration
   */
  async saveConfiguration(configKey?: string): Promise<Result<void, ValidationError>> {
    return this.configurationManager.saveConfiguration(configKey);
  }

  /**
   * Export configuration
   */
  exportConfiguration(): string {
    return this.configurationManager.exportConfiguration();
  }

  /**
   * Import configuration
   */
  importConfiguration(configJson: string): Result<void, ValidationError> {
    return this.configurationManager.importConfiguration(configJson);
  }

  /**
   * Validate comparison request
   */
  private validateComparisonRequest(request: ComparisonRequest): any {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate options
    if (!Array.isArray(request.options) || request.options.length < 2) {
      errors.push(
        createValidationError(
          'options',
          'At least 2 options are required for comparison',
          'INSUFFICIENT_OPTIONS'
        )
      );
    }

    if (request.options.length > 5) {
      errors.push(
        createValidationError(
          'options',
          'Maximum 5 options allowed for comparison',
          'TOO_MANY_OPTIONS'
        )
      );
    }

    // Validate constraints
    if (!Array.isArray(request.constraints) || request.constraints.length === 0) {
      errors.push(
        createValidationError(
          'constraints',
          'At least 1 constraint is required for comparison',
          'NO_CONSTRAINTS'
        )
      );
    }

    // Validate report format
    if (request.reportFormat) {
      const validFormats = ['json', 'markdown', 'html'];
      if (!validFormats.includes(request.reportFormat)) {
        errors.push(
          createValidationError(
            'reportFormat',
            'Invalid report format. Must be json, markdown, or html',
            'INVALID_FORMAT'
          )
        );
      }
    }

    // Validate individual options
    request.options.forEach((option, index) => {
      const optionValidation = InputValidator.validateOption(option);
      if (!optionValidation.isValid) {
        errors.push(
          createValidationError(
            `options[${index}]`,
            `Option validation failed: ${optionValidation.errors[0]?.message}`,
            'INVALID_OPTION'
          )
        );
      }
    });

    // Validate individual constraints
    request.constraints.forEach((constraint, index) => {
      const constraintValidation = InputValidator.validateConstraint(constraint);
      if (!constraintValidation.isValid) {
        errors.push(
          createValidationError(
            `constraints[${index}]`,
            `Constraint validation failed: ${constraintValidation.errors[0]?.message}`,
            'INVALID_CONSTRAINT'
          )
        );
      }
    });

    // Validate consistency between options and constraints
    const constraintIds = new Set(request.constraints.map(c => c.id));
    request.options.forEach((option, optionIndex) => {
      for (const constraintId of constraintIds) {
        if (!option.scores.has(constraintId)) {
          errors.push(
            createValidationError(
              `options[${optionIndex}].scores`,
              `Option '${option.name}' missing score for constraint '${constraintId}'`,
              'MISSING_SCORE'
            )
          );
        }
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Set up comparison with options and constraints
   */
  private async setupComparison(
    options: Option[],
    constraints: Constraint[]
  ): Promise<Result<void, ValidationError>> {
    try {
      // Clear existing data
      this.reset();

      // Add all options
      for (const option of options) {
        const result = this.optionManager.addOption(option);
        if (!result.success) {
          return result;
        }
      }

      // Add all constraints
      for (const constraint of constraints) {
        const result = this.constraintManager.addConstraint(constraint);
        if (!result.success) {
          return result;
        }
      }

      // Normalize constraint weights
      this.constraintManager.normalizeWeights();

      return createSuccess(undefined);
    } catch (error) {
      return createError(
        createValidationError(
          'setup',
          `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SETUP_ERROR'
        )
      );
    }
  }

  /**
   * Export report in specified format
   */
  private exportReport(report: ComparisonReport, format: 'json' | 'markdown' | 'html'): string {
    switch (format) {
      case 'json':
        return this.reportGenerator.exportToJSON(report);
      case 'markdown':
        return this.reportGenerator.exportToMarkdown(report);
      case 'html':
        return this.reportGenerator.exportToHTML(report);
      default:
        return this.reportGenerator.exportToHTML(report);
    }
  }

  /**
   * Get system status and health information
   */
  getSystemStatus() {
    return {
      optionCount: this.optionManager.getOptions().length,
      constraintCount: this.constraintManager.getConstraints().length,
      presetCount: this.configurationManager.getPresetConfigurations().length,
      isReady: this.optionManager.getOptions().length >= 2 && 
               this.constraintManager.getConstraints().length >= 1,
    };
  }

  /**
   * Validate system readiness for comparison
   */
  validateReadiness(): Result<void, ValidationError> {
    const status = this.getSystemStatus();
    
    if (!status.isReady) {
      if (status.optionCount < 2) {
        return createError(
          createValidationError(
            'readiness',
            'At least 2 options are required for comparison',
            'INSUFFICIENT_OPTIONS'
          )
        );
      }
      
      if (status.constraintCount < 1) {
        return createError(
          createValidationError(
            'readiness',
            'At least 1 constraint is required for comparison',
            'NO_CONSTRAINTS'
          )
        );
      }
    }

    return createSuccess(undefined);
  }
}