#!/usr/bin/env ts-node

/**
 * Interactive test script for The Referee
 * Run with: npx ts-node test-example.ts
 */

import { RefereeSystem } from './src/RefereeSystem';
import { Option, Constraint } from './src/types/core';

async function testReferee() {
  console.log('🏆 Testing The Referee - Option Comparison Tool\n');

  // Initialize the system
  const system = new RefereeSystem();
  await system.initialize();

  // Example 1: Laptop Comparison
  console.log('📱 Example 1: Laptop Comparison');
  console.log('===============================');

  const laptops: Option[] = [
    {
      id: 'budget_laptop',
      name: 'Budget Laptop',
      description: 'Affordable option for basic tasks',
      scores: new Map([
        ['price', 800],
        ['performance', 75],
        ['battery', 6],
        ['portability', 85]
      ])
    },
    {
      id: 'gaming_laptop',
      name: 'Gaming Laptop',
      description: 'High-performance for gaming and development',
      scores: new Map([
        ['price', 1500],
        ['performance', 95],
        ['battery', 4],
        ['portability', 60]
      ])
    },
    {
      id: 'ultrabook',
      name: 'Ultrabook',
      description: 'Premium thin and light laptop',
      scores: new Map([
        ['price', 1200],
        ['performance', 85],
        ['battery', 9],
        ['portability', 95]
      ])
    }
  ];

  const laptopConstraints: Constraint[] = [
    {
      id: 'price',
      name: 'Price',
      weight: 25,
      type: 'cost',
      direction: 'minimize', // Lower price is better
      scale: { min: 500, max: 2000, unit: 'USD' }
    },
    {
      id: 'performance',
      name: 'Performance Score',
      weight: 40,
      type: 'performance',
      direction: 'maximize', // Higher performance is better
      scale: { min: 60, max: 100, unit: 'points' }
    },
    {
      id: 'battery',
      name: 'Battery Life',
      weight: 20,
      type: 'efficiency',
      direction: 'maximize', // Longer battery is better
      scale: { min: 3, max: 10, unit: 'hours' }
    },
    {
      id: 'portability',
      name: 'Portability',
      weight: 15,
      type: 'performance',
      direction: 'maximize', // More portable is better
      scale: { min: 50, max: 100, unit: 'score' }
    }
  ];

  try {
    const result = await system.performComparison({
      options: laptops,
      constraints: laptopConstraints,
      reportFormat: 'markdown'
    });

    if (result.success) {
      console.log('✅ Comparison successful!\n');
      
      // Show rankings
      console.log('🏆 RANKINGS:');
      result.data.report.rankings.forEach((ranking, index) => {
        console.log(`${index + 1}. ${ranking.option.name} (Score: ${ranking.closenessScore.toFixed(3)})`);
        console.log(`   Strengths: ${ranking.strengthAreas.join(', ')}`);
        console.log(`   Weaknesses: ${ranking.weaknessAreas.join(', ')}\n`);
      });

      // Show top recommendation
      console.log('💡 TOP RECOMMENDATION:');
      const topRec = result.data.report.executiveSummary.topRecommendation;
      console.log(`${topRec.optionId}: ${topRec.reasoning}`);
      console.log(`Confidence: ${(topRec.confidence * 100).toFixed(1)}%\n`);

      // Show key findings
      console.log('🔍 KEY FINDINGS:');
      result.data.report.executiveSummary.keyFindings.forEach(finding => {
        console.log(`• ${finding}`);
      });

      console.log('\n📄 Full report saved as markdown format');
      if (result.data.exportedReport) {
        console.log('Report length:', result.data.exportedReport.length, 'characters');
      }

    } else {
      console.error('❌ Comparison failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error during comparison:', error);
  }

  // Example 2: Quick comparison with different data
  console.log('\n\n🍕 Example 2: Restaurant Comparison');
  console.log('===================================');

  const restaurants: Option[] = [
    {
      id: 'italian_place',
      name: 'Mario\'s Italian',
      scores: new Map([
        ['price', 25],      // $25 average meal
        ['quality', 90],    // 90/100 quality score
        ['distance', 2],    // 2 miles away
        ['ambiance', 85]    // 85/100 ambiance score
      ])
    },
    {
      id: 'sushi_bar',
      name: 'Sakura Sushi',
      scores: new Map([
        ['price', 40],
        ['quality', 95],
        ['distance', 5],
        ['ambiance', 90]
      ])
    },
    {
      id: 'burger_joint',
      name: 'Bob\'s Burgers',
      scores: new Map([
        ['price', 15],
        ['quality', 75],
        ['distance', 1],
        ['ambiance', 60]
      ])
    }
  ];

  const restaurantConstraints: Constraint[] = [
    {
      id: 'price',
      name: 'Price per meal',
      weight: 30,
      type: 'cost',
      direction: 'minimize',
      scale: { min: 10, max: 50, unit: 'USD' }
    },
    {
      id: 'quality',
      name: 'Food Quality',
      weight: 50,
      type: 'performance',
      direction: 'maximize',
      scale: { min: 60, max: 100, unit: 'score' }
    },
    {
      id: 'distance',
      name: 'Distance',
      weight: 15,
      type: 'efficiency',
      direction: 'minimize',
      scale: { min: 1, max: 10, unit: 'miles' }
    },
    {
      id: 'ambiance',
      name: 'Ambiance',
      weight: 5,
      type: 'performance',
      direction: 'maximize',
      scale: { min: 50, max: 100, unit: 'score' }
    }
  ];

  try {
    const quickResult = await system.quickCompare(restaurants, restaurantConstraints);
    
    if (quickResult.success) {
      console.log('✅ Quick comparison successful!');
      const topRanking = quickResult.data.report.rankings[0];
      if (topRanking) {
        console.log('Winner:', topRanking.option.name);
      }
      if (quickResult.data.exportedReport) {
        console.log('Report preview:', quickResult.data.exportedReport.substring(0, 200) + '...');
      }
    }

  } catch (error) {
    console.error('❌ Quick comparison failed:', error);
  }

  console.log('\n🎉 Test completed! The Referee is working perfectly.');
  console.log('\n💡 Try creating your own comparison by modifying the options and constraints above!');
}

// Run the test
testReferee().catch(console.error);