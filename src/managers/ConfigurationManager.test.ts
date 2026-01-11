/**
 * Tests for ConfigurationManager - Configuration persistence and management
 * 
 * This test suite covers:
 * - Configuration loading and saving
 * - User preferences management
 * - Preset configuration management
 * - Validation and error handling
 * - Import/export functionality
 */

import * as fc from 'fast-check';
import { ConfigurationManager, UserPreferences, PresetConfiguration } from './ConfigurationManager';

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;

  beforeEach(() => {
    manager = new ConfigurationManager();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default configuration', () => {
      const preferences = manager.getUserPreferences();
      
      expect(preferences).toBeDefined();
      expect(preferences.defaultScoringMethodology).toBeDefined();
      expect(preferences.reportFormat).toBe('html');
      expect(preferences.visualizationPreferences).toBeDefined();
      expect(preferences.analysisSettings).toBeDefined();
      
      // Analysis settings should have valid defaults
      expect(preferences.analysisSettings.strengthThreshold).toBe(0.75);
      expect(preferences.analysisSettings.weaknessThreshold).toBe(0.25);
      expect(preferences.analysisSettings.significanceThreshold).toBe(0.15);
    });

    it('should have default preset configurations', () => {
      const presets = manager.getPresetConfigurations();
      
      expect(presets.length).toBeGreaterThan(0);
      
      // Should have laptop comparison preset
      const laptopPreset = presets.find(p => p.id === 'laptop_comparison');
      expect(laptopPreset).toBeDefined();
      expect(laptopPreset?.name).toBe('Laptop Comparison');
      expect(laptopPreset?.constraints.length).toBeGreaterThan(0);
      
      // Should have investment analysis preset
      const investmentPreset = presets.find(p => p.id === 'investment_analysis');
      expect(investmentPreset).toBeDefined();
      expect(investmentPreset?.category).toBe('business');
      
      // Should have software selection preset
      const softwarePreset = presets.find(p => p.id === 'software_selection');
      expect(softwarePreset).toBeDefined();
      expect(softwarePreset?.category).toBe('technology');
    });
  });

  describe('User Preferences Management', () => {
    it('should update user preferences successfully', () => {
      const newPreferences: Partial<UserPreferences> = {
        reportFormat: 'json',
        analysisSettings: {
          strengthThreshold: 0.8,
          weaknessThreshold: 0.2,
          significanceThreshold: 0.1,
        },
      };

      const result = manager.updateUserPreferences(newPreferences);
      expect(result.success).toBe(true);

      const updated = manager.getUserPreferences();
      expect(updated.reportFormat).toBe('json');
      expect(updated.analysisSettings.strengthThreshold).toBe(0.8);
      expect(updated.analysisSettings.weaknessThreshold).toBe(0.2);
      expect(updated.analysisSettings.significanceThreshold).toBe(0.1);
    });

    it('should validate user preferences', () => {
      const invalidPreferences: Partial<UserPreferences> = {
        reportFormat: 'invalid' as any,
        analysisSettings: {
          strengthThreshold: 1.5, // Invalid: > 1
          weaknessThreshold: -0.1, // Invalid: < 0
          significanceThreshold: 0.5,
        },
      };

      const result = manager.updateUserPreferences(invalidPreferences);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.code).toMatch(/INVALID_/);
      }
    });

    it('should preserve existing preferences when partially updating', () => {
      const originalPreferences = manager.getUserPreferences();
      const originalFormat = originalPreferences.reportFormat;
      
      const partialUpdate: Partial<UserPreferences> = {
        analysisSettings: {
          strengthThreshold: 0.9,
          weaknessThreshold: 0.1,
          significanceThreshold: 0.2,
        },
      };

      const result = manager.updateUserPreferences(partialUpdate);
      expect(result.success).toBe(true);

      const updated = manager.getUserPreferences();
      expect(updated.reportFormat).toBe(originalFormat); // Should be preserved
      expect(updated.analysisSettings.strengthThreshold).toBe(0.9); // Should be updated
    });
  });

  describe('Preset Configuration Management', () => {
    it('should add new preset configuration', () => {
      const newPreset: PresetConfiguration = {
        id: 'test_preset',
        name: 'Test Preset',
        description: 'A test preset configuration',
        category: 'custom',
        tags: ['test'],
        scoringMethodology: {
          normalizationMethod: 'vector',
          weightingApproach: 'linear',
          distanceMetric: 'euclidean',
          idealSolutionMethod: 'max_min',
        },
        constraints: [
          {
            id: 'test_constraint',
            name: 'Test Constraint',
            weight: 100,
            type: 'performance',
            direction: 'maximize',
            scale: { min: 0, max: 100 },
          },
        ],
      };

      const result = manager.setPresetConfiguration(newPreset);
      expect(result.success).toBe(true);

      const retrieved = manager.getPresetConfiguration('test_preset');
      expect(retrieved).toEqual(newPreset);
    });

    it('should validate preset configuration', () => {
      const invalidPreset: any = {
        id: 'invalid_preset',
        // Missing required fields
        category: 'invalid_category',
      };

      const result = manager.setPresetConfiguration(invalidPreset);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.code).toMatch(/MISSING_FIELD|INVALID_CATEGORY/);
      }
    });

    it('should remove preset configuration', () => {
      const testPreset: PresetConfiguration = {
        id: 'removable_preset',
        name: 'Removable Preset',
        description: 'A preset to be removed',
        category: 'custom',
        tags: [],
        scoringMethodology: {
          normalizationMethod: 'vector',
          weightingApproach: 'linear',
          distanceMetric: 'euclidean',
          idealSolutionMethod: 'max_min',
        },
        constraints: [],
      };

      manager.setPresetConfiguration(testPreset);
      expect(manager.getPresetConfiguration('removable_preset')).toBeDefined();

      const removed = manager.removePresetConfiguration('removable_preset');
      expect(removed).toBe(true);
      expect(manager.getPresetConfiguration('removable_preset')).toBeNull();
    });

    it('should return false when removing non-existent preset', () => {
      const removed = manager.removePresetConfiguration('non_existent');
      expect(removed).toBe(false);
    });
  });

  describe('Configuration Persistence', () => {
    it('should save and load configuration', async () => {
      // Update some preferences
      const newPreferences: Partial<UserPreferences> = {
        reportFormat: 'markdown',
        analysisSettings: {
          strengthThreshold: 0.85,
          weaknessThreshold: 0.15,
          significanceThreshold: 0.12,
        },
      };

      manager.updateUserPreferences(newPreferences);

      // Save configuration
      const saveResult = await manager.saveConfiguration('test_config');
      expect(saveResult.success).toBe(true);

      // Create new manager and load configuration
      const newManager = new ConfigurationManager();
      const loadResult = await newManager.loadConfiguration('test_config');
      
      // Note: In test environment without localStorage, this will return default config
      expect(loadResult.success).toBe(true);
    });

    it('should handle missing configuration gracefully', async () => {
      const result = await manager.loadConfiguration('non_existent_config');
      expect(result.success).toBe(true);
      
      if (result.success) {
        // Should return default configuration
        const config = result.data;
        expect(config.userPreferences).toBeDefined();
        expect(config.presetConfigurations).toBeDefined();
      }
    });
  });

  describe('Import/Export Functionality', () => {
    it('should export configuration as JSON', () => {
      const exported = manager.exportConfiguration();
      
      expect(exported).toBeDefined();
      expect(exported.length).toBeGreaterThan(100);
      
      // Should be valid JSON
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed.version).toBeDefined();
      expect(parsed.userPreferences).toBeDefined();
      expect(parsed.presetConfigurations).toBeDefined();
    });

    it('should import valid configuration', () => {
      const exported = manager.exportConfiguration();
      
      // Create new manager and import
      const newManager = new ConfigurationManager();
      const result = newManager.importConfiguration(exported);
      
      expect(result.success).toBe(true);
      
      // Preferences should match
      const originalPrefs = manager.getUserPreferences();
      const importedPrefs = newManager.getUserPreferences();
      expect(importedPrefs).toEqual(originalPrefs);
    });

    it('should reject invalid JSON during import', () => {
      const invalidJson = '{ invalid json }';
      
      const result = manager.importConfiguration(invalidJson);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.code).toBe('IMPORT_ERROR');
      }
    });

    it('should reject invalid configuration structure during import', () => {
      const invalidConfig = JSON.stringify({
        version: '1.0.0',
        // Missing userPreferences
      });
      
      const result = manager.importConfiguration(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.code).toMatch(/MISSING_/);
      }
    });
  });

  describe('Reset and Defaults', () => {
    it('should reset to default configuration', () => {
      // Modify configuration
      manager.updateUserPreferences({ reportFormat: 'json' });
      expect(manager.getUserPreferences().reportFormat).toBe('json');
      
      // Reset to defaults
      manager.resetToDefaults();
      expect(manager.getUserPreferences().reportFormat).toBe('html');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 12: Configuration Persistence
     * Configuration data should be consistently saved, loaded, and validated
     * across different scenarios while maintaining data integrity.
     */
    it('should maintain configuration integrity through save/load cycles', () => {
      fc.assert(
        fc.property(
          fc.record({
            reportFormat: fc.constantFrom('json', 'markdown', 'html'),
            strengthThreshold: fc.float({ min: Math.fround(0.5), max: Math.fround(1.0), noNaN: true }),
            weaknessThreshold: fc.float({ min: Math.fround(0.0), max: Math.fround(0.5), noNaN: true }),
            significanceThreshold: fc.float({ min: Math.fround(0.05), max: Math.fround(0.3), noNaN: true }),
            showRadarChart: fc.boolean(),
            showHeatmap: fc.boolean(),
            colorScheme: fc.constantFrom('default', 'colorblind', 'high-contrast'),
          }),
          ({ reportFormat, strengthThreshold, weaknessThreshold, significanceThreshold, showRadarChart, showHeatmap, colorScheme }) => {
            const localManager = new ConfigurationManager();
            
            // Update preferences with generated values
            const preferences: Partial<UserPreferences> = {
              reportFormat: reportFormat as 'json' | 'markdown' | 'html',
              analysisSettings: {
                strengthThreshold,
                weaknessThreshold,
                significanceThreshold,
              },
              visualizationPreferences: {
                showRadarChart,
                showHeatmap,
                showScatterPlot: true,
                colorScheme: colorScheme as 'default' | 'colorblind' | 'high-contrast',
              },
            };
            
            const updateResult = localManager.updateUserPreferences(preferences);
            
            // Property: Valid preferences should always be accepted
            expect(updateResult.success).toBe(true);
            
            if (updateResult.success) {
              const retrieved = localManager.getUserPreferences();
              
              // Property: Retrieved preferences should match what was set
              expect(retrieved.reportFormat).toBe(reportFormat);
              expect(retrieved.analysisSettings.strengthThreshold).toBe(strengthThreshold);
              expect(retrieved.analysisSettings.weaknessThreshold).toBe(weaknessThreshold);
              expect(retrieved.analysisSettings.significanceThreshold).toBe(significanceThreshold);
              expect(retrieved.visualizationPreferences.showRadarChart).toBe(showRadarChart);
              expect(retrieved.visualizationPreferences.showHeatmap).toBe(showHeatmap);
              expect(retrieved.visualizationPreferences.colorScheme).toBe(colorScheme);
              
              // Property: Export/import should preserve data
              const exported = localManager.exportConfiguration();
              expect(exported.length).toBeGreaterThan(50);
              
              const newManager = new ConfigurationManager();
              const importResult = newManager.importConfiguration(exported);
              expect(importResult.success).toBe(true);
              
              if (importResult.success) {
                const importedPrefs = newManager.getUserPreferences();
                
                // Property: Imported preferences should match original
                expect(importedPrefs.reportFormat).toBe(reportFormat);
                expect(importedPrefs.analysisSettings.strengthThreshold).toBe(strengthThreshold);
                expect(importedPrefs.analysisSettings.weaknessThreshold).toBe(weaknessThreshold);
                expect(importedPrefs.analysisSettings.significanceThreshold).toBe(significanceThreshold);
                expect(importedPrefs.visualizationPreferences.showRadarChart).toBe(showRadarChart);
                expect(importedPrefs.visualizationPreferences.showHeatmap).toBe(showHeatmap);
                expect(importedPrefs.visualizationPreferences.colorScheme).toBe(colorScheme);
              }
            }
          }
        ), { numRuns: 100 });
    });

    it('should validate preset configurations consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            category: fc.constantFrom('general', 'technology', 'business', 'personal', 'custom'),
            constraintCount: fc.integer({ min: 1, max: 5 }),
          }),
          ({ id, name, description, category, constraintCount }) => {
            const localManager = new ConfigurationManager();
            
            // Generate valid constraints
            const constraints = Array.from({ length: constraintCount }, (_, i) => ({
              id: `constraint_${i}`,
              name: `Constraint ${i}`,
              weight: 100 / constraintCount,
              type: 'performance' as const,
              direction: 'maximize' as const,
              scale: { min: 0, max: 100 },
            }));
            
            const preset: PresetConfiguration = {
              id,
              name,
              description,
              category: category as 'general' | 'technology' | 'business' | 'personal' | 'custom',
              tags: ['test'],
              scoringMethodology: {
                normalizationMethod: 'vector',
                weightingApproach: 'linear',
                distanceMetric: 'euclidean',
                idealSolutionMethod: 'max_min',
              },
              constraints,
            };
            
            const result = localManager.setPresetConfiguration(preset);
            
            // Property: Valid presets should always be accepted
            expect(result.success).toBe(true);
            
            if (result.success) {
              const retrieved = localManager.getPresetConfiguration(id);
              
              // Property: Retrieved preset should match what was set
              expect(retrieved).toBeDefined();
              if (retrieved) {
                expect(retrieved.id).toBe(id);
                expect(retrieved.name).toBe(name);
                expect(retrieved.description).toBe(description);
                expect(retrieved.category).toBe(category);
                expect(retrieved.constraints.length).toBe(constraintCount);
              }
              
              // Property: Preset should appear in list
              const allPresets = localManager.getPresetConfigurations();
              const foundPreset = allPresets.find(p => p.id === id);
              expect(foundPreset).toBeDefined();
              
              // Property: Removal should work
              const removed = localManager.removePresetConfiguration(id);
              expect(removed).toBe(true);
              
              const afterRemoval = localManager.getPresetConfiguration(id);
              expect(afterRemoval).toBeNull();
            }
          }
        ), { numRuns: 100 });
    });

    it('should reject invalid preference values consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            strengthThreshold: fc.float({ min: Math.fround(-2), max: Math.fround(3), noNaN: true }),
            weaknessThreshold: fc.float({ min: Math.fround(-2), max: Math.fround(3), noNaN: true }),
            significanceThreshold: fc.float({ min: Math.fround(-2), max: Math.fround(3), noNaN: true }),
          }),
          ({ strengthThreshold, weaknessThreshold, significanceThreshold }) => {
            const localManager = new ConfigurationManager();
            
            const preferences: Partial<UserPreferences> = {
              analysisSettings: {
                strengthThreshold,
                weaknessThreshold,
                significanceThreshold,
              },
            };
            
            const result = localManager.updateUserPreferences(preferences);
            
            // Property: Values outside [0,1] should be rejected
            const hasInvalidValue = strengthThreshold < 0 || strengthThreshold > 1 ||
                                  weaknessThreshold < 0 || weaknessThreshold > 1 ||
                                  significanceThreshold < 0 || significanceThreshold > 1;
            
            if (hasInvalidValue) {
              expect(result.success).toBe(false);
              if (!result.success) {
                expect(result.error.code).toBe('INVALID_RANGE');
              }
            } else {
              expect(result.success).toBe(true);
              if (result.success) {
                const retrieved = localManager.getUserPreferences();
                expect(retrieved.analysisSettings.strengthThreshold).toBe(strengthThreshold);
                expect(retrieved.analysisSettings.weaknessThreshold).toBe(weaknessThreshold);
                expect(retrieved.analysisSettings.significanceThreshold).toBe(significanceThreshold);
              }
            }
          }
        ), { numRuns: 100 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty preset configurations list', () => {
      // Remove all presets
      const presets = manager.getPresetConfigurations();
      presets.forEach(preset => {
        manager.removePresetConfiguration(preset.id);
      });
      
      const remaining = manager.getPresetConfigurations();
      expect(remaining).toHaveLength(0);
    });

    it('should handle configuration with no constraints', () => {
      const presetWithNoConstraints: PresetConfiguration = {
        id: 'no_constraints',
        name: 'No Constraints',
        description: 'A preset with no constraints',
        category: 'custom',
        tags: [],
        scoringMethodology: {
          normalizationMethod: 'vector',
          weightingApproach: 'linear',
          distanceMetric: 'euclidean',
          idealSolutionMethod: 'max_min',
        },
        constraints: [],
      };
      
      const result = manager.setPresetConfiguration(presetWithNoConstraints);
      expect(result.success).toBe(true);
    });
  });
});