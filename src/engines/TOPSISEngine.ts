/**
 * TOPSISEngine - Implementation of the TOPSIS algorithm for multi-criteria decision analysis
 * 
 * TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) is a multi-criteria 
 * decision analysis method that ranks alternatives based on their distance from ideal solutions.
 * 
 * Algorithm Steps:
 * 1. Normalize the decision matrix using vector normalization
 * 2. Apply constraint weights to the normalized matrix
 * 3. Determine ideal and negative-ideal solutions
 * 4. Calculate distances from each option to ideal solutions
 * 5. Calculate closeness scores and rank options
 */

import {
  Option,
  Constraint,
  ScoringResult,
  OptionRanking,
  ScoringMethodology,
  ValidationError,
  ValidationResult,
  Result,
  createSuccess,
  createError,
  createValidationError,
} from '../types/core';

export class TOPSISEngine {
  private methodology: ScoringMethodology;

  constructor(methodology?: Partial<ScoringMethodology>) {
    this.methodology = {
      normalizationMethod: 'vector',
      weightingApproach: 'linear',
      distanceMetric: 'euclidean',
      idealSolutionMethod: 'max_min',
      ...methodology,
    };
  }

  /**
   * Calculate TOPSIS scores for given options and constraints
   */
  calculateScores(options: Option[], constraints: Constraint[]): Result<ScoringResult, ValidationError> {
    // Validate inputs
    const validation = this.validateInputs(options, constraints);
    if (!validation.isValid) {
      return createError(validation.errors[0]!);
    }

    try {
      // Step 1: Build decision matrix
      const decisionMatrix = this.buildDecisionMatrix(options, constraints);
      
      // Step 2: Normalize the decision matrix
      const normalizedMatrix = this.normalizeMatrix(decisionMatrix, constraints);
      
      // Step 3: Apply weights
      const weightedMatrix = this.applyWeights(normalizedMatrix, constraints);
      
      // Step 4: Calculate ideal solutions
      const { ideal, negativeIdeal } = this.calculateIdealSolutions(weightedMatrix, constraints);
      
      // Step 5: Calculate distances
      const { positiveDistances, negativeDistances } = this.calculateDistances(
        weightedMatrix, 
        ideal, 
        negativeIdeal
      );
      
      // Step 6: Calculate closeness scores
      const closenessScores = this.calculateClosenessScores(positiveDistances, negativeDistances);
      
      // Step 7: Generate rankings
      const rankings = this.generateRankings(options, closenessScores, weightedMatrix, constraints);
      
      // Build result
      const result: ScoringResult = {
        rankings,
        normalizedScores: this.buildScoreMap(options, constraints, normalizedMatrix),
        weightedScores: this.buildScoreMap(options, constraints, weightedMatrix),
        closenessScores: new Map(options.map((option, index) => [option.id, closenessScores[index]!])),
        idealSolution: ideal,
        negativeIdealSolution: negativeIdeal,
        scoringMethodology: { ...this.methodology },
      };

      return createSuccess(result);
    } catch (error) {
      return createError(
        createValidationError(
          'calculation',
          `TOPSIS calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CALCULATION_ERROR'
        )
      );
    }
  }

  /**
   * Build decision matrix from options and constraints
   */
  private buildDecisionMatrix(options: Option[], constraints: Constraint[]): number[][] {
    const matrix: number[][] = [];
    
    for (const option of options) {
      const row: number[] = [];
      for (const constraint of constraints) {
        const score = option.scores.get(constraint.id) ?? 0;
        row.push(score);
      }
      matrix.push(row);
    }
    
    return matrix;
  }

  /**
   * Normalize decision matrix using vector normalization
   */
  normalizeMatrix(decisionMatrix: number[][], constraints: Constraint[]): number[][] {
    const normalizedMatrix: number[][] = [];
    const numOptions = decisionMatrix.length;
    const numConstraints = constraints.length;

    // Calculate column sums of squares for vector normalization
    const columnSumSquares: number[] = new Array(numConstraints).fill(0);
    
    for (let j = 0; j < numConstraints; j++) {
      for (let i = 0; i < numOptions; i++) {
        const value = decisionMatrix[i]![j]!;
        columnSumSquares[j]! += value * value;
      }
    }

    // Normalize each element
    for (let i = 0; i < numOptions; i++) {
      const normalizedRow: number[] = [];
      for (let j = 0; j < numConstraints; j++) {
        const originalValue = decisionMatrix[i]![j]!;
        const sumSquares = columnSumSquares[j]!;
        
        // Vector normalization: value / sqrt(sum of squares)
        const normalizedValue = sumSquares > 0 ? originalValue / Math.sqrt(sumSquares) : 0;
        normalizedRow.push(normalizedValue);
      }
      normalizedMatrix.push(normalizedRow);
    }

    return normalizedMatrix;
  }

  /**
   * Apply constraint weights to normalized matrix
   */
  applyWeights(normalizedMatrix: number[][], constraints: Constraint[]): number[][] {
    const weightedMatrix: number[][] = [];
    
    for (let i = 0; i < normalizedMatrix.length; i++) {
      const weightedRow: number[] = [];
      for (let j = 0; j < constraints.length; j++) {
        const normalizedValue = normalizedMatrix[i]![j]!;
        const weight = constraints[j]!.weight / 100; // Convert percentage to decimal
        const weightedValue = normalizedValue * weight;
        weightedRow.push(weightedValue);
      }
      weightedMatrix.push(weightedRow);
    }

    return weightedMatrix;
  }

  /**
   * Calculate ideal and negative-ideal solutions
   */
  calculateIdealSolutions(
    weightedMatrix: number[][], 
    constraints: Constraint[]
  ): { ideal: number[]; negativeIdeal: number[] } {
    const ideal: number[] = [];
    const negativeIdeal: number[] = [];

    for (let j = 0; j < constraints.length; j++) {
      const constraint = constraints[j]!;
      const columnValues = weightedMatrix.map(row => row[j]!);
      
      if (constraint.direction === 'maximize') {
        // For benefit criteria: ideal = max, negative-ideal = min
        ideal.push(Math.max(...columnValues));
        negativeIdeal.push(Math.min(...columnValues));
      } else {
        // For cost criteria: ideal = min, negative-ideal = max
        ideal.push(Math.min(...columnValues));
        negativeIdeal.push(Math.max(...columnValues));
      }
    }

    return { ideal, negativeIdeal };
  }

  /**
   * Calculate distances from each option to ideal solutions
   */
  calculateDistances(
    weightedMatrix: number[][], 
    ideal: number[], 
    negativeIdeal: number[]
  ): { positiveDistances: number[]; negativeDistances: number[] } {
    const positiveDistances: number[] = [];
    const negativeDistances: number[] = [];

    for (let i = 0; i < weightedMatrix.length; i++) {
      const row = weightedMatrix[i]!;
      
      // Calculate Euclidean distance to positive ideal solution
      let positiveDistance = 0;
      for (let j = 0; j < row.length; j++) {
        const diff = row[j]! - ideal[j]!;
        positiveDistance += diff * diff;
      }
      positiveDistances.push(Math.sqrt(positiveDistance));
      
      // Calculate Euclidean distance to negative ideal solution
      let negativeDistance = 0;
      for (let j = 0; j < row.length; j++) {
        const diff = row[j]! - negativeIdeal[j]!;
        negativeDistance += diff * diff;
      }
      negativeDistances.push(Math.sqrt(negativeDistance));
    }

    return { positiveDistances, negativeDistances };
  }

  /**
   * Calculate closeness scores (relative closeness to ideal solution)
   */
  calculateClosenessScores(positiveDistances: number[], negativeDistances: number[]): number[] {
    const closenessScores: number[] = [];

    for (let i = 0; i < positiveDistances.length; i++) {
      const positiveDistance = positiveDistances[i]!;
      const negativeDistance = negativeDistances[i]!;
      
      // Closeness score = D- / (D+ + D-)
      // Where D+ is distance to positive ideal, D- is distance to negative ideal
      const totalDistance = positiveDistance + negativeDistance;
      
      if (totalDistance === 0) {
        // If both distances are 0, the option is at both ideal points (perfect score)
        closenessScores.push(1.0);
      } else {
        const closeness = negativeDistance / totalDistance;
        closenessScores.push(closeness);
      }
    }

    return closenessScores;
  }

  /**
   * Generate option rankings based on closeness scores
   */
  private generateRankings(
    options: Option[], 
    closenessScores: number[], 
    weightedMatrix: number[][],
    constraints: Constraint[]
  ): OptionRanking[] {
    // Create rankings with indices for sorting
    const indexedRankings = options.map((option, index) => ({
      option,
      index,
      closenessScore: closenessScores[index]!,
    }));

    // Sort by closeness score (descending - higher is better)
    indexedRankings.sort((a, b) => b.closenessScore - a.closenessScore);

    // Generate final rankings with strength/weakness analysis
    const rankings: OptionRanking[] = indexedRankings.map((item, rank) => {
      const strengthAreas = this.identifyStrengths(item.index, weightedMatrix, constraints);
      const weaknessAreas = this.identifyWeaknesses(item.index, weightedMatrix, constraints);

      return {
        option: item.option,
        rank: rank + 1,
        closenessScore: item.closenessScore,
        strengthAreas,
        weaknessAreas,
      };
    });

    return rankings;
  }

  /**
   * Identify constraint areas where an option performs well
   */
  private identifyStrengths(
    optionIndex: number, 
    weightedMatrix: number[][], 
    constraints: Constraint[]
  ): string[] {
    const strengths: string[] = [];
    const optionRow = weightedMatrix[optionIndex]!;

    for (let j = 0; j < constraints.length; j++) {
      const constraint = constraints[j]!;
      const optionValue = optionRow[j]!;
      
      // Calculate percentile rank for this constraint
      const columnValues = weightedMatrix.map(row => row[j]!);
      const sortedValues = [...columnValues].sort((a, b) => a - b);
      const percentileRank = (sortedValues.indexOf(optionValue) + 1) / sortedValues.length;
      
      // Consider top 25% as strengths
      if (constraint.direction === 'maximize' && percentileRank >= 0.75) {
        strengths.push(constraint.name);
      } else if (constraint.direction === 'minimize' && percentileRank <= 0.25) {
        strengths.push(constraint.name);
      }
    }

    return strengths;
  }

  /**
   * Identify constraint areas where an option performs poorly
   */
  private identifyWeaknesses(
    optionIndex: number, 
    weightedMatrix: number[][], 
    constraints: Constraint[]
  ): string[] {
    const weaknesses: string[] = [];
    const optionRow = weightedMatrix[optionIndex]!;

    for (let j = 0; j < constraints.length; j++) {
      const constraint = constraints[j]!;
      const optionValue = optionRow[j]!;
      
      // Calculate percentile rank for this constraint
      const columnValues = weightedMatrix.map(row => row[j]!);
      const sortedValues = [...columnValues].sort((a, b) => a - b);
      const percentileRank = (sortedValues.indexOf(optionValue) + 1) / sortedValues.length;
      
      // Consider bottom 25% as weaknesses
      if (constraint.direction === 'maximize' && percentileRank <= 0.25) {
        weaknesses.push(constraint.name);
      } else if (constraint.direction === 'minimize' && percentileRank >= 0.75) {
        weaknesses.push(constraint.name);
      }
    }

    return weaknesses;
  }

  /**
   * Build score maps for normalized and weighted scores
   */
  private buildScoreMap(
    options: Option[], 
    constraints: Constraint[], 
    matrix: number[][]
  ): Map<string, Map<string, number>> {
    const scoreMap = new Map<string, Map<string, number>>();

    for (let i = 0; i < options.length; i++) {
      const option = options[i]!;
      const constraintScores = new Map<string, number>();
      
      for (let j = 0; j < constraints.length; j++) {
        const constraint = constraints[j]!;
        const score = matrix[i]![j]!;
        constraintScores.set(constraint.id, score);
      }
      
      scoreMap.set(option.id, constraintScores);
    }

    return scoreMap;
  }

  /**
   * Validate inputs for TOPSIS calculation
   */
  private validateInputs(options: Option[], constraints: Constraint[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      errors.push(
        createValidationError(
          'options',
          'At least 2 options are required for TOPSIS calculation',
          'INSUFFICIENT_OPTIONS'
        )
      );
    }

    // Validate constraints
    if (!Array.isArray(constraints) || constraints.length === 0) {
      errors.push(
        createValidationError(
          'constraints',
          'At least 1 constraint is required for TOPSIS calculation',
          'NO_CONSTRAINTS'
        )
      );
    }

    // Validate that all options have scores for all constraints
    if (options.length > 0 && constraints.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i]!;
        for (const constraint of constraints) {
          if (!option.scores.has(constraint.id)) {
            errors.push(
              createValidationError(
                `options[${i}].scores`,
                `Option '${option.name}' missing score for constraint '${constraint.id}'`,
                'MISSING_SCORE'
              )
            );
          } else {
            const score = option.scores.get(constraint.id)!;
            if (typeof score !== 'number' || !isFinite(score) || isNaN(score)) {
              errors.push(
                createValidationError(
                  `options[${i}].scores`,
                  `Invalid score for constraint '${constraint.id}' in option '${option.name}'`,
                  'INVALID_SCORE'
                )
              );
            }
          }
        }
      }
    }

    // Validate constraint weights
    if (constraints.length > 0) {
      const totalWeight = constraints.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        warnings.push('Constraint weights do not sum to 100%');
      }
      
      // Check for invalid weights
      for (const constraint of constraints) {
        if (typeof constraint.weight !== 'number' || !isFinite(constraint.weight) || isNaN(constraint.weight)) {
          errors.push(
            createValidationError(
              'constraints',
              `Invalid weight for constraint '${constraint.id}': ${constraint.weight}`,
              'INVALID_WEIGHT'
            )
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Get current methodology configuration
   */
  getMethodology(): ScoringMethodology {
    return { ...this.methodology };
  }

  /**
   * Update methodology configuration
   */
  setMethodology(methodology: Partial<ScoringMethodology>): void {
    this.methodology = { ...this.methodology, ...methodology };
  }
}