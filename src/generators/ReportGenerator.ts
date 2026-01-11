/**
 * ReportGenerator - Generates comprehensive comparison reports
 * 
 * This class provides structured report generation with:
 * - Executive summaries with key findings
 * - Detailed rankings and analysis
 * - Multiple export formats (JSON, Markdown, HTML)
 * - Visualization data preparation
 */

import {
  ComparisonReport,
  ExecutiveSummary,
  TradeOffAnalysis,
  ScoringResult,
  Option,
  Constraint,
  Visualization,
  ValidationError,
  Result,
  createSuccess,
  createError,
  createValidationError,
} from '../types/core';

export class ReportGenerator {
  /**
   * Generate a comprehensive comparison report
   */
  generateReport(
    scoringResult: ScoringResult,
    tradeOffAnalysis: TradeOffAnalysis,
    options: Option[],
    constraints: Constraint[]
  ): Result<ComparisonReport, ValidationError> {
    try {
      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary(
        scoringResult,
        tradeOffAnalysis,
        options,
        constraints
      );

      // Generate visualizations
      const visualizations = this.generateVisualizations(
        scoringResult,
        tradeOffAnalysis,
        options,
        constraints
      );

      const report: ComparisonReport = {
        executiveSummary,
        rankings: scoringResult.rankings,
        tradeOffAnalysis,
        visualizations,
        methodology: scoringResult.scoringMethodology,
        timestamp: new Date(),
      };

      return createSuccess(report);
    } catch (error) {
      return createError(
        createValidationError(
          'report',
          `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'REPORT_GENERATION_ERROR'
        )
      );
    }
  }

  /**
   * Generate executive summary with key findings
   */
  private generateExecutiveSummary(
    scoringResult: ScoringResult,
    tradeOffAnalysis: TradeOffAnalysis,
    options: Option[],
    constraints: Constraint[]
  ): ExecutiveSummary {
    const topRanking = scoringResult.rankings[0]!;
    const topRecommendation = tradeOffAnalysis.recommendations.find(r => r.type === 'best_overall')!;

    // Generate key findings
    const keyFindings: string[] = [];
    
    // Top performer analysis
    const topOption = options.find(o => o.id === topRanking.option.id)!;
    const topAnalysis = tradeOffAnalysis.optionAnalyses.get(topOption.id)!;
    keyFindings.push(
      `${topOption.name} emerges as the top choice with a score of ${(topRanking.closenessScore * 100).toFixed(1)}%`
    );

    // Strength analysis
    if (topAnalysis.strengths.length > 0) {
      const strengthAreas = topAnalysis.strengths.map(s => s.constraintName).join(', ');
      keyFindings.push(`Strong performance in: ${strengthAreas}`);
    }

    // Competition analysis
    if (scoringResult.rankings.length > 1) {
      const secondPlace = scoringResult.rankings[1]!;
      const scoreDiff = (topRanking.closenessScore - secondPlace.closenessScore) * 100;
      keyFindings.push(
        `${scoreDiff.toFixed(1)}% performance advantage over ${secondPlace.option.name}`
      );
    }

    // Pareto frontier analysis
    const paretoCount = tradeOffAnalysis.dominanceRelations.paretoFrontier.length;
    if (paretoCount > 1) {
      keyFindings.push(`${paretoCount} options on the Pareto frontier offer different trade-offs`);
    }

    // Generate significant trade-offs
    const significantTradeOffs: string[] = [];
    
    // Analyze major differences between top options
    const topComparison = tradeOffAnalysis.pairwiseComparisons.find(
      c => c.optionA === topRanking.option.id || c.optionB === topRanking.option.id
    );
    
    if (topComparison && topComparison.significantDifferences.length > 0) {
      topComparison.significantDifferences.forEach(diff => {
        if (diff.significance === 'high') {
          significantTradeOffs.push(
            `${diff.constraintName}: ${(diff.percentageDifference * 100).toFixed(0)}% difference between top options`
          );
        }
      });
    }

    // Calculate overall confidence
    const avgConfidence = tradeOffAnalysis.recommendations.reduce(
      (sum, rec) => sum + rec.confidence, 0
    ) / tradeOffAnalysis.recommendations.length;

    return {
      topRecommendation,
      keyFindings,
      significantTradeOffs,
      confidenceLevel: avgConfidence,
      methodology: `TOPSIS multi-criteria analysis with ${constraints.length} weighted criteria`,
    };
  }

  /**
   * Generate visualizations for the report
   */
  private generateVisualizations(
    scoringResult: ScoringResult,
    tradeOffAnalysis: TradeOffAnalysis,
    options: Option[],
    constraints: Constraint[]
  ): Visualization[] {
    const visualizations: Visualization[] = [];

    // Rankings bar chart
    visualizations.push(this.createRankingsChart(scoringResult, options));

    // Constraint performance radar chart
    visualizations.push(this.createRadarChart(scoringResult, options, constraints));

    // Trade-off scatter plot
    visualizations.push(this.createTradeOffScatterPlot(scoringResult, constraints));

    // Performance heatmap
    visualizations.push(this.createPerformanceHeatmap(scoringResult, options, constraints));

    return visualizations;
  }

  /**
   * Create rankings bar chart visualization
   */
  private createRankingsChart(scoringResult: ScoringResult, options: Option[]): Visualization {
    const data = scoringResult.rankings.map(ranking => ({
      option: ranking.option.name,
      score: Math.round(ranking.closenessScore * 100),
      rank: ranking.rank,
    }));

    return {
      type: 'bar_chart',
      title: 'Overall Rankings',
      data: {
        labels: data.map(d => d.option),
        datasets: [{
          label: 'Overall Score (%)',
          data: data.map(d => d.score),
          backgroundColor: data.map((_, i) => 
            i === 0 ? '#4CAF50' : i === 1 ? '#2196F3' : '#FF9800'
          ),
        }],
      },
      config: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Score (%)' },
          },
        },
      },
    };
  }

  /**
   * Create radar chart for constraint performance
   */
  private createRadarChart(
    scoringResult: ScoringResult,
    options: Option[],
    constraints: Constraint[]
  ): Visualization {
    const datasets = options.slice(0, 3).map((option, index) => {
      const normalizedScores = scoringResult.normalizedScores.get(option.id)!;
      const data = constraints.map(constraint => {
        const score = normalizedScores.get(constraint.id) ?? 0;
        return Math.round(score * 100);
      });

      const colors = ['#4CAF50', '#2196F3', '#FF9800'];
      return {
        label: option.name,
        data,
        borderColor: colors[index],
        backgroundColor: colors[index] + '20',
        pointBackgroundColor: colors[index],
      };
    });

    return {
      type: 'radar_chart',
      title: 'Performance Comparison',
      data: {
        labels: constraints.map(c => c.name),
        datasets,
      },
      config: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 20 },
          },
        },
      },
    };
  }

  /**
   * Create trade-off scatter plot
   */
  private createTradeOffScatterPlot(
    scoringResult: ScoringResult,
    constraints: Constraint[]
  ): Visualization {
    if (constraints.length < 2) {
      return {
        type: 'scatter_plot',
        title: 'Trade-off Analysis',
        data: { datasets: [] },
      };
    }

    const xConstraint = constraints[0]!;
    const yConstraint = constraints[1]!;

    const data = scoringResult.rankings.map(ranking => {
      const xScore = ranking.option.scores.get(xConstraint.id) ?? 0;
      const yScore = ranking.option.scores.get(yConstraint.id) ?? 0;
      
      return {
        x: xScore,
        y: yScore,
        label: ranking.option.name,
        rank: ranking.rank,
      };
    });

    return {
      type: 'scatter_plot',
      title: `${xConstraint.name} vs ${yConstraint.name}`,
      data: {
        datasets: [{
          label: 'Options',
          data,
          backgroundColor: data.map(d => 
            d.rank === 1 ? '#4CAF50' : d.rank === 2 ? '#2196F3' : '#FF9800'
          ),
        }],
      },
      config: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: xConstraint.name } },
          y: { title: { display: true, text: yConstraint.name } },
        },
      },
    };
  }

  /**
   * Create performance heatmap
   */
  private createPerformanceHeatmap(
    scoringResult: ScoringResult,
    options: Option[],
    constraints: Constraint[]
  ): Visualization {
    const data = options.map(option => {
      const normalizedScores = scoringResult.normalizedScores.get(option.id)!;
      return constraints.map(constraint => {
        const score = normalizedScores.get(constraint.id) ?? 0;
        return Math.round(score * 100);
      });
    });

    return {
      type: 'heatmap',
      title: 'Performance Heatmap',
      data: {
        labels: {
          x: constraints.map(c => c.name),
          y: options.map(o => o.name),
        },
        datasets: [{
          data,
          backgroundColor: (value: number) => {
            if (value >= 80) return '#4CAF50';
            if (value >= 60) return '#8BC34A';
            if (value >= 40) return '#FFC107';
            if (value >= 20) return '#FF9800';
            return '#F44336';
          },
        }],
      },
      config: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (context: any) => {
                const point = context[0];
                return `${options[point.dataIndex]?.name} - ${constraints[point.index]?.name}`;
              },
              label: (context: any) => `Score: ${context.parsed.v}%`,
            },
          },
        },
      },
    };
  }

  /**
   * Export report to JSON format
   */
  exportToJSON(report: ComparisonReport): string {
    return JSON.stringify(report, (key, value) => {
      // Handle Map objects
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }, 2);
  }

  /**
   * Export report to Markdown format
   */
  exportToMarkdown(report: ComparisonReport): string {
    const md: string[] = [];

    // Header
    md.push('# Option Comparison Report');
    md.push(`*Generated on ${report.timestamp.toLocaleDateString()}*\n`);

    // Executive Summary
    md.push('## Executive Summary\n');
    md.push(`**Top Recommendation:** ${report.executiveSummary.topRecommendation.reasoning}\n`);
    
    md.push('### Key Findings\n');
    report.executiveSummary.keyFindings.forEach(finding => {
      md.push(`- ${finding}`);
    });
    md.push('');

    if (report.executiveSummary.significantTradeOffs.length > 0) {
      md.push('### Significant Trade-offs\n');
      report.executiveSummary.significantTradeOffs.forEach(tradeoff => {
        md.push(`- ${tradeoff}`);
      });
      md.push('');
    }

    // Rankings
    md.push('## Rankings\n');
    md.push('| Rank | Option | Score | Strengths | Weaknesses |');
    md.push('|------|--------|-------|-----------|------------|');
    
    report.rankings.forEach(ranking => {
      const analysis = report.tradeOffAnalysis.optionAnalyses.get(ranking.option.id);
      const strengths = analysis?.strengths.map(s => s.constraintName).join(', ') || 'None';
      const weaknesses = analysis?.weaknesses.map(w => w.constraintName).join(', ') || 'None';
      
      md.push(
        `| ${ranking.rank} | ${ranking.option.name} | ${(ranking.closenessScore * 100).toFixed(1)}% | ${strengths} | ${weaknesses} |`
      );
    });
    md.push('');

    // Recommendations
    md.push('## Recommendations\n');
    report.tradeOffAnalysis.recommendations.forEach(rec => {
      const option = report.rankings.find(r => r.option.id === rec.optionId)?.option;
      md.push(`### ${rec.type.replace('_', ' ').toUpperCase()}: ${option?.name}\n`);
      md.push(`${rec.reasoning}\n`);
      md.push(`*Confidence: ${(rec.confidence * 100).toFixed(0)}%*\n`);
    });

    // Methodology
    md.push('## Methodology\n');
    md.push(`${report.executiveSummary.methodology}\n`);
    md.push(`- Normalization: ${report.methodology.normalizationMethod}`);
    md.push(`- Distance Metric: ${report.methodology.distanceMetric}`);
    md.push(`- Weighting: ${report.methodology.weightingApproach}`);

    return md.join('\n');
  }

  /**
   * Export report to HTML format
   */
  exportToHTML(report: ComparisonReport): string {
    const html: string[] = [];

    // HTML structure
    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push('<head>');
    html.push('<meta charset="UTF-8">');
    html.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    html.push('<title>Option Comparison Report</title>');
    html.push('<style>');
    html.push(`
      body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
      .section { margin: 30px 0; }
      .recommendation { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
      .ranking-table { width: 100%; border-collapse: collapse; }
      .ranking-table th, .ranking-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .ranking-table th { background-color: #f2f2f2; }
      .rank-1 { background-color: #e8f5e8; }
      .rank-2 { background-color: #e3f2fd; }
      .rank-3 { background-color: #fff3e0; }
      .confidence { font-style: italic; color: #666; }
      .methodology { background: #f9f9f9; padding: 15px; border-left: 4px solid #2196F3; }
    `);
    html.push('</style>');
    html.push('</head>');
    html.push('<body>');

    // Header
    html.push('<div class="header">');
    html.push('<h1>Option Comparison Report</h1>');
    html.push(`<p><em>Generated on ${report.timestamp.toLocaleDateString()}</em></p>`);
    html.push('</div>');

    // Executive Summary
    html.push('<div class="section">');
    html.push('<h2>Executive Summary</h2>');
    html.push(`<p><strong>Top Recommendation:</strong> ${report.executiveSummary.topRecommendation.reasoning}</p>`);
    
    html.push('<h3>Key Findings</h3>');
    html.push('<ul>');
    report.executiveSummary.keyFindings.forEach(finding => {
      html.push(`<li>${finding}</li>`);
    });
    html.push('</ul>');

    if (report.executiveSummary.significantTradeOffs.length > 0) {
      html.push('<h3>Significant Trade-offs</h3>');
      html.push('<ul>');
      report.executiveSummary.significantTradeOffs.forEach(tradeoff => {
        html.push(`<li>${tradeoff}</li>`);
      });
      html.push('</ul>');
    }
    html.push('</div>');

    // Rankings
    html.push('<div class="section">');
    html.push('<h2>Rankings</h2>');
    html.push('<table class="ranking-table">');
    html.push('<thead><tr><th>Rank</th><th>Option</th><th>Score</th><th>Strengths</th><th>Weaknesses</th></tr></thead>');
    html.push('<tbody>');
    
    report.rankings.forEach(ranking => {
      const analysis = report.tradeOffAnalysis.optionAnalyses.get(ranking.option.id);
      const strengths = analysis?.strengths.map(s => s.constraintName).join(', ') || 'None';
      const weaknesses = analysis?.weaknesses.map(w => w.constraintName).join(', ') || 'None';
      const rankClass = ranking.rank <= 3 ? `rank-${ranking.rank}` : '';
      
      html.push(`<tr class="${rankClass}">`);
      html.push(`<td>${ranking.rank}</td>`);
      html.push(`<td>${ranking.option.name}</td>`);
      html.push(`<td>${(ranking.closenessScore * 100).toFixed(1)}%</td>`);
      html.push(`<td>${strengths}</td>`);
      html.push(`<td>${weaknesses}</td>`);
      html.push('</tr>');
    });
    
    html.push('</tbody></table>');
    html.push('</div>');

    // Recommendations
    html.push('<div class="section">');
    html.push('<h2>Recommendations</h2>');
    report.tradeOffAnalysis.recommendations.forEach(rec => {
      const option = report.rankings.find(r => r.option.id === rec.optionId)?.option;
      html.push('<div class="recommendation">');
      html.push(`<h3>${rec.type.replace('_', ' ').toUpperCase()}: ${option?.name}</h3>`);
      html.push(`<p>${rec.reasoning}</p>`);
      html.push(`<p class="confidence">Confidence: ${(rec.confidence * 100).toFixed(0)}%</p>`);
      html.push('</div>');
    });
    html.push('</div>');

    // Methodology
    html.push('<div class="section">');
    html.push('<h2>Methodology</h2>');
    html.push('<div class="methodology">');
    html.push(`<p>${report.executiveSummary.methodology}</p>`);
    html.push('<ul>');
    html.push(`<li><strong>Normalization:</strong> ${report.methodology.normalizationMethod}</li>`);
    html.push(`<li><strong>Distance Metric:</strong> ${report.methodology.distanceMetric}</li>`);
    html.push(`<li><strong>Weighting:</strong> ${report.methodology.weightingApproach}</li>`);
    html.push('</ul>');
    html.push('</div>');
    html.push('</div>');

    html.push('</body>');
    html.push('</html>');

    return html.join('\n');
  }
}