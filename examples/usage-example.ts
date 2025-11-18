import { convertPlanToExcalidraw } from 'plan-viz';
import * as fs from 'fs';

// Example 1: Simple conversion
const simplePlan = `
ProjectionExec: expr=[id, name]
  FilterExec: predicate=age > 18
    TableScan: table=users
`;

const result1 = convertPlanToExcalidraw(simplePlan);
console.log('Simple Plan Conversion:');
console.log(JSON.stringify(result1, null, 2));

// Example 2: Conversion with custom configuration
const customResult = convertPlanToExcalidraw(simplePlan, {
  generator: {
    nodeWidth: 250,
    nodeHeight: 100,
    verticalSpacing: 120,
    horizontalSpacing: 60,
    fontSize: 18,
    nodeColor: '#2563eb',
    arrowColor: '#64748b',
  },
});

fs.writeFileSync('output-custom.json', JSON.stringify(customResult, null, 2));
console.log('Custom configuration output written to output-custom.json');

// Example 3: Loading from file
const complexPlan = fs.readFileSync('examples/complex-plan.txt', 'utf-8');
const result3 = convertPlanToExcalidraw(complexPlan);
fs.writeFileSync('output-complex.json', JSON.stringify(result3, null, 2));
console.log('Complex plan output written to output-complex.json');

// Example 4: Error handling
try {
  convertPlanToExcalidraw('');
} catch (error) {
  if (error instanceof Error) {
    console.error('Error caught:', error.message);
  }
}

