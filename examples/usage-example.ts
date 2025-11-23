import { convertPlanToExcalidraw } from '../src/index';
import * as fs from 'fs';

// Example 1: Simple conversion
const simplePlan = `
DataSourceExec: file_groups={1 groups: [[d_1.parquet]]}, projection=[d_dkey, env, service, host], file_type=parquet
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
    nodeColor: '#64748b',
    arrowColor: '#64748b',
  },
});

fs.writeFileSync('examples/simplePlan.excalidraw', JSON.stringify(customResult, null, 2));
console.log('Custom configuration output written to simplePlan.excalidraw');

// Example 3: Loading from file
const complexPlan = fs.readFileSync('examples/join.sql', 'utf-8');
const result3 = convertPlanToExcalidraw(complexPlan);
fs.writeFileSync('examples/complexPlan.excalidraw', JSON.stringify(result3, null, 2));
console.log('Complex plan output written to complexPlan.excalidraw');

// Example 4: Error handling
try {
  convertPlanToExcalidraw('');
} catch (error) {
  if (error instanceof Error) {
    console.error('Error caught:', error.message);
  }
}

