/**
 * Core type definitions for the Option Referee comparison tool
 * Based on the TOPSIS algorithm for multi-criteria decision analysis
 */

// Result type for error handling
export type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Validation error structure
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// Scale definition for constraints
export interface ScaleDefinition {
  min: number;
  max: number;
  unit?: string | undefined;
  description?: string | undefined;
}

// Core Option interface
export interface Option {
  id: string;
  name: string;
  description?: string | undefined;
  scores: Map<string, number>; // constraint_id -> score
  metadata?: Record<string, any> | undefined;
}

// Constraint types and directions
export type ConstraintType = 'cost' | 'performance' | 'efficiency' | 'custom';
export type ConstraintDirection = 'maximize' | 'minimize';

// Core Constraint interface
export interface Constraint {
  id: string;
  name: string;
  weight: number; // 0-100, normalized to sum to 100%
  type: ConstraintType;
  direction: ConstraintDirection; // higher is better vs lower is better
  scale: ScaleDefinition;
}

// Scoring methodology configuration
export interface ScoringMethodology {
  normalizationMethod: 'vector' | 'minmax' | 'zscore';
  weightingApproach: 'linear' | 'logarithmic' | 'categorical';
  distanceMetric: 'euclidean' | 'manhattan' | 'chebyshev';
  idealSolutionMethod: 'max_min' | 'user_defined';
}

// Performance metrics for individual constraints
export interface ConstraintPerformance {
  constraintId: string;
  constraintName: string;
  score: number;
  normalizedScore: number;
  percentileRank: number;
}

// Option ranking result
export interface OptionRanking {
  option: Option;
  rank: number;
  closenessScore: number;
  strengthAreas: string[];
  weaknessAreas: string[];
}

// Constraint difference analysis
export interface ConstraintDifference {
  constraintId: string;
  constraintName: string;
  scoreDifference: number;
  percentageDifference: number;
  significance: 'low' | 'medium' | 'high';
}

// Pairwise comparison between options
export interface PairwiseComparison {
  optionA: string;
  optionB: string;
  winner: string;
  significantDifferences: ConstraintDifference[];
  overallScoreDifference: number;
}

// Recommendation types and structure
export type RecommendationType = 'best_overall' | 'best_for_constraint' | 'compromise' | 'avoid';

export interface Recommendation {
  type: RecommendationType;
  optionId: string;
  reasoning: string;
  confidence: number;
  conditions?: string[];
}

// Analysis results for individual options
export interface OptionAnalysis {
  optionId: string;
  strengths: ConstraintPerformance[];
  weaknesses: ConstraintPerformance[];
  overallScore: number;
  rank: number;
}

// Dominance analysis between options
export interface DominanceAnalysis {
  dominantOptions: string[]; // Options that dominate others
  dominatedOptions: string[]; // Options dominated by others
  paretoFrontier: string[]; // Non-dominated options
  dominanceMatrix: Map<string, string[]>; // option_id -> list of dominated options
}

// Complete trade-off analysis
export interface TradeOffAnalysis {
  optionAnalyses: Map<string, OptionAnalysis>;
  pairwiseComparisons: PairwiseComparison[];
  dominanceRelations: DominanceAnalysis;
  recommendations: Recommendation[];
}

// TOPSIS scoring results
export interface ScoringResult {
  rankings: OptionRanking[];
  normalizedScores: Map<string, Map<string, number>>; // option_id -> constraint_id -> normalized_score
  weightedScores: Map<string, Map<string, number>>; // option_id -> constraint_id -> weighted_score
  closenessScores: Map<string, number>; // option_id -> closeness_score
  idealSolution: number[];
  negativeIdealSolution: number[];
  scoringMethodology: ScoringMethodology;
}

// Visualization data structure
export interface Visualization {
  type: 'bar_chart' | 'radar_chart' | 'scatter_plot' | 'heatmap';
  title: string;
  data: any; // Flexible data structure for different chart types
  config?: Record<string, any>;
}

// Executive summary
export interface ExecutiveSummary {
  topRecommendation: Recommendation;
  keyFindings: string[];
  significantTradeOffs: string[];
  confidenceLevel: number;
  methodology: string;
}

// Complete comparison report
export interface ComparisonReport {
  executiveSummary: ExecutiveSummary;
  rankings: OptionRanking[];
  tradeOffAnalysis: TradeOffAnalysis;
  visualizations: Visualization[];
  methodology: ScoringMethodology;
  timestamp: Date;
}

// Utility type for creating successful results
export const createSuccess = <T>(data: T): Result<T, ValidationError> => ({
  success: true,
  data,
});

// Utility type for creating error results
export const createError = (error: ValidationError): Result<never, ValidationError> => ({
  success: false,
  error,
});

// Utility function for creating validation errors
export const createValidationError = (
  field: string,
  message: string,
  code: string
): ValidationError => ({
  field,
  message,
  code,
});