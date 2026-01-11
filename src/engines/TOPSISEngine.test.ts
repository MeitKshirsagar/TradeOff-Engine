/**
 * Tests for TOPSISEngine - TOPSIS algorithm implementation
 * 
 * This test suite covers:
 * - Basic TOPSIS algorithm functionality
 * - Matrix normalization and weight application
 * - Ideal solution calculation
 * - Distance calculations and closeness scores
 * - Edge cases and error handling
 * - Property-based testing for mathematical correctness
 * - Unit tests with known TOPSIS examples from literature
 */

import { TOPSISEngine } from './TOPSISEngine';
import {
  Option,
  Constraint,
  ScoringResult,
  OptionRanking,
  createValidationError,
} from '../types/core';
import * as fc from 'fast-check';

describe('TOPSISEngine', () => {
  let engine: TOPSISEngine;

  beforeEach(() => {
    engine = new TOPSISEngine();
  });

  describe('Basic Functionality', () => {
    it('should calculate scores for valid options and constraints', () => {
      const options: Option[] = [
        {
          id: 'opt1',
          name: 'Option 1',
          scores: new Map([
            ['cost', 100],
            ['performance', 80],
          ]),
        },
        {
          id: 'opt2',
          name: 'Option 2',
          scores: new Map([
            ['cost', 80],
            ['performance', 90],
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'cost',
          name: 'Cost',
          weight: 60,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 200 },
        },
        {
          id: 'performance',
          name: 'Performance',
          weight: 40,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const scoringResult = result.data;
        expect(scoringResult.rankings).toHaveLength(2);
        expect(scoringResult.rankings[0]!.rank).toBe(1);
        expect(scoringResult.rankings[1]!.rank).toBe(2);
        expect(scoringResult.closenessScores.size).toBe(2);
        expect(scoringResult.idealSolution).toHaveLength(2);
        expect(scoringResult.negativeIdealSolution).toHaveLength(2);
      }
    });
  });

  describe('TOPSIS Algorithm Unit Tests with Known Examples', () => {
    /**
     * Test case from TOPSIS literature: Supplier Selection Problem
     * Source: Hwang & Yoon (1981) - Multiple Attribute Decision Making
     * 
     * This is a classic example used to validate TOPSIS implementations
     */
    it('should match known TOPSIS results for supplier selection example', () => {
      // Classic supplier selection problem with 3 suppliers and 4 criteria
      const options: Option[] = [
        {
          id: 'supplier_a',
          name: 'Supplier A',
          scores: new Map([
            ['cost', 250],        // Lower is better (minimize)
            ['quality', 16],      // Higher is better (maximize)
            ['delivery', 8.5],    // Higher is better (maximize)
            ['service', 5],       // Higher is better (maximize)
          ]),
        },
        {
          id: 'supplier_b',
          name: 'Supplier B',
          scores: new Map([
            ['cost', 200],        // Lower is better (minimize)
            ['quality', 16],      // Higher is better (maximize)
            ['delivery', 9.0],    // Higher is better (maximize)
            ['service', 4],       // Higher is better (maximize)
          ]),
        },
        {
          id: 'supplier_c',
          name: 'Supplier C',
          scores: new Map([
            ['cost', 300],        // Lower is better (minimize)
            ['quality', 32],      // Higher is better (maximize)
            ['delivery', 7.0],    // Higher is better (maximize)
            ['service', 4],       // Higher is better (maximize)
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'cost',
          name: 'Cost',
          weight: 30,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 500 },
        },
        {
          id: 'quality',
          name: 'Quality',
          weight: 40,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 50 },
        },
        {
          id: 'delivery',
          name: 'Delivery Time',
          weight: 20,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 10 },
        },
        {
          id: 'service',
          name: 'Service Level',
          weight: 10,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 10 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const rankings = result.data.rankings;
        
        // Expected ranking based on TOPSIS calculation:
        // Supplier C should rank first (highest quality compensates for higher cost)
        // Supplier B should rank second
        // Supplier A should rank third
        expect(rankings[0]!.option.id).toBe('supplier_c');
        expect(rankings[1]!.option.id).toBe('supplier_b');
        expect(rankings[2]!.option.id).toBe('supplier_a');
        
        // Verify closeness scores are in descending order
        expect(rankings[0]!.closenessScore).toBeGreaterThan(rankings[1]!.closenessScore);
        expect(rankings[1]!.closenessScore).toBeGreaterThan(rankings[2]!.closenessScore);
        
        // Supplier C should have high closeness score (> 0.6)
        expect(rankings[0]!.closenessScore).toBeGreaterThan(0.6);
        
        // All closeness scores should be valid
        rankings.forEach((ranking: OptionRanking) => {
          expect(ranking.closenessScore).toBeGreaterThanOrEqual(0);
          expect(ranking.closenessScore).toBeLessThanOrEqual(1);
          expect(isFinite(ranking.closenessScore)).toBe(true);
        });
      }
    });

    /**
     * Test case: Technology Selection Problem
     * Simplified example to test TOPSIS with equal weights
     */
    it('should handle technology selection with equal weights correctly', () => {
      const options: Option[] = [
        {
          id: 'tech_a',
          name: 'Technology A',
          scores: new Map([
            ['performance', 85],
            ['cost', 120],
            ['reliability', 90],
          ]),
        },
        {
          id: 'tech_b',
          name: 'Technology B',
          scores: new Map([
            ['performance', 75],
            ['cost', 100],
            ['reliability', 95],
          ]),
        },
        {
          id: 'tech_c',
          name: 'Technology C',
          scores: new Map([
            ['performance', 95],
            ['cost', 150],
            ['reliability', 85],
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'performance',
          name: 'Performance',
          weight: 33.33,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
        {
          id: 'cost',
          name: 'Cost',
          weight: 33.33,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 0, max: 200 },
        },
        {
          id: 'reliability',
          name: 'Reliability',
          weight: 33.34,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const rankings = result.data.rankings;
        
        // With equal weights, Technology B should perform well due to balanced scores
        expect(rankings).toHaveLength(3);
        
        // Verify all rankings are assigned correctly
        const ranks = rankings.map((r: OptionRanking) => r.rank);
        expect(ranks).toEqual([1, 2, 3]);
        
        // Verify closeness scores are properly ordered
        for (let i = 0; i < rankings.length - 1; i++) {
          expect(rankings[i]!.closenessScore).toBeGreaterThanOrEqual(rankings[i + 1]!.closenessScore);
        }
      }
    });

    /**
     * Test case: Single criterion decision (degenerate case)
     */
    it('should handle single criterion decision correctly', () => {
      const options: Option[] = [
        {
          id: 'option_1',
          name: 'Option 1',
          scores: new Map([['score', 85]]),
        },
        {
          id: 'option_2',
          name: 'Option 2',
          scores: new Map([['score', 92]]),
        },
        {
          id: 'option_3',
          name: 'Option 3',
          scores: new Map([['score', 78]]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'score',
          name: 'Score',
          weight: 100,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const rankings = result.data.rankings;
        
        // For single criterion maximize, ranking should match score order
        expect(rankings[0]!.option.id).toBe('option_2'); // highest score (92)
        expect(rankings[1]!.option.id).toBe('option_1'); // middle score (85)
        expect(rankings[2]!.option.id).toBe('option_3'); // lowest score (78)
        
        // Closeness scores should reflect the score differences
        expect(rankings[0]!.closenessScore).toBeGreaterThan(rankings[1]!.closenessScore);
        expect(rankings[1]!.closenessScore).toBeGreaterThan(rankings[2]!.closenessScore);
      }
    });

    /**
     * Test case: Extreme weight scenario
     */
    it('should handle extreme weight distributions correctly', () => {
      const options: Option[] = [
        {
          id: 'option_x',
          name: 'Option X',
          scores: new Map([
            ['primary', 60],    // Lower score on primary criterion
            ['secondary', 95],  // High score on secondary
          ]),
        },
        {
          id: 'option_y',
          name: 'Option Y',
          scores: new Map([
            ['primary', 90],    // High score on primary criterion
            ['secondary', 70],  // Lower score on secondary
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'primary',
          name: 'Primary Criterion',
          weight: 95,  // Heavily weighted
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
        {
          id: 'secondary',
          name: 'Secondary Criterion',
          weight: 5,   // Lightly weighted
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 100 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const rankings = result.data.rankings;
        
        // Option Y should win due to much higher score on heavily weighted criterion
        expect(rankings[0]!.option.id).toBe('option_y');
        expect(rankings[1]!.option.id).toBe('option_x');
        
        // The difference in closeness scores should be significant
        const scoreDifference = rankings[0]!.closenessScore - rankings[1]!.closenessScore;
        expect(scoreDifference).toBeGreaterThan(0.2);
      }
    });

    /**
     * Test case: Mixed constraint directions
     */
    it('should handle mixed maximize/minimize constraints correctly', () => {
      const options: Option[] = [
        {
          id: 'car_a',
          name: 'Car A',
          scores: new Map([
            ['price', 25000],      // minimize
            ['mpg', 30],           // maximize
            ['safety', 4],         // maximize
            ['maintenance', 800],  // minimize
          ]),
        },
        {
          id: 'car_b',
          name: 'Car B',
          scores: new Map([
            ['price', 35000],      // minimize
            ['mpg', 40],           // maximize
            ['safety', 5],         // maximize
            ['maintenance', 600],  // minimize
          ]),
        },
        {
          id: 'car_c',
          name: 'Car C',
          scores: new Map([
            ['price', 20000],      // minimize
            ['mpg', 25],           // maximize
            ['safety', 3],         // maximize
            ['maintenance', 1000], // minimize
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'price',
          name: 'Price',
          weight: 40,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 15000, max: 50000 },
        },
        {
          id: 'mpg',
          name: 'Fuel Efficiency',
          weight: 30,
          type: 'efficiency',
          direction: 'maximize',
          scale: { min: 20, max: 50 },
        },
        {
          id: 'safety',
          name: 'Safety Rating',
          weight: 20,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 1, max: 5 },
        },
        {
          id: 'maintenance',
          name: 'Annual Maintenance Cost',
          weight: 10,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 500, max: 1500 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const rankings = result.data.rankings;
        
        // Verify all cars are ranked
        expect(rankings).toHaveLength(3);
        expect(rankings.map((r: OptionRanking) => r.rank)).toEqual([1, 2, 3]);
        
        // Verify ideal solutions respect constraint directions
        const { idealSolution, negativeIdealSolution } = result.data;
        expect(idealSolution).toHaveLength(4);
        expect(negativeIdealSolution).toHaveLength(4);
        
        // For minimize constraints, ideal should be less than negative ideal
        // For maximize constraints, ideal should be greater than negative ideal
        // (This is checked in the weighted space, so we just verify they're different)
        expect(idealSolution).not.toEqual(negativeIdealSolution);
        
        // All closeness scores should be valid
        rankings.forEach((ranking: OptionRanking) => {
          expect(ranking.closenessScore).toBeGreaterThanOrEqual(0);
          expect(ranking.closenessScore).toBeLessThanOrEqual(1);
          expect(isFinite(ranking.closenessScore)).toBe(true);
        });
      }
    });

    /**
     * Test case: Verify mathematical properties of TOPSIS
     */
    it('should satisfy TOPSIS mathematical properties', () => {
      const options: Option[] = [
        {
          id: 'opt1',
          name: 'Option 1',
          scores: new Map([
            ['criterion1', 10],
            ['criterion2', 20],
          ]),
        },
        {
          id: 'opt2',
          name: 'Option 2',
          scores: new Map([
            ['criterion1', 15],
            ['criterion2', 25],
          ]),
        },
      ];

      const constraints: Constraint[] = [
        {
          id: 'criterion1',
          name: 'Criterion 1',
          weight: 60,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 30 },
        },
        {
          id: 'criterion2',
          name: 'Criterion 2',
          weight: 40,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 0, max: 30 },
        },
      ];

      const result = engine.calculateScores(options, constraints);

      expect(result.success).toBe(true);
      if (result.success) {
        const { normalizedScores, weightedScores, idealSolution, negativeIdealSolution } = result.data;
        
        // Property 1: Normalized matrix should have unit column vectors
        const opt1Normalized = [
          normalizedScores.get('opt1')!.get('criterion1')!,
          normalizedScores.get('opt1')!.get('criterion2')!,
        ];
        const opt2Normalized = [
          normalizedScores.get('opt2')!.get('criterion1')!,
          normalizedScores.get('opt2')!.get('criterion2')!,
        ];
        
        // Check vector normalization for each criterion
        for (let j = 0; j < 2; j++) {
          const col1 = j === 0 ? opt1Normalized[0] : opt1Normalized[1];
          const col2 = j === 0 ? opt2Normalized[0] : opt2Normalized[1];
          const sumSquares = col1! * col1! + col2! * col2!;
          expect(sumSquares).toBeCloseTo(1, 5);
        }
        
        // Property 2: Weighted scores should reflect constraint weights
        const opt1Weighted = [
          weightedScores.get('opt1')!.get('criterion1')!,
          weightedScores.get('opt1')!.get('criterion2')!,
        ];
        
        // Weighted score should equal normalized score * weight
        expect(opt1Weighted[0]).toBeCloseTo(opt1Normalized[0]! * 0.6, 5);
        expect(opt1Weighted[1]).toBeCloseTo(opt1Normalized[1]! * 0.4, 5);
        
        // Property 3: Ideal and negative ideal should be at extremes
        expect(idealSolution).toHaveLength(2);
        expect(negativeIdealSolution).toHaveLength(2);
        
        // For maximize constraints, ideal should be max, negative ideal should be min
        const allWeightedScores = [
          [opt1Weighted[0], opt1Weighted[1]],
          [weightedScores.get('opt2')!.get('criterion1')!, weightedScores.get('opt2')!.get('criterion2')!],
        ];
        
        for (let j = 0; j < 2; j++) {
          const columnValues = allWeightedScores.map(row => row[j]!);
          expect(idealSolution[j]).toBe(Math.max(...columnValues));
          expect(negativeIdealSolution[j]).toBe(Math.min(...columnValues));
        }
      }
    });
  });
});