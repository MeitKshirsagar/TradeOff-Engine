/**
 * TradeOffAnalyzer - Analyzes performance differences and generates insights
 * 
 * This class provides comprehensive trade-off analysis by:
 * - Identifying strengths and weaknesses for each option
 * - Detecting significant differences between options
 * - Finding dominance relationships
 * - Generating contextual recommendations
 */

import {
  Option,
  Constraint,
  ScoringResult,
  TradeOffAnalysis,
  OptionAnalysis,
  ConstraintPerformance,
  PairwiseComparison,
  ConstraintDifference,
  DominanceAnalysis,
  Recommendation,
  RecommendationType,
  ValidationError,
  ValidationResult,
  Result,
  createSuccess,
  createError,
  createValidationError,
} from '../types/core';

export class TradeOffAnalyzer {
  /**
   * Perform comprehensive trade-off analysis
   */
  analyzeTradeOffs(
    scoringResult: ScoringResult,
    options: Option[],
    constraints: Constraint[]
  ): Result<TradeOffAnalysis, ValidationError> {
    // Validate inputs
    const validation = this.validateInputs(scoringResult, options, constraints);
    if (!validation.isValid) {
      return createError(validation.errors[0]!);
    }

    try {
      // Generate individual option analyses
      const optionAnalyses = this.generateOptionAnalyses(scoringResult, options, constraints);
      
      // Perform pairwise comparisons
      const pairwiseComparisons = this.performPairwiseComparisons(scoringResult, options, constraints);
      
      // Find dominance relationships
      const dominanceRelations = this.findDominantOptions(options, constraints, scoringResult);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(optionAnalyses, dominanceRelations, scoringResult);
      
      const analysis: TradeOffAnalysis = {
        optionAnalyses,
        pairwiseComparisons,
        dominanceRelations,
        recommendations,
      };

      return createSuccess(analysis);
    } catch (error) {
      return createError(
        createValidationError(
          'analysis',
          `Trade-off analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'ANALYSIS_ERROR'
        )
      );
    }
  }

  /**
   * Generate detailed analysis for each option
   */
  private generateOptionAnalyses(
    scoringResult: ScoringResult,
    options: Option[],
    constraints: Constraint[]
  ): Map<string, OptionAnalysis> {
    const optionAnalyses = new Map<string, OptionAnalysis>();

    for (const option of options) {
      const ranking = scoringResult.rankings.find(r => r.option.id === option.id);
      if (!ranking) continue;

      const strengths = this.identifyStrengths(option, constraints, scoringResult);
      const weaknesses = this.identifyWeaknesses(option, constraints, scoringResult);
      const overallScore = scoringResult.closenessScores.get(option.id) ?? 0;

      const analysis: OptionAnalysis = {
        optionId: option.id,
        strengths,
        weaknesses,
        overallScore,
        rank: ranking.rank,
      };

      optionAnalyses.set(option.id, analysis);
    }

    return optionAnalyses;
  }

  /**
   * Identify constraint areas where an option performs well
   */
  identifyStrengths(
    option: Option,
    constraints: Constraint[],
    scoringResult: ScoringResult
  ): ConstraintPerformance[] {
    const strengths: ConstraintPerformance[] = [];
    const normalizedScores = scoringResult.normalizedScores.get(option.id);
    
    if (!normalizedScores) return strengths;

    for (const constraint of constraints) {
      const score = option.scores.get(constraint.id) ?? 0;
      const normalizedScore = normalizedScores.get(constraint.id) ?? 0;
      
      // Calculate percentile rank for this constraint across all options
      const allScores = Array.from(scoringResult.normalizedScores.values())
        .map(scores => scores.get(constraint.id) ?? 0)
        .sort((a, b) => a - b);
      
      const percentileRank = this.calculatePercentileRank(normalizedScore, allScores);
      
      // Consider top 25% as strengths
      if (percentileRank >= 0.75) {
        strengths.push({
          constraintId: constraint.id,
          constraintName: constraint.name,
          score,
          normalizedScore,
          percentileRank,
        });
      }
    }

    // Sort by percentile rank (highest first)
    return strengths.sort((a, b) => b.percentileRank - a.percentileRank);
  }

  /**
   * Identify constraint areas where an option performs poorly
   */
  identifyWeaknesses(
    option: Option,
    constraints: Constraint[],
    scoringResult: ScoringResult
  ): ConstraintPerformance[] {
    const weaknesses: ConstraintPerformance[] = [];
    const normalizedScores = scoringResult.normalizedScores.get(option.id);
    
    if (!normalizedScores) return weaknesses;

    for (const constraint of constraints) {
      const score = option.scores.get(constraint.id) ?? 0;
      const normalizedScore = normalizedScores.get(constraint.id) ?? 0;
      
      // Calculate percentile rank for this constraint across all options
      const allScores = Array.from(scoringResult.normalizedScores.values())
        .map(scores => scores.get(constraint.id) ?? 0)
        .sort((a, b) => a - b);
      
      const percentileRank = this.calculatePercentileRank(normalizedScore, allScores);
      
      // Consider bottom 25% as weaknesses
      if (percentileRank <= 0.25) {
        weaknesses.push({
          constraintId: constraint.id,
          constraintName: constraint.name,
          score,
          normalizedScore,
          percentileRank,
        });
      }
    }

    // Sort by percentile rank (lowest first)
    return weaknesses.sort((a, b) => a.percentileRank - b.percentileRank);
  }

  /**
   * Perform pairwise comparisons between all options
   */
  private performPairwiseComparisons(
    scoringResult: ScoringResult,
    options: Option[],
    constraints: Constraint[]
  ): PairwiseComparison[] {
    const comparisons: PairwiseComparison[] = [];

    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const optionA = options[i]!;
        const optionB = options[j]!;
        
        const comparison = this.compareOptions(optionA, optionB, constraints, scoringResult);
        comparisons.push(comparison);
      }
    }

    return comparisons;
  }

  /**
   * Compare two options and identify significant differences
   */
  private compareOptions(
    optionA: Option,
    optionB: Option,
    constraints: Constraint[],
    scoringResult: ScoringResult
  ): PairwiseComparison {
    const significantDifferences: ConstraintDifference[] = [];
    
    const scoreA = scoringResult.closenessScores.get(optionA.id) ?? 0;
    const scoreB = scoringResult.closenessScores.get(optionB.id) ?? 0;
    const overallScoreDifference = Math.abs(scoreA - scoreB);
    
    // Determine winner
    const winner = scoreA > scoreB ? optionA.id : optionB.id;

    // Analyze differences for each constraint
    for (const constraint of constraints) {
      const rawScoreA = optionA.scores.get(constraint.id) ?? 0;
      const rawScoreB = optionB.scores.get(constraint.id) ?? 0;
      const scoreDifference = rawScoreA - rawScoreB;
      
      // Calculate percentage difference
      const maxScore = Math.max(Math.abs(rawScoreA), Math.abs(rawScoreB));
      const percentageDifference = maxScore > 0 ? Math.abs(scoreDifference) / maxScore : 0;
      
      // Determine significance
      let significance: 'low' | 'medium' | 'high' = 'low';
      if (percentageDifference > 0.3) {
        significance = 'high';
      } else if (percentageDifference > 0.15) {
        significance = 'medium';
      }
      
      // Only include significant differences
      if (significance !== 'low') {
        significantDifferences.push({
          constraintId: constraint.id,
          constraintName: constraint.name,
          scoreDifference,
          percentageDifference,
          significance,
        });
      }
    }

    return {
      optionA: optionA.id,
      optionB: optionB.id,
      winner,
      significantDifferences,
      overallScoreDifference,
    };
  }

  /**
   * Find dominance relationships between options
   */
  findDominantOptions(
    options: Option[],
    constraints: Constraint[],
    scoringResult: ScoringResult
  ): DominanceAnalysis {
    const dominanceMatrix = new Map<string, string[]>();
    const dominatedBy = new Map<string, string[]>();
    
    // Initialize maps
    for (const option of options) {
      dominanceMatrix.set(option.id, []);
      dominatedBy.set(option.id, []);
    }

    // Check dominance relationships
    for (let i = 0; i < options.length; i++) {
      for (let j = 0; j < options.length; j++) {
        if (i === j) continue;
        
        const optionA = options[i]!;
        const optionB = options[j]!;
        
        if (this.dominates(optionA, optionB, constraints)) {
          dominanceMatrix.get(optionA.id)!.push(optionB.id);
          dominatedBy.get(optionB.id)!.push(optionA.id);
        }
      }
    }

    // Identify dominant and dominated options
    const dominantOptions = options
      .filter(option => dominanceMatrix.get(option.id)!.length > 0)
      .map(option => option.id);
    
    const dominatedOptions = options
      .filter(option => dominatedBy.get(option.id)!.length > 0)
      .map(option => option.id);
    
    // Pareto frontier consists of non-dominated options
    const paretoFrontier = options
      .filter(option => dominatedBy.get(option.id)!.length === 0)
      .map(option => option.id);

    return {
      dominantOptions,
      dominatedOptions,
      paretoFrontier,
      dominanceMatrix,
    };
  }

  /**
   * Check if optionA dominates optionB (Pareto dominance)
   */
  private dominates(optionA: Option, optionB: Option, constraints: Constraint[]): boolean {
    let hasAdvantage = false;
    
    for (const constraint of constraints) {
      const scoreA = optionA.scores.get(constraint.id) ?? 0;
      const scoreB = optionB.scores.get(constraint.id) ?? 0;
      
      if (constraint.direction === 'maximize') {
        if (scoreA < scoreB) return false; // A is worse in this constraint
        if (scoreA > scoreB) hasAdvantage = true; // A is better in this constraint
      } else {
        if (scoreA > scoreB) return false; // A is worse in this constraint (higher cost)
        if (scoreA < scoreB) hasAdvantage = true; // A is better in this constraint (lower cost)
      }
    }
    
    return hasAdvantage; // A dominates B if it's at least as good in all constraints and better in at least one
  }

  /**
   * Generate contextual recommendations
   */
  generateRecommendations(
    optionAnalyses: Map<string, OptionAnalysis>,
    dominanceRelations: DominanceAnalysis,
    scoringResult: ScoringResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Best overall recommendation
    const bestOption = this.findBestOverallOption(optionAnalyses);
    if (bestOption) {
      recommendations.push(bestOption);
    }
    
    // Compromise recommendation
    const compromiseOption = this.findCompromiseOption(optionAnalyses, dominanceRelations);
    if (compromiseOption) {
      recommendations.push(compromiseOption);
    }
    
    // Avoid recommendation
    const avoidOption = this.findOptionToAvoid(optionAnalyses, dominanceRelations);
    if (avoidOption) {
      recommendations.push(avoidOption);
    }

    return recommendations;
  }

  /**
   * Find the best overall option
   */
  private findBestOverallOption(optionAnalyses: Map<string, OptionAnalysis>): Recommendation | null {
    let bestOption: OptionAnalysis | null = null;
    
    for (const analysis of optionAnalyses.values()) {
      if (!bestOption || analysis.rank < bestOption.rank) {
        bestOption = analysis;
      }
    }
    
    if (!bestOption) return null;
    
    return {
      type: 'best_overall',
      optionId: bestOption.optionId,
      reasoning: `Ranks #${bestOption.rank} with highest overall score (${(bestOption.overallScore * 100).toFixed(1)}%). Strong performance across ${bestOption.strengths.length} key areas.`,
      confidence: this.calculateConfidence(bestOption, optionAnalyses),
    };
  }

  /**
   * Find a good compromise option
   */
  private findCompromiseOption(
    optionAnalyses: Map<string, OptionAnalysis>,
    dominanceRelations: DominanceAnalysis
  ): Recommendation | null {
    // Look for options on the Pareto frontier that aren't the top choice
    const paretoOptions = dominanceRelations.paretoFrontier
      .map(id => optionAnalyses.get(id))
      .filter(analysis => analysis && analysis.rank > 1)
      .sort((a, b) => a!.rank - b!.rank);
    
    const compromiseOption = paretoOptions[0];
    if (!compromiseOption) return null;
    
    return {
      type: 'compromise',
      optionId: compromiseOption.optionId,
      reasoning: `Balanced choice ranking #${compromiseOption.rank}. Offers good trade-offs without major weaknesses in any area.`,
      confidence: this.calculateConfidence(compromiseOption, optionAnalyses),
    };
  }

  /**
   * Find option to avoid
   */
  private findOptionToAvoid(
    optionAnalyses: Map<string, OptionAnalysis>,
    dominanceRelations: DominanceAnalysis
  ): Recommendation | null {
    // Look for dominated options with many weaknesses
    const dominatedOptions = dominanceRelations.dominatedOptions
      .map(id => optionAnalyses.get(id))
      .filter(analysis => analysis && analysis.weaknesses.length >= 2)
      .sort((a, b) => b!.rank - a!.rank);
    
    const avoidOption = dominatedOptions[0];
    if (!avoidOption) return null;
    
    return {
      type: 'avoid',
      optionId: avoidOption.optionId,
      reasoning: `Ranks last (#${avoidOption.rank}) with significant weaknesses in ${avoidOption.weaknesses.length} areas. Better alternatives available.`,
      confidence: this.calculateConfidence(avoidOption, optionAnalyses),
    };
  }

  /**
   * Calculate confidence score for a recommendation
   */
  private calculateConfidence(option: OptionAnalysis, allAnalyses: Map<string, OptionAnalysis>): number {
    const totalOptions = allAnalyses.size;
    const rankScore = (totalOptions - option.rank + 1) / totalOptions;
    const strengthScore = Math.min(option.strengths.length / 3, 1); // Max 3 strengths for full score
    const weaknessScore = Math.max(0, 1 - option.weaknesses.length / 3); // Penalty for weaknesses
    
    return Math.min(0.95, (rankScore * 0.5 + strengthScore * 0.3 + weaknessScore * 0.2));
  }

  /**
   * Calculate percentile rank of a value in a sorted array
   */
  private calculatePercentileRank(value: number, sortedValues: number[]): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0] === value ? 1 : 0;
    
    // Count values less than or equal to the target value
    let count = 0;
    for (const v of sortedValues) {
      if (v < value) count++;
      else if (v === value) count += 0.5; // Tie handling
    }
    
    return count / sortedValues.length;
  }

  /**
   * Validate inputs for trade-off analysis
   */
  private validateInputs(
    scoringResult: ScoringResult,
    options: Option[],
    constraints: Constraint[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate scoring result
    if (!scoringResult || !scoringResult.rankings) {
      errors.push(
        createValidationError(
          'scoringResult',
          'Valid scoring result is required for trade-off analysis',
          'INVALID_SCORING_RESULT'
        )
      );
    }

    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      errors.push(
        createValidationError(
          'options',
          'At least 2 options are required for trade-off analysis',
          'INSUFFICIENT_OPTIONS'
        )
      );
    }

    // Validate constraints
    if (!Array.isArray(constraints) || constraints.length === 0) {
      errors.push(
        createValidationError(
          'constraints',
          'At least 1 constraint is required for trade-off analysis',
          'NO_CONSTRAINTS'
        )
      );
    }

    // Validate consistency between scoring result and options
    if (scoringResult && scoringResult.rankings && options.length > 0) {
      const scoringOptionIds = new Set(scoringResult.rankings.map(r => r.option.id));
      const inputOptionIds = new Set(options.map(o => o.id));
      
      for (const optionId of inputOptionIds) {
        if (!scoringOptionIds.has(optionId)) {
          errors.push(
            createValidationError(
              'consistency',
              `Option '${optionId}' not found in scoring results`,
              'MISSING_SCORING_DATA'
            )
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}