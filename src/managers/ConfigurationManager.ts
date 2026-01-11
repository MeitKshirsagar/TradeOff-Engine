/**
 * ConfigurationManager - Manages user preferences and system configuration
 * 
 * This class provides configuration persistence with:
 * - Save/load functionality for user preferences
 * - Configuration validation for compatibility
 * - Preset configurations for common scenarios
 * - Version management and migration support
 */

// Declare window for Node.js compatibility
declare const window: any;

import {
  ScoringMethodology,
  Constraint,
  ValidationError,
  ValidationResult,
  Result,
  createSuccess,
  createError,
  createValidationError,
} from '../types/core';

// Configuration interfaces
export interface UserPreferences {
  defaultScoringMethodology: ScoringMethodology;
  defaultConstraints: Constraint[];
  reportFormat: 'json' | 'markdown' | 'html';
  visualizationPreferences: {
    showRadarChart: boolean;
    showHeatmap: boolean;
    showScatterPlot: boolean;
    colorScheme: 'default' | 'colorblind' | 'high-contrast';
  };
  analysisSettings: {
    strengthThreshold: number; // Percentile threshold for identifying strengths (0-1)
    weaknessThreshold: number; // Percentile threshold for identifying weaknesses (0-1)
    significanceThreshold: number; // Threshold for significant differences (0-1)
  };
}

export interface SystemConfiguration {
  version: string;
  userPreferences: UserPreferences;
  presetConfigurations: Map<string, PresetConfiguration>;
  lastModified: Date;
}

export interface PresetConfiguration {
  id: string;
  name: string;
  description: string;
  scoringMethodology: ScoringMethodology;
  constraints: Constraint[];
  category: 'general' | 'technology' | 'business' | 'personal' | 'custom';
  tags: string[];
}

export class ConfigurationManager {
  private static readonly CONFIG_VERSION = '1.0.0';
  private static readonly DEFAULT_CONFIG_KEY = 'option_referee_config';
  
  private configuration: SystemConfiguration;

  constructor() {
    this.configuration = this.createDefaultConfiguration();
  }

  /**
   * Load configuration from storage
   */
  async loadConfiguration(storageKey?: string): Promise<Result<SystemConfiguration, ValidationError>> {
    try {
      const key = storageKey || ConfigurationManager.DEFAULT_CONFIG_KEY;
      const configData = this.getFromStorage(key);
      
      if (!configData) {
        // No existing configuration, return default
        return createSuccess(this.configuration);
      }

      const parsed = JSON.parse(configData);
      const validationResult = this.validateConfiguration(parsed);
      
      if (!validationResult.isValid) {
        return createError(validationResult.errors[0]!);
      }

      // Handle version migration if needed
      const migratedConfig = this.migrateConfiguration(parsed);
      this.configuration = this.deserializeConfiguration(migratedConfig);
      
      return createSuccess(this.configuration);
    } catch (error) {
      return createError(
        createValidationError(
          'configuration',
          `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LOAD_ERROR'
        )
      );
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfiguration(storageKey?: string): Promise<Result<void, ValidationError>> {
    try {
      const key = storageKey || ConfigurationManager.DEFAULT_CONFIG_KEY;
      this.configuration.lastModified = new Date();
      
      const serialized = this.serializeConfiguration(this.configuration);
      this.saveToStorage(key, JSON.stringify(serialized, null, 2));
      
      return createSuccess(undefined);
    } catch (error) {
      return createError(
        createValidationError(
          'configuration',
          `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SAVE_ERROR'
        )
      );
    }
  }

  /**
   * Get current user preferences
   */
  getUserPreferences(): UserPreferences {
    return { ...this.configuration.userPreferences };
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): Result<void, ValidationError> {
    try {
      const updated = { ...this.configuration.userPreferences, ...preferences };
      const validationResult = this.validateUserPreferences(updated);
      
      if (!validationResult.isValid) {
        return createError(validationResult.errors[0]!);
      }

      this.configuration.userPreferences = updated;
      return createSuccess(undefined);
    } catch (error) {
      return createError(
        createValidationError(
          'preferences',
          `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'UPDATE_ERROR'
        )
      );
    }
  }

  /**
   * Get all preset configurations
   */
  getPresetConfigurations(): PresetConfiguration[] {
    return Array.from(this.configuration.presetConfigurations.values());
  }

  /**
   * Get preset configuration by ID
   */
  getPresetConfiguration(id: string): PresetConfiguration | null {
    return this.configuration.presetConfigurations.get(id) || null;
  }

  /**
   * Add or update preset configuration
   */
  setPresetConfiguration(preset: PresetConfiguration): Result<void, ValidationError> {
    try {
      const validationResult = this.validatePresetConfiguration(preset);
      
      if (!validationResult.isValid) {
        return createError(validationResult.errors[0]!);
      }

      this.configuration.presetConfigurations.set(preset.id, preset);
      return createSuccess(undefined);
    } catch (error) {
      return createError(
        createValidationError(
          'preset',
          `Failed to set preset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'PRESET_ERROR'
        )
      );
    }
  }

  /**
   * Remove preset configuration
   */
  removePresetConfiguration(id: string): boolean {
    return this.configuration.presetConfigurations.delete(id);
  }

  /**
   * Create default system configuration
   */
  private createDefaultConfiguration(): SystemConfiguration {
    const defaultPreferences: UserPreferences = {
      defaultScoringMethodology: {
        normalizationMethod: 'vector',
        weightingApproach: 'linear',
        distanceMetric: 'euclidean',
        idealSolutionMethod: 'max_min',
      },
      defaultConstraints: [],
      reportFormat: 'html',
      visualizationPreferences: {
        showRadarChart: true,
        showHeatmap: true,
        showScatterPlot: true,
        colorScheme: 'default',
      },
      analysisSettings: {
        strengthThreshold: 0.75,
        weaknessThreshold: 0.25,
        significanceThreshold: 0.15,
      },
    };

    const presetConfigurations = new Map<string, PresetConfiguration>();
    
    // Add default presets
    this.createDefaultPresets().forEach(preset => {
      presetConfigurations.set(preset.id, preset);
    });

    return {
      version: ConfigurationManager.CONFIG_VERSION,
      userPreferences: defaultPreferences,
      presetConfigurations,
      lastModified: new Date(),
    };
  }

  /**
   * Create default preset configurations
   */
  private createDefaultPresets(): PresetConfiguration[] {
    return [
      {
        id: 'laptop_comparison',
        name: 'Laptop Comparison',
        description: 'Standard configuration for comparing laptops and computers',
        category: 'technology',
        tags: ['laptop', 'computer', 'hardware'],
        scoringMethodology: {
          normalizationMethod: 'vector',
          weightingApproach: 'linear',
          distanceMetric: 'euclidean',
          idealSolutionMethod: 'max_min',
        },
        constraints: [
          {
            id: 'price',
            name: 'Price',
            weight: 25,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 500, max: 3000 },
          },
          {
            id: 'performance',
            name: 'Performance',
            weight: 35,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 60, max: 100 },
          },
          {
            id: 'battery_life',
            name: 'Battery Life',
            weight: 20,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 3, max: 12 },
          },
          {
            id: 'portability',
            name: 'Portability',
            weight: 20,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 1, max: 10 },
          },
        ],
      },
      {
        id: 'investment_analysis',
        name: 'Investment Analysis',
        description: 'Configuration for comparing investment options',
        category: 'business',
        tags: ['investment', 'finance', 'roi'],
        scoringMethodology: {
          normalizationMethod: 'vector',
          weightingApproach: 'logarithmic',
          distanceMetric: 'euclidean',
          idealSolutionMethod: 'max_min',
        },
        constraints: [
          {
            id: 'expected_return',
            name: 'Expected Return',
            weight: 40,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 0, max: 20 },
          },
          {
            id: 'risk_level',
            name: 'Risk Level',
            weight: 30,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 1, max: 10 },
          },
          {
            id: 'liquidity',
            name: 'Liquidity',
            weight: 20,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 1, max: 10 },
          },
          {
            id: 'minimum_investment',
            name: 'Minimum Investment',
            weight: 10,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 100, max: 100000 },
          },
        ],
      },
      {
        id: 'software_selection',
        name: 'Software Selection',
        description: 'Configuration for comparing software tools and platforms',
        category: 'technology',
        tags: ['software', 'tools', 'platform'],
        scoringMethodology: {
          normalizationMethod: 'vector',
          weightingApproach: 'linear',
          distanceMetric: 'euclidean',
          idealSolutionMethod: 'max_min',
        },
        constraints: [
          {
            id: 'functionality',
            name: 'Functionality',
            weight: 35,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 1, max: 10 },
          },
          {
            id: 'ease_of_use',
            name: 'Ease of Use',
            weight: 25,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 1, max: 10 },
          },
          {
            id: 'cost',
            name: 'Cost',
            weight: 20,
            type: 'cost',
            direction: 'minimize',
            scale: { min: 0, max: 1000 },
          },
          {
            id: 'support_quality',
            name: 'Support Quality',
            weight: 20,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 1, max: 10 },
          },
        ],
      },
    ];
  }

  /**
   * Validate configuration structure and data
   */
  private validateConfiguration(config: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push(
        createValidationError('config', 'Configuration must be an object', 'INVALID_TYPE')
      );
      return { isValid: false, errors, warnings };
    }

    // Validate version
    if (!config.version || typeof config.version !== 'string') {
      errors.push(
        createValidationError('version', 'Configuration version is required', 'MISSING_VERSION')
      );
    }

    // Validate user preferences
    if (!config.userPreferences) {
      errors.push(
        createValidationError('userPreferences', 'User preferences are required', 'MISSING_PREFERENCES')
      );
    } else {
      const prefValidation = this.validateUserPreferences(config.userPreferences);
      errors.push(...prefValidation.errors);
      warnings.push(...prefValidation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate user preferences
   */
  private validateUserPreferences(preferences: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!preferences || typeof preferences !== 'object') {
      errors.push(
        createValidationError('preferences', 'Preferences must be an object', 'INVALID_TYPE')
      );
      return { isValid: false, errors, warnings };
    }

    // Validate analysis settings
    if (preferences.analysisSettings) {
      const settings = preferences.analysisSettings;
      
      if (typeof settings.strengthThreshold === 'number') {
        if (settings.strengthThreshold < 0 || settings.strengthThreshold > 1) {
          errors.push(
            createValidationError('strengthThreshold', 'Strength threshold must be between 0 and 1', 'INVALID_RANGE')
          );
        }
      }
      
      if (typeof settings.weaknessThreshold === 'number') {
        if (settings.weaknessThreshold < 0 || settings.weaknessThreshold > 1) {
          errors.push(
            createValidationError('weaknessThreshold', 'Weakness threshold must be between 0 and 1', 'INVALID_RANGE')
          );
        }
      }
      
      if (typeof settings.significanceThreshold === 'number') {
        if (settings.significanceThreshold < 0 || settings.significanceThreshold > 1) {
          errors.push(
            createValidationError('significanceThreshold', 'Significance threshold must be between 0 and 1', 'INVALID_RANGE')
          );
        }
      }
    }

    // Validate report format
    if (preferences.reportFormat) {
      const validFormats = ['json', 'markdown', 'html'];
      if (!validFormats.includes(preferences.reportFormat)) {
        errors.push(
          createValidationError('reportFormat', 'Invalid report format', 'INVALID_FORMAT')
        );
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate preset configuration
   */
  private validatePresetConfiguration(preset: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!preset || typeof preset !== 'object') {
      errors.push(
        createValidationError('preset', 'Preset must be an object', 'INVALID_TYPE')
      );
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['id', 'name', 'description', 'category', 'scoringMethodology', 'constraints'];
    for (const field of requiredFields) {
      if (!preset[field]) {
        errors.push(
          createValidationError(field, `${field} is required`, 'MISSING_FIELD')
        );
      }
    }

    // Validate category
    if (preset.category) {
      const validCategories = ['general', 'technology', 'business', 'personal', 'custom'];
      if (!validCategories.includes(preset.category)) {
        errors.push(
          createValidationError('category', 'Invalid preset category', 'INVALID_CATEGORY')
        );
      }
    }

    // Validate constraints
    if (Array.isArray(preset.constraints)) {
      if (preset.constraints.length === 0) {
        warnings.push('Preset has no constraints defined');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Migrate configuration to current version
   */
  private migrateConfiguration(config: any): any {
    // Handle version migrations here
    if (!config.version || config.version < ConfigurationManager.CONFIG_VERSION) {
      // Add migration logic for future versions
      config.version = ConfigurationManager.CONFIG_VERSION;
    }
    
    return config;
  }

  /**
   * Serialize configuration for storage
   */
  private serializeConfiguration(config: SystemConfiguration): any {
    return {
      version: config.version,
      userPreferences: config.userPreferences,
      presetConfigurations: Object.fromEntries(config.presetConfigurations),
      lastModified: config.lastModified.toISOString(),
    };
  }

  /**
   * Deserialize configuration from storage
   */
  private deserializeConfiguration(data: any): SystemConfiguration {
    const presetConfigurations = new Map<string, PresetConfiguration>();
    
    if (data.presetConfigurations) {
      Object.entries(data.presetConfigurations).forEach(([key, value]) => {
        presetConfigurations.set(key, value as PresetConfiguration);
      });
    }

    return {
      version: data.version,
      userPreferences: data.userPreferences,
      presetConfigurations,
      lastModified: new Date(data.lastModified),
    };
  }

  /**
   * Get data from storage (browser localStorage or Node.js equivalent)
   */
  private getFromStorage(key: string): string | null {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        return (window as any).localStorage.getItem(key);
      }
    } catch (error) {
      // localStorage not available
    }
    
    // For Node.js environment, return null (no persistence in tests)
    return null;
  }

  /**
   * Save data to storage (browser localStorage or Node.js equivalent)
   */
  private saveToStorage(key: string, data: string): void {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem(key, data);
      }
    } catch (error) {
      // localStorage not available
      // In a real implementation, you might use file system here
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.configuration = this.createDefaultConfiguration();
  }

  /**
   * Export configuration as JSON string
   */
  exportConfiguration(): string {
    return JSON.stringify(this.serializeConfiguration(this.configuration), null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  importConfiguration(configJson: string): Result<void, ValidationError> {
    try {
      const parsed = JSON.parse(configJson);
      const validationResult = this.validateConfiguration(parsed);
      
      if (!validationResult.isValid) {
        return createError(validationResult.errors[0]!);
      }

      this.configuration = this.deserializeConfiguration(parsed);
      return createSuccess(undefined);
    } catch (error) {
      return createError(
        createValidationError(
          'import',
          `Failed to import configuration: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
          'IMPORT_ERROR'
        )
      );
    }
  }
}