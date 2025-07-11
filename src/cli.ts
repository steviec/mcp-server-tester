#!/usr/bin/env node

/**
 * MCP Tester CLI
 */

import { Command } from 'commander';
import { TestRunner } from './testing/runner.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

interface CliOptions {
  serverConfig: string;
  serverName?: string;
  timeout?: number;
  quiet?: boolean;
  verbose?: boolean;
}

function handleError(error: unknown): never {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'Unknown error';
  }

  console.error(`Error: ${message}`);
  process.exit(1);
}

async function runTests(testFile: string, options: CliOptions): Promise<void> {
  try {
    console.log(`Running tests from: ${testFile}`);

    const runner = new TestRunner(testFile, options);
    const summary = await runner.run();

    // Exit with error code if any tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('mcp-server-tester')
    .description('Standalone CLI tool for testing MCP servers')
    .version(packageJson.version);

  // Unified test command
  program
    .argument('<test-file>', 'Test configuration file (YAML)')
    .requiredOption('--server-config <file>', 'MCP server configuration file (JSON)')
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
    .option('--quiet', 'Suppress non-essential output')
    .option('--verbose', 'Enable verbose output with additional details')
    .action(async (testFile: string, options: CliOptions) => {
      await runTests(testFile, options);
    });

  // Parse command line arguments
  program.parse();
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  handleError(error);
});

process.on('unhandledRejection', reason => {
  handleError(reason);
});

main();
