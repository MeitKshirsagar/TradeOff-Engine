// Test setup for property-based testing with fast-check
import fc from 'fast-check';

// Configure fast-check for consistent property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  seed: 42, // Fixed seed for reproducible tests during development
  verbose: true,
});

// Global test utilities and matchers can be added here