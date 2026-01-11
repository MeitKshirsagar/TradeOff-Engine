# Option Referee

A comprehensive multi-criteria decision analysis tool that helps you make informed decisions by comparing multiple options across various criteria using the TOPSIS algorithm.

## Features

- **Multi-criteria Analysis**: Compare 2-5 options across multiple weighted criteria
- **TOPSIS Algorithm**: Industry-standard technique for preference ranking
- **Trade-off Analysis**: Identify strengths, weaknesses, and dominance relationships
- **Comprehensive Reports**: Generate detailed reports in JSON, Markdown, or HTML formats
- **Property-Based Testing**: Mathematically verified correctness with 100+ test iterations
- **Configuration Management**: Save preferences and use preset configurations
- **Visualization Data**: Generate chart data for visual comparisons

## Quick Start

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

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Using Preset Configurations

```typescript
// Get available presets
const presets = system.getPresetConfigurations();
console.log('Available presets:', presets.map(p => p.name));

// Apply a preset
const laptopPreset = system.applyPresetConfiguration('laptop_comparison');
if (laptopPreset.success) {
  const constraints = laptopPreset.data;
  // Use the preset constraints for your comparison
}
```

## Advanced Usage

### Step-by-Step Comparison

```typescript
import { RefereeSystem } from 'option-referee';

const system = new RefereeSystem();
await system.initialize();

// Add options one by one
system.addOption({
  id: 'option1',
  name: 'Option 1',
  scores: new Map([['criteria1', 80]]),
});

// Add constraints
system.addConstraint({
  id: 'criteria1',
  name: 'Important Criteria',
  weight: 100,
  type: 'performance',
  direction: 'maximize',
  scale: { min: 0, max: 100 },
});

// Check if ready for comparison
const readiness = system.validateReadiness();
if (readiness.success) {
  const comparison = await system.quickCompare(
    system.getOptions(),
    system.getConstraints()
  );
}
```

## Understanding the Results

### Rankings
Each option receives a closeness score (0-1) and rank:
- Higher closeness scores indicate better overall performance
- Rank 1 is the best option according to your criteria weights

### Trade-off Analysis
- **Strengths**: Areas where an option performs in the top 25%
- **Weaknesses**: Areas where an option performs in the bottom 25%
- **Dominance**: When one option is better in all criteria
- **Pareto Frontier**: Non-dominated options offering different trade-offs

### Recommendations
- **Best Overall**: Highest-scoring option
- **Compromise**: Balanced option on the Pareto frontier
- **Avoid**: Dominated option with significant weaknesses

## API Reference

### RefereeSystem

Main class for performing comparisons.

#### Methods

- `initialize(configKey?: string)`: Initialize the system
- `performComparison(request: ComparisonRequest)`: Perform full comparison
- `quickCompare(options, constraints)`: Quick comparison with HTML output
- `addOption(option: Option)`: Add an option
- `addConstraint(constraint: Constraint)`: Add a constraint
- `getPresetConfigurations()`: Get available presets
- `applyPresetConfiguration(id: string)`: Apply a preset
- `validateReadiness()`: Check if ready for comparison

### Types

#### Option
```typescript
interface Option {
  id: string;
  name: string;
  description?: string;
  scores: Map<string, number>; // constraint_id -> score
}
```

#### Constraint
```typescript
interface Constraint {
  id: string;
  name: string;
  weight: number; // 0-100
  type: 'cost' | 'performance' | 'efficiency' | 'custom';
  direction: 'maximize' | 'minimize';
  scale: { min: number; max: number };
}
```

## Testing

The system includes comprehensive testing with property-based tests:

```bash
npm test
```

- **149 tests** across 9 test suites
- **Property-based testing** with 100+ iterations per property
- **Integration tests** for end-to-end workflows
- **Unit tests** for individual components

## Algorithm Details

### TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)

1. **Normalization**: Vector normalization of the decision matrix
2. **Weighting**: Apply user-defined weights to normalized scores
3. **Ideal Solutions**: Calculate positive and negative ideal solutions
4. **Distance Calculation**: Euclidean distance to ideal solutions
5. **Closeness Score**: Relative closeness to the positive ideal solution

### Property-Based Testing

The system uses property-based testing to verify mathematical correctness:
- **Invariants**: Properties that remain constant (e.g., ranking consistency)
- **Round-trip Properties**: Operations that should return to original state
- **Metamorphic Properties**: Relationships between inputs and outputs
- **Error Conditions**: Proper handling of invalid inputs

## Architecture

The system is built with a modular architecture:

- **RefereeSystem**: Main API that orchestrates all components
- **Managers**: Handle option and constraint data management
- **Engines**: Implement TOPSIS algorithm and scoring logic
- **Analyzers**: Generate trade-off analysis and recommendations
- **Generators**: Create reports and visualizations
- **Validators**: Ensure data integrity and validation

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For questions and support, please open an issue on GitHub.