#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ConverterService } from './services/converter.service';
import { hasViewOptions, runPlanViewCli, ViewCliOptions } from './plan-view-cli';
import { getPlanViewCapabilities } from './analysis/metrics/catalog';

interface CliOptions extends ViewCliOptions {
  input?: string;
  section?: number;
  allWorkers?: boolean;
  output?: string;
  nodeWidth: number;
  nodeHeight: number;
  verticalSpacing: number;
  horizontalSpacing: number;
}

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

const program = new Command();
const capabilities = getPlanViewCapabilities();

program
  .name('plan-viz')
  .description('Convert Apache Data Fusion Physical Execution Plans to Excalidraw JSON')
  .version(version);

program
  .option('-i, --input <file>', 'Input file containing the execution plan')
  .option('-o, --output <file>', 'Output file for Excalidraw JSON')
  .option('--section <number>', 'Select a 1-based plan section', Number)
  .option('--all-workers', 'Draw every distributed task')
  .option('--metric-display <mode>', 'Metric display: off, labels or heatmap (default: off)')
  .option('--metric <name>', 'Exact metric name for labels or heatmap')
  .option('--palette <name>', 'Heatmap palette: ' + capabilities.palettes.map((palette) => palette.id).join(', ') +
    ' (default: ' + capabilities.defaultHeatmapPalette + ')')
  .option('--metric-cohort <id>', 'Comparison cohort ID from inspection')
  .option('--structure <mode>', 'Structural explanations: off or explain (default: off)')
  .option('--variant <id>', 'Physical variant ID from inspection')
  .option('--operator-profile <id>', 'Explicitly assumed operator implementation profile')
  .option('--metric-profile <id>', 'Explicitly assumed metric definition and unit profile')
  .option('--export-profile <id>', 'Explicitly assumed exporter/task ownership profile')
  .option('--capabilities', 'Print API capabilities as JSON without reading a plan')
  .option('--inspect', 'Print captured input and metric availability as JSON')
  .option('--analyze', 'Print selected analysis as JSON without a scene')
  .option('--report <file>', 'Write scene analysis and render references to a JSON sidecar')
  .option(
    '--node-width <number>',
    'Width of each node box',
    (value: string) => parseInt(value, 10),
    200
  )
  .option(
    '--node-height <number>',
    'Height of each node box',
    (value: string) => parseInt(value, 10),
    80
  )
  .option(
    '--vertical-spacing <number>',
    'Vertical spacing between nodes',
    (value: string) => parseInt(value, 10),
    100
  )
  .option(
    '--horizontal-spacing <number>',
    'Horizontal spacing between sibling nodes',
    (value: string) => parseInt(value, 10),
    50
  )
  .action(async (options: CliOptions) => {
    try {
      const config = {
        input: { section: options.section },
        distributed: { workerDisplay: options.allWorkers ? 'all' as const : 'representative' as const },
        generator: { nodeWidth: options.nodeWidth, nodeHeight: options.nodeHeight,
          verticalSpacing: options.verticalSpacing, horizontalSpacing: options.horizontalSpacing },
      };
      if (hasViewOptions(program)) {
        await runPlanViewCli(program, options, config);
        return;
      }
      let planText: string;

      // Read input
      if (options.input) {
        const inputPath = path.resolve(options.input);
        if (!fs.existsSync(inputPath)) {
          console.error(`Error: Input file not found: ${inputPath}`);
          process.exit(1);
        }
        planText = fs.readFileSync(inputPath, 'utf-8');
      } else {
        // Read from stdin
        const stdinBuffer = fs.readFileSync(0, 'utf-8');
        planText = stdinBuffer.toString();
      }

      // Convert
      const result = new ConverterService(config).convertDetailed(planText);
      for (const diagnostic of result.diagnostics) console.error(diagnostic.code + ': ' + diagnostic.message);
      const excalidrawData = result.scene;
      const output = JSON.stringify(excalidrawData, null, 2);

      // Write output
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, output, 'utf-8');
        console.log(`Successfully wrote Excalidraw JSON to: ${outputPath}`);
      } else {
        // Write to stdout
        console.log(output);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

void program.parseAsync(process.argv);
