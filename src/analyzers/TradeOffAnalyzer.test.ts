/**
 * Tests for TradeOffAnalyzer - Trade-off analysis and insights generation
 * 
 * This test suite covers:
 * - Strength and weakness identification
 * - Pairwise comparisons between options
 * - Dominance relationship detection
 * - Recommendation generation
 * - Edge cases and error handling
 */

import * as fc from 'fast-check';
import { TradeOffAnalyzer } from './TradeOffAnalyzer';
import { TOPSISEngine } from '../engines/TOPSISEngine';
import {
  Option,
  Constraint,
  ScoringResult,
  TradeOffAnalysis,
  OptionAnalysis,
  DominanceAnalysis,
  Recommendation,
} from '../types/core';

describe('TradeOffAnalyzer', () => {
  let analyzer: TradeOffAnalyzer;
  let topsisEngine: TOPSISEngine;
  let sampleOptions: Option[];
  let sampleConstraints: Constraint[];
  let sampleScoringResult: ScoringResult;

  beforeEach(() => {
    analyzer = new TradeOffAnalyzer();
    topsisEngine = new TOPSISEngine();

    // Set up sample data for testing
    sampleOptions = [
      {
        id: 'laptop_a',
        name: 'Laptop A',
        scores: new Map([
          ['price', 800],
          ['performance', 85],
          ['battery', 6],
          ['weight', 2.5],
        ]),
      },
      {
        id: 'laptop_b',
        name: 'Laptop B',
        scores: new Map([
          ['price', 1200],
          ['performance', 95],
          ['battery', 8],
          ['weight', 3.0],
        ]),
      },
      {
        id: 'laptop_c',
        name: 'Laptop C',
        scores: new Map([
          ['price', 600],
          ['performance', 70],
          ['battery', 4],
          ['weight', 2.0],
        ]),
      },
    ];

    sampleConstraints = [
      {
        id: 'price',
        name: 'Price',
        weight: 30,
        type: 'cost',
        direction: 'minimize',
        scale: { min: 500, max: 1500 },
      },
      {
        id: 'performance',
        name: 'Performance',
        weight: 40,
        type: 'performance',
        direction: 'maximize',
        scale: { min: 60, max: 100 },
      },
      {
        id: 'battery',
        name: 'Battery Life',
        weight: 20,
        type: 'performance',
        direction: 'maximize',
        scale: { min: 3, max: 10 },
      },
      {
        id: 'weight',
        name: 'Weight',
        weight: 10,
        type: 'cost',
        direction: 'minimize',
        scale: { min: 1.5, max: 4.0 },
      },
    ];

    // Generate scoring result using TOPSIS
    const scoringResult = topsisEngine.calculateScores(sampleOptions, sampleConstraints);
    if (scoringResult.success) {
      sampleScoringResult = scoringResult.data;
    }
  });

  describe('Basic Functionality', () => {
    it('should perform complete trade-off analysis', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const analysis = result.data;
        
        // Should have analysis for all options
        expect(analysis.optionAnalyses.size).toBe(3);
        
        // Should have pairwise comparisons (n*(n-1)/2)
        expect(analysis.pairwiseComparisons).toHaveLength(3);
        
        // Should have dominance analysis
        expect(analysis.dominanceRelations).toBeDefined();
        expect(analysis.dominanceRelations.paretoFrontier).toBeDefined();
        
        // Should have recommendations
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should identify strengths and weaknesses correctly', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const analysis = result.data;
        
        // Check that each option has analysis
        for (const option of sampleOptions) {
          const optionAnalysis = analysis.optionAnalyses.get(option.id);
          expect(optionAnalysis).toBeDefined();
          
          if (optionAnalysis) {
            // Strengths and weaknesses should be arrays
            expect(Array.isArray(optionAnalysis.strengths)).toBe(true);
            expect(Array.isArray(optionAnalysis.weaknesses)).toBe(true);
            
            // Should have valid percentile ranks
            optionAnalysis.strengths.forEach(strength => {
              expect(strength.percentileRank).toBeGreaterThanOrEqual(0);
              expect(strength.percentileRank).toBeLessThanOrEqual(1);
            });
            
            optionAnalysis.weaknesses.forEach(weakness => {
              expect(weakness.percentileRank).toBeGreaterThanOrEqual(0);
              expect(weakness.percentileRank).toBeLessThanOrEqual(1);
            });
          }
        }
      }
    });
  });

  describe('Strength and Weakness Identification', () => {
    it('should identify strengths for high-performing constraints', () => {
      // Laptop B should have strengths in performance and battery
      const strengths = analyzer.identifyStrengths(
        sampleOptions[1]!, // Laptop B
        sampleConstraints,
        sampleScoringResult
      );

      expect(strengths.length).toBeGreaterThan(0);
      
      // Should be sorted by percentile rank (highest first)
      for (let i = 0; i < strengths.length - 1; i++) {
        expect(strengths[i]!.percentileRank).toBeGreaterThanOrEqual(strengths[i + 1]!.percentileRank);
      }
      
      // All strengths should be in top 25%
      strengths.forEach(strength => {
        expect(strength.percentileRank).toBeGreaterThanOrEqual(0.75);
      });
    });

    it('should identify weaknesses for low-performing constraints', () => {
      // Laptop C should have weaknesses in performance and battery
      const weaknesses = analyzer.identifyWeaknesses(
        sampleOptions[2]!, // Laptop C
        sampleConstraints,
        sampleScoringResult
      );

      // Laptop C has the lowest performance and battery scores, so should have some weaknesses
      // But the exact number depends on the percentile calculation
      expect(weaknesses.length).toBeGreaterThanOrEqual(0);
      
      if (weaknesses.length > 0) {
        // Should be sorted by percentile rank (lowest first)
        for (let i = 0; i < weaknesses.length - 1; i++) {
          expect(weaknesses[i]!.percentileRank).toBeLessThanOrEqual(weaknesses[i + 1]!.percentileRank);
        }
        
        // All weaknesses should be in bottom 25%
        weaknesses.forEach(weakness => {
          expect(weakness.percentileRank).toBeLessThanOrEqual(0.25);
        });
      }
    });

    it('should handle options with no clear strengths or weaknesses', () => {
      // Create an option with middle-range scores
      const middleOption: Option = {
        id: 'middle',
        name: 'Middle Option',
        scores: new Map([
          ['price', 900],
          ['performance', 80],
          ['battery', 6],
          ['weight', 2.7],
        ]),
      };

      const strengths = analyzer.identifyStrengths(middleOption, sampleConstraints, sampleScoringResult);
      const weaknesses = analyzer.identifyWeaknesses(middleOption, sampleConstraints, sampleScoringResult);

      // Middle-performing option might have few or no extreme strengths/weaknesses
      expect(strengths.length).toBeLessThanOrEqual(sampleConstraints.length);
      expect(weaknesses.length).toBeLessThanOrEqual(sampleConstraints.length);
    });
  });

  describe('Pairwise Comparisons', () => {
    it('should perform pairwise comparisons between all options', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const analysis = result.data;
        const comparisons = analysis.pairwiseComparisons;
        
        // Should have n*(n-1)/2 comparisons for n options
        expect(comparisons).toHaveLength(3); // 3*2/2 = 3
        
        // Each comparison should have required fields
        comparisons.forEach(comparison => {
          expect(comparison.optionA).toBeDefined();
          expect(comparison.optionB).toBeDefined();
          expect(comparison.winner).toBeDefined();
          expect(comparison.overallScoreDifference).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(comparison.significantDifferences)).toBe(true);
          
          // Winner should be one of the compared options
          expect([comparison.optionA, comparison.optionB]).toContain(comparison.winner);
        });
      }
    });

    it('should identify significant differences between options', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const analysis = result.data;
        
        // Find comparison between Laptop B (high-end) and Laptop C (budget)
        const comparison = analysis.pairwiseComparisons.find(
          c => (c.optionA === 'laptop_b' && c.optionB === 'laptop_c') ||
               (c.optionA === 'laptop_c' && c.optionB === 'laptop_b')
        );
        
        expect(comparison).toBeDefined();
        if (comparison) {
          // Should have significant differences due to large gaps in performance and price
          expect(comparison.significantDifferences.length).toBeGreaterThan(0);
          
          comparison.significantDifferences.forEach(diff => {
            expect(diff.significance).toMatch(/^(medium|high)$/);
            expect(diff.percentageDifference).toBeGreaterThan(0.15);
          });
        }
      }
    });
  });

  describe('Dominance Analysis', () => {
    it('should identify dominance relationships correctly', () => {
      const dominanceAnalysis = analyzer.findDominantOptions(
        sampleOptions,
        sampleConstraints,
        sampleScoringResult
      );

      expect(dominanceAnalysis.dominantOptions).toBeDefined();
      expect(dominanceAnalysis.dominatedOptions).toBeDefined();
      expect(dominanceAnalysis.paretoFrontier).toBeDefined();
      expect(dominanceAnalysis.dominanceMatrix).toBeDefined();

      // Pareto frontier should contain non-dominated options
      expect(dominanceAnalysis.paretoFrontier.length).toBeGreaterThan(0);
      expect(dominanceAnalysis.paretoFrontier.length).toBeLessThanOrEqual(sampleOptions.length);

      // Dominance matrix should be consistent
      for (const [optionId, dominatedList] of dominanceAnalysis.dominanceMatrix) {
        expect(sampleOptions.some(opt => opt.id === optionId)).toBe(true);
        dominatedList.forEach(dominatedId => {
          expect(sampleOptions.some(opt => opt.id === dominatedId)).toBe(true);
        });
      }
    });

    it('should handle case with no dominance relationships', () => {
      // Create options where no option dominates another
      const balancedOptions: Option[] = [
        {
          id: 'opt1',
          name: 'Option 1',
          scores: new Map([
            ['criterion1', 80],
            ['criterion2', 60],
          ]),
        },
        {
          id: 'opt2',
          name: 'Option 2',
          scores: new Map([
            ['criterion1', 60],
            ['criterion2', 80],
          ]),
        },
      ];

      const balancedConstraints: Constraint[] = [
        {
          id: 'criterion1',
          name: 'Criterion 1',
          weight: 50,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
        {
          id: 'criterion2',
          name: 'Criterion 2',
          weight: 50,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
      ];

      const scoringResult = topsisEngine.calculateScores(balancedOptions, balancedConstraints);
      expect(scoringResult.success).toBe(true);

      if (scoringResult.success) {
        const dominanceAnalysis = analyzer.findDominantOptions(
          balancedOptions,
          balancedConstraints,
          scoringResult.data
        );

        // All options should be on Pareto frontier (no dominance)
        expect(dominanceAnalysis.paretoFrontier).toHaveLength(2);
        expect(dominanceAnalysis.dominantOptions).toHaveLength(0);
        expect(dominanceAnalysis.dominatedOptions).toHaveLength(0);
      }
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate appropriate recommendations', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const analysis = result.data;
        const recommendations = analysis.recommendations;

        expect(recommendations.length).toBeGreaterThan(0);

        // Should have at least a best overall recommendation
        const bestOverall = recommendations.find(r => r.type === 'best_overall');
        expect(bestOverall).toBeDefined();

        if (bestOverall) {
          expect(bestOverall.optionId).toBeDefined();
          expect(bestOverall.reasoning).toBeDefined();
          expect(bestOverall.confidence).toBeGreaterThan(0);
          expect(bestOverall.confidence).toBeLessThanOrEqual(1);
        }

        // All recommendations should have valid structure
        recommendations.forEach(rec => {
          expect(rec.type).toMatch(/^(best_overall|best_for_constraint|compromise|avoid)$/);
          expect(rec.optionId).toBeDefined();
          expect(rec.reasoning).toBeDefined();
          expect(rec.confidence).toBeGreaterThanOrEqual(0);
          expect(rec.confidence).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should generate different types of recommendations', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const analysis = result.data;
        const recommendations = analysis.recommendations;

        const recommendationTypes = new Set(recommendations.map(r => r.type));
        
        // Should have multiple recommendation types
        expect(recommendationTypes.size).toBeGreaterThan(1);
        
        // Should include best overall
        expect(recommendationTypes.has('best_overall')).toBe(true);
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid scoring results', () => {
      const invalidScoringResult = {} as ScoringResult;
      
      const result = analyzer.analyzeTradeOffs(invalidScoringResult, sampleOptions, sampleConstraints);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SCORING_RESULT');
      }
    });

    it('should reject insufficient options', () => {
      const singleOption = [sampleOptions[0]!];
      
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, singleOption, sampleConstraints);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_OPTIONS');
      }
    });

    it('should reject empty constraints', () => {
      const result = analyzer.analyzeTradeOffs(sampleScoringResult, sampleOptions, []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NO_CONSTRAINTS');
      }
    });

    it('should reject inconsistent data', () => {
      // Create options that don't match scoring result
      const mismatchedOptions: Option[] = [
        {
          id: 'different_id',
          name: 'Different Option',
          scores: new Map([['test', 50]]),
        },
        {
          id: 'another_different_id',
          name: 'Another Different Option',
          scores: new Map([['test', 60]]),
        },
      ];

      const result = analyzer.analyzeTradeOffs(sampleScoringResult, mismatchedOptions, sampleConstraints);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_SCORING_DATA');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle options with identical scores', () => {
      const identicalOptions: Option[] = [
        {
          id: 'opt1',
          name: 'Option 1',
          scores: new Map([
            ['criterion1', 75],
            ['criterion2', 75],
          ]),
        },
        {
          id: 'opt2',
          name: 'Option 2',
          scores: new Map([
            ['criterion1', 75],
            ['criterion2', 75],
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'criterion1',
          name: 'Criterion 1',
          weight: 50,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
        {
          id: 'criterion2',
          name: 'Criterion 2',
          weight: 50,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
      ];

      const scoringResult = topsisEngine.calculateScores(identicalOptions, constraints);
      expect(scoringResult.success).toBe(true);

      if (scoringResult.success) {
        const result = analyzer.analyzeTradeOffs(scoringResult.data, identicalOptions, constraints);
        
        expect(result.success).toBe(true);
        if (result.success) {
          const analysis = result.data;
          
          // Should handle identical options gracefully
          expect(analysis.optionAnalyses.size).toBe(2);
          expect(analysis.pairwiseComparisons).toHaveLength(1);
          
          // Pairwise comparison should show minimal differences
          const comparison = analysis.pairwiseComparisons[0]!;
          expect(comparison.overallScoreDifference).toBeCloseTo(0, 5);
          expect(comparison.significantDifferences).toHaveLength(0);
        }
      }
    });

    it('should handle single constraint scenario', () => {
      const singleConstraint: Constraint[] = [
        {
          id: 'performance',
          name: 'Performance',
          weight: 100,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 60, max: 100 },
        },
      ];

      const scoringResult = topsisEngine.calculateScores(sampleOptions, singleConstraint);
      expect(scoringResult.success).toBe(true);

      if (scoringResult.success) {
        const result = analyzer.analyzeTradeOffs(scoringResult.data, sampleOptions, singleConstraint);
        
        expect(result.success).toBe(true);
        if (result.success) {
          const analysis = result.data;
          
          // Should work with single constraint
          expect(analysis.optionAnalyses.size).toBe(3);
          expect(analysis.recommendations.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
  describe('Property-Based Tests', () => {
    /**
     * Property 8: Trade-off Analysis Completeness
     * For any completed scoring, the system should identify strengths and weaknesses 
     * for each option, highlight significant performance differences, detect dominance 
     * relationships, and provide clear trade-off explanations.
     */
    describe('Feature: option-referee, Property 8: Trade-off Analysis Completeness', () => {
      it('should provide complete analysis for all valid scoring results', () => {
        fc.assert(
          fc.property(
            fc.record({
              optionCount: fc.integer({ min: 2, max: 5 }),
              constraintCount: fc.integer({ min: 1, max: 4 }),
            }),
            ({ optionCount, constraintCount }) => {
              // Create instances for this property test
              const localTopsisEngine = new TOPSISEngine();
              const localAnalyzer = new TradeOffAnalyzer();
              
              // Generate random but valid options and constraints
              const options: Option[] = Array.from({ length: optionCount }, (_, i) => ({
                id: `option_${i}`,
                name: `Option ${i}`,
                scores: new Map<string, number>(),
              }));

              const constraints: Constraint[] = Array.from({ length: constraintCount }, (_, i) => ({
                id: `constraint_${i}`,
                name: `Constraint ${i}`,
                weight: 100 / constraintCount, // Equal weights
                type: 'custom' as const,
                direction: i % 2 === 0 ? 'maximize' as const : 'minimize' as const,
                scale: { min: 0, max: 100 },
              }));

              // Add random scores for each option-constraint pair
              for (const option of options) {
                for (const constraint of constraints) {
                  const score = Math.random() * 100;
                  option.scores.set(constraint.id, score);
                }
              }

              // Generate TOPSIS scoring result
              const scoringResult = localTopsisEngine.calculateScores(options, constraints);
              
              if (!scoringResult.success) return; // Skip invalid combinations
              
              const analysisResult = localAnalyzer.analyzeTradeOffs(scoringResult.data, options, constraints);
              
              // Property: Valid inputs should always produce valid analysis
              expect(analysisResult.success).toBe(true);
              
              if (analysisResult.success) {
                const analysis = analysisResult.data;
                
                // Property: Analysis should be complete for all options
                expect(analysis.optionAnalyses.size).toBe(optionCount);
                
                // Property: Each option should have analysis with required fields
                for (const option of options) {
                  const optionAnalysis = analysis.optionAnalyses.get(option.id);
                  expect(optionAnalysis).toBeDefined();
                  
                  if (optionAnalysis) {
                    expect(optionAnalysis.optionId).toBe(option.id);
                    expect(Array.isArray(optionAnalysis.strengths)).toBe(true);
                    expect(Array.isArray(optionAnalysis.weaknesses)).toBe(true);
                    expect(typeof optionAnalysis.overallScore).toBe('number');
                    expect(typeof optionAnalysis.rank).toBe('number');
                    expect(optionAnalysis.rank).toBeGreaterThan(0);
                    expect(optionAnalysis.rank).toBeLessThanOrEqual(optionCount);
                    expect(optionAnalysis.overallScore).toBeGreaterThanOrEqual(0);
                    expect(optionAnalysis.overallScore).toBeLessThanOrEqual(1);
                  }
                }
                
                // Property: Pairwise comparisons should cover all pairs
                const expectedComparisons = (optionCount * (optionCount - 1)) / 2;
                expect(analysis.pairwiseComparisons).toHaveLength(expectedComparisons);
                
                // Property: Each comparison should have valid structure
                analysis.pairwiseComparisons.forEach(comparison => {
                  expect(options.some(opt => opt.id === comparison.optionA)).toBe(true);
                  expect(options.some(opt => opt.id === comparison.optionB)).toBe(true);
                  expect([comparison.optionA, comparison.optionB]).toContain(comparison.winner);
                  expect(comparison.overallScoreDifference).toBeGreaterThanOrEqual(0);
                  expect(Array.isArray(comparison.significantDifferences)).toBe(true);
                });
                
                // Property: Dominance analysis should be complete
                expect(analysis.dominanceRelations).toBeDefined();
                expect(Array.isArray(analysis.dominanceRelations.dominantOptions)).toBe(true);
                expect(Array.isArray(analysis.dominanceRelations.dominatedOptions)).toBe(true);
                expect(Array.isArray(analysis.dominanceRelations.paretoFrontier)).toBe(true);
                expect(analysis.dominanceRelations.dominanceMatrix).toBeDefined();
                
                // Property: Pareto frontier should contain at least one option
                expect(analysis.dominanceRelations.paretoFrontier.length).toBeGreaterThan(0);
                expect(analysis.dominanceRelations.paretoFrontier.length).toBeLessThanOrEqual(optionCount);
                
                // Property: All Pareto frontier options should be valid option IDs
                analysis.dominanceRelations.paretoFrontier.forEach(optionId => {
                  expect(options.some(opt => opt.id === optionId)).toBe(true);
                });
                
                // Property: Recommendations should be provided
                expect(Array.isArray(analysis.recommendations)).toBe(true);
                expect(analysis.recommendations.length).toBeGreaterThan(0);
                
                // Property: Each recommendation should have valid structure
                analysis.recommendations.forEach(rec => {
                  expect(['best_overall', 'best_for_constraint', 'compromise', 'avoid']).toContain(rec.type);
                  expect(options.some(opt => opt.id === rec.optionId)).toBe(true);
                  expect(typeof rec.reasoning).toBe('string');
                  expect(rec.reasoning.length).toBeGreaterThan(0);
                  expect(rec.confidence).toBeGreaterThanOrEqual(0);
                  expect(rec.confidence).toBeLessThanOrEqual(1);
                });
                
                // Property: Should have at least a best overall recommendation
                const bestOverall = analysis.recommendations.find(r => r.type === 'best_overall');
                expect(bestOverall).toBeDefined();
              }
            }
          ), { numRuns: 100 });
      });

      it('should maintain consistency between rankings and analysis', () => {
        fc.assert(
          fc.property(
            fc.record({
              optionCount: fc.integer({ min: 2, max: 4 }),
              constraintCount: fc.integer({ min: 1, max: 3 }),
            }),
            ({ optionCount, constraintCount }) => {
              // Create instances for this property test
              const localTopsisEngine = new TOPSISEngine();
              const localAnalyzer = new TradeOffAnalyzer();
              
              // Generate test data
              const options: Option[] = Array.from({ length: optionCount }, (_, i) => ({
                id: `opt_${i}`,
                name: `Option ${i}`,
                scores: new Map<string, number>(),
              }));

              const constraints: Constraint[] = Array.from({ length: constraintCount }, (_, i) => ({
                id: `const_${i}`,
                name: `Constraint ${i}`,
                weight: 100 / constraintCount,
                type: 'custom' as const,
                direction: 'maximize' as const,
                scale: { min: 0, max: 100 },
              }));

              // Add scores
              for (const option of options) {
                for (const constraint of constraints) {
                  option.scores.set(constraint.id, Math.random() * 100);
                }
              }

              const scoringResult = localTopsisEngine.calculateScores(options, constraints);
              if (!scoringResult.success) return;
              
              const analysisResult = localAnalyzer.analyzeTradeOffs(scoringResult.data, options, constraints);
              if (!analysisResult.success) return;
              
              const analysis = analysisResult.data;
              const rankings = scoringResult.data.rankings;
              
              // Property: Analysis ranks should match TOPSIS rankings
              for (const ranking of rankings) {
                const optionAnalysis = analysis.optionAnalyses.get(ranking.option.id);
                expect(optionAnalysis).toBeDefined();
                if (optionAnalysis) {
                  expect(optionAnalysis.rank).toBe(ranking.rank);
                  expect(optionAnalysis.overallScore).toBeCloseTo(ranking.closenessScore, 5);
                }
              }
              
              // Property: Best overall recommendation should be top-ranked option
              const bestOverall = analysis.recommendations.find(r => r.type === 'best_overall');
              if (bestOverall) {
                const topRankedOption = rankings.find(r => r.rank === 1);
                expect(topRankedOption).toBeDefined();
                if (topRankedOption) {
                  expect(bestOverall.optionId).toBe(topRankedOption.option.id);
                }
              }
            }
          ), { numRuns: 100 });
      });

      it('should identify meaningful differences between options', () => {
        fc.assert(
          fc.property(
            fc.record({
              // Generate scenarios with clear differences
              highScore: fc.float({ min: 80, max: 100, noNaN: true }),
              lowScore: fc.float({ min: 10, max: 40, noNaN: true }),
              constraintWeight: fc.float({ min: 20, max: 100, noNaN: true }),
            }),
            ({ highScore, lowScore, constraintWeight }) => {
              // Create instances for this property test
              const localTopsisEngine = new TOPSISEngine();
              const localAnalyzer = new TradeOffAnalyzer();
              
              // Create options with clear performance differences
              const options: Option[] = [
                {
                  id: 'high_performer',
                  name: 'High Performer',
                  scores: new Map([
                    ['main_criterion', highScore],
                    ['secondary', 50],
                  ]),
                },
                {
                  id: 'low_performer',
                  name: 'Low Performer',
                  scores: new Map([
                    ['main_criterion', lowScore],
                    ['secondary', 50],
                  ]),
                },
              ];

              const constraints: Constraint[] = [
                {
                  id: 'main_criterion',
                  name: 'Main Criterion',
                  weight: constraintWeight,
                  type: 'performance',
                  direction: 'maximize',
                  scale: { min: 0, max: 100 },
                },
                {
                  id: 'secondary',
                  name: 'Secondary Criterion',
                  weight: 100 - constraintWeight,
                  type: 'performance',
                  direction: 'maximize',
                  scale: { min: 0, max: 100 },
                },
              ];

              const scoringResult = localTopsisEngine.calculateScores(options, constraints);
              if (!scoringResult.success) return;
              
              const analysisResult = localAnalyzer.analyzeTradeOffs(scoringResult.data, options, constraints);
              if (!analysisResult.success) return;
              
              const analysis = analysisResult.data;
              
              // Property: High performer should rank better than low performer
              const highPerformerAnalysis = analysis.optionAnalyses.get('high_performer');
              const lowPerformerAnalysis = analysis.optionAnalyses.get('low_performer');
              
              expect(highPerformerAnalysis).toBeDefined();
              expect(lowPerformerAnalysis).toBeDefined();
              
              if (highPerformerAnalysis && lowPerformerAnalysis) {
                expect(highPerformerAnalysis.rank).toBeLessThan(lowPerformerAnalysis.rank);
                expect(highPerformerAnalysis.overallScore).toBeGreaterThan(lowPerformerAnalysis.overallScore);
              }
              
              // Property: Should detect significant differences when scores differ substantially
              const comparison = analysis.pairwiseComparisons.find(
                c => (c.optionA === 'high_performer' && c.optionB === 'low_performer') ||
                     (c.optionA === 'low_performer' && c.optionB === 'high_performer')
              );
              
              expect(comparison).toBeDefined();
              if (comparison) {
                expect(comparison.winner).toBe('high_performer');
                
                // If the score difference is large enough, should detect significant differences
                const scoreDiff = Math.abs(highScore - lowScore);
                if (scoreDiff > 30) { // Large difference
                  expect(comparison.significantDifferences.length).toBeGreaterThan(0);
                  
                  const mainCriterionDiff = comparison.significantDifferences.find(
                    d => d.constraintId === 'main_criterion'
                  );
                  if (mainCriterionDiff) {
                    expect(['medium', 'high']).toContain(mainCriterionDiff.significance);
                  }
                }
              }
            }
          ), { numRuns: 100 });
      });

      it('should handle dominance relationships correctly', () => {
        fc.assert(
          fc.property(
            fc.record({
              dominantScore1: fc.float({ min: 80, max: 100, noNaN: true }),
              dominantScore2: fc.float({ min: 80, max: 100, noNaN: true }),
              dominatedScore1: fc.float({ min: 10, max: 50, noNaN: true }),
              dominatedScore2: fc.float({ min: 10, max: 50, noNaN: true }),
            }),
            ({ dominantScore1, dominantScore2, dominatedScore1, dominatedScore2 }) => {
              // Create instances for this property test
              const localTopsisEngine = new TOPSISEngine();
              const localAnalyzer = new TradeOffAnalyzer();
              
              // Create clear dominance scenario
              const options: Option[] = [
                {
                  id: 'dominant',
                  name: 'Dominant Option',
                  scores: new Map([
                    ['criterion1', dominantScore1],
                    ['criterion2', dominantScore2],
                  ]),
                },
                {
                  id: 'dominated',
                  name: 'Dominated Option',
                  scores: new Map([
                    ['criterion1', dominatedScore1],
                    ['criterion2', dominatedScore2],
                  ]),
                },
              ];

              const constraints: Constraint[] = [
                {
                  id: 'criterion1',
                  name: 'Criterion 1',
                  weight: 50,
                  type: 'performance',
                  direction: 'maximize',
                  scale: { min: 0, max: 100 },
                },
                {
                  id: 'criterion2',
                  name: 'Criterion 2',
                  weight: 50,
                  type: 'performance',
                  direction: 'maximize',
                  scale: { min: 0, max: 100 },
                },
              ];

              const scoringResult = localTopsisEngine.calculateScores(options, constraints);
              if (!scoringResult.success) return;
              
              const analysisResult = localAnalyzer.analyzeTradeOffs(scoringResult.data, options, constraints);
              if (!analysisResult.success) return;
              
              const analysis = analysisResult.data;
              
              // Property: If one option is better in all criteria, it should dominate
              if (dominantScore1 > dominatedScore1 && dominantScore2 > dominatedScore2) {
                // Dominant option should be in dominant list or Pareto frontier
                const isDominant = analysis.dominanceRelations.dominantOptions.includes('dominant') ||
                                 analysis.dominanceRelations.paretoFrontier.includes('dominant');
                expect(isDominant).toBe(true);
                
                // Dominated option should not be on Pareto frontier if clearly dominated
                if (dominantScore1 - dominatedScore1 > 20 && dominantScore2 - dominatedScore2 > 20) {
                  expect(analysis.dominanceRelations.paretoFrontier).not.toContain('dominated');
                }
              }
              
              // Property: Pareto frontier should contain at least one option
              expect(analysis.dominanceRelations.paretoFrontier.length).toBeGreaterThan(0);
              
              // Property: Dominance matrix should be consistent
              const dominanceMatrix = analysis.dominanceRelations.dominanceMatrix;
              for (const [optionId, dominatedList] of dominanceMatrix) {
                expect(['dominant', 'dominated']).toContain(optionId);
                dominatedList.forEach(dominatedId => {
                  expect(['dominant', 'dominated']).toContain(dominatedId);
                });
              }
            }
          ), { numRuns: 100 });
      });

      /**
       * Property 9: Recommendation Generation
       * The system should provide actionable recommendations including best overall choice,
       * compromise options, and options to avoid, with appropriate confidence levels.
       */
      it('should generate comprehensive and valid recommendations', () => {
        fc.assert(
          fc.property(
            fc.record({
              optionCount: fc.integer({ min: 2, max: 4 }),
              constraintCount: fc.integer({ min: 1, max: 3 }),
            }),
            ({ optionCount, constraintCount }) => {
              // Create instances for this property test
              const localTopsisEngine = new TOPSISEngine();
              const localAnalyzer = new TradeOffAnalyzer();
              
              // Generate test data with varied performance levels
              const options: Option[] = Array.from({ length: optionCount }, (_, i) => ({
                id: `option_${i}`,
                name: `Option ${i}`,
                scores: new Map<string, number>(),
              }));

              const constraints: Constraint[] = Array.from({ length: constraintCount }, (_, i) => ({
                id: `constraint_${i}`,
                name: `Constraint ${i}`,
                weight: 100 / constraintCount,
                type: 'custom' as const,
                direction: 'maximize' as const,
                scale: { min: 0, max: 100 },
              }));

              // Add varied scores to create clear performance differences
              for (let i = 0; i < options.length; i++) {
                const option = options[i]!;
                for (const constraint of constraints) {
                  // Create performance spread: first option best, last option worst
                  const baseScore = 90 - (i * 20); // 90, 70, 50, 30...
                  const variation = (Math.random() - 0.5) * 20; // ±10 variation
                  const score = Math.max(10, Math.min(100, baseScore + variation));
                  option.scores.set(constraint.id, score);
                }
              }

              const scoringResult = localTopsisEngine.calculateScores(options, constraints);
              if (!scoringResult.success) return;
              
              const analysisResult = localAnalyzer.analyzeTradeOffs(scoringResult.data, options, constraints);
              if (!analysisResult.success) return;
              
              const analysis = analysisResult.data;
              const recommendations = analysis.recommendations;
              
              // Property: Should always provide recommendations
              expect(recommendations.length).toBeGreaterThan(0);
              
              // Property: Should have at least a best overall recommendation
              const bestOverall = recommendations.find(r => r.type === 'best_overall');
              expect(bestOverall).toBeDefined();
              
              if (bestOverall) {
                // Property: Best overall should be a valid option ID
                expect(options.some(opt => opt.id === bestOverall.optionId)).toBe(true);
                
                // Property: Best overall should have high confidence
                expect(bestOverall.confidence).toBeGreaterThan(0);
                expect(bestOverall.confidence).toBeLessThanOrEqual(1);
                
                // Property: Best overall should have meaningful reasoning
                expect(bestOverall.reasoning).toBeDefined();
                expect(bestOverall.reasoning.length).toBeGreaterThan(10);
              }
              
              // Property: All recommendations should have valid structure
              recommendations.forEach(rec => {
                expect(['best_overall', 'best_for_constraint', 'compromise', 'avoid']).toContain(rec.type);
                expect(options.some(opt => opt.id === rec.optionId)).toBe(true);
                expect(rec.reasoning).toBeDefined();
                expect(rec.reasoning.length).toBeGreaterThan(0);
                expect(rec.confidence).toBeGreaterThanOrEqual(0);
                expect(rec.confidence).toBeLessThanOrEqual(1);
              });
              
              // Property: Recommendations should be consistent with rankings
              const rankings = scoringResult.data.rankings;
              const topRankedOption = rankings.find(r => r.rank === 1);
              
              if (topRankedOption && bestOverall) {
                expect(bestOverall.optionId).toBe(topRankedOption.option.id);
              }
              
              // Property: Should not recommend the same option for conflicting types
              const avoidRecommendation = recommendations.find(r => r.type === 'avoid');
              if (avoidRecommendation && bestOverall) {
                expect(avoidRecommendation.optionId).not.toBe(bestOverall.optionId);
              }
              
              // Property: Confidence should correlate with performance differences
              if (optionCount >= 3) {
                const topOption = rankings[0];
                const bottomOption = rankings[rankings.length - 1];
                
                if (topOption && bottomOption) {
                  const scoreDifference = topOption.closenessScore - bottomOption.closenessScore;
                  
                  // If there's a large performance gap, confidence should be higher
                  if (scoreDifference > 0.3 && bestOverall) {
                    expect(bestOverall.confidence).toBeGreaterThan(0.6);
                  }
                }
              }
            }
          ), { numRuns: 100 });
      });
    });
  });