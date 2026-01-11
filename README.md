# TradeOff Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)](https://jestjs.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://choosealicense.com/licenses/mit/)

A comprehensive multi-criteria decision analysis tool that helps you make informed decisions by comparing multiple options across various criteria using the TOPSIS algorithm.

**Applications**: Job offers, investment choices, vacation planning, technology selection, housing decisions, and any scenario where you need to weigh multiple factors.

## Features

- **Multi-criteria Analysis**: Compare 2-5 options across multiple weighted criteria
- **TOPSIS Algorithm**: Industry-standard technique for preference ranking
- **Trade-off Analysis**: Identify strengths, weaknesses, and dominance relationships
- **Comprehensive Reports**: Generate detailed reports in JSON, Markdown, or HTML formats
- **Property-Based Testing**: Mathematically verified correctness with 100+ test iterations
- **Configuration Management**: Save preferences and use preset configurations
- **Visualization Data**: Generate chart data for visual comparisons
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions

## Quick Start

### Installation

```bash
git clone https://github.com/MeitKshirsagar/TradeOff-Engine.git
cd TradeOff-Engine
npm install
```

### Instant Test

```bash
# Quick JavaScript test (no compilation needed)
node quick-test.js

# Full TypeScript examples
npx ts-node test-example.ts

# Your custom comparison
npx ts-node my-comparison.ts
```

### Basic Usage

```typescript
import { RefereeSystem } from 'option-referee';

// Create a new comparison system
const system = new RefereeSystem();
await system.initialize();

// Define your options
const laptops = [
  {
    id: 'laptop_a',
    name: 'Budget Laptop',
    scores: new Map([
      ['price', 800],
      ['performance', 75],
      ['battery', 6],
    ]),
  },
  {
    id: 'laptop_b',
    name: 'Gaming Laptop',
    scores: new Map([
      ['price', 1500],
      ['performance', 95],
      ['battery', 4],
    ]),
  },
];

// Define your criteria
const criteria = [
  {
    id: 'price',
    name: 'Price',
    weight: 30,
    type: 'cost',
    direction: 'minimize',
    scale: { min: 500, max: 2000 },
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

// Perform comparison
const result = await system.performComparison({
  options: laptops,
  constraints: criteria,
  reportFormat: 'html',
});

if (result.success) {
  console.log('Top choice:', result.data.report.rankings[0].option.name);
  console.log('Report:', result.data.exportedReport);
}
```

## Real-World Examples

### Job Comparison
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

### Vacation Planning
```typescript
const destinations = [
  { id: 'paris', name: 'Paris', scores: new Map([
    ['cost', 2500], ['weather', 70], ['culture', 95], ['activities', 90]
  ])},
  { id: 'bali', name: 'Bali', scores: new Map([
    ['cost', 1200], ['weather', 85], ['culture', 80], ['activities', 85]
  ])},
];
```

### Investment Analysis
```typescript
const investments = [
  { id: 'stocks', name: 'Index Funds', scores: new Map([
    ['return', 8], ['risk', 30], ['liquidity', 95], ['time', 10]
  ])},
  { id: 'realestate', name: 'Real Estate', scores: new Map([
    ['return', 12], ['risk', 50], ['liquidity', 20], ['time', 80]
  ])},
];
```

## Understanding Results

### Rankings
- **Closeness Score**: 0-1 scale (higher = better overall choice)
- **Rank**: 1 = best option according to your weights
- **Strengths**: Areas where option performs in top 25%
- **Weaknesses**: Areas where option performs in bottom 25%

### Recommendations
- **Best Overall**: Highest scoring option
- **Compromise**: Balanced option on Pareto frontier
- **Confidence**: Algorithm certainty (higher = more decisive)

## Testing & Quality

```bash
# Run all tests (149 tests across 9 suites)
npm test

# Build the project
npm run build

# Test with coverage
npm run test:coverage
```

**Quality Metrics:**
- 149 passing tests
- Property-based testing with 100+ iterations per property
- Mathematical correctness verification
- Full TypeScript type safety
- Comprehensive error handling

## Architecture

```
src/
├── types/          # Core type definitions
├── managers/       # Data management (Options, Constraints, Config)
├── validators/     # Input validation and sanitization
├── engines/        # TOPSIS algorithm implementation
├── analyzers/      # Trade-off analysis and recommendations
├── generators/     # Report generation (JSON, MD, HTML)
└── RefereeSystem.ts # Main API orchestrator
```

## Documentation

- **[TESTING.md](TESTING.md)** - Comprehensive testing guide
- **[Design Document](.kiro/specs/option-referee/design.md)** - Technical architecture
- **[Requirements](.kiro/specs/option-referee/requirements.md)** - Formal specifications
- **[Implementation Tasks](.kiro/specs/option-referee/tasks.md)** - Development roadmap

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **TOPSIS Algorithm**: Technique for Order of Preference by Similarity to Ideal Solution
- **Property-Based Testing**: Inspired by QuickCheck and Hypothesis
- **Multi-Criteria Decision Analysis**: Academic research in decision science

## Support

- **Issues**: [GitHub Issues](https://github.com/MeitKshirsagar/TradeOff-Engine/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/MeitKshirsagar/TradeOff-Engine/discussions)
- **Contact**: [Your Email]

---

**Made with care for better decision making**