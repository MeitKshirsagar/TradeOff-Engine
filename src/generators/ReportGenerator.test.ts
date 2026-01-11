/**
 * Tests for ReportGenerator - Comprehensive report generation and export
 * 
 * This test suite covers:
 * - Report generation with all required sections
 * - Executive summary creation
 * - Visualization data preparation
 * - Multiple export formats (JSON, Markdown, HTML)
 * - Error handling and validation
 */

import * as fc from 'fast-check';
import { ReportGenerator } from './ReportGenerator';
import { TOPSISEngine } from '../engines/TOPSISEngine';
import { TradeOffAnalyzer } from '../analyzers/TradeOffAnalyzer';
import {
  Option,
  Constraint,
  ScoringResult,
  TradeOffAnalysis,
  ComparisonReport,
} from '../types/core';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  let topsisEngine: TOPSISEngine;
  let analyzer: TradeOffAnalyzer;
  let sampleOptions: Option[];
  let sampleConstraints: Constraint[];
  let sampleScoringResult: ScoringResult;
  let sampleTradeOffAnalysis: TradeOffAnalysis;

  beforeEach(() => {
    generator = new ReportGenerator();
    topsisEngine = new TOPSISEngine();
    analyzer = new TradeOffAnalyzer();

    // Set up sample data
    sampleOptions = [
      {
        id: 'laptop_a',
        name: 'Laptop A',
        scores: new Map([
          ['price', 800],
          ['performance', 85],
          ['battery', 6],
        ]),
      },
      {
        id: 'laptop_b',
        name: 'Laptop B',
        scores: new Map([
          ['price', 1200],
          ['performance', 95],
          ['battery', 8],
        ]),
      },
      {
        id: 'laptop_c',
        name: 'Laptop C',
        scores: new Map([
          ['price', 600],
          ['performance', 70],
          ['battery', 4],
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
        weight: 50,
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
    ];

    // Generate scoring and analysis results
    const scoringResult = topsisEngine.calculateScores(sampleOptions, sampleConstraints);
    if (scoringResult.success) {
      sampleScoringResult = scoringResult.data;
      
      const analysisResult = analyzer.analyzeTradeOffs(
        sampleScoringResult,
        sampleOptions,
        sampleConstraints
      );
      if (analysisResult.success) {
        sampleTradeOffAnalysis = analysisResult.data;
      }
    }
  });

  describe('Basic Functionality', () => {
    it('should generate a complete comparison report', () => {
      const result = generator.generateReport(
        sampleScoringResult,
        sampleTradeOffAnalysis,
        sampleOptions,
        sampleConstraints
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const report = result.data;
        
        // Should have all required sections
        expect(report.executiveSummary).toBeDefined();
        expect(report.rankings).toBeDefined();
        expect(report.tradeOffAnalysis).toBeDefined();
        expect(report.visualizations).toBeDefined();
        expect(report.methodology).toBeDefined();
        expect(report.timestamp).toBeInstanceOf(Date);
        
        // Executive summary should be complete
        expect(report.executiveSummary.topRecommendation).toBeDefined();
        expect(report.executiveSummary.keyFindings.length).toBeGreaterThan(0);
        expect(report.executiveSummary.confidenceLevel).toBeGreaterThan(0);
        expect(report.executiveSummary.methodology).toBeDefined();
        
        // Should have visualizations
        expect(report.visualizations.length).toBeGreaterThan(0);
        
        // Rankings should match input
        expect(report.rankings).toBe(sampleScoringResult.rankings);
        expect(report.tradeOffAnalysis).toBe(sampleTradeOffAnalysis);
      }
    });

    it('should generate appropriate visualizations', () => {
      const result = generator.generateReport(
        sampleScoringResult,
        sampleTradeOffAnalysis,
        sampleOptions,
        sampleConstraints
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const report = result.data;
        const visualizations = report.visualizations;
        
        // Should have multiple visualization types
        expect(visualizations.length).toBeGreaterThanOrEqual(3);
        
        // Check for expected visualization types
        const types = visualizations.map(v => v.type);
        expect(types).toContain('bar_chart');
        expect(types).toContain('radar_chart');
        expect(types).toContain('heatmap');
        
        // Each visualization should have required fields
        visualizations.forEach(viz => {
          expect(viz.title).toBeDefined();
          expect(viz.data).toBeDefined();
          expect(['bar_chart', 'radar_chart', 'scatter_plot', 'heatmap']).toContain(viz.type);
        });
      }
    });
  });

  describe('Executive Summary Generation', () => {
    it('should create meaningful executive summary', () => {
      const result = generator.generateReport(
        sampleScoringResult,
        sampleTradeOffAnalysis,
        sampleOptions,
        sampleConstraints
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const summary = result.data.executiveSummary;
        
        // Should have top recommendation
        expect(summary.topRecommendation.type).toBe('best_overall');
        expect(summary.topRecommendation.reasoning).toBeDefined();
        expect(summary.topRecommendation.reasoning.length).toBeGreaterThan(10);
        
        // Should have key findings
        expect(summary.keyFindings.length).toBeGreaterThan(0);
        summary.keyFindings.forEach(finding => {
          expect(finding.length).toBeGreaterThan(10);
        });
        
        // Should have confidence level
        expect(summary.confidenceLevel).toBeGreaterThan(0);
        expect(summary.confidenceLevel).toBeLessThanOrEqual(1);
        
        // Should have methodology description
        expect(summary.methodology).toContain('TOPSIS');
        expect(summary.methodology).toContain(sampleConstraints.length.toString());
      }
    });

    it('should identify significant trade-offs when present', () => {
      // Create options with clear trade-offs
      const tradeOffOptions: Option[] = [
        {
          id: 'high_perf_expensive',
          name: 'High Performance Expensive',
          scores: new Map([
            ['price', 2000], // Expensive
            ['performance', 95], // High performance
          ]),
        },
        {
          id: 'low_perf_cheap',
          name: 'Low Performance Cheap',
          scores: new Map([
            ['price', 500], // Cheap
            ['performance', 60], // Low performance
          ]),
        },
      ];

      const tradeOffConstraints: Constraint[] = [
        {
          id: 'price',
          name: 'Price',
          weight: 50,
          type: 'cost',
          direction: 'minimize',
          scale: { min: 400, max: 2500 },
        },
        {
          id: 'performance',
          name: 'Performance',
          weight: 50,
          type: 'performance',
          direction: 'maximize',
          scale: { min: 50, max: 100 },
        },
      ];

      const scoringResult = topsisEngine.calculateScores(tradeOffOptions, tradeOffConstraints);
      expect(scoringResult.success).toBe(true);

      if (scoringResult.success) {
        const analysisResult = analyzer.analyzeTradeOffs(
          scoringResult.data,
          tradeOffOptions,
          tradeOffConstraints
        );
        expect(analysisResult.success).toBe(true);

        if (analysisResult.success) {
          const reportResult = generator.generateReport(
            scoringResult.data,
            analysisResult.data,
            tradeOffOptions,
            tradeOffConstraints
          );
          expect(reportResult.success).toBe(true);

          if (reportResult.success) {
            const summary = reportResult.data.executiveSummary;
            
            // Should identify trade-offs between price and performance
            expect(summary.significantTradeOffs.length).toBeGreaterThan(0);
            
            const hasPerformanceTradeOff = summary.significantTradeOffs.some(
              tradeoff => tradeoff.toLowerCase().includes('performance')
            );
            expect(hasPerformanceTradeOff).toBe(true);
          }
        }
      }
    });
  });

  describe('Export Formats', () => {
    let sampleReport: ComparisonReport;

    beforeEach(() => {
      const result = generator.generateReport(
        sampleScoringResult,
        sampleTradeOffAnalysis,
        sampleOptions,
        sampleConstraints
      );
      if (result.success) {
        sampleReport = result.data;
      }
    });

    it('should export to valid JSON format', () => {
      const jsonString = generator.exportToJSON(sampleReport);
      
      expect(jsonString).toBeDefined();
      expect(jsonString.length).toBeGreaterThan(100);
      
      // Should be valid JSON
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.executiveSummary).toBeDefined();
      expect(parsed.rankings).toBeDefined();
      expect(parsed.visualizations).toBeDefined();
    });

    it('should export to well-formatted Markdown', () => {
      const markdown = generator.exportToMarkdown(sampleReport);
      
      expect(markdown).toBeDefined();
      expect(markdown.length).toBeGreaterThan(200);
      
      // Should contain Markdown elements
      expect(markdown).toContain('# Option Comparison Report');
      expect(markdown).toContain('## Executive Summary');
      expect(markdown).toContain('## Rankings');
      expect(markdown).toContain('| Rank | Option |'); // Table header
      expect(markdown).toContain('## Recommendations');
      expect(markdown).toContain('## Methodology');
      
      // Should contain actual data
      sampleOptions.forEach(option => {
        expect(markdown).toContain(option.name);
      });
    });

    it('should export to valid HTML format', () => {
      const html = generator.exportToHTML(sampleReport);
      
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(500);
      
      // Should contain HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
      
      // Should contain CSS styles
      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
      
      // Should contain content sections
      expect(html).toContain('<h1>Option Comparison Report</h1>');
      expect(html).toContain('<h2>Executive Summary</h2>');
      expect(html).toContain('<h2>Rankings</h2>');
      expect(html).toContain('<table class="ranking-table">');
      
      // Should contain actual data
      sampleOptions.forEach(option => {
        expect(html).toContain(option.name);
      });
    });

    it('should handle different export formats consistently', () => {
      const json = generator.exportToJSON(sampleReport);
      const markdown = generator.exportToMarkdown(sampleReport);
      const html = generator.exportToHTML(sampleReport);
      
      // All formats should contain the same core information
      const topOption = sampleReport.rankings[0]!.option.name;
      
      expect(json).toContain(topOption);
      expect(markdown).toContain(topOption);
      expect(html).toContain(topOption);
      
      // All should contain methodology information
      expect(json).toContain('TOPSIS');
      expect(markdown).toContain('TOPSIS');
      expect(html).toContain('TOPSIS');
    });
  });

  describe('Visualization Generation', () => {
    it('should create appropriate chart data structures', () => {
      const result = generator.generateReport(
        sampleScoringResult,
        sampleTradeOffAnalysis,
        sampleOptions,
        sampleConstraints
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const visualizations = result.data.visualizations;
        
        // Bar chart should have proper structure
        const barChart = visualizations.find(v => v.type === 'bar_chart');
        expect(barChart).toBeDefined();
        if (barChart) {
          expect(barChart.data.labels).toBeDefined();
          expect(barChart.data.datasets).toBeDefined();
          expect(barChart.data.labels.length).toBe(sampleOptions.length);
        }
        
        // Radar chart should have proper structure
        const radarChart = visualizations.find(v => v.type === 'radar_chart');
        expect(radarChart).toBeDefined();
        if (radarChart) {
          expect(radarChart.data.labels).toBeDefined();
          expect(radarChart.data.datasets).toBeDefined();
          expect(radarChart.data.labels.length).toBe(sampleConstraints.length);
        }
        
        // Heatmap should have proper structure
        const heatmap = visualizations.find(v => v.type === 'heatmap');
        expect(heatmap).toBeDefined();
        if (heatmap) {
          expect(heatmap.data.labels).toBeDefined();
          expect(heatmap.data.datasets).toBeDefined();
        }
      }
    });

    it('should handle single constraint scenarios', () => {
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
        const analysisResult = analyzer.analyzeTradeOffs(
          scoringResult.data,
          sampleOptions,
          singleConstraint
        );
        expect(analysisResult.success).toBe(true);

        if (analysisResult.success) {
          const reportResult = generator.generateReport(
            scoringResult.data,
            analysisResult.data,
            sampleOptions,
            singleConstraint
          );
          expect(reportResult.success).toBe(true);

          if (reportResult.success) {
            const visualizations = reportResult.data.visualizations;
            
            // Should still generate visualizations
            expect(visualizations.length).toBeGreaterThan(0);
            
            // Scatter plot should handle single constraint gracefully
            const scatterPlot = visualizations.find(v => v.type === 'scatter_plot');
            if (scatterPlot) {
              expect(scatterPlot.data.datasets).toBeDefined();
            }
          }
        }
      }
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 10: Report Generation Completeness
     * For any valid scoring and analysis results, the system should generate
     * comprehensive reports with all required sections and export formats.
     */
    it('should generate complete reports for all valid inputs', () => {
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
            const localGenerator = new ReportGenerator();
            
            // Generate test data
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

            // Add random scores
            for (const option of options) {
              for (const constraint of constraints) {
                option.scores.set(constraint.id, Math.random() * 100);
              }
            }

            const scoringResult = localTopsisEngine.calculateScores(options, constraints);
            if (!scoringResult.success) return;
            
            const analysisResult = localAnalyzer.analyzeTradeOffs(
              scoringResult.data,
              options,
              constraints
            );
            if (!analysisResult.success) return;
            
            const reportResult = localGenerator.generateReport(
              scoringResult.data,
              analysisResult.data,
              options,
              constraints
            );
            
            // Property: Valid inputs should always produce valid reports
            expect(reportResult.success).toBe(true);
            
            if (reportResult.success) {
              const report = reportResult.data;
              
              // Property: Report should have all required sections
              expect(report.executiveSummary).toBeDefined();
              expect(report.rankings).toBeDefined();
              expect(report.tradeOffAnalysis).toBeDefined();
              expect(report.visualizations).toBeDefined();
              expect(report.methodology).toBeDefined();
              expect(report.timestamp).toBeInstanceOf(Date);
              
              // Property: Executive summary should be complete
              expect(report.executiveSummary.topRecommendation).toBeDefined();
              expect(report.executiveSummary.keyFindings.length).toBeGreaterThan(0);
              expect(report.executiveSummary.confidenceLevel).toBeGreaterThan(0);
              expect(report.executiveSummary.confidenceLevel).toBeLessThanOrEqual(1);
              expect(report.executiveSummary.methodology).toBeDefined();
              
              // Property: Should have visualizations
              expect(report.visualizations.length).toBeGreaterThan(0);
              
              // Property: All visualizations should be valid
              report.visualizations.forEach(viz => {
                expect(['bar_chart', 'radar_chart', 'scatter_plot', 'heatmap']).toContain(viz.type);
                expect(viz.title).toBeDefined();
                expect(viz.title.length).toBeGreaterThan(0);
                expect(viz.data).toBeDefined();
              });
              
              // Property: Export formats should work
              const jsonExport = localGenerator.exportToJSON(report);
              const markdownExport = localGenerator.exportToMarkdown(report);
              const htmlExport = localGenerator.exportToHTML(report);
              
              expect(jsonExport.length).toBeGreaterThan(50);
              expect(markdownExport.length).toBeGreaterThan(100);
              expect(htmlExport.length).toBeGreaterThan(200);
              
              // Property: JSON should be valid
              expect(() => JSON.parse(jsonExport)).not.toThrow();
              
              // Property: All formats should contain option names
              options.forEach(option => {
                expect(jsonExport).toContain(option.name);
                expect(markdownExport).toContain(option.name);
                expect(htmlExport).toContain(option.name);
              });
            }
          }
        ), { numRuns: 100 });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully', () => {
      const invalidScoringResult = {} as ScoringResult;
      
      const result = generator.generateReport(
        invalidScoringResult,
        sampleTradeOffAnalysis,
        sampleOptions,
        sampleConstraints
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REPORT_GENERATION_ERROR');
      }
    });

    it('should handle empty data sets', () => {
      const emptyOptions: Option[] = [];
      const emptyConstraints: Constraint[] = [];
      
      // This should fail at the scoring level, but if it somehow gets through
      const result = generator.generateReport(
        sampleScoringResult,
        sampleTradeOffAnalysis,
        emptyOptions,
        emptyConstraints
      );

      // Should either succeed with empty data or fail gracefully
      if (!result.success) {
        expect(result.error.code).toBe('REPORT_GENERATION_ERROR');
      }
    });
  });
});