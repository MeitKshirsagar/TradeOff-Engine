/**
 * Option Referee - Multi-criteria decision analysis tool
 * 
 * A comprehensive comparison tool that helps users make informed decisions
 * by analyzing trade-offs between multiple options across various criteria.
 * 
 * Features:
 * - TOPSIS-based multi-criteria scoring
 * - Comprehensive trade-off analysis
 * - Property-based testing for correctness
 * - Multiple report formats (JSON, Markdown, HTML)
 * - Configuration management and presets
 * - Visualization data generation
 */

// Main API
export { RefereeSystem } from './RefereeSystem';
export type { ComparisonRequest, ComparisonResult } from './RefereeSystem';

// Export all core types
export * from './types/core';

// Individual components (for advanced usage)
export { OptionManager } from './managers/OptionManager';
export { ConstraintManager } from './managers/ConstraintManager';
export { ConfigurationManager } from './managers/ConfigurationManager';
export { InputValidator } from './validators/InputValidator';
export { TOPSISEngine } from './engines/TOPSISEngine';
export { TradeOffAnalyzer } from './analyzers/TradeOffAnalyzer';
export { ReportGenerator } from './generators/ReportGenerator';

// Version information
export const VERSION = '1.0.0';

// Quick start helper function
export const createQuickComparison = async (
  options: import('./types/core').Option[],
  constraints: import('./types/core').Constraint[]
) => {
  const { RefereeSystem } = await import('./RefereeSystem');
  const system = new RefereeSystem();
  await system.initialize();
  return system.quickCompare(options, constraints);
};