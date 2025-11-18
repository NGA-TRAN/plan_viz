#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { convertPlanToExcalidraw } from './index';

interface CliOptions {
  input?: string;
  output?: string;
  nodeWidth: number;
  nodeHeight: number;
  verticalSpacing: number;
  horizontalSpacing: number;
  fontSize: number;
}

const program = new Command();

program
  .name('plan-viz')
  .description('Convert Apache Data Fusion Physical Execution Plans to Excalidraw JSON')
  .version('0.1.0');

program
  .option('-i, --input <file>', 'Input file containing the execution plan')
  .option('-o, --output <file>', 'Output file for Excalidraw JSON')
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
  .option(
    '--font-size <number>',
    'Font size for node text',
    (value: string) => parseInt(value, 10),
    16
  )
  .action((options: CliOptions) => {
    try {
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
      const config = {
        generator: {
          nodeWidth: options.nodeWidth,
          nodeHeight: options.nodeHeight,
          verticalSpacing: options.verticalSpacing,
          horizontalSpacing: options.horizontalSpacing,
          fontSize: options.fontSize,
        },
      };

      const excalidrawData = convertPlanToExcalidraw(planText, config);
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

program.parse(process.argv);
