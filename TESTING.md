# Testing Guide

The TradeOff Engine is ready to use! Here are several ways to test it yourself:

## Quick Tests

### 1. Instant Test (JavaScript - No compilation needed)
```bash
node quick-test.js
```
This runs a phone comparison example and builds the project automatically.

### 2. TypeScript Examples (More detailed)
```bash
# Full featured test with 2 examples
npx ts-node test-example.ts

# Your custom comparison (edit this file!)
npx ts-node my-comparison.ts
```

### 3. Run All Tests (Verify everything works)
```bash
npm test
```

## Create Your Own Comparison

### Easy Way: Edit `my-comparison.ts`

1. Open `my-comparison.ts`
2. Modify the `myOptions` and `myConstraints` arrays
3. Run: `npx ts-node my-comparison.ts`

### Example Scenarios to Try:

**Job Comparison:**
```typescript
const jobs = [
  { id: 'google', name: 'Google SWE', scores: new Map([
    ['salary', 180000], ['wlb', 70], ['growth', 85], ['location', 60]
  ])},
  { id: 'startup', name: 'Startup CTO', scores: new Map([
    ['salary', 120000], ['wlb', 50], ['growth', 95], ['location', 80]
  ])},
];

const criteria = [
  { id: 'salary', weight: 40, direction: 'maximize', scale: {min: 80000, max: 200000} },
  { id: 'wlb', weight: 30, direction: 'maximize', scale: {min: 40, max: 90} },
  { id: 'growth', weight: 20, direction: 'maximize', scale: {min: 60, max: 100} },
  { id: 'location', weight: 10, direction: 'maximize', scale: {min: 50, max: 100} },
];
```

**Vacation Planning:**
```typescript
const destinations = [
  { id: 'paris', name: 'Paris', scores: new Map([
    ['cost', 2500], ['weather', 70], ['culture', 95], ['activities', 90]
  ])},
  { id: 'bali', name: 'Bali', scores: new Map([
    ['cost', 1200], ['weather', 85], ['culture', 80], ['activities', 85]
  ])},
];

const criteria = [
  { id: 'cost', weight: 35, direction: 'minimize', scale: {min: 1000, max: 3000} },
  { id: 'weather', weight: 25, direction: 'maximize', scale: {min: 60, max: 90} },
  { id: 'culture', weight: 25, direction: 'maximize', scale: {min: 70, max: 100} },
  { id: 'activities', weight: 15, direction: 'maximize', scale: {min: 70, max: 100} },
];
```

## Understanding the Results

### Rankings
- **Closeness Score**: 0-1 scale (higher = better overall choice)
- **Rank**: 1 = best option according to your weights
- **Strengths**: Areas where option performs in top 25%
- **Weaknesses**: Areas where option performs in bottom 25%

### Recommendations
- **Best Overall**: Highest scoring option
- **Compromise**: Balanced option on Pareto frontier
- **Confidence**: How certain the algorithm is (higher = more decisive)

### Key Insights
- **Performance Advantage**: How much better the winner is
- **Pareto Frontier**: Options that aren't dominated by others
- **Trade-offs**: What you gain/lose with each choice

## Advanced Usage

### Using the API Directly
```typescript
import { RefereeSystem } from './src/RefereeSystem';

const system = new RefereeSystem();
await system.initialize();

// Add options one by one
system.addOption({ id: 'opt1', name: 'Option 1', scores: new Map([...]) });
system.addConstraint({ id: 'crit1', name: 'Criteria 1', weight: 50, ... });

// Check if ready
const readiness = system.validateReadiness();
if (readiness.success) {
  const result = await system.quickCompare(
    system.getOptions(), 
    system.getConstraints()
  );
}
```

### Export Formats
```typescript
// Get different report formats
const result = await system.performComparison({
  options: myOptions,
  constraints: myConstraints,
  reportFormat: 'html'  // 'json', 'markdown', or 'html'
});
```

## Troubleshooting

**TypeScript Errors?**
```bash
npm run build
```

**Missing Dependencies?**
```bash
npm install
```

**Tests Failing?**
```bash
npm test
```

**Want to see all available methods?**
Check the `src/RefereeSystem.ts` file for the complete API.

## You're Ready!

The TradeOff Engine can compare anything with numerical criteria. Just define your options, set your priorities (weights), and let the TOPSIS algorithm find the mathematically optimal choice for you!

**Happy comparing!**