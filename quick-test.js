#!/usr/bin/env node

/**
 * Quick JavaScript test (no TypeScript compilation needed)
 * Run with: node quick-test.js
 */

const { RefereeSystem } = require('./dist/RefereeSystem');

async function quickTest() {
  console.log('Quick Test - The TradeOff Engine\n');

  try {
    // Build first if needed
    console.log('Building project...');
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    
    const system = new RefereeSystem();
    await system.initialize();

    // Simple phone comparison
    const phones = [
      {
        id: 'iphone',
        name: 'iPhone 15',
        scores: new Map([
          ['price', 999],
          ['camera', 95],
          ['battery', 85],
          ['performance', 98]
        ])
      },
      {
        id: 'samsung',
        name: 'Samsung Galaxy S24',
        scores: new Map([
          ['price', 899],
          ['camera', 92],
          ['battery', 90],
          ['performance', 95]
        ])
      },
      {
        id: 'pixel',
        name: 'Google Pixel 8',
        scores: new Map([
          ['price', 699],
          ['camera', 88],
          ['battery', 80],
          ['performance', 90]
        ])
      }
    ];

    const criteria = [
      {
        id: 'price',
        name: 'Price',
        weight: 30,
        type: 'cost',
        direction: 'minimize',
        scale: { min: 600, max: 1200 }
      },
      {
        id: 'camera',
        name: 'Camera Quality',
        weight: 25,
        type: 'performance',
        direction: 'maximize',
        scale: { min: 80, max: 100 }
      },
      {
        id: 'battery',
        name: 'Battery Life',
        weight: 25,
        type: 'efficiency',
        direction: 'maximize',
        scale: { min: 75, max: 95 }
      },
      {
        id: 'performance',
        name: 'Performance',
        weight: 20,
        type: 'performance',
        direction: 'maximize',
        scale: { min: 85, max: 100 }
      }
    ];

    console.log('Comparing phones...\n');

    const result = await system.performComparison({
      options: phones,
      constraints: criteria,
      reportFormat: 'json'
    });

    if (result.success) {
      console.log('SUCCESS!\n');
      
      console.log('RANKINGS:');
      result.data.report.rankings.forEach((ranking, index) => {
        const medal = index === 0 ? '[1st]' : index === 1 ? '[2nd]' : '[3rd]';
        console.log(`${medal} ${ranking.option.name} - Score: ${ranking.closenessScore.toFixed(3)}`);
      });

      console.log('\nRECOMMENDATION:');
      const rec = result.data.report.executiveSummary.topRecommendation;
      console.log(`${rec.reasoning}`);
      console.log(`Confidence: ${(rec.confidence * 100).toFixed(1)}%`);

      console.log('\nThe TradeOff Engine is working perfectly!');
      console.log('\nTo create your own comparison:');
      console.log('   1. Edit my-comparison.ts with your options');
      console.log('   2. Run: npx ts-node my-comparison.ts');
      console.log('   3. Or use the full example: npx ts-node test-example.ts');

    } else {
      console.error('Test failed:', result.error);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTry running: npm run build');
  }
}

quickTest().catch(console.error);