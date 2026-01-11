#!/usr/bin/env ts-node

/**
 * YOUR CUSTOM COMPARISON - Modify this file to test your own scenarios!
 * Run with: npx ts-node my-comparison.ts
 */

import { RefereeSystem } from './src/RefereeSystem';
import { Option, Constraint } from './src/types/core';

async function myComparison() {
  console.log('🏆 My Custom Comparison\n');

  const system = new RefereeSystem();
  await system.initialize();

  // 🎯 MODIFY THIS SECTION TO TEST YOUR OWN COMPARISON
  // ================================================

  // Define your options (2-5 options)
  const myOptions: Option[] = [
    {
      id: 'option_a',
      name: 'Option A',
      description: 'First choice',
      scores: new Map([
        ['criteria1', 80],
        ['criteria2', 60],
        ['criteria3', 90]
      ])
    },
    {
      id: 'option_b', 
      name: 'Option B',
      description: 'Second choice',
      scores: new Map([
        ['criteria1', 70],
        ['criteria2', 85],
        ['criteria3', 75]
      ])
    },
    {
      id: 'option_c',
      name: 'Option C', 
      description: 'Third choice',
      scores: new Map([
        ['criteria1', 95],
        ['criteria2', 70],
        ['criteria3', 65]
      ])
    }
  ];

  // Define your criteria (what matters to you)
  const myConstraints: Constraint[] = [
    {
      id: 'criteria1',
      name: 'Important Factor 1',
      weight: 50,  // 50% importance
      type: 'performance',
      direction: 'maximize', // Higher is better
      scale: { min: 0, max: 100 }
    },
    {
      id: 'criteria2', 
      name: 'Important Factor 2',
      weight: 30,  // 30% importance
      type: 'efficiency',
      direction: 'maximize', // Higher is better
      scale: { min: 0, max: 100 }
    },
    {
      id: 'criteria3',
      name: 'Important Factor 3', 
      weight: 20,  // 20% importance
      type: 'custom',
      direction: 'maximize', // Higher is better
      scale: { min: 0, max: 100 }
    }
  ];

  // ================================================
  // END OF MODIFICATION SECTION
  // ================================================

  try {
    console.log('🔄 Running comparison...\n');

    const result = await system.performComparison({
      options: myOptions,
      constraints: myConstraints,
      reportFormat: 'markdown'
    });

    if (result.success) {
      console.log('✅ SUCCESS! Here are your results:\n');
      
      // Show the winner
      const winner = result.data.report.rankings[0];
      if (winner) {
        console.log(`🏆 WINNER: ${winner.option.name}`);
        console.log(`   Score: ${winner.closenessScore.toFixed(3)}`);
        console.log(`   Strengths: ${winner.strengthAreas.join(', ')}`);
        if (winner.weaknessAreas.length > 0) {
          console.log(`   Weaknesses: ${winner.weaknessAreas.join(', ')}`);
        }
        console.log();
      }

      // Show all rankings
      console.log('📊 FULL RANKINGS:');
      result.data.report.rankings.forEach((ranking, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
        console.log(`${medal} ${index + 1}. ${ranking.option.name} (${ranking.closenessScore.toFixed(3)})`);
      });
      console.log();

      // Show recommendation
      const rec = result.data.report.executiveSummary.topRecommendation;
      console.log('💡 RECOMMENDATION:');
      console.log(`   ${rec.reasoning}`);
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%\n`);

      // Show key insights
      console.log('🔍 KEY INSIGHTS:');
      result.data.report.executiveSummary.keyFindings.forEach(finding => {
        console.log(`   • ${finding}`);
      });

    } else {
      console.error('❌ Comparison failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run your comparison
myComparison().catch(console.error);

/*
🎯 HOW TO CUSTOMIZE THIS:

1. CHANGE THE OPTIONS:
   - Update myOptions array with your choices
   - Give each option a unique id, name, and description
   - Set scores for each criteria (use the same criteria IDs)

2. CHANGE THE CRITERIA:
   - Update myConstraints array with what matters to you
   - Set weights (must add up to 100)
   - Choose direction: 'maximize' (higher is better) or 'minimize' (lower is better)
   - Set appropriate scale min/max values

3. EXAMPLE SCENARIOS TO TRY:

   JOB OFFERS:
   options: ['Google', 'Startup', 'Remote Job']
   criteria: ['salary', 'work_life_balance', 'growth', 'location']

   VACATION DESTINATIONS:
   options: ['Paris', 'Tokyo', 'Bali']  
   criteria: ['cost', 'weather', 'activities', 'culture']

   INVESTMENT OPTIONS:
   options: ['Stocks', 'Real Estate', 'Crypto']
   criteria: ['expected_return', 'risk', 'liquidity', 'time_commitment']

4. RUN THE TEST:
   npx ts-node my-comparison.ts
*/